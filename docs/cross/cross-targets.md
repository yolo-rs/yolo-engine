# Cross target profiles

`targets.toml` remains the machine-readable cross-rs target catalog. `crates/cargo-xwin` and
`crates/cargo-zigbuild` add Windows MSVC and Linux/glibc/musl linker workflows; BunCC supplies MSVC, MinGW/MSYS2,
Wine, Proton, .NET, and WebAssembly providers.

## Requested platform families

| Platform | Targets and entry points | Notes |
| --- | --- | --- |
| Windows 11 | `x86_64-pc-windows-msvc`, `x86_64-pc-windows-gnu` | `cargo-xwin` for MSVC; BunCC's MSVC and MinGW providers for native C/C++. |
| Linux | GNU and musl triples already in `targets.toml` | `cargo-zigbuild` handles glibc compatibility levels; cross image repos handle containerized targets. |
| Android 17 / API 37 | `aarch64-linux-android`, `x86_64-linux-android`; ARMv7 and 32-bit entries retained | Set `compileSdk = 37` and `targetSdk = 37` in the Android project and install Android SDK/NDK 37. |
| WebAssembly | `wasm32-unknown-emscripten`; BunCC's Rust/WASI/WebAssembly providers | `packages/wasm` builds, inspects, validates, optimizes, and runs modules. |

The Android framework level is separate from the Rust target triple: the Android SDK project selects API 37 while
NDK linking selects the ABI. The 64-bit ABIs map to `aarch64-linux-android` (arm64-v8a) and
`x86_64-linux-android`; ARM32 maps to `armv7-linux-androideabi` (armeabi-v7a). See Google's
[Android 17 SDK setup](https://developer.android.com/about/versions/17/setup-sdk).

This catalog defines toolchain intent, not a claim that every host SDK or third-party native dependency has already
been downloaded or built. `vendor/README.md` records the pinned upstream vendor set and its lazy checkout state.
