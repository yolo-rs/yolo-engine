# Build ownership cleanup — 2026-11-04

## Snapshot and scope

Before cleanup, the following untracked working files were copied and SHA-256
verified in the external sibling backup
`yolo-cross-migration-backups/ownership-cleanup-2026-11-04/`. Its
`snapshot-manifest.json` records the source revision, byte sizes, original
workspace-relative paths, and full digests. The snapshot also includes the
pre-cleanup `packages/buncc/src/cli.ts` so the removed UI dispatch can be
recovered exactly.

The UI module was not transferred to yolo-ui: every configured source required
by these recipes was absent in the checked workspaces and toolchain cache. No
recipe had a complete source/toolchain pair to build and qualify. The archived
recipes identify their intended owners for a future migration:

| Archived code | Intended owner | Why it left yolo-cross |
| --- | --- | --- |
| `packages/buncc/src/ui/recipes.ts`: iced M3 gallery, libcosmic calculator, Qt calculator/analog clock, GTK Broadway | yolo-ui | Application and frontend recipes plus browser bundle generation belong with UI products. Their source roots (`vendor/bun-ui`, `crates/bun-ui-web`, and the configured Qt source) were absent. `iced-m3-gallery` also depends on `crates/aphrody-m3-iced` in the absent bun-ui checkout. |
| `packages/buncc/src/ui/index.ts`: HTML/JS/WASM bundle store, browser feature selector, Broadway launcher | yolo-ui | It packages application-facing UI bundles and selects browser-specific WebAssembly variants, rather than providing a compiler driver. The expected `crates/bun-ui-web` consumer was absent. |
| The `servo` and `cef` recipe cases in those files | yolo-web | Servo and CEF are browser engines/webview integrations. `vendor/servo` and `vendor/cef-rs` were absent. |

At cleanup time, `vendor/bun-ui`, `vendor/servo`, `vendor/cef-rs`,
`crates/bun-ui-web`, `crates/bun-ui-web/apps/cosmic-calculator`, the configured
Qt source, and the emsdk checkout were unavailable. Accordingly, none of the
UI or engine recipes was moved or represented as working.

## Aphrody WASM scripts

`scripts/aphrody/release/stage-cli-wasm.ts` was product-specific release
staging for `packages/cli-wasm`, including the `aphrody-cli-wasm` archive and
manifest. That product is outside the active cross workspace. The referenced
`packages/cli-wasm` and `scripts/aphrody/release/publish-downloads.ts` were
also absent, so the stage script could not load or stage its product here. It
was preserved in the external snapshot and removed from the active workspace.

The generic behavior in `scripts/aphrody/build/rust/wasm-package.ts` is already
provided by the active `@yolo/wasm` package (`packages/wasm/src/build.ts`): it
builds or packages Cargo WebAssembly artifacts; accepts a Cargo wrapper or a
prebuilt artifact; pins `wasm-bindgen` from `Cargo.lock`; validates and
optimizes modules; supports a byte-size limit and cache; and atomically
replaces output only after a valid package is ready. The old helper's intended
local and remote Cargo routes referenced absent `scripts/cargo.ts` and
`scripts/aphrody/build/rust/vps-cargo.ts`. Its reusable packager was therefore
removed after confirming the active implementation and existing tests cover
those behaviors.

Validation run against the retained implementation:

```powershell
bun test packages/wasm/test/build.test.ts
```

Result: 4 passed, 3 skipped, 0 failed. The skipped cases were the optional
`wasm-opt` optimization, WASI Preview 2 component conversion, and the
network-gated wasm-bindgen case. The wasm-bindgen path was then run separately:

```powershell
$env:YOLO_WASM_TEST_NETWORK = '1'
bun test packages/wasm/test/build.test.ts --test-name-pattern 'builds the web target and runs greet and add'
```

Result: 1 passed, 6 filtered out, 0 failed. The environment variable enabled
the test's network-capable lane; the installed version-pinned
`wasm-bindgen-cli` was used. The temporary `YOLO_WASM_TEST_NETWORK` variable
was removed after the command.

The remaining `buncc` CLI was also checked after removing the stale dispatch:

```powershell
bun check --no-script packages/buncc/src/cli.ts
bun packages/buncc/src/cli.ts --help
```

The type check reported no errors in 63 files. The help command exited 0 and
no longer advertises `bun-ui`, Servo/CEF, or the removed UI toolchain command.

## Active CLI boundary

`packages/buncc/src/cli.ts` no longer advertises or dispatches the UI recipe,
Servo/CEF, or UI SDK-install commands. `buncc build` now falls through to the
Cargo workspace build action. The general compiler driver, Cargo orchestration,
Windows/MSVC, MinGW, xwin/zigbuild, WebAssembly package support, and
Emscripten target images remain in yolo-cross. The generic Rust/WASM path stays
in `packages/wasm`. The retired `emsdk`, `wasi-sdk`, and `qt-wasm` installers
were bundled with those UI recipes and had no active caller after cleanup; the
cross-rs Emscripten container target and Rust WASI/browser builders remain. If
a local C/C++ Emscripten or WASI SDK workflow is added later, expose it as a
generic provider with its own pinned source and integrity checks. UI
applications and browser engines await their owning repositories and source
inputs.

No UI source was changed in yolo-ui or yolo-web, no vendor Bun source was
changed, and no VPS process or transfer was touched.
