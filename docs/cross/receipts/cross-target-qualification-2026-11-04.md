# Cross-target qualification receipt

Date: 2026-11-04 (UTC)

Scope: reproducible build and runtime evidence for the workspace's Windows,
Linux, Android, and WebAssembly build lanes. This is a qualification snapshot,
not a claim that every declared target is supported or that Android was run on
a device.

## Toolchain snapshot

- Host: Windows 11 x86_64, MSVC host triple `x86_64-pc-windows-msvc`.
- `rustc`: 1.101.0-nightly (`708c94ef0`, 2026-11-03), LLVM 23.1.5.
- `cargo`: 1.101.0-nightly (`31d3246e0`, 2026-10-27).
- `cargo-zigbuild`: 0.24.1; Zig 0.17.0.
- `cargo-ndk`: 4.1.2; Android NDK 30.0.16248370, API level 23 for these builds.
- `wasm-bindgen`: 0.2.129.
- Linux runtime container: `rust:1-slim`, image digest
  `sha256:ea0999ff67355d958b8799b6751c879a6d770076d26047dca66f6e51e77930d3`;
  it reported Cargo 1.99.1 during execution.
- WebAssembly runtime: Node.js v26.13.0 (WASI Preview 1 reports Node's
  experimental-feature notice).

Cargo's build output directory was supplied by the host's external
`CARGO_TARGET_DIR`; its user-specific cache path is intentionally omitted.
Paths below are relative to that Cargo target directory unless explicitly
shown relative to the repository. Generated files are ignored build outputs,
not checked-in release assets.

## Build and runtime evidence

### Windows MSVC

Build command:

```powershell
cargo build -p cross --bin cross --release --target x86_64-pc-windows-msvc --locked
```

Artifact: `x86_64-pc-windows-msvc/release/cross.exe` — 2,007,040 bytes;
SHA-256 `C8A982954E166EAD640B9D9F2323B2D53CBE6924FAAA8BE1B6496CE9FA749682`.

Runtime command:

```powershell
$crossExe = Join-Path $env:CARGO_TARGET_DIR 'x86_64-pc-windows-msvc\release\cross.exe'
& $crossExe --version
```

It printed `cross 0.2.5 (a9301e91 2026-10-31)`.

### Windows 7 x86_64 MSVC compatibility target

Rust documents `x86_64-win7-windows-msvc` as a Tier 3 target with `core`,
`alloc`, `std` and `test` support. Rust does not publish a precompiled standard
library for it, so this build used nightly `-Z build-std`. Tier 3 means this
target is supported in the Rust source but is not broadly built/tested by the
project; it does not guarantee that `cross` or all its dependencies run on
Windows 7. See [Rust's Windows 7 MSVC target requirements](https://doc.rust-lang.org/rustc/platform-support/win7-windows-msvc.html)
and [target tiers](https://doc.rust-lang.org/rustc/platform-support.html).

Build command, using an isolated target directory:

```powershell
$env:CARGO_TARGET_DIR = 'target\win7-msvc-cargo'
cargo +nightly -Z build-std=std,panic_abort build -p cross --bin cross --release --target x86_64-win7-windows-msvc --locked
```

The build exited 0 with Rust 1.101.0-nightly. Artifact:
`x86_64-win7-windows-msvc/release/cross.exe` — 2,035,200 bytes;
SHA-256 `39C16A083B13073BD16CFD1A3108BBA0C1888805E0B9F0DE31983B5747994043`.
`llvm-readobj --file-headers` identified x86_64 PE/COFF and a console
subsystem. The optional-header subsystem version is 6.0; that header value is
not evidence of API compatibility. Running this binary on the Windows 11
build host printed `cross 0.2.5 (a9301e91 2026-10-31)` and fell back to host
Cargo as expected. No Windows 7 machine or VM was available, so Windows 7
runtime compatibility remains unqualified.

Microsoft documents `_WIN32_WINNT=0x0601` for Windows 7 API declarations and
Windows SDK support for building Windows 7 SP1 desktop applications. However,
Microsoft also states Visual Studio 2026 (the installed MSVC 14.51 toolchain
used here) no longer supports targeting Windows 7/8/8.1. The Rust target can
still emit a PE, but this particular compiler/runtime combination is outside
Microsoft's supported Windows 7 target set. The PE imports UCRT API-set DLLs;
the receipt does not qualify a Windows 7 SP1 image, the required UCRT update,
or a compatible redistributable. See [Windows headers and target macros](https://learn.microsoft.com/en-us/windows/win32/winprog/using-the-windows-headers),
[Windows SDK desktop targeting](https://learn.microsoft.com/en-us/cpp/windows/how-to-use-the-windows-10-sdk-in-a-windows-desktop-application),
[Microsoft C++ target OS support](https://learn.microsoft.com/en-us/cpp/overview/supported-platforms-visual-cpp),
and [Visual Studio 2022 runtime requirements](https://learn.microsoft.com/en-us/visualstudio/releases/2022/system-requirements).

### Windows 7 GNU compatibility target (not built)

Rust exposes `x86_64-win7-windows-gnu` as Tier 3 and does not ship its
precompiled standard library; `build-std` plus a compatible MinGW toolchain is
required. No `x86_64-w64-mingw32-gcc`/MinGW toolchain or Wine runner was on PATH
for this qualification, so no GNU artifact or Windows 7 runtime test was
attempted. The ordinary `x86_64-pc-windows-gnu` target is a distinct target
and must not be called Windows 7 support. See
[Rust's Windows 7 GNU target requirements](https://doc.rust-lang.org/rustc/platform-support/win7-windows-gnu.html)
and [Windows GNU requirements](https://doc.rust-lang.org/rustc/platform-support/windows-gnu.html).

### Linux x86_64, glibc baseline 2.17

Build command:

```powershell
cargo zigbuild --target x86_64-unknown-linux-gnu.2.17 --release -p cross --bin cross --locked
```

Artifact: `x86_64-unknown-linux-gnu/release/cross` — 2,123,656 bytes;
SHA-256 `68E3898171CA2D03B7E0A094F7E6968693AC2040C39EDAA3D00A7EDC47D3878C`.
`llvm-readelf --version-info` found GLIBC symbol requirements through 2.17.

Runtime command (mounting the artifact read-only as `/cross`):

```powershell
$artifactPath = Join-Path $env:CARGO_TARGET_DIR 'x86_64-unknown-linux-gnu\release\cross'
docker run --rm --platform linux/amd64 -v "${artifactPath}:/cross:ro" rust:1-slim /cross --version
```

It exited 0 and printed `cross 0.2.5 (a9301e91 2026-10-31)` and Cargo
1.99.1. The Rust-enabled image is required because `cross --version` probes
`rustc --print target-list`; an otherwise equivalent Debian slim container
without Rust exits 1 at that probe.

### Android arm64-v8a and x86_64

Two Android API levels were compiled. The API 23 and API 37 artifacts use
separate Cargo target directories and output directories so the builds remain
independently inspectable.

API 23 commands:

```powershell
cargo ndk -t arm64-v8a -P 23 -o target/android/jniLibs build -p android-native --release --locked
cargo ndk -t x86_64 -P 23 -o target/android/jniLibs build -p android-native --release --locked
```

Both builds exited 0. NDK `llvm-readelf -h` identified the copied libraries
as ELF64 AArch64 and ELF64 x86-64 respectively:

| Artifact | Size | SHA-256 |
| --- | ---: | --- |
| `target/android/jniLibs/arm64-v8a/libandroid_native.so` | 422,440 bytes | `31F41BA1F42AE72475245A6739C9D0EC8BD32E011D650CE83F41332B5CB0BBC6` |
| `target/android/jniLibs/x86_64/libandroid_native.so` | 412,296 bytes | `4C6FE33B33FE7B8A148ACEC256EFE4FC01DBB4AC104B2749F8EC7D93955C99DC` |

API 37 commands (separate Cargo output directory):

```powershell
$env:CARGO_TARGET_DIR = 'target/android-api37-cargo'
cargo ndk -t arm64-v8a -P 37 -o target/android-api37/jniLibs build -p android-native --release --locked
cargo ndk -t x86_64 -P 37 -o target/android-api37/jniLibs build -p android-native --release --locked
```

Both builds exited 0. NDK `llvm-readelf -h` confirmed ELF64 AArch64 and
x86-64:

| Artifact | Size | SHA-256 |
| --- | ---: | --- |
| `target/android-api37/jniLibs/arm64-v8a/libandroid_native.so` | 415,008 bytes | `8B8884E0A7AEDD0E914A8DA8D073C85BF8729DEF8B7FB112AB5D7412ECFACBF0` |
| `target/android-api37/jniLibs/x86_64/libandroid_native.so` | 404,488 bytes | `7E3AF75EB609F74A09680026B45A092B5C85EB4AADA49C3CACE965954F787261` |

No Android device or emulator was attached to ADB. This establishes API 23
and API 37 compile/link artifacts and ELF architecture only; it does not
establish Android runtime behavior or device compatibility.

### WebAssembly browser module

Build and binding generation commands:

```powershell
cargo build -p yolo-wasm-raw --target wasm32-unknown-unknown --release --locked
cargo build -p yolo-wasm-bindgen-hello --target wasm32-unknown-unknown --release --locked
wasm-bindgen --target web --out-dir target/wasm-bindgen "$env:CARGO_TARGET_DIR\wasm32-unknown-unknown\release\yolo_wasm_bindgen_hello.wasm"
```

The raw module was 511 bytes, SHA-256
`AA98439F5DDCDB18A36DB9FB88AC72B7FF0CB7DF47A99003D97D4CBB45A1234D`.
The bindgen input module was 39,588 bytes, SHA-256
`554634CEFFC3FE08CDCA6C9BF5361DF20652466855D54D719D7FF31E235AD627`.
Generated browser outputs:

| Artifact | Size | SHA-256 |
| --- | ---: | --- |
| `target/wasm-bindgen/yolo_wasm_bindgen_hello_bg.wasm` | 22,340 bytes | `14978422533274BC3C39FE10CE13431FA9862076448ABB33F6C8335DD19F8F70` |
| `target/wasm-bindgen/yolo_wasm_bindgen_hello.js` | 6,879 bytes | `4396BB0BA593542E48FE8045AE5D8B0ED429C9D50ECA3359A01A0A5DF6ED37CA` |
| `target/wasm-bindgen/yolo_wasm_bindgen_hello.d.ts` | 1,608 bytes | `8AAF85E865CE760643D1D8A1CC9DC7B5584B2E1606912A2DA3652565428D8121` |
| `target/wasm-bindgen/yolo_wasm_bindgen_hello_bg.wasm.d.ts` | 525 bytes | `2FD1008DC61D19CC9CE59A1A05A0D3EF502C76DD2A19E4C97ACE2739B52F956A` |

A temporary Node.js harness loaded the generated module and verified
`add(20, 22) == 42` and `greet("Bun") == "Hello, Bun!"`; it exited 0.
The harness invocation was:

```powershell
node "$env:TEMP\yolo-cross-wasm-bindgen-smoke.mjs" target/wasm-bindgen/yolo_wasm_bindgen_hello.js target/wasm-bindgen/yolo_wasm_bindgen_hello_bg.wasm
```

Its JavaScript source was:

```js
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';
const js = await import(pathToFileURL(process.argv[2]).href);
js.initSync(fs.readFileSync(process.argv[3]));
if (js.add(20, 22) !== 42 || js.greet('Bun') !== 'Hello, Bun!') throw new Error('unexpected WebAssembly result');
console.log('wasm-bindgen runtime passed');
```

### WASI Preview 1 command

Target installation and build commands:

```powershell
rustup target add wasm32-wasip1 wasm32-wasip2
cargo build -p yolo-wasm-wasi-hello --target wasm32-wasip1 --release --locked
```

Artifact: `wasm32-wasip1/release/yolo-wasm-wasi-hello.wasm` — 65,796 bytes;
SHA-256 `3AC805EA2AF85EA4FC92D6BE00958CA020C5094D6DD4F3DF11C66B76FDD75E03`.
A temporary Node.js WASI Preview 1 harness ran the module with two arguments
and `HELLO=wasi-ok`; output included `arg:alpha`, `arg:beta`, and
`env:wasi-ok`, with exit code 0. `wasm32-wasip2` was installed but no WASI 2
fixture was built in this qualification.

The WASI harness invocation was:

```powershell
node "$env:TEMP\yolo-cross-wasi-smoke.cjs" "$env:CARGO_TARGET_DIR\wasm32-wasip1\release\yolo-wasm-wasi-hello.wasm"
```

Its source was:

```js
const fs = require('node:fs');
const { WASI } = require('node:wasi');
const wasi = new WASI({ version: 'preview1', args: ['fixture', 'alpha', 'beta'], env: { HELLO: 'wasi-ok' }, preopens: {} });
WebAssembly.instantiate(fs.readFileSync(process.argv[2]), { wasi_snapshot_preview1: wasi.wasiImport }).then(({ instance }) => {
  process.exitCode = wasi.start(instance);
}).catch(error => { console.error(error); process.exitCode = 1; });
```

## Boundaries and gaps

- Standard Cargo artifacts are in the host-selected external target cache;
  they are not part of the repository and are not portable release bundles.
- Android outputs and WebAssembly glue are under ignored `target/` and are not
  checked-in deliverables. Re-run the commands above to regenerate them.
- Android proof covers API 23 and API 37 linking for two ABIs; there was no
  device runtime proof.
- Linux proof covers x86_64 GNU with a glibc 2.17 symbol ceiling. It does not
  qualify Linux ARM, musl, other architectures, or every target in
  `targets.toml`.
- Windows proof covers x86_64 MSVC standard and the x86_64 Windows 7 MSVC
  compatibility target; both ran only on the Windows 11 host. There is no
  Windows 7 runtime proof. Windows GNU and ARM64 Windows remain unqualified.
- Browser WebAssembly and WASI Preview 1 fixtures ran. WASI Preview 2,
  Emscripten, browser integration, and optimized release (`wasm-opt`) paths
  were not qualified here.
- The Docker `rust:1-slim` tag is mutable; its exact pulled image digest is
  recorded above for the runtime proof.
