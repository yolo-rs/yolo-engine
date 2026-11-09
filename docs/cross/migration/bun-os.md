# Bun OS build and interop migration status

This checkout contains an in-progress source consolidation from Bun OS. The root Cargo and Bun manifests describe a
single orchestration surface, but the migration is not yet a complete, validated monorepo: the worktree is uncommitted,
several cross tool repositories remain Git submodules, some native files remain outside `crates/` and `packages/`, and
the `vendor/` directory is an inventory rather than a hydrated vendor tree. Do not treat catalog entries or copied
source as proof that a component is useful, builds, or has been released.

## Candidate source currently present

- `packages/buncc` (`@yolo/buncc`): compiler driver and providers for C/C++, MSVC, MinGW/MSYS2, .NET, Rust, and
  WebAssembly. The local package identity is rebranded; no package was published.
- `packages/cross-plugins` (`@yolo/cross-plugins`) is the narrow compiler-plugin API; BunOS's product plugin
  registry, graph, devtools, polyfills, and Android docs crawler are excluded and preserved in the external archive.
- `@yolo/windows` now lives in `yolo-bun/packages/windows` and owns Bun's `bun:ffi` Win32, registry, service, shell,
  `bun:windows`, and `bun:winrt` compatibility APIs. `packages/windows-interops` retains the .NET WinUI host and
  BunOS device-driver adapter; its local dependency on the yolo-bun package is for this sibling checkout only and is
  not a publication-ready dependency. The windows-rs Node-API provider and typed WinRT facade moved to
  `yolo-os/crates/windows-native-napi` and `yolo-os/packages/windows-winrt`. `packages/bun-dotnet-windows` and
  `packages/winclean` remain cross-build/interop tools as `@yolo/bun-dotnet-windows` and `@yolo/winclean`. WinClean uses
  `crates/yolo-capture`, `crates/yolo-process`, and `@yolo/kernel-client`; original sources remain in the BunOS archive.
- `packages/android-pipeline` (`@yolo/android-pipeline`), `packages/bun-android` (`@yolo/bun-android`), and
  `packages/wasm` (`@yolo/wasm`), plus `crates/android-native`, remain in the active workspace. The WASM CLI is
  `yolo-wasm`; three fixture crates are flattened under `crates/yolo-wasm-*`. Android SDK/NDK/Gradle interfaces remain active.
- Core Cargo sources include `crates/cross`, `crates/xtask`, `crates/cargo-xwin`, `crates/cargo-zigbuild`,
  `crates/yolo-hardware`, and selected Windows/Android interop crates. Generic POSIX/GNU compatibility moved to
  `yolo-standards/crates/yolo-posix`. All active Rust workspace
  source paths are under the root `crates/` directory.
- Host topology and optional CUDA/clock probing moved from `crates/bun-os-native` to
  `yolo-os/crates/bun-os-native`; it had no consumer in the cross compiler workspace.
- The unused duplicate Bun POSIX/GNU package was removed from this workspace. yolo-web owns the byte-identical
  `@yolo-web/posix-bun` package used by its Bun tooling; yolo-cross keeps no POSIX Bun package or runtime surface.
- Root `Cargo.toml`, `Cargo.lock`, `package.json`, `bun.lock`, `Justfile`, and `workspace.json` describe Cargo/Bun/Just
  orchestration. The workspace remains uncommitted; catalog presence is not evidence of release or target support.
- The selected `factory/linux-desktop` closure manifests and resolver, plus the verified .NET/PowerShell archive pins
  and pin refresh script, are present because `buncc` reads them directly. Bun OS package recipes and unrelated image
  profiles remain in the preserved archive.
- `buncc doctor --all` checks installed toolchains, locked Cargo metadata, and the root `workspace.json` catalog.
  Bun 1.4 native check/lint/fmt and host-only AOT static checks are exposed as workspace tasks. Missing optional AOT
  component metadata is reported as skipped rather than as an empty blocker set. All active Bun packages require Bun
  1.4.4 or newer; root quality tasks pin upstream `bun@1.4.4-canary.1` for built-in lint and AOT checks. Stable Bun
  1.4.4 does not provide `bun lint` or `bun check --aot`; the AOT check builds no executable. No workspace-wide nightly
  pin remains; the isolated WASM fixture test process selects its required nightly toolchain.

`cargo-xwin` and `cargo-zigbuild` are flattened workspace sources under `crates/` at their pinned upstream commits,
with MIT licenses retained. Their original Git history bundles and nested metadata are backed up outside the checkout
at `C:\src\migration-backups\yolo-cross-submodule-flatten`; their histories have not been imported into the parent
Git history. `cross-toolchains`, `manylinux-cross`, and `rust-musl-cross` remain submodules. The source checkout is
therefore flattened for the Cargo tool crates but does not have one Git history for every tool and image repository.

## Target intent

The inherited cross-rs target catalog lists Windows MSVC/GNU, Linux GNU/musl, Android ARM/ARM64/x86/x86_64, and
Emscripten targets. This catalog is not evidence that each lane builds on this checkout. The Android Gradle pipeline
can request API 37 (Android 17) through the consuming project's
`compileSdk` and `targetSdk`; the Rust ABI targets remain `aarch64-linux-android` and
`x86_64-linux-android` for 64-bit, with ARMv7/ARM32 entries also retained. Android 17 is API 37; install the matching
SDK/NDK to build Android applications. See the [Android 17 SDK setup](https://developer.android.com/about/versions/17/setup-sdk).

`bun-android` is intended to invoke Cargo from the root workspace. Its prior dependency on Bun OS's unrelated
workspace runtime was removed. Windows and Android native output still requires the corresponding platform SDKs and
toolchains.

The Chromium/Obscura wrapper plus Google/auth package closure were moved to `yolo-web` under `@yolo-web/*`; they are
not part of the cross compiler workspace. The only available CEF code was a Tauri v1 runtime/window/webview
implementation with GTK/X11 and sibling Tauri dependencies. It remains in the preserved archive until a Tauri-free
web runtime boundary is extracted; Tauri framework code belongs to `yolo-ui`.

The active Chromium ownership inventory was rechecked on 2026-11-04; see
[`chromium-ownership-2026-11-04.md`](chromium-ownership-2026-11-04.md). The
`@yolo-web/chromium` package is maintained in the sibling yolo-web workspace.
No duplicate Chromium package or catalog entry is present in this yolo-cross
checkout. Its GN/depot_tools provider and Chromium/MSVC host preflight remain
here because they prepare cross-platform build hosts and do not implement a
browser runtime.

The sibling `yolo-ai` workspace owns the extracted Rust AI/runtime boundary: `yolo-rag-core`, `yolo-toolcall`,
`yolo-model-client`, `yolo-agent-proto`, `yolo-rollout`, and `yolo-agent-engine`. Its first-party `yolo-agent-context`
implements the engine's bounded local `SystemPromptProvider`. The model client provides the Anthropic, Ollama,
OpenAI Chat/Responses, vLLM, and reranking adapters. Cross compilation must consume these existing interfaces when
needed; it must not add duplicate provider clients or turn loops. The workspace and source attribution are described
in [`yolo-ai/UPSTREAM-ATTRIBUTION.md`](../../../yolo-ai/UPSTREAM-ATTRIBUTION.md). Legacy Bun OS consumers have not
all been decoupled, and source extraction alone does not establish a complete migration.

No Aphrody app, CLI, MCP, infra, chat, or WebOS product is counted as successful YOLO migration. `C:\src\yolo-rs` is
only a local landing folder and currently has no imported Bun OS crate; the `yolo-rs` organization hosts separate
projects such as [`yolo-zig`](https://github.com/yolo-rs/yolo-zig). The `webos-wasm` copy is outside the active Bun
workspace; WebOS remains excluded from migration success.

The `packages/cli-wasm` copy packages the Aphrody `aphrody pure` product CLI and invokes product release scripts. It
was removed from the active Bun workspace and moved to `bun-os-archive/legacy-excluded/yolo-cross-cli-wasm`; the
original BunOS source remains intact. It is not part of the cross-compilation toolkit.

## Vendor and archive state

`vendor/bun-os-submodules.json` and `vendor/bun-os.gitmodules` preserve a source submodule inventory, URLs, and
available pinned revisions. Vendor repositories are not copied into this checkout; many are large upstream projects
and remain lazy references. This is not a complete `vendor/` tree. See [vendor/README.md](../../vendor/README.md).

The original checkout was moved intact to `C:\src\bun-os-archive` after the migrated workspace compiled. The former
`C:\src\bun-os` path is empty/absent. This archive preserves its thousands of local changes, private/local state,
desktop OS product, apps, kernel payloads, and unrelated packages; those components are not part of the active
cross-compilation workspace.

## Ownership split

Bun OS remains the distribution and image integration layer. YOLO is the current owner for reusable cross-platform
toolchains, standards, UI, web, reverse-engineering and developer tools. Aphrody is the legacy source and package
namespace. This follows the useful Linux/GNU ecosystem distinction: the kernel, a complete distribution, and portable
userland/developer projects have separate boundaries, without claiming YOLO is GNU or that either project is endorsed
by GNU or the Linux Foundation.

The detailed source inventory, keep/move/remove rules, migration gates, and upstream research references are in the
[Bun OS and YOLO boundary map](../../../bun-os-archive/docs/architecture/YOLO-OS-BOUNDARIES.md) in the preserved Bun OS
checkout. That link is local to this workstation; in published yolo-cross documentation, use the corresponding
canonical Bun OS repository URL after the repository transfer is completed.

GitHub ownership was checked on 2026-11-04: `aphrody-labs` has public repositories, while `yolo` exists but has no
public repositories yet. Public access to npm organization pages was unavailable, so `@yolo` registry access and
transfer rights are unverified. The active package identities are locally rebranded to `@yolo/*`; no package was
published and no GitHub repository or npm package transfer is claimed. Historical source URLs, author attribution,
and explicitly documented environment-variable fallbacks remain where they preserve provenance or compatibility.
