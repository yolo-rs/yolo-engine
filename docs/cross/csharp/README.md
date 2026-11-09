# C#/.NET + MSVC: cross-compilation & interop guide

How the yolo-cross C#/.NET + MSVC layer fits together: real cross-language
interop (Rust <-> C# <-> C/C++), cross-compilation in both directions, and the
Windows toolchain that backs it. Every Microsoft/Windows claim is cited to
Microsoft Learn; third-party tools (`xwin`, `cargo-xwin`, `cargo-zigbuild`, Uno)
are labelled as such.

- Worked, buildable example: [`dotnet/`](../../dotnet/)
- Setup + build scripts: [`scripts/`](../../scripts/)
- Honest per-target verdicts: [`FEASIBILITY.md`](./FEASIBILITY.md)
- Reproduction receipts: [`../receipts/csharp/`](../receipts/csharp/README.md)

---

## 1. The interop model

### 1.1 C# -> native (Rust/C/C++) with source-generated P/Invoke

Use [`[LibraryImport]`](https://learn.microsoft.com/dotnet/standard/native-interop/pinvoke-source-generation)
(the .NET 7+ source generator) instead of `[DllImport]`. It generates the
marshalling stub at **compile time**, so the call is trim-safe and
NativeAOT-compatible; `[DllImport]` generates an IL stub at runtime, which is not
available under AOT. Methods must be `static partial` in a `partial` type.

```csharp
internal static unsafe partial class NativeMethods
{
    [LibraryImport("yolo_interop")]
    internal static partial int yolo_cross_add(int a, int b);

    [LibraryImport("yolo_interop")]
    internal static partial int yolo_cross_apply(delegate* unmanaged<int,int> cb, int x);
}
```

The loader maps the base name `yolo_interop` to `yolo_interop.dll` on Windows
and `libyolo_interop.so` on Linux. To change calling convention use
[`[UnmanagedCallConv]`](https://learn.microsoft.com/dotnet/standard/native-interop/pinvoke-source-generation#basic-usage)
(there is no `CallingConvention` on `[LibraryImport]`). See
`dotnet/src/YoloCross.Interop/NativeMethods.cs`.

### 1.2 native -> C# with `[UnmanagedCallersOnly]`

A `static` method marked
[`[UnmanagedCallersOnly]`](https://learn.microsoft.com/dotnet/api/system.runtime.interopservices.unmanagedcallersonlyattribute)
is callable directly from native code. Two uses in this repo:

1. **In-process callback.** Take its address as a `delegate* unmanaged<int,int>`
   and pass it to Rust, which invokes it (`yolo_cross_apply`). This is exactly
   the pattern in the Microsoft docs example (`&DoubleInt`).
2. **Named native export.** Under a NativeAOT `NativeLib` build, a non-empty
   `EntryPoint` becomes a real exported C symbol in the produced shared library
   ([native exports](https://learn.microsoft.com/dotnet/core/deploying/native-aot/interop#native-exports),
   [building native libraries](https://learn.microsoft.com/dotnet/core/deploying/native-aot/libraries)).

```csharp
[UnmanagedCallersOnly(EntryPoint = "yolo_managed_double")]
public static int ManagedDouble(int x) => x * 2;   // dumpbin /exports -> yolo_managed_double
```

**Blittable-only rule.** `[UnmanagedCallersOnly]` methods must use blittable
parameter/return types. In .NET 11 a non-blittable signature (`bool`, `char`)
under NativeAOT throws `InvalidProgramException`
([breaking change](https://learn.microsoft.com/dotnet/core/compatibility/interop/11/unmanagedcallersonly-non-blittable));
use `byte`/`int`/`ushort` or
[disable runtime marshalling](https://learn.microsoft.com/dotnet/standard/native-interop/disabled-marshalling).

---

## 2. Building the Rust native side (repo toolchain)

### 2.1 Host build (Windows MSVC)

```bash
cargo build --release --manifest-path dotnet/native/yolo_interop/Cargo.toml \
  --target-dir dotnet/native/yolo_interop/target
```

Produces `yolo_interop.dll` linked by the local MSVC. (The crate is its own
Cargo workspace, so it never touches the yolo-cross workspace root manifest.)

### 2.2 Windows -> Linux (`cargo-zigbuild`)

[`cargo-zigbuild`](https://github.com/rust-cross/cargo-zigbuild) (third-party)
uses `zig` as the cross-linker and bundles a cross glibc, so you get a real ELF
`.so` from Windows:

```bash
cargo zigbuild --release --target x86_64-unknown-linux-gnu \
  --manifest-path dotnet/native/yolo_interop/Cargo.toml \
  --target-dir dotnet/native/yolo_interop/target
# -> libyolo_interop.so (ELF 64-bit, stripped) - verified here.
```

### 2.3 (any host) -> Windows MSVC via `cargo-xwin` + `xwin`

This is the "Windows SDK on Linux" cross-compile story. The Windows SDK and the
MSVC CRT are Windows-only *software* ([Windows SDK](https://learn.microsoft.com/windows/apps/windows-sdk/),
[acquire MSVC](https://learn.microsoft.com/cpp/overview/acquire-msvc)), but their
**headers and import libraries** are just files. [`xwin`](https://github.com/Jake-Shadle/xwin)
(third-party) downloads the official Microsoft VC++ Build Tools + Windows SDK
packages and "splats" the CRT + SDK headers and import `.lib`s into a sysroot;
[`cargo-xwin`](https://github.com/rust-cross/cargo-xwin) (third-party) then points
`clang-cl` / `lld-link` at that sysroot so a **non-Windows host links PE/COFF
binaries for `*-pc-windows-msvc` without a Windows install**:

```bash
# cargo-xwin is NOT installed on this host (standalone xwin 0.10.0 IS; cache at
# C:\src\yolo\.xwin-cache). Install the cargo subcommand first:
cargo install cargo-xwin
cargo xwin build --release --target x86_64-pc-windows-msvc \
  --manifest-path dotnet/native/yolo_interop/Cargo.toml
```

Licensing: xwin downloads Microsoft-licensed components; you must accept the
Microsoft license (`xwin --accept-license`). On Windows you normally just use the
installed MSVC instead (section 2.1); xwin's value is on Linux/macOS hosts.

---

## 3. C# cross-compilation

### 3.1 `dotnet publish -r linux-x64` (from Windows)

Runtime IDs come from the [RID catalog](https://learn.microsoft.com/dotnet/core/rid-catalog).

```bash
# Framework-dependent: small; needs .NET 10 runtime on the Linux target.
dotnet publish dotnet/src/YoloCross.Cli/YoloCross.Cli.csproj -c Release \
  -r linux-x64 --self-contained false -o dotnet/publish/linux-x64
# -> ELF PIE apphost (verified built here; runs on a Linux x64 host).

# Self-contained: no runtime needed on target, larger output.
dotnet publish ... -r linux-x64 --self-contained true
```

The RID-aware target in `YoloCross.Cli.csproj` places the matching native
library (`libyolo_interop.so` for `linux-*`, `yolo_interop.dll` for `win-*`)
next to the app. (Production NuGet packaging would instead ship per-RID assets
under `runtimes/<rid>/native/`.)

### 3.2 NativeAOT (`-p:PublishAot=true`)

NativeAOT compiles IL to native code ahead of time; the app is self-contained
and needs no installed runtime
([Native AOT deployment](https://learn.microsoft.com/dotnet/core/deploying/native-aot/)).

```bash
dotnet publish dotnet/src/YoloCross.Cli/YoloCross.Cli.csproj -c Release \
  -r win-x64 -p:PublishAot=true -o dotnet/publish/win-x64-aot
# -> ~1 MB native exe, verified running here.
```

- **Prerequisites (Windows):** Visual Studio with the *Desktop development with
  C++* workload (MSVC + Windows SDK)
  ([prerequisites](https://learn.microsoft.com/dotnet/core/deploying/native-aot/#prerequisites)).
- **Gotcha found here:** the ILCompiler link step shells out to `vswhere.exe` to
  locate the MSVC linker environment. If the VS Installer directory isn't on
  `PATH`, the link fails with `MSB3073` (exit 123). Fix: prepend
  `C:\Program Files (x86)\Microsoft Visual Studio\Installer` to `PATH` (the
  `-Aot` path in `scripts/dotnet-interop.ps1` does this).
- **Cross-OS is not supported:** you cannot NativeAOT-compile Linux binaries on
  Windows (or vice-versa). "**Native AOT does not support cross-OS
  compilation**" - [cross-compile](https://learn.microsoft.com/dotnet/core/deploying/native-aot/cross-compile).
  Cross-*architecture* (x64<->arm64) on the same OS is supported with the right
  build tools. Produce Linux AOT builds on Linux (or WSL/container).

---

## 4. C++ / C# MSVC interop

- **Toolset.** This host has VS Build Tools 2026 (v18.11), MSVC v14.51, and the
  Windows 11 SDK (10.0.26100 / 10.0.28000). `clang`/`clang-cl` 23.1.4 target
  `x86_64-pc-windows-msvc` and auto-detect the MSVC install via vswhere.
- **Call C++ from C#:** expose a C ABI (`extern "C"`) from the native DLL and
  bind it with `[LibraryImport]` (section 1.1), exactly as for Rust.
- **Call C# from C/C++:** build the managed library as a NativeAOT `NativeLib`
  shared library (section 1.2); `dumpbin /exports` shows the C symbols; a C
  program `LoadLibrary`s it and calls them (`dotnet/native/consumer/call_managed.c`,
  verified here).
- **C/C++ dependencies via vcpkg (MSVC).** Use manifest mode: a `vcpkg.json`
  with your dependencies and a triplet such as `x64-windows`
  ([manifest mode](https://learn.microsoft.com/vcpkg/concepts/manifest-mode),
  [triplets](https://learn.microsoft.com/vcpkg/users/triplets)). `vcpkg install`
  with no args installs into `vcpkg_installed/<triplet>/`. For MSBuild projects,
  set `VcpkgEnableManifest=true` and `VcpkgTriplet`
  ([MSBuild integration](https://learn.microsoft.com/vcpkg/users/buildsystems/msbuild-integration)).
  Sample + custom MSVC triplet: `scripts/vcpkg/` (verified: `fmt` 12.2.0 built
  and linked by `clang-cl`).

---

## 5. Toolchain setup (winget / vcpkg / VS Build Tools / Windows Terminal)

`scripts/setup-windows-dev.ps1` (and the `.sh` mirror) **detect and report** by
default and change nothing; `-Install` installs missing light packages via
winget, and VS Build Tools are additionally gated behind `-InstallBuildTools`.
No Insider/preview enrolment is ever performed.

winget package Ids (verified against Microsoft Learn and confirmed to resolve):

| Tool | winget Id | Source |
| --- | --- | --- |
| .NET SDK 10 | `Microsoft.DotNet.SDK.10` (preview: `Microsoft.DotNet.SDK.Preview`) | [install .NET](https://learn.microsoft.com/dotnet/core/install/windows) |
| PowerShell 7 | `Microsoft.PowerShell` (preview: `Microsoft.PowerShell.Preview`) | [install PowerShell](https://learn.microsoft.com/powershell/scripting/install/install-powershell-on-windows) |
| Windows Terminal | `Microsoft.WindowsTerminal` (`.Preview`; Canary via Store/GitHub) | [Terminal install](https://learn.microsoft.com/windows/terminal/install) |
| VS Build Tools 2026 | `Microsoft.VisualStudio.BuildTools` (VS2022: `Microsoft.VisualStudio.2022.BuildTools`) | [acquire MSVC](https://learn.microsoft.com/cpp/overview/acquire-msvc) |
| C++ workload | `--add Microsoft.VisualStudio.Workload.VCTools` | [component ids](https://learn.microsoft.com/visualstudio/install/workload-component-id-vs-build-tools) |
| MSVC v143 toolset | `--add Microsoft.VisualStudio.Component.VC.Tools.x86.x64` | same |
| Windows 11 SDK | `--add Microsoft.VisualStudio.Component.Windows11SDK.26100` | same |

vcpkg is not a winget package; clone + bootstrap:
`git clone https://github.com/microsoft/vcpkg` then `bootstrap-vcpkg.bat`
([get started](https://learn.microsoft.com/vcpkg/get_started/get-started)).

**Preview / canary channels** (detected, never auto-enrolled): see
[`FEASIBILITY.md` section 4](./FEASIBILITY.md#4-bleeding-edge--canary--preview-channels).
Windows Insider enrolment is manual:
[flighting](https://learn.microsoft.com/windows-insider/flighting). Prerelease
.NET SDKs install non-destructively to a local dir with `dotnet-install`
([reference](https://learn.microsoft.com/dotnet/core/tools/dotnet-install-script),
[test prerelease locally](https://learn.microsoft.com/dotnet/core/tools/test-prerelease-sdk-locally)).

---

## 6. Quick start

```bash
# Detect the toolchain (no changes):
pwsh -File scripts/setup-windows-dev.ps1

# Build Rust + .NET and run the interop demo; add -Linux and -Aot for cross-publish:
pwsh -File scripts/dotnet-interop.ps1 -Linux -Aot
```
