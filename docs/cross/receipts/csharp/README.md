# C#/.NET + MSVC interop - build receipts

Real commands, tool versions, and trimmed real output captured on this host
while building `dotnet/` and `scripts/`. Anything not executed is listed under
[Not run](#not-run). Build outputs live in gitignored `bin/`/`obj/`/`publish/`
and `target/` directories; none are committed. No artifact here exceeds 10 MB.

Host: Windows 11 Pro 10.0.28120 (x64). Captured 2026-11-05.

## Tool versions (verified with real commands)

| Tool | Version | Command |
| --- | --- | --- |
| .NET SDK | 10.0.403 (also 10.0.401); host 10.0.14; RID win-x64 | `dotnet --info` |
| Rust | rustc 1.101.0-nightly (708c94ef0 2026-11-03) | `rustc --version` |
| Cargo | 1.101.0-nightly (31d3246e0 2026-10-27) | `cargo --version` |
| clang / clang-cl | 23.1.4 (target x86_64-pc-windows-msvc) | `clang --version` |
| zig | 0.17.0 | `zig version` |
| cargo-zigbuild | present (`~/.cargo/bin/cargo-zigbuild.exe`) | `cargo zigbuild --help` |
| xwin | 0.10.0 (`~/.cargo/bin/xwin.exe`) | `xwin --version` |
| cargo-xwin | NOT installed (the `cargo xwin` subcommand is absent) | `cargo xwin --version` -> "no such command" |
| PowerShell | 7.6.9 on .NET 10.0.14 | `pwsh -c '$PSVersionTable'` |
| winget | v1.30.140-preview | `winget --version` |
| VS Build Tools | 2026, 18.11.12324.101 [VisualStudio.18.Release] | `vswhere -all -prerelease` |
| MSVC toolset | 14.51.36231 (cl.exe) | filesystem `VC\Tools\MSVC` |
| Windows 11 SDK | 10.0.26100.0 and 10.0.28000.0 | `Windows Kits\10\Lib` |
| vcpkg | 2026-09-26-51bf87ca6e9bf3e62 (`C:\src\vcpkg`) | `vcpkg version` |
| git | 2.55.0.windows.5 | `git --version` |

xwin download cache present at `C:\src\yolo\.xwin-cache` (dl/, unpack/).

## Artifacts produced (size + SHA-256 prefix)

| Bytes | SHA-256 (first 16) | Path (under `dotnet/`) |
| --- | --- | --- |
| 9,216 | `f2564fe5e7ea9be7` | `native/yolo_interop/target/release/yolo_interop.dll` |
| 284,736 | `312437e3277fa47b` | `native/yolo_interop/target/x86_64-unknown-linux-gnu/release/libyolo_interop.so` (ELF 64-bit, stripped) |
| 999,936 | `8c7b4a6eff3b2d72` | `publish/win-x64-aot/yolo-cross-dotnet.exe` (NativeAOT) |
| 864,256 | `efd1341c9b68c2c0` | `publish/nativeexport-win-x64/yolo_managed.dll` (NativeAOT shared lib) |
| 148,992 | `5bd4e4bd96103f4f` | `publish/nativeexport-win-x64/call_managed.exe` (C loader) |
| 78,192 | `6282e33c3b906485` | `publish/linux-x64/yolo-cross-dotnet` (ELF PIE apphost) |

## 1. Rust cdylib (host windows-msvc)

```console
$ cargo build --release --manifest-path native/yolo_interop/Cargo.toml --target-dir native/yolo_interop/target
    Finished `release` profile [optimized] target(s) in 2.11s

$ dumpbin /exports target/release/yolo_interop.dll
          1    0 00001000 yolo_cross_add
          2    1 00001004 yolo_cross_apply
          3    2 00001014 yolo_cross_fnv1a64
          4    3 0000104C yolo_cross_version
```

## 2. dotnet build + run (JIT, Windows host)

```console
$ dotnet build -c Release
  YoloCross.Interop -> ...\YoloCross.Interop.dll
  YoloCross.Cli -> ...\yolo-cross-dotnet.dll
La génération a réussi.  0 Avertissement(s)  0 Erreur(s)

$ ./src/YoloCross.Cli/bin/Release/net10.0/yolo-cross-dotnet.exe
native library version : yolo_interop 0.1.0
add(40, 2)             : 42
fnv1a64("yolo")        : 0xd32f1249a87757c8
rust -> C# callback(21): 42
  [PASS] rust add(40,2) == 42
  [PASS] rust callback doubles 21 -> 42
  [PASS] version reports yolo_interop
  [PASS] fnv1a64("yolo") == 0xd32f1249a87757c8
4/4 checks passed   (exit 0)
```

## 3. Rust cdylib cross-compiled Windows -> linux-x64 (cargo-zigbuild)

```console
$ cargo zigbuild --release --target x86_64-unknown-linux-gnu --manifest-path native/yolo_interop/Cargo.toml --target-dir native/yolo_interop/target
    Finished `release` profile [optimized] target(s) in 4.24s

$ file .../libyolo_interop.so
ELF 64-bit LSB shared object, x86-64, ... dynamically linked, stripped

$ llvm-nm -D --defined-only .../libyolo_interop.so | grep yolo_cross
000000000000e870 T yolo_cross_add
000000000000e874 T yolo_cross_apply
000000000000e883 T yolo_cross_fnv1a64
000000000000e8ba T yolo_cross_version
```

## 4. dotnet publish -r linux-x64 (cross-publish, framework-dependent)

```console
$ dotnet publish src/YoloCross.Cli/YoloCross.Cli.csproj -c Release -r linux-x64 --self-contained false -o publish/linux-x64
  YoloCross.Cli -> ...\publish\linux-x64\

$ file publish/linux-x64/yolo-cross-dotnet
ELF 64-bit LSB pie executable, x86-64, ... for GNU/Linux 3.2.0, stripped

$ ls publish/linux-x64 | grep -iE 'yolo_interop|libyolo'
libyolo_interop.so        # the cargo-zigbuild .so is bundled; no stray Windows .dll
```

Built here; the apphost RUNS on a Linux x64 host with the .NET 10 runtime (not
executed on this Windows host).

## 5. dotnet publish -r win-x64 -p:PublishAot=true (NativeAOT)

```console
# NativeAOT's link step calls vswhere.exe to locate the MSVC linker env; the VS
# Installer dir must be on PATH or the link fails with MSB3073 (code 123).
$ export PATH="/c/Program Files (x86)/Microsoft Visual Studio/Installer:$PATH"
$ dotnet publish src/YoloCross.Cli/YoloCross.Cli.csproj -c Release -r win-x64 -p:PublishAot=true -o publish/win-x64-aot
  Generating native code
  YoloCross.Cli -> ...\publish\win-x64-aot\

$ ./publish/win-x64-aot/yolo-cross-dotnet.exe
... 4/4 checks passed   (exit 0)      # exe = 999,936 bytes, no .NET runtime needed
```

## 6. C# [UnmanagedCallersOnly] native export (NativeAOT shared lib) + C consumer

```console
$ dotnet publish src/YoloCross.NativeExport/YoloCross.NativeExport.csproj -c Release -r win-x64 -o publish/nativeexport-win-x64
  Generating native code -> yolo_managed.dll

$ dumpbin /exports publish/nativeexport-win-x64/yolo_managed.dll | grep yolo_managed
    yolo_managed_add = yolo_managed_YoloCross_NativeExport_Managed__Add
    yolo_managed_double = yolo_managed_YoloCross_NativeExport_Managed__Double

$ clang native/consumer/call_managed.c -o publish/nativeexport-win-x64/call_managed.exe
$ ./call_managed.exe
native C -> C#: yolo_managed_double(21) = 42
native C -> C#: yolo_managed_add(40, 2) = 42
PASS: native code called C# NativeAOT exports   (exit 0)
```

## 7. PowerShell 7 module

```console
$ pwsh -NoProfile -c "Import-Module .../module/YoloCross/YoloCross.psd1 -Force; Test-YoloCross | Format-List"
LibDir      : ...\src\YoloCross.Cli\bin\Release\net10.0
Version     : yolo_interop 0.1.0
Add_40_2    : 42
Hash_yolo   : 0xd32f1249a87757c8
Callback_21 : 42
Passed      : True
```

## 8. vcpkg (manifest mode, MSVC) + C++ consumer

```console
$ cd scripts/vcpkg && vcpkg install --triplet x64-windows --x-install-root=vcpkg_installed
Installing 3/3 fmt:x64-windows@12.2.0#1...
All requested installations completed successfully in: 104 ms   # license: MIT

$ clang-cl consumer.cpp /nologo /std:c++17 /EHsc /I<inc> /link /LIBPATH:<lib> fmt.lib
$ ./consumer.exe
yolo-cross vcpkg + MSVC: fmt linked from a vcpkg manifest (fmt 12.2.0)   (exit 0)
```

## 9. Toolchain setup detection (no installs performed)

```console
$ pwsh -File scripts/setup-windows-dev.ps1
Tool             Status  Detail
.NET SDK         present 10.0.401; 10.0.403
PowerShell 7     present pwsh 7.6.9 on .NET 10.0.14
Windows Terminal present Microsoft.WindowsTerminalPreview 1.26.2734.0
VS Build Tools   present Visual Studio Build Tools 2026 18.11.12324.101 [VisualStudio.18.Release]
MSVC toolset     present cl.exe toolsets: 14.51.36231
Windows 11 SDK   present builds: 10.0.26100.0, 10.0.28000.0
vcpkg            present C:\src\vcpkg\vcpkg.exe (... 2026-09-26-51bf87ca6e9bf3e62)
7 present, 0 missing.
```

winget IDs additionally confirmed to resolve via `winget search` (read-only, no
install): `Microsoft.DotNet.SDK.10` (10.0.403), `Microsoft.PowerShell` (7.6.9),
`Microsoft.PowerShell.Preview` (7.7.5), `Microsoft.WindowsTerminal` (1.25),
`Microsoft.WindowsTerminal.Preview` (1.26), `Microsoft.VisualStudio.BuildTools`
(18.11.3 = VS 2026), `Microsoft.VisualStudio.2022.BuildTools` (17.14.44).
`Microsoft.WindowsTerminal.Canary` did NOT resolve via winget here.

## 10. .NET 11 preview / nightly channel resolution (dotnet-install -DryRun)

Dry-run downloads nothing; it only resolves the channel to a concrete version
and URL (so these are reported as "resolves", not "installed"):

```console
$ ./dotnet-install.ps1 -Channel 11.0 -Quality preview -DryRun
dotnet-install: URL #0 - aka.ms: https://builds.dotnet.microsoft.com/dotnet/Sdk/11.0.100-rc.3.26522.148/dotnet-sdk-11.0.100-rc.3.26522.148-win-x64.tar.gz

$ ./dotnet-install.ps1 -Channel 11.0 -Quality daily -DryRun
dotnet-install: URL #0 - aka.ms: https://ci.dot.net/public/Sdk/11.0.200-preview.26554.106/dotnet-sdk-11.0.200-preview.26554.106-win-x64.tar.gz
```

To actually install non-destructively into a local dir (not done here):
`./dotnet-install.ps1 -Channel 11.0 -Quality preview -InstallDir .dotnet`.

## Not run

| Target | Why | How it would run |
| --- | --- | --- |
| NativeAOT linux-x64 from Windows | Native AOT does not support cross-OS compilation ([docs](https://learn.microsoft.com/dotnet/core/deploying/native-aot/cross-compile)) | On a Linux x64 host (or WSL/container) with clang+zlib: `dotnet publish -r linux-x64 -p:PublishAot=true` |
| Execute the linux-x64 apphost | No Linux runtime on this Windows host | Copy `publish/linux-x64` to a Linux x64 box with .NET 10 and run `./yolo-cross-dotnet` |
| Self-contained linux publish | Only framework-dependent was built | add `--self-contained true` |
| cargo-xwin Rust -> windows-msvc via xwin SDK | `cargo xwin` subcommand not installed (standalone `xwin` 0.10.0 is present) | `cargo install cargo-xwin` then `cargo xwin build --target x86_64-pc-windows-msvc` |
| Any winget install / Build Tools install | Detect-only this session | `scripts/setup-windows-dev.ps1 -Install [-InstallBuildTools]` |
| Windows Insider / preview-channel enrolment | Never performed by tooling | Manual: https://learn.microsoft.com/windows-insider/flighting |
