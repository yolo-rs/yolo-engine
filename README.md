# YOLO Engine 6.0 (`++UE6+Release-6.0-YoloEngine`) — Official Architecture & Reference Manual

`yolo-engine` (`C:\src\yolo-engine` -> `https://github.com/yolo-rs/yolo-engine`) is a complete, bare-metal Rust 2024 and Bun v1.4.4+ replacement for **Epic Games' Unreal Engine 6 (`UE6`)**. It strictly mirrors Unreal Engine's directory structure (`Engine/Build`, `Engine/Config`, `Engine/Shaders`, `Engine/Plugins`, `Engine/Source/{Runtime,Editor,Developer,Programs,ThirdParty}`), configuration hierarchy (`DefaultEngine.ini`, `DefaultEditor.ini`, `DefaultGame.ini`, `DefaultInput.ini`), build tooling (`UnrealBuildTool`, `UnrealHeaderTool`, `UnrealAutomationTool`, `GitDependencies`), and Git versioning discipline while replacing legacy C++/Slate/HLSL internals with the 7 sovereign Rust ecosystems forked into `yolo-rs/*`.

---

## 1. The 7 Foundational Ecosystems Forked in `yolo-rs/*`

| Unreal Engine 6 Subsystem | Legacy UE5/UE6 C++ Stack | `yolo-engine` 6.0 Replacement (`yolo-rs/*` Forks) |
| :--- | :--- | :--- |
| **`Core` / `CoreUObject` / `Engine` / `MassEntity`** | `UObject`, `AActor`, `UActorComponent`, `FTaskGraphInterface`, Verse VM | **[`yolo-rs/bevy`](https://github.com/yolo-rs/bevy)** (`bevyengine/*` top repositories) + `yolo-engine-core` (`UWorld`, `UClassDescriptor`, Verse transactional TaskGraph) |
| **`Slate` / `SlateCore` / `UnrealEd` Shell** | C++ Slate immediate/retained widget tree | **[`yolo-rs/zed`](https://github.com/yolo-rs/zed)** (GPUI 0.8 + Taffy 0.15 + WGPU 120 FPS hardware-accelerated dockable tabs) |
| **`ModelingToolsEditorMode` / `ControlRig` / `Substrate`** | External DCC roundtrip (Maya / ZBrush / Substance) + Modeling Mode | **[`yolo-rs/artcraft`](https://github.com/yolo-rs/artcraft)** (`storytold/*` — in-viewport 3D Sculpting, Voxel CSG/Remesh, Quad Retopology, Skeletal Auto-Rigging, PBR Layer Painting) |
| **`LiveCoding` / `SourceCodeAccess` / Blueprint Text** | External Visual Studio / Rider C++ rebuilds | **[`yolo-rs/helix`](https://github.com/yolo-rs/helix)** (`helix-editor/helix` — modal rope buffer, multi-cursor selection-first editing embedded in `UnrealEd`) |
| **`UnrealHeaderTool` / `AssetRegistry` / `ReferenceViewer`** | Custom C++ header parser + asset reference DB | **[`yolo-rs/tree-sitter`](https://github.com/yolo-rs/tree-sitter)** (`v0.27.2` 30 grammars) + **Graphify `v0.9.104`** (24-worker incremental AST & dependency graph) |
| **`ApplicationCore` / `GenericWindow` / `EnhancedInput`** | Win32 / Cocoa / SDL platform window wrappers | **[`yolo-rs/winit`](https://github.com/yolo-rs/winit)**, **`yolo-rs/raw-window-handle`**, **`yolo-rs/glutin`**, **`yolo-rs/softbuffer`**, **`yolo-rs/accesskit`** (`rust-windowing/*`) |
| **`RHI` / `RenderCore` / `Renderer` (`Nanite` + `Lumen`)** | D3D12RHI / VulkanRHI / MetalRHI + DXC HLSL | **[`yolo-rs/wgpu`](https://github.com/yolo-rs/wgpu)** (`v30.0.1`) + **[`yolo-rs/naga`](https://github.com/yolo-rs/naga)** (`v30.0.0`) (`gfx-rs/*` — WGSL/SPIR-V/DXIL/MSL compute meshlets & ray-tracing) |

---

## 2. Canonical Directory Structure (`C:\src\yolo-engine`)

```text
C:\src\yolo-engine\
├── Cargo.toml                                      # Rust 2024 Workspace (Edition 2024, Resolver 3, sccache)
├── package.json                                    # Bun 1.4.4+ Scripts (UBT, UHT, UAT, MCP, R2 CPK Stream)
├── Engine/
│   ├── Build/
│   │   ├── Build.version                           # ++UE6+Release-6.0-YoloEngine (CL 20261108)
│   │   └── Commit.gitdeps.xml                      # Unreal GitDependencies XML manifest
│   ├── Config/
│   │   ├── DefaultEngine.ini                       # Nanite, Lumen, VSM, TSR, WGPU RHI & EOS settings
│   │   ├── DefaultEditor.ini                       # Zed GPUI 120Hz, Helix Modal, Tree-Sitter & Artcraft DCC
│   │   ├── DefaultGame.ini                         # Project identity & licensing
│   │   └── DefaultInput.ini                        # Rust-Windowing winit + AccessKit + Helix modal bindings
│   ├── Shaders/
│   │   └── Private/
│   │       ├── NaniteClusterCull.wgsl              # GPU-driven meshlet cluster & LOD screen-space culling
│   │       └── LumenScreenProbeGather.wgsl         # Dynamic GI radiance probe gather compute shader
│   ├── Plugins/                                    # Modular Engine & Editor plugins (.uplugin equivalents)
│   └── Source/
│       ├── Runtime/
│       │   ├── yolo-engine-core/                   # Core, CoreUObject Reflection, UWorld, Bevy ECS, Winit
│       │   ├── yolo-engine-render/                 # RHI (WGPU 30), Naga Shader Compiler, Nanite & Lumen
│       │   └── yolo-engine-online/                 # NetCore, Iris Replication, EOS, EAC & R2 IoStore (.cpk)
│       ├── Editor/
│       │   └── yolo-engine-editor/                 # UnrealEd 6.0 (Zed GPUI 0.8 + Artcraft + Helix + Tree-Sitter)
│       ├── Programs/
│       │   ├── cli.ts                              # UnrealBuildTool (UBT), UHT, GitDeps & 35 MCP Skills CLI
│       │   └── cli.test.ts                         # Automated test suite for UBT/UHT/MCP/Config
│       └── ThirdParty/
│           └── yolo-rs-forks.json                  # Exact pinned commits & metadata of all yolo-rs/* forks
├── packages/
│   └── yolo-cpk-stream/                            # Cloudflare R2 60GB IoStore / .cpk HTTP Range streamer
└── deploy/
    ├── docker/                                     # Containerized dedicated server & PixelStreaming2
    ├── k8s/                                        # Kubernetes Triad autoscaling manifests
    └── streaming/                                  # WebRTC / Sunshine / Moonlight / Gamescope orchestrator
```

---

## 3. Build Tools & Git Versioning Best Practices

### 3.1 `UnrealBuildTool` (`UBT`), `UnrealHeaderTool` (`UHT`) & `UnrealAutomationTool` (`UAT`)
- **Inspect Engine Version & ThirdParty Forks**:
  ```bash
  bun Engine/Source/Programs/cli.ts status
  ```
- **Run `UnrealBuildTool` (`UBT`) Build Plan**:
  ```bash
  bun Engine/Source/Programs/cli.ts ubt YoloEditor Win64 Shipping
  ```
- **Run `UnrealHeaderTool` (`UHT`) Reflection Audit**:
  ```bash
  bun Engine/Source/Programs/cli.ts uht
  ```
- **Compile & Test All Rust Runtime/Editor Modules + Bun Programs**:
  ```bash
  cargo test --workspace && bun test
  ```

### 3.2 Unreal Engine Git & Versioning Best Practices
1. **Stream & Changelist Discipline (`Engine/Build/Build.version`)**: Every commit on `main` maps to a deterministic Changelist (`CL-20261108`) on stream `++UE6+Release-6.0-YoloEngine`.
2. **One File Per Actor (`OFPA`) & Text-First Metadata**: Level actors, `Default*.ini` configs, and shader graphs are stored in deterministic UTF-8 text (`core.eol=lf`, `merge.conflictStyle=zdiff3`) so Git 3-way merges never require exclusive binary file locks.
3. **Zero-Bloat Binary Asset Streaming (`Commit.gitdeps.xml` + Cloudflare R2 `IoStore`)**: Large binary `.uasset` / `.utoc` / `.ucas` / `.cpk` payloads (up to 60GB+) are never committed into `.git/objects`; they are content-addressed by BLAKE3 hash and streamed on demand via HTTP `Range` from Cloudflare R2 (`yolo-engine-online::format_r2_iostore_range_header`).
4. **Git Scalar & Kernel.org Tuning**: `feature.manyFiles=true`, `index.version=4`, `core.fsmonitor=true`, `commitGraph.changedPaths=true`, and `rerere.enabled=true` are active by default.

---

## 4. Matrix of 35 Unreal Engine 6 MCP Skills (`bun Engine/Source/Programs/cli.ts mcp`)

All 35 skills are exposed via `UNREAL_MCP_SKILLS_MATRIX` in [`Engine/Source/Programs/cli.ts`](file:///C:/src/yolo-engine/Engine/Source/Programs/cli.ts):
- **`world-ecs` (5 skills)**: `ue6.world.spawn_actor`, `ue6.world.query_archetypes`, `ue6.world.partition_stream`, `ue6.verse.eval_transaction`, `ue6.uht.inspect_uclass`.
- **`rendering-rhi` (5 skills)**: `ue6.render.nanite_cull_audit`, `ue6.render.lumen_probe_trace`, `ue6.render.naga_compile_shader`, `ue6.render.vsm_shadow_atlas`, `ue6.render.tsr_upscale_profile`.
- **`artcraft-dcc` (5 skills)**: `ue6.artcraft.sculpt_brush`, `ue6.artcraft.voxel_remesh`, `ue6.artcraft.quad_retopology`, `ue6.artcraft.skeletal_autorig`, `ue6.artcraft.pbr_texture_paint`.
- **`unrealed-gpui` (5 skills)**: `ue6.editor.gpui_dock_layout`, `ue6.editor.winit_window_surface`, `ue6.editor.accesskit_tree`, `ue6.editor.sequencer_cinematic`, `ue6.editor.niagara_gpu_sim`.
- **`helix-treesitter` (5 skills)**: `ue6.code.helix_modal_exec`, `ue6.code.treesitter_parse`, `ue6.code.graphify_update`, `ue6.code.graphify_query_path`, `ue6.code.hot_reload_rust_dylib`.
- **`physics-animation` (5 skills)**: `ue6.physics.rigid_body_step`, `ue6.physics.raycast_query`, `ue6.anim.pose_blend_ik`, `ue6.audio.metasound_graph`, `ue6.ai.mass_crowd_navmesh`.
- **`networking-eos-r2` (5 skills)**: `ue6.net.iris_replicate_delta`, `ue6.net.eos_session_matchmake`, `ue6.net.eac_attest_client`, `ue6.pak.r2_iostore_stream`, `ue6.cloud.pixel_streaming_webrtc`.
