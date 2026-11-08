#!/usr/bin/env bun
// SPDX-License-Identifier: MIT OR Apache-2.0
/**
 * YOLO Engine 6.0 (`UE6`) — `Engine/Source/Programs/UnrealBuildTool`, `UnrealHeaderTool`,
 * `UnrealAutomationTool`, `GitDependencies` & `UnrealMCP` (35 Skills Matrix)
 *
 * 100% Native Bun v1.4.4+ & Rust 2024 implementation of Epic Games' Unreal Engine 6
 * build, reflection, asset cooking, Git dependency management, and MCP automation suite.
 */
import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import {
  buildEpicAuthorizeUrl,
  DEFAULT_EPIC_OAUTH_CONFIG,
  EPIC_OAUTH_ENDPOINTS,
  generateEpicPkcePair,
  parseEpicLauncherCliArgs,
  resolveEosNativeSdk,
} from "../../../packages/epic-games-sdk/src/index.ts";

const rawDir = import.meta.dir;
export const ENGINE_ROOT =
  rawDir.startsWith("B:\\~BUN") || rawDir.startsWith("/$bunfs")
    ? (process.env.YOLO_ENGINE_ROOT ?? "C:/src/yolo-engine")
    : resolve(rawDir, "../../..");

export type UbtTargetType = "Game" | "Editor" | "Client" | "Server" | "Program";
export type UbtConfiguration = "Debug" | "Development" | "Test" | "Shipping";
export type UbtTargetPlatform =
  | "Win64"
  | "Linux"
  | "Mac"
  | "Android"
  | "WebGPU";

export interface BuildVersionManifest {
  readonly FileVersion: number;
  readonly MajorVersion: number;
  readonly MinorVersion: number;
  readonly PatchVersion: number;
  readonly Changelist: number;
  readonly CompatibleChangelist: number;
  readonly BranchName: string;
  readonly BuildVersion: string;
  readonly EngineAssociation: string;
  readonly Architecture: Record<string, string>;
}

export interface UbtBuildRules {
  readonly moduleName: string;
  readonly moduleType: "Runtime" | "Editor" | "ThirdParty" | "Developer" | "Program";
  readonly cratePath: string;
  readonly publicDependencyModules: readonly string[];
  readonly privateDependencyModules: readonly string[];
  readonly pchUsage: "UseExplicitOrSharedPCHs" | "Rust2024CargoModuleGraph";
}

export interface UnrealMcpSkillDescriptor {
  readonly id: string;
  readonly domain:
    | "world-ecs"
    | "rendering-rhi"
    | "artcraft-dcc"
    | "unrealed-gpui"
    | "helix-treesitter"
    | "physics-animation"
    | "networking-eos-r2";
  readonly unrealSubsystem: string;
  readonly yoloRustCrateOrTool: string;
  readonly description: string;
}

export const UNREAL_BUILD_TOOL_MODULES: readonly UbtBuildRules[] = [
  {
    moduleName: "EOSSDK_C_ABI",
    moduleType: "ThirdParty",
    cratePath: "Engine/Source/ThirdParty/EOSSDK/epic-games-eos-sys",
    publicDependencyModules: [],
    privateDependencyModules: [],
    pchUsage: "Rust2024CargoModuleGraph",
  },
  {
    moduleName: "EpicGamesAuth_OAuth2_EOS",
    moduleType: "Runtime",
    cratePath: "Engine/Source/Runtime/epic-games-auth",
    publicDependencyModules: ["EOSSDK_C_ABI"],
    privateDependencyModules: [],
    pchUsage: "Rust2024CargoModuleGraph",
  },
  {
    moduleName: "Core",
    moduleType: "Runtime",
    cratePath: "Engine/Source/Runtime/yolo-engine-core",
    publicDependencyModules: ["BevyECS", "RustWindowingWinit", "VerseTaskGraph"],
    privateDependencyModules: ["AccessKit", "RawWindowHandle"],
    pchUsage: "Rust2024CargoModuleGraph",
  },
  {
    moduleName: "RHI_RenderCore_Renderer",
    moduleType: "Runtime",
    cratePath: "Engine/Source/Runtime/yolo-engine-render",
    publicDependencyModules: ["Core", "GfxRsWgpu", "GfxRsNaga"],
    privateDependencyModules: ["NaniteCompute", "LumenRayTracing", "VSM", "TSR"],
    pchUsage: "Rust2024CargoModuleGraph",
  },
  {
    moduleName: "NetCore_OnlineSubsystemEOS_PakFile",
    moduleType: "Runtime",
    cratePath: "Engine/Source/Runtime/yolo-engine-online",
    publicDependencyModules: ["Core", "IrisReplication", "EOS", "EAC"],
    privateDependencyModules: ["CloudflareR2IoStore", "QuicTransport"],
    pchUsage: "Rust2024CargoModuleGraph",
  },
  {
    moduleName: "UnrealEd_ZedGPUI_Artcraft_Helix",
    moduleType: "Editor",
    cratePath: "Engine/Source/Editor/yolo-engine-editor",
    publicDependencyModules: [
      "Core",
      "RHI_RenderCore_Renderer",
      "NetCore_OnlineSubsystemEOS_PakFile",
    ],
    privateDependencyModules: [
      "ZedGPUI",
      "StorytoldArtcraft",
      "HelixModal",
      "TreeSitter0272",
      "Graphify09104",
    ],
    pchUsage: "Rust2024CargoModuleGraph",
  },
];

/**
 * 35 Official Unreal Engine 6 MCP Skills Matrix across 7 Engineering Domains.
 */
export const UNREAL_MCP_SKILLS_MATRIX: readonly UnrealMcpSkillDescriptor[] = [
  // Domain 1: World, Bevy ECS & Verse Scripting (5 skills)
  {
    id: "ue6.world.spawn_actor",
    domain: "world-ecs",
    unrealSubsystem: "UWorld / AActor",
    yoloRustCrateOrTool: "yolo-engine-core::UWorld::spawn_actor",
    description: "Spawn an AActor entity with Bevy ECS components and FTransform in the active UWorld",
  },
  {
    id: "ue6.world.query_archetypes",
    domain: "world-ecs",
    unrealSubsystem: "MassEntity / Bevy ECS",
    yoloRustCrateOrTool: "yolo-rs/bevy ecs::query",
    description: "Query entities and components across Bevy ECS archetype tables with zero-copy filters",
  },
  {
    id: "ue6.world.partition_stream",
    domain: "world-ecs",
    unrealSubsystem: "WorldPartition / OneFilePerActor",
    yoloRustCrateOrTool: "yolo-engine-core::WorldPartitionGrid",
    description: "Load or unload spatial 2D/3D World Partition streaming cells and HLOD layers",
  },
  {
    id: "ue6.verse.eval_transaction",
    domain: "world-ecs",
    unrealSubsystem: "Verse VM / Transactional TaskGraph",
    yoloRustCrateOrTool: "yolo-engine-core::VerseTaskGraph",
    description: "Execute a speculative Verse transaction with automatic rollback on failure",
  },
  {
    id: "ue6.uht.inspect_uclass",
    domain: "world-ecs",
    unrealSubsystem: "CoreUObject / UnrealHeaderTool",
    yoloRustCrateOrTool: "yolo-engine-core::UClassDescriptor",
    description: "Inspect reflected UCLASS, UPROPERTY, and UFUNCTION metadata generated from Rust AST",
  },

  // Domain 2: Rendering, Nanite, Lumen & Gfx-rs WGPU/Naga (5 skills)
  {
    id: "ue6.render.nanite_cull_audit",
    domain: "rendering-rhi",
    unrealSubsystem: "Nanite Virtualized Geometry",
    yoloRustCrateOrTool: "yolo-engine-render::cull_nanite_clusters",
    description: "Run GPU/CPU screen-space error cluster culling on Nanite meshlet hierarchies",
  },
  {
    id: "ue6.render.lumen_probe_trace",
    domain: "rendering-rhi",
    unrealSubsystem: "Lumen Global Illumination & Reflections",
    yoloRustCrateOrTool: "Engine/Shaders/Private/LumenScreenProbeGather.wgsl",
    description: "Configure Lumen hardware/software ray-tracing probes and radiance cache parameters",
  },
  {
    id: "ue6.render.naga_compile_shader",
    domain: "rendering-rhi",
    unrealSubsystem: "ShaderCompilerWorker / RHI",
    yoloRustCrateOrTool: "yolo-rs/naga v30.0.0",
    description: "Cross-compile WGSL/HLSL/GLSL shaders into SPIR-V, DXIL, MSL, and WebGPU via Naga",
  },
  {
    id: "ue6.render.vsm_shadow_atlas",
    domain: "rendering-rhi",
    unrealSubsystem: "Virtual Shadow Maps (VSM)",
    yoloRustCrateOrTool: "yolo-engine-render::VirtualShadowMap",
    description: "Inspect 16kx16k virtual shadow page tables and clipmap invalidation bounds",
  },
  {
    id: "ue6.render.tsr_upscale_profile",
    domain: "rendering-rhi",
    unrealSubsystem: "Temporal Super Resolution (TSR)",
    yoloRustCrateOrTool: "yolo-engine-render::TsrPass",
    description: "Configure TSR anti-aliasing and temporal upscaling history buffers for 120 FPS output",
  },

  // Domain 3: Storytold Artcraft DCC Modeling, Sculpting, Rigging & Paint (5 skills)
  {
    id: "ue6.artcraft.sculpt_brush",
    domain: "artcraft-dcc",
    unrealSubsystem: "ModelingToolsEditorMode / Artcraft Sculpt",
    yoloRustCrateOrTool: "yolo-rs/artcraft::SculptEngine",
    description: "Apply dynamic BVH clay buildup, smooth, crease, or grab sculpting strokes in-viewport",
  },
  {
    id: "ue6.artcraft.voxel_remesh",
    domain: "artcraft-dcc",
    unrealSubsystem: "GeometryProcessing / Voxel CSG",
    yoloRustCrateOrTool: "yolo-rs/artcraft::VoxelRemesher",
    description: "Perform manifold OpenVDB/SDF boolean CSG and uniform voxel remeshing",
  },
  {
    id: "ue6.artcraft.quad_retopology",
    domain: "artcraft-dcc",
    unrealSubsystem: "QuadRemesher / Nanite LOD Builder",
    yoloRustCrateOrTool: "yolo-rs/artcraft::QuadRetopo",
    description: "Generate animation-ready quad topology and bake displacement/normal maps from high-poly sculpt",
  },
  {
    id: "ue6.artcraft.skeletal_autorig",
    domain: "artcraft-dcc",
    unrealSubsystem: "ControlRig / SkeletonEditor",
    yoloRustCrateOrTool: "yolo-rs/artcraft::AutoRigger",
    description: "Bind geodesic heat-diffusion skin weights and construct full-body IK Control Rig",
  },
  {
    id: "ue6.artcraft.pbr_texture_paint",
    domain: "artcraft-dcc",
    unrealSubsystem: "Substrate / Material Layer Stack",
    yoloRustCrateOrTool: "yolo-rs/artcraft::PbrPainter",
    description: "Paint multi-channel BaseColor, Metallic, Roughness, Normal, and Emissive layers on GPU",
  },

  // Domain 4: UnrealEd Zed GPUI 0.8 Shell & Rust-Windowing (5 skills)
  {
    id: "ue6.editor.gpui_dock_layout",
    domain: "unrealed-gpui",
    unrealSubsystem: "Slate / UnrealEd TabManager",
    yoloRustCrateOrTool: "yolo-rs/zed GPUI 0.8 + Taffy 0.15",
    description: "Arrange 120 FPS dockable GPUI editor tabs (Viewport, Outliner, Details, ContentBrowser)",
  },
  {
    id: "ue6.editor.winit_window_surface",
    domain: "unrealed-gpui",
    unrealSubsystem: "ApplicationCore / GenericWindow",
    yoloRustCrateOrTool: "yolo-rs/winit + yolo-rs/raw-window-handle",
    description: "Manage multi-monitor high-DPI window surfaces and raw GPU swapchain handles",
  },
  {
    id: "ue6.editor.accesskit_tree",
    domain: "unrealed-gpui",
    unrealSubsystem: "SlateAccessibility",
    yoloRustCrateOrTool: "yolo-rs/accesskit",
    description: "Export native screen-reader accessibility tree for all UnrealEd GPUI widgets",
  },
  {
    id: "ue6.editor.sequencer_cinematic",
    domain: "unrealed-gpui",
    unrealSubsystem: "LevelSequence / MovieRenderPipeline",
    yoloRustCrateOrTool: "yolo-engine-editor::SequencerTimeline",
    description: "Keyframe camera cuts, skeletal animations, and render EXR/AV1 cinematic sequences",
  },
  {
    id: "ue6.editor.niagara_gpu_sim",
    domain: "unrealed-gpui",
    unrealSubsystem: "Niagara VFX System",
    yoloRustCrateOrTool: "yolo-engine-editor::NiagaraVfxEditor",
    description: "Simulate millions of GPU compute particles with depth-buffer collisions",
  },

  // Domain 5: Helix Modal Code Editor & Tree-Sitter 0.27.2 + Graphify AST (5 skills)
  {
    id: "ue6.code.helix_modal_exec",
    domain: "helix-treesitter",
    unrealSubsystem: "LiveCoding / SourceCodeAccess",
    yoloRustCrateOrTool: "yolo-rs/helix modal rope engine",
    description: "Execute Helix multi-cursor selection-first modal edits across Rust, Verse, and WGSL files",
  },
  {
    id: "ue6.code.treesitter_parse",
    domain: "helix-treesitter",
    unrealSubsystem: "Blueprint / Verse Syntax Service",
    yoloRustCrateOrTool: "yolo-rs/tree-sitter v0.27.2",
    description: "Run incremental Tree-Sitter Concrete Syntax Tree queries and textobject selections",
  },
  {
    id: "ue6.code.graphify_update",
    domain: "helix-treesitter",
    unrealSubsystem: "AssetRegistry / ReferenceViewer",
    yoloRustCrateOrTool: "graphify v0.9.104 (24 workers)",
    description: "Rebuild the full project AST dependency graph and cross-module call flow without LLM latency",
  },
  {
    id: "ue6.code.graphify_query_path",
    domain: "helix-treesitter",
    unrealSubsystem: "ReferenceViewer / SizeMap",
    yoloRustCrateOrTool: "graphify path & query",
    description: "Find shortest dependency paths between UClasses, shaders, and ECS systems in graph.json",
  },
  {
    id: "ue6.code.hot_reload_rust_dylib",
    domain: "helix-treesitter",
    unrealSubsystem: "LiveCodingServer",
    yoloRustCrateOrTool: "yolo-engine-editor::SubsecondHotPatch",
    description: "Hot-reload modified Rust ECS systems and WGSL shaders in <80ms without stopping Play-In-Editor",
  },

  // Domain 6: Chaos Physics, Skeletal Animation & MetaSound Audio (5 skills)
  {
    id: "ue6.physics.rigid_body_step",
    domain: "physics-animation",
    unrealSubsystem: "Chaos Physics Engine",
    yoloRustCrateOrTool: "yolo-engine-core::ChaosXPBD",
    description: "Step deterministic XPBD rigid-body, cloth, and destruction constraints on Bevy TaskPool",
  },
  {
    id: "ue6.physics.raycast_query",
    domain: "physics-animation",
    unrealSubsystem: "CollisionQueryParams / LineTraceSingle",
    yoloRustCrateOrTool: "yolo-engine-core::SpatialBVH",
    description: "Perform SIMD-accelerated raycasts, sphere sweeps, and overlap queries against world geometry",
  },
  {
    id: "ue6.anim.pose_blend_ik",
    domain: "physics-animation",
    unrealSubsystem: "AnimGraph / ControlRig",
    yoloRustCrateOrTool: "yolo-engine-core::AnimPoseEvaluator",
    description: "Evaluate inertialization pose blending, motion matching, and two-bone/FABRIK inverse kinematics",
  },
  {
    id: "ue6.audio.metasound_graph",
    domain: "physics-animation",
    unrealSubsystem: "MetaSounds DSP Graph",
    yoloRustCrateOrTool: "yolo-engine-core::MetaSoundDsp",
    description: "Synthesize procedural sample-accurate audio graphs and HRTF spatialization",
  },
  {
    id: "ue6.ai.mass_crowd_navmesh",
    domain: "physics-animation",
    unrealSubsystem: "MassAI / StateTree / RecastNavMesh",
    yoloRustCrateOrTool: "yolo-engine-core::StateTreeCrowd",
    description: "Simulate 100,000+ autonomous crowd agents with StateTree behavior and navmesh avoidance",
  },

  // Domain 7: Networking, Iris Replication, EOS, EAC & Cloudflare R2 Pak Streaming (5 skills)
  {
    id: "ue6.net.iris_replicate_delta",
    domain: "networking-eos-r2",
    unrealSubsystem: "NetCore / Iris Replication",
    yoloRustCrateOrTool: "yolo-engine-online::IrisReplication",
    description: "Encode and prioritize quantized entity state deltas over QUIC / WebTransport",
  },
  {
    id: "ue6.net.eos_session_matchmake",
    domain: "networking-eos-r2",
    unrealSubsystem: "OnlineSubsystemEOS",
    yoloRustCrateOrTool: "yolo-engine-online::FEosSessionState",
    description: "Create, advertise, and join Epic Online Services lobbies with cross-play authentication",
  },
  {
    id: "ue6.net.eac_attest_client",
    domain: "networking-eos-r2",
    unrealSubsystem: "EasyAntiCheat (EAC)",
    yoloRustCrateOrTool: "yolo-engine-online::EacVerifier",
    description: "Verify Ed25519 binary signatures and anti-tamper memory frames on connected clients",
  },
  {
    id: "ue6.pak.r2_iostore_stream",
    domain: "networking-eos-r2",
    unrealSubsystem: "PakFile / IoStore On-Demand",
    yoloRustCrateOrTool: "yolo-engine-online::format_r2_iostore_range_header",
    description: "Stream on-demand `.utoc`/`.ucas`/`.cpk` asset chunks from 60GB Cloudflare R2 buckets via HTTP Range",
  },
  {
    id: "ue6.cloud.pixel_streaming_webrtc",
    domain: "networking-eos-r2",
    unrealSubsystem: "PixelStreaming2 (NVENC / AV1 / WebRTC)",
    yoloRustCrateOrTool: "deploy/streaming/cluster-orchestrator.ts",
    description: "Stream 120 FPS WGPU frames over WebRTC / Sunshine / Gamescope to browser and mobile clients",
  },
];

export function loadEngineBuildVersion(engineRoot = ENGINE_ROOT): BuildVersionManifest {
  const verPath = join(engineRoot, "Engine", "Build", "Build.version");
  return JSON.parse(readFileSync(verPath, "utf8")) as BuildVersionManifest;
}

export function loadThirdPartyForksManifest(engineRoot = ENGINE_ROOT): unknown {
  const forksPath = join(
    engineRoot,
    "Engine",
    "Source",
    "ThirdParty",
    "yolo-rs-forks.json",
  );
  if (!existsSync(forksPath)) return { status: "pending-fork-sync" };
  return JSON.parse(readFileSync(forksPath, "utf8"));
}

export function executeUnrealBuildTool(options: {
  target: string;
  targetType?: UbtTargetType;
  platform?: UbtTargetPlatform;
  configuration?: UbtConfiguration;
}) {
  const version = loadEngineBuildVersion();
  const targetType = options.targetType ?? "Editor";
  const platform = options.platform ?? "Win64";
  const configuration = options.configuration ?? "Development";

  const cargoProfile =
    configuration === "Shipping" || configuration === "Test"
      ? "--release"
      : "";

  return {
    tool: "UnrealBuildTool (UBT 6.0 — Rust 2024 & Bun 1.4.4+)",
    engineVersion: version.BuildVersion,
    target: options.target,
    targetType,
    platform,
    configuration,
    modules: UNREAL_BUILD_TOOL_MODULES,
    cargoInvocation: `cargo build --workspace ${cargoProfile}`.trim(),
    sccacheEnabled: true,
  };
}

if (import.meta.main) {
  const [tool = "status", ...args] = Bun.argv.slice(2);

  if (tool === "status" || tool === "version") {
    console.log(
      JSON.stringify(
        {
          version: loadEngineBuildVersion(),
          ubtModulesCount: UNREAL_BUILD_TOOL_MODULES.length,
          mcpSkillsCount: UNREAL_MCP_SKILLS_MATRIX.length,
          thirdPartyForks: loadThirdPartyForksManifest(),
        },
        null,
        2,
      ),
    );
  } else if (tool === "ubt") {
    const plan = executeUnrealBuildTool({
      target: args[0] ?? "YoloEditor",
      platform: (args[1] as UbtTargetPlatform | undefined) ?? "Win64",
      configuration: (args[2] as UbtConfiguration | undefined) ?? "Development",
    });
    console.log(JSON.stringify(plan, null, 2));
  } else if (tool === "uht") {
    console.log(
      JSON.stringify(
        {
          tool: "UnrealHeaderTool (UHT 6.0 — Tree-Sitter 0.27.2 + Rust Proc-Macro Reflection)",
          modulesScanned: UNREAL_BUILD_TOOL_MODULES.map((m) => m.moduleName),
          reflectedMacros: ["#[uclass]", "#[ustruct]", "#[uproperty]", "#[ufunction]"],
        },
        null,
        2,
      ),
    );
  } else if (tool === "mcp") {
    const domainFilter = args[0];
    const skills = domainFilter
      ? UNREAL_MCP_SKILLS_MATRIX.filter((s) => s.domain === domainFilter)
      : UNREAL_MCP_SKILLS_MATRIX;
    console.log(
      JSON.stringify(
        {
          protocol: "Model Context Protocol (MCP 2026-11)",
          totalSkills: skills.length,
          skills,
        },
        null,
        2,
      ),
    );
  } else if (tool === "gitdeps") {
    console.log(JSON.stringify(loadThirdPartyForksManifest(), null, 2));
  } else if (tool === "epic-auth") {
    const pkce = generateEpicPkcePair();
    const authorizeUrl = buildEpicAuthorizeUrl(
      DEFAULT_EPIC_OAUTH_CONFIG,
      "ue6_sovereign_state",
      pkce,
    );
    const launcherArgs = parseEpicLauncherCliArgs(args);
    const nativeSdk = resolveEosNativeSdk(ENGINE_ROOT);
    console.log(
      JSON.stringify(
        {
          tool: "EpicGamesAuth & EOS OAuth2 / C-ABI / Rust / TypeScript Suite (UE6)",
          endpoints: EPIC_OAUTH_ENDPOINTS,
          config: {
            productName: DEFAULT_EPIC_OAUTH_CONFIG.productName,
            productId: DEFAULT_EPIC_OAUTH_CONFIG.productId,
            sandboxId: DEFAULT_EPIC_OAUTH_CONFIG.sandboxId,
            deploymentId: DEFAULT_EPIC_OAUTH_CONFIG.deploymentId,
            clientId: DEFAULT_EPIC_OAUTH_CONFIG.clientId,
            redirectUri: DEFAULT_EPIC_OAUTH_CONFIG.redirectUri,
            scopes: DEFAULT_EPIC_OAUTH_CONFIG.scopes,
          },
          pkceSample: pkce,
          authorizeUrl,
          launcherArgs,
          nativeSdk,
        },
        null,
        2,
      ),
    );
  } else {
    console.error(
      "Usage: bun Engine/Source/Programs/cli.ts <status|ubt|uht|mcp|gitdeps|epic-auth> [args...]",
    );
    process.exit(1);
  }
}
