# C#/.NET + MSVC interop & cross-compilation - FEASIBILITY

An honest, per-target verdict for everything in scope, grounded in official
Microsoft Learn docs (and clearly-labelled third-party sources where no
Microsoft equivalent exists). Captured on Windows 11 Pro 10.0.28120, 2026-11-05.

Build receipts for every "works here now" row are in
[`docs/receipts/csharp/`](../receipts/csharp/README.md).

## Legend

| Mark | Meaning |
| --- | --- |
| **HERE** | Verified working on THIS Windows host (receipt exists). |
| **OTHER-HOST** | Supported by design, but needs a different OS/host to run or build. |
| **GUARDED** | Possible on this host after an install we deliberately did not run. |
| **NO** | Not possible today without emulation (VM/WSL/container), per docs. |

## 1. Core interop (Rust <-> C#, C/C++ <-> C#)

| Capability | Verdict | Evidence / command | Source |
| --- | --- | --- | --- |
| C# -> Rust cdylib via source-gen P/Invoke (`[LibraryImport]`) | **HERE** | CLI 4/4; `add`,`fnv1a64`,`version` | [pinvoke-source-generation](https://learn.microsoft.com/dotnet/standard/native-interop/pinvoke-source-generation) |
| Native -> C# via `[UnmanagedCallersOnly]` function pointer (in-process callback) | **HERE** | CLI `rust -> C# callback(21)=42` | [UnmanagedCallersOnlyAttribute](https://learn.microsoft.com/dotnet/api/system.runtime.interopservices.unmanagedcallersonlyattribute) |
| C# `[UnmanagedCallersOnly]` compiled to a named NATIVE export (NativeAOT shared lib) | **HERE** | `dumpbin /exports yolo_managed.dll` -> `yolo_managed_double/add` | [native-aot/interop#native-exports](https://learn.microsoft.com/dotnet/core/deploying/native-aot/interop#native-exports), [native-aot/libraries](https://learn.microsoft.com/dotnet/core/deploying/native-aot/libraries) |
| Native C program calls the C# export (LoadLibrary) | **HERE** | `call_managed.exe` -> PASS | same as above |
| C/C++ (MSVC) dependency management via vcpkg manifest + triplet | **HERE** | `vcpkg install` fmt 12.2.0; clang-cl consumer runs | [manifest-mode](https://learn.microsoft.com/vcpkg/concepts/manifest-mode), [triplets](https://learn.microsoft.com/vcpkg/users/triplets) |

Note: `[UnmanagedCallersOnly]` methods must be `static` and use only
**blittable** types. Our exports take/return `int` only. In .NET 11, a
non-blittable signature (e.g. `bool`/`char`) under NativeAOT throws
`InvalidProgramException` ([breaking change](https://learn.microsoft.com/dotnet/core/compatibility/interop/11/unmanagedcallersonly-non-blittable)).

## 2. Cross-compilation targets

| Target | Verdict | Evidence / command | Source |
| --- | --- | --- | --- |
| Rust cdylib -> `x86_64-pc-windows-msvc` (host) | **HERE** | `cargo build --release` -> `yolo_interop.dll` | n/a (native host build) |
| Rust cdylib -> `x86_64-unknown-linux-gnu` (Win -> Linux) | **HERE** | `cargo zigbuild` -> ELF `libyolo_interop.so` | cargo-zigbuild (3rd-party): https://github.com/rust-cross/cargo-zigbuild |
| Rust -> Windows MSVC via **cargo-xwin** (xwin supplies SDK+CRT so clang-cl links with no Windows host) | **GUARDED** | `cargo xwin` subcommand not installed; standalone `xwin` 0.10.0 present + cache at `C:\src\yolo\.xwin-cache`. `cargo install cargo-xwin` then `cargo xwin build --target x86_64-pc-windows-msvc` | cargo-xwin: https://github.com/rust-cross/cargo-xwin ; xwin: https://github.com/Jake-Shadle/xwin |
| C# app -> `linux-x64` (framework-dependent cross-publish) | **HERE** (builds) / **OTHER-HOST** (runs) | `dotnet publish -r linux-x64 --self-contained false` -> ELF PIE apphost; run on a Linux x64 box w/ .NET 10 | [rid-catalog](https://learn.microsoft.com/dotnet/core/rid-catalog), [deploying](https://learn.microsoft.com/dotnet/core/deploying/) |
| C# app -> NativeAOT `win-x64` | **HERE** | `dotnet publish -r win-x64 -p:PublishAot=true` -> 999,936 B exe, runs 4/4 | [native-aot (CLI)](https://learn.microsoft.com/dotnet/core/deploying/native-aot/#publish-native-aot-using-the-cli) |
| C# app -> NativeAOT `linux-x64` FROM Windows | **NO** | Not attempted; cross-OS AOT unsupported. Run on a Linux host/WSL/container instead. | "**Native AOT does not support cross-OS compilation**" - [native-aot/cross-compile](https://learn.microsoft.com/dotnet/core/deploying/native-aot/cross-compile) |
| NativeAOT prerequisites on Windows | **HERE** | VS Build Tools 2026 + MSVC + Win11 SDK present; link needs VS Installer (vswhere) on PATH | [native-aot prerequisites](https://learn.microsoft.com/dotnet/core/deploying/native-aot/#prerequisites) |

### What "Windows SDK 11 on Linux" actually means

It means **cross-compilation**, not running the SDK or any Windows runtime on
Linux. The Windows 11 SDK is Windows-only software (supported OSes are Windows
10/11 - [Windows SDK](https://learn.microsoft.com/windows/apps/windows-sdk/)).
Tools like `xwin` download the SDK's **headers + import libraries + CRT** and
hand them to a cross-linker (`clang-cl`/`lld-link`) so a Linux (or Windows) host
can emit Windows PE binaries without a full Windows toolchain. You do **not**
run `rc.exe`/`midl`/WinUI/Windows App SDK on Linux this way - only link against
the SDK's libs. NativeAOT itself still cannot cross-OS compile
([cross-compile](https://learn.microsoft.com/dotnet/core/deploying/native-aot/cross-compile)).

## 3. UI frameworks: "C# in the browser" and "WinUI-style XAML on Linux/WASM"

| Framework | Runs on | In browser? | On Linux desktop? | Verdict | Source |
| --- | --- | --- | --- | --- | --- |
| **WinUI 3 / Windows App SDK** | Windows 10 1809+ / Windows 11 only | **No** | **No** | Shipping, **Windows-only by design**. Not built here (needs the WinUI workload); would run only on Windows. | [WinUI 3](https://learn.microsoft.com/windows/apps/winui/winui3/), [dev FAQ "Native Windows-only"](https://learn.microsoft.com/windows/apps/get-started/windows-developer-faq), [Windows App SDK](https://learn.microsoft.com/windows/apps/windows-app-sdk/) |
| **Blazor WebAssembly** | A WASM .NET runtime in any modern browser | **Yes** - this IS the real "C# in the browser" | runs in a browser on Linux | Shipping today. Buildable here (`dotnet new blazorwasm`); not built in this increment. | [Blazor hosting models](https://learn.microsoft.com/aspnet/core/blazor/hosting-models#blazor-webassembly), [Blazor](https://learn.microsoft.com/aspnet/core/blazor/) |
| **Uno Platform** | Windows, Linux, macOS, iOS, Android, **WASM** | **Yes** | **Yes** | The real "WinUI-style XAML on Linux/WASM" path. **Third-party, NOT Microsoft** - a reimplementation of the WinUI/WinAppSDK XAML API, not the Microsoft WinUI runtime. Shipping/mature. Not used here. | Uno (vendor): https://platform.uno/ |
| **.NET MAUI** | Android, iOS, macOS (Catalyst), Windows (via WinUI 3) | No | **No** (no Linux desktop target) | Shipping for its listed platforms; not a Linux-desktop or browser path. | [MAUI supported platforms](https://learn.microsoft.com/dotnet/maui/supported-platforms) |

**Plain-language summary of the user's named goals:**
- "WinUI 3 on Linux" -> **not possible** (Windows-only). Aspirational only.
- "WinUI 3 in a browser" -> **not possible** with WinUI itself.
- "C# in the browser" -> **yes, today** via **Blazor WebAssembly** (shipping).
- "WinUI-style XAML on Linux and in the browser" -> **yes, today** via the
  **Uno Platform** (shipping, third-party reimplementation - not Microsoft WinUI).

## 4. Bleeding-edge / canary & preview channels

Detection is done by `scripts/setup-windows-dev.ps1`; **enrolment in any
Insider/preview program is never performed by tooling** (it is a manual,
user-driven action). winget IDs were verified against Microsoft Learn and
confirmed to resolve with `winget search`.

| Channel / preview | Verdict here | Command / Id | Source |
| --- | --- | --- | --- |
| .NET 10 SDK (GA) | **HERE** | 10.0.403 installed; winget `Microsoft.DotNet.SDK.10` | [install .NET on Windows](https://learn.microsoft.com/dotnet/core/install/windows) |
| .NET 11 **preview** SDK | **GUARDED** (resolves; not fetched) | dry-run resolved `11.0.100-rc.3.26522.148`. `dotnet-install -Channel 11.0 -Quality preview -InstallDir .dotnet` (non-destructive local dir) | [dotnet-install](https://learn.microsoft.com/dotnet/core/tools/dotnet-install-script), [test prerelease locally](https://learn.microsoft.com/dotnet/core/tools/test-prerelease-sdk-locally) |
| .NET 11 **nightly/daily** SDK | **GUARDED** (resolves; not fetched) | dry-run resolved `11.0.200-preview.26554.106` from ci.dot.net. `dotnet-install -Channel 11.0 -Quality daily -InstallDir .dotnet` | [dotnet-install `--quality daily`](https://learn.microsoft.com/dotnet/core/tools/dotnet-install-script#options) |
| Windows Terminal (stable) | **HERE** (Preview installed: 1.26.2734.0) | winget `Microsoft.WindowsTerminal` | [Terminal install](https://learn.microsoft.com/windows/terminal/install) |
| Windows Terminal **Preview** | **HERE** | winget `Microsoft.WindowsTerminal.Preview` | [Terminal FAQ (channels)](https://learn.microsoft.com/windows/terminal/faq) |
| Windows Terminal **Canary** | **GUARDED** | not in winget on this host; Microsoft Store / [GitHub releases](https://github.com/microsoft/terminal/releases). Canary pkg family `Microsoft.WindowsTerminalCanary_8wekyb3d8bbwe` | [Terminal FAQ](https://learn.microsoft.com/windows/terminal/faq) |
| PowerShell 7 (stable) | **HERE** (7.6.9) | winget `Microsoft.PowerShell` | [install PowerShell](https://learn.microsoft.com/powershell/scripting/install/install-powershell-on-windows) |
| PowerShell **Preview** | **GUARDED** (resolves 7.7.5) | winget `Microsoft.PowerShell.Preview` | same |
| VS Build Tools 2026 (v18, Release) | **HERE** (18.11.12324.101) | winget `Microsoft.VisualStudio.BuildTools` | [acquire MSVC](https://learn.microsoft.com/cpp/overview/acquire-msvc) |
| VS 2026 **Insiders** (Preview channel) | **GUARDED** | winget `Microsoft.VisualStudio.Enterprise.Insiders` (channel `VisualStudio.18.Preview`); BuildTools Insiders id confirm via `winget search` | [acquire MSVC (winget)](https://learn.microsoft.com/cpp/overview/acquire-msvc#install-msvc-by-using-winget) |
| Windows 11 Insider (Canary/Dev) | **GUARDED** (manual, never scripted) | enrol at https://insider.windows.com ; channels doc below | [Windows Insider flighting](https://learn.microsoft.com/windows-insider/flighting) |

### Cross-cutting canary floor (project doctrine - framing only)

These frame the yolo ecosystem's bleeding-edge targets. They are **yolo-cross
project doctrine**, not Microsoft requirements, and were not installed here:

- **Chromium Canary** - browser-side canary target (ecosystem, not part of this C#/MSVC layer).
- **Linux kernel 7.3+** - the project's declared Linux floor. Note: the .NET
  `linux-x64` apphost we built targets **GNU/Linux 3.2.0+** (from its ELF
  header), so Microsoft's actual runtime floor is far lower; 7.3+ is the yolo
  canary choice, not a .NET requirement.
- **Bun canary (v1.4.4-canary+)** - already the repo default (`package.json`
  `packageManager`), used only by the surrounding workspace tooling, not by this
  C#/Rust/C++ layer.

## 5. One-line verdicts for the originally-named asks

- WinUI 3 on Linux: **NO** (Windows-only).
- WinUI 3 in browser: **NO** (use Blazor WASM or Uno instead).
- C# in browser: **YES today** (Blazor WebAssembly).
- WinUI-style XAML on Linux/WASM: **YES today** (Uno Platform, third-party).
- Windows 11 SDK "on Linux": **cross-compile only** (headers/libs/CRT via xwin+clang-cl), never the runtime/tooling.
- Rust->Windows MSVC and Rust->Linux cross-builds: **working** (zigbuild here; xwin install-guarded).
- C#->Linux cross-publish & C#->native-Windows AOT: **working here**; C#->Linux AOT from Windows: **NO** (cross-OS AOT unsupported).
