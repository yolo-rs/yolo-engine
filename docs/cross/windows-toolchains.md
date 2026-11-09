# Windows and MSVC toolchains

`yolo-cross` owns the Windows/Linux host qualification and cross-compilation
tooling. This includes Rust Windows MSVC target builds and prerequisite checks
used by browser-engine source builds. The actual Chromium, CEF, or other engine
source workflow remains owned by `yolo-web` and must follow that checkout's
pinned upstream build instructions.

The Bun driven cross-toolchain interface is owned by this workspace and uses
`YOLO_CROSS_*` environment variables. Existing `BUNUI_*` variables are read
only compatibility fallbacks; when both names are set, `YOLO_CROSS_*` wins.
`YOLO_CROSS_WORKSPACE` or `--workspace <path>` selects the consumer Cargo
workspace. Output paths remain selectable through `--target-dir`, `bundle
--out`, and the explicit `installer --dist` directory. Toolchain caches remain
outside the consumer source tree by default.

The MSVC/xwin flow still requires explicit owner opt-in with
`YOLO_CROSS_MSVC_ACCEPT_LICENSE=1` (or the legacy
`BUNUI_MSVC_ACCEPT_LICENSE=1`). The tool does not accept the Microsoft license
on the owner's behalf; the default Windows target remains `*-pc-windows-gnullvm`.

| Public variable                                                                       | Legacy fallback                             |
| ------------------------------------------------------------------------------------- | ------------------------------------------- |
| `YOLO_CROSS_WORKSPACE`                                                                | `BUNUI_WORKSPACE`                           |
| `YOLO_CROSS_LLVM_MINGW`                                                               | `BUNUI_LLVM_MINGW`                          |
| `YOLO_CROSS_WIN_SYSROOT`                                                              | `BUNUI_WIN_SYSROOT`                         |
| `YOLO_CROSS_WINEPREFIX`                                                               | `BUNUI_WINEPREFIX`                          |
| `YOLO_CROSS_HOST_QT_LIBEXEC`                                                          | `BUNUI_HOST_QT_LIBEXEC`                     |
| `YOLO_CROSS_QT_HOST_TOOLS`, `YOLO_CROSS_QT_TOOLS_DIR`                                 | `BUNUI_QT_HOST_TOOLS`, `BUNUI_QT_TOOLS_DIR` |
| `YOLO_CROSS_QT_PREFIX`, `YOLO_CROSS_QT_HOST_PATH`                                     | `BUNUI_QT_PREFIX`, `BUNUI_QT_HOST_PATH`     |
| `YOLO_CROSS_SIGN_PKCS12`, `YOLO_CROSS_SIGN_PASSFILE`, `YOLO_CROSS_SIGN_TIMESTAMP_URL` | Matching `BUNUI_SIGN_*` names               |
| `YOLO_CROSS_MSVC_ACCEPT_LICENSE`                                                      | `BUNUI_MSVC_ACCEPT_LICENSE`                 |

`YOLO_CROSS_ARCH`, `YOLO_CROSS_TRIPLE`, and `YOLO_CROSS_CLANG_TARGET` are
emitted by `windows.ts env`; the CMake toolchain also accepts legacy
`BUNUI_CROSS_ARCH` as an environment variable or CMake cache value.

On Windows, run the Chromium/MSVC host preflight with:

```powershell
bun run windows:chromium:doctor
```

The preflight inspects Visual Studio, MSVC linker and ATL/MFC headers, Windows
SDK/debugger files, and the `depot_tools` commands on `PATH`. It reports the
current host only; it does not install workloads, fetch Chromium, build an
engine, or prove Linux/Windows parity. Chromium's pinned checkout remains the
authority for its exact supported toolchain. Review
[`yolo-web`'s browser-specific toolchain guide](https://github.com/yolo-rs/yolo-web/blob/main/docs/WINDOWS_BROWSER_TOOLCHAIN.md)
before building an engine.

Rust crates targeting Windows can also use the workspace cross-build recipes
for MSVC/GNU and Linux GNU/musl. Select a target only after verifying that its
SDK, linker, sysroot, and deployment runtime are available; catalog presence is
not proof of a successful build.
