# GEMINI.md — YOLO Engine 6.0 (`C:\src\yolo-engine`)

> **Doctrine**: No Human In The Loop (NHITL) | Complete Unreal Engine 6 Replacement | 100% Rust 2024 + Upstream Bun v1.4.4+ + Zig 0.15+ + C11/C++20

## 1. Sovereign Identity & Unified Monorepo Topology
`C:\src\yolo-engine` is the canonical **YOLO Engine 6.0 (`UE6`)** monorepo unifying:
- **Unreal Engine 6 Directory Surface (`Engine/`)**:
  - [`Engine/Build/BatchFiles/`](file:///C:/src/yolo-engine/Engine/Build/BatchFiles) (`RunUAT`, `Build`, `Rebuild`, `Clean`) & [`Engine/Build/Commit.gitdeps.xml`](file:///C:/src/yolo-engine/Engine/Build/Commit.gitdeps.xml)
  - [`Engine/Config/BaseEngine.ini`](file:///C:/src/yolo-engine/Engine/Config/BaseEngine.ini), `BaseEditor.ini`, `BaseGame.ini`, `BaseInput.ini`, `BaseScalability.ini`
  - [`Engine/Source/Programs/UnrealBuildTool`](file:///C:/src/yolo-engine/Engine/Source/Programs/UnrealBuildTool/src/main.rs) (`ubt`), [`UnrealHeaderTool`](file:///C:/src/yolo-engine/Engine/Source/Programs/UnrealHeaderTool/src/main.rs) (`uht`), [`UnrealAutomationTool`](file:///C:/src/yolo-engine/Engine/Source/Programs/UnrealAutomationTool/src/main.rs) (`uat`)
  - [`Engine/Source/Runtime/Core/Public/UnrealEngine6Compat.hpp`](file:///C:/src/yolo-engine/Engine/Source/Runtime/Core/Public/UnrealEngine6Compat.hpp) (`UCLASS`, `USTRUCT`, `UPROPERTY`, `UFUNCTION`, `GENERATED_BODY`, `UObject`, `AActor`, `APawn`, `ACharacter`, `AGameModeBase`, `TArray`, `TMap`, `TObjectPtr`)
- **46 Sovereign `yolo-rs` Upstream Forks**:
  - [`Engine/Source/ThirdParty/yolo-rs-forks.json`](file:///C:/src/yolo-engine/Engine/Source/ThirdParty/yolo-rs-forks.json) & [`yolo-rs-forks.ts`](file:///C:/src/yolo-engine/Engine/Source/ThirdParty/yolo-rs-forks.ts): 6 `bevyengine` repos, `zed-industries/zed` (`GPUI`), 16 `storytold` Craft apps, `helix-editor/helix`, `tree-sitter/tree-sitter` (v0.27.2), 14 `rust-windowing` + `AccessKit` repos, and 7 `gfx-rs` (`wgpu` v30.0.1, `naga` v30.0.0) repos.
- **Absorbed Pillars (`yolo-re`, `yolo-cross`, `yolo-zig`)**:
  - `crates/re/*`, `packages/re/*`, `toolchains/re/*`, `scripts/re/*` (Ghidra MCP, `iced-x86`, binary triage, console emulators, `aphrody-nie-mcp`).
  - `crates/cross/*`, `packages/cross/*`, `toolchains/cross/*`, `scripts/cross/*` (`xwin`, `zigbuild`, GNU/MSVC cross-compilers, WinRT).
  - `crates/zig/*`, `toolchains/zig/*` (Bare-metal Zig 0.15+ SIMD C-ABI kernels).

## 2. Core Runtime Crates & Packages
1. **Epic Games Auth & EOS SDK**:
   - C11/C++20 Headers & Shim: [`Engine/Source/ThirdParty/EOSSDK/Include/eos_sdk.h`](file:///C:/src/yolo-engine/Engine/Source/ThirdParty/EOSSDK/Include/eos_sdk.h), [`eos_sdk.hpp`](file:///C:/src/yolo-engine/Engine/Source/ThirdParty/EOSSDK/Include/eos_sdk.hpp)
   - Rust FFI & OAuth2 Client: [`Engine/Source/ThirdParty/EOSSDK/epic-games-eos-sys/src/lib.rs`](file:///C:/src/yolo-engine/Engine/Source/ThirdParty/EOSSDK/epic-games-eos-sys/src/lib.rs), [`Engine/Source/Runtime/epic-games-auth/src/lib.rs`](file:///C:/src/yolo-engine/Engine/Source/Runtime/epic-games-auth/src/lib.rs)
   - TypeScript/Bun SDK: [`packages/epic-games-sdk/src/index.ts`](file:///C:/src/yolo-engine/packages/epic-games-sdk/src/index.ts)
2. **Reverse-Engineering & Game Porters (`Criware`, `Level-5 nie*`, `Bandai Namco UE4/5/6`)**:
   - [`Engine/Source/Runtime/yolo-engine-re-game-porters/src/lib.rs`](file:///C:/src/yolo-engine/Engine/Source/Runtime/yolo-engine-re-game-porters/src/lib.rs): `.cpk` (`CPK ` + `@UTF` + XOR decrypt), `CRILAYLA` LZ decompression, `.usm`, `.acb`/`.awb`, Level-5 `.g4tx` (`NXTCH` Tegra X1 deswizzle), `.g4mg`/`.g4sk`, `.cfg.bin` (`RDBN`/`T2B`), Bandai Namco `.pak`/`.utoc`/`.ucas` + DXBC/DXIL/SPIR-V to Naga WGSL, and 100% offline DRM-free ownership verification (`FOfflineGameOwnershipReceipt`).
3. **11-Platform SDKs, 8-Channel Store Publisher, 15 UE5/UE6 File Formats, Blueprint VM & FFI**:
   - [`Engine/Source/Runtime/yolo-engine-platforms-blueprints-ffi/src/lib.rs`](file:///C:/src/yolo-engine/Engine/Source/Runtime/yolo-engine-platforms-blueprints-ffi/src/lib.rs):
     - **11 Platforms**: `NintendoDs` (`.nds`), `NintendoWii` (`.dol`/`.rvz`), `NintendoSwitch` (`.nro`/`.nso`/`.nsp`), `PlayStation1And2` (`.psx`/`.elf`/`.iso`), `PlayStation5` (`.self`/`.pkg`), `XboxSeriesXS` (`.msixvc`/`.xvc`), `PcDesktop` (`.exe`/`.elf`/`.app`), `MobileAndroid` (`.aab`/`.apk`), `MobileIos` (`.ipa`), `WebBrowserWebGpu` (`.wasm` + `.cpk.r2`), `ChromeWebStoreExtension` (`.crx` Manifest V3 WebGPU + live binary/asset patcher).
     - **8 Store & Registry Publishers**: Microsoft Store (`MSIXVC`), Google Play Store (`AAB`), Chrome Web Store (`CRX3`), Flatpak (`Flathub`), Nix Flakes (`flake.nix`), Bun Registry, Crates.io, and Self-Hosted Game Website (`yolo-dokploy` + `yolo-traefik` v3).
     - **Blueprint (`Kismet`) VM & C-ABI FFI**: `FBlueprintGraph::compile_to_rust_bevy_system`, `ue6_ffi_bevy_world_create`, `ue6_ffi_bevy_spawn_actor`, `ue6_ffi_kismet_execute_blueprint_node`, `ue6_ffi_platform_sdk_count`, `ue6_ffi_bevy_world_destroy`.
4. **Universal Bun Bundler Plugin (`@yolo-rs/bun-plugin-yolo-engine`)**:
   - [`packages/bun-plugin-yolo-engine/src/index.ts`](file:///C:/src/yolo-engine/packages/bun-plugin-yolo-engine/src/index.ts) (preloaded via [`bunfig.toml`](file:///C:/src/yolo-engine/bunfig.toml)): 20 `yolo:*` virtual modules and custom loaders for `.wgsl`/`.hlsl`/`.glsl`, `.gltf`/`.glb`/`.obj`/`.fbx`/`.uasset`/`.umap`, `.ktx2`/`.dds`/`.hdr`, `.mp4`/`.webm`/`.usm`/`.cpk`/`.g4tx`/`.g4mg`, `.nds`/`.dol`/`.rvz`/`.nro`/`.nsp`/`.psx`/`.pkg`/`.xvc`/`.crx`, `.dll`/`.so`/`.dylib`, and `.verse`/`.hx`.

## 3. Standard Commands & VPS Build Hub
- **Rust Tests**: `cargo test --workspace`
- **Bun Tests**: `bun run test`
- **Typecheck**: `bun check`
- **VPS Lightweight UE6 Clone Sync (`ssh vps`)**: `bun run deploy/vps/sync-ue6-vps.ts` (`/srv/build/sources/unreal-engine-6-lite`)
