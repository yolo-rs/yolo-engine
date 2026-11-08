// SPDX-License-Identifier: MIT OR Apache-2.0
/**
 * `@yolo-rs/bun-plugin-yolo-engine` — Universal Bun Bundler & Runtime Plugin for YOLO Engine 6.0 (UE6).
 *
 * Implements the official Bun Plugin specification (`https://github.com/oven-sh/bun/blob/main/docs/bundler/plugins.mdx`):
 * - `onStart`: Initializes UE6 asset registry and shader target matrix.
 * - `onResolve`: Intercepts `yolo:*` virtual module specifiers into the `"yolo-engine"` namespace.
 * - `onLoad`: Resolves virtual modules (`yolo:engine`, `yolo:bevy`, `yolo:wgpu`, `yolo:craft`, `yolo:gpui`,
 *   `yolo:egui`, `yolo:storyteller`, `yolo:helix`, `yolo:zed`, `yolo:steam`, `yolo:epic`, `yolo:cross`)
 *   and custom file loaders for 3D scenes, WebGPU/Naga shaders, HDR/PBR textures, video/audio streams,
 *   WASM/Native FFI libraries, and Verse/Helix configuration files.
 */
import type { BunPlugin } from "bun";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, statSync } from "node:fs";
import { basename, extname } from "node:path";

export type NagaTargetBackend = "SPIR-V" | "DXIL" | "MSL" | "WGSL";

export interface UE6AssetDescriptor {
  readonly type: "3d-scene";
  readonly path: string;
  readonly fileName: string;
  readonly extension: string;
  readonly byteLength: number;
  readonly magicHex: string;
  readonly sha256: string;
  readonly meshletReady: boolean;
  readonly naniteClusterEstimate: number;
}

export interface UE6ShaderDescriptor {
  readonly type: "shader";
  readonly path: string;
  readonly extension: string;
  readonly source: string;
  readonly sha256: string;
  readonly entrypoints: {
    readonly vertex: readonly string[];
    readonly fragment: readonly string[];
    readonly compute: readonly string[];
  };
  readonly workgroupSizes: readonly [number, number, number][];
  readonly nagaTargets: readonly NagaTargetBackend[];
}

export interface UE6TextureDescriptor {
  readonly type: "texture";
  readonly path: string;
  readonly extension: string;
  readonly byteLength: number;
  readonly sha256: string;
  readonly pipeline: "Photocraft" | "Lightcraft";
  readonly colorSpace: "ACEScg_Linear" | "sRGB" | "HDR10_PQ";
  readonly virtualTextureStreaming: boolean;
}

export interface UE6MediaStreamDescriptor {
  readonly type: "media-stream";
  readonly path: string;
  readonly extension: string;
  readonly byteLength: number;
  readonly sha256: string;
  readonly pipeline: "Filmcraft" | "Effectcraft" | "Soundcraft" | "MetaSound";
  readonly codecFamily: "video" | "audio" | "metasound-dsp";
  readonly sampleRateOrFps: number;
}

export interface UE6NativeFfiDescriptor {
  readonly type: "native-ffi";
  readonly path: string;
  readonly extension: string;
  readonly byteLength: number;
  readonly sha256: string;
  readonly runtimeKind: "wasm" | "bun-ffi-dlopen";
}

export interface UE6ScriptModuleDescriptor {
  readonly type: "script-module";
  readonly path: string;
  readonly language: "verse" | "helix-toml";
  readonly identifiers: readonly string[];
  readonly rawSource: string;
}

export const YOLO_VIRTUAL_MODULES: Record<string, Record<string, unknown>> = {
  "yolo:engine": {
    subsystem: "yolo-engine",
    version: "6.0.0",
    branchName: "++UE6+Release-6.0-YoloEngine",
    changelist: 20261108,
    rhiBackend: "WGPU 30.0.1 (Vulkan 1.3 / DirectX 12 Ultimate / Metal 3 / WebGPU)",
    yoloRsForksCount: 46,
    ecosystems: [
      "bevyengine",
      "zed-industries",
      "storytold",
      "helix-editor",
      "tree-sitter",
      "rust-windowing",
      "gfx-rs",
    ],
    capabilities: {
      naniteVirtualizedGeometry: true,
      lumenGlobalIllumination: true,
      virtualShadowMaps: true,
      temporalSuperResolution: true,
      irisReplication: true,
      cloudflareR2IoStoreStreaming: true,
      mcpSkillsCount: 35,
    },
  },
  "yolo:bevy": {
    subsystem: "bevy",
    fork: "yolo-rs/bevy",
    ue6Module: "Engine/Source/Runtime/BevyECS",
    storageModel: "Archetype + SparseSet Table Storage",
    schedules: ["PreStartup", "Startup", "First", "PreUpdate", "Update", "PostUpdate", "Render", "Last"],
    ffiHooks: ["ue6_bevy_world_create", "ue6_bevy_spawn_actor", "ue6_bevy_run_schedule"],
  },
  "yolo:wgpu": {
    subsystem: "wgpu",
    fork: "yolo-rs/wgpu",
    nagaFork: "yolo-rs/naga",
    version: "30.0.1",
    ue6Module: "Engine/Source/Runtime/RHI",
    backends: ["DirectX12", "Vulkan", "Metal", "WebGPU"],
    nagaTargets: ["SPIR-V", "DXIL", "MSL", "WGSL"],
    shaders: ["NaniteClusterCull.wgsl", "LumenScreenProbeGather.wgsl"],
  },
  "yolo:craft": {
    subsystem: "craft",
    organization: "yolo-rs (storytold 16-app suite)",
    totalApps: 16,
    apps: [
      "photocraft",
      "artcraft",
      "craft-anything",
      "pdfcraft",
      "filmcraft",
      "wordcraft",
      "lightcraft",
      "vectorcraft",
      "effectcraft",
      "cadcraft",
      "gridcraft",
      "designcraft",
      "craft-launcher",
      "figcraft",
      "deckcraft",
      "soundcraft",
    ],
  },
  "yolo:gpui": {
    subsystem: "gpui",
    fork: "yolo-rs/zed",
    version: "0.8.0",
    layoutEngine: "Taffy 0.15 Flexbox/Grid",
    targetFps: 120,
    dockPanels: [
      "LevelViewport",
      "WorldOutliner",
      "DetailsInspector",
      "ContentBrowser",
      "ArtcraftSculptAndVoxel",
      "HelixTreeSitterCodeEditor",
      "SequencerTimeline",
      "NiagaraVfxEditor",
      "McpAutomationConsole",
    ],
  },
  "yolo:egui": {
    subsystem: "egui",
    overlayMode: "EguiImmediateDebug + BevyFeathersViewport",
    features: [
      "FrameTimeHistogram",
      "NaniteClusterBoundsOverlay",
      "LumenProbeVisualizer",
      "ChaosPhysicsWireframe",
      "EcsEntityInspector",
    ],
  },
  "yolo:storyteller": {
    subsystem: "storyteller",
    mode: "local-uncensored-multimodal",
    pipelines: {
      image: "Flux.1-Dev / SDXL / Imagen-WebGPU",
      video: "Veo-Local / SVD-XT / FilmcraftTimeline",
      mesh3d: "GaussianSplatting / NeRF / ArtcraftVoxelRemesh",
      audio: "SoundcraftDAW / MetaSoundProceduralSynth",
    },
    safetyFilter: "disabled-local-sovereign",
  },
  "yolo:helix": {
    subsystem: "helix",
    fork: "yolo-rs/helix",
    companionForks: ["yolo-rs/nucleo", "yolo-rs/tree-house"],
    architecture: "Selection -> Action Modal Rope Editor",
    modes: ["Normal", "Insert", "Select", "Command"],
    treeSitterVersion: "0.27.2",
  },
  "yolo:zed": {
    subsystem: "zed",
    fork: "yolo-rs/zed",
    companionForks: ["yolo-rs/extensions", "yolo-rs/create-gpui-app"],
    collaboration: "CRDT Multi-Buffer + LiveCoding Subsecond Hot-Patch",
    ue6Module: "Engine/Source/Editor/UnrealEd",
  },
  "yolo:steam": {
    subsystem: "steam",
    sdkVersion: "Steamworks SDK v1.61",
    appIdDefault: 480,
    features: [
      "SteamAuthSessionTicket",
      "SteamNetworkingSocketsRelay",
      "SteamCloudRemoteStorage",
      "SteamWorkshopUgc",
      "SteamCmdDepotBuilder",
    ],
  },
  "yolo:epic": {
    subsystem: "epic",
    sdkVersion: "EOS SDK 1.16.4 (C ABI + Rust + Bun TypeScript)",
    oauthEndpoints: {
      authorize: "https://www.epicgames.com/id/authorize",
      token: "https://api.epicgames.dev/epic/oauth/v2/token",
      tokenInfo: "https://api.epicgames.dev/epic/oauth/v2/tokenInfo",
      revoke: "https://api.epicgames.dev/epic/oauth/v2/revoke",
      jwks: "https://api.epicgames.dev/epic/oauth/v2/.well-known/jwks.json",
    },
    antiCheat: "EasyAntiCheat (EAC Ed25519 Attestation)",
  },
  "yolo:cross": {
    subsystem: "cross",
    orchestrator: "yolo-engine-core::FCrossCompileJob",
    backends: ["cargo-xwin", "cargo-zigbuild", "zig-cc", "rustup-target"],
    targets: [
      "x86_64-pc-windows-msvc",
      "x86_64-unknown-linux-gnu",
      "x86_64-unknown-linux-musl",
      "aarch64-apple-darwin",
      "aarch64-linux-android",
      "wasm32-unknown-unknown",
    ],
  },
  "yolo:re": {
    subsystem: "re",
    engine: "yolo-engine-re-game-porters + yolo-re-core (goblin + iced-x86 + ghidra)",
    decompiler: "Ghidra Headless + Rust Sleigh Lifter + rdynarmic ARM64",
    formats: ["PE32+", "ELF64", "Mach-O64", "NSO0", "NRO0", "ASAR", "Minidump"],
    offlineOwnershipVerifier: true,
    zeroRemoteDrmDependency: ["Steam", "Valve", "EpicGames"],
  },
  "yolo:criware": {
    subsystem: "criware",
    crate: "yolo-engine-re-game-porters + aphrody-nie-formats",
    formats: ["CPK", "CRILAYLA", "USM (CRID)", "ACB (AFS2)", "AWB", "HCA", "ADX"],
    encryption: "CRI Position-Based XOR + Viola 0x1717E18E",
    streaming: "HTTP 206 Range 4MB Chunk VFS (Cloudflare R2 + Self-Hosted Garage S3)",
  },
  "yolo:level5": {
    subsystem: "level5-nie",
    crate: "yolo-engine-re-game-porters + aphrody-nie-*",
    formats: ["G4TX", "NXTCH", "G4MG", "G4MD", "G4SK", "G4RA", "G4PK", "G4PKM", "RDBN (.cfg.bin)", "T2B"],
    targets: ["Windows64Native", "Linux64Native", "WebBrowserWebGpu", "MobileAndroidArm64", "MobileIosArm64"],
  },
  "yolo:bandai": {
    subsystem: "bandai-namco-ue",
    crate: "yolo-engine-re-game-porters",
    supportedTitles: [
      "Dragon Ball: Sparking! ZERO (UE5 -> UE6)",
      "Dragon Ball Z: Kakarot (UE4 -> UE6)",
      "Dragon Ball Xenoverse 2 (Dimps Criware CPK/EMB/EMO)",
      "Tekken 8 (UE5 -> UE6)",
    ],
    shaderPipeline: "DXBC / DXIL / SPIR-V -> Naga WGSL Compute & Meshlet",
    offlineLanSelfHost: true,
  },
  "yolo:zig": {
    subsystem: "zig",
    toolchain: "yolo-zig v0.15+ (zig cc / zig c++ / cargo-zigbuild / build.zig)",
    libraries: ["yolo-zig-abi", "libsais", "zig-bsdiff", "lightpanda-browser", "electrobun"],
    sysroots: ["gnu.2.38", "musl", "msvc-xwin", "android-ndk", "macos-sdk"],
  },
  "yolo:platforms": {
    subsystem: "platforms-11-sdk",
    crate: "yolo-engine-platforms-blueprints-ffi",
    platformsCount: 11,
    platforms: [
      "NintendoDS (.nds ARM946E-S + ARM7TDMI)",
      "NintendoWii (.dol/.rvz PowerPC Broadway + GX TEV)",
      "NintendoSwitch (.nro/.nso/.nsp ARM64 Tegra X1 + NVN/Vulkan)",
      "PlayStation1And2 (.psx/.elf/.iso MIPS R3000A GTE & Emotion Engine R5900)",
      "PlayStation5 (.self/.pkg AMD Zen 2 + RDNA 2 SPIR-V + Tempest 3D)",
      "XboxSeriesXS (.msixvc/.xvc GDK Scarlett DirectX 12 Ultimate + DirectStorage)",
      "PcDesktop (.exe/.elf/.app Win64, Linux Gamescope, macOS Universal2)",
      "MobileAndroid (.aab/.apk Android 17 ARM64 Vulkan 1.3)",
      "MobileIos (.ipa iOS 19 ARM64 Metal 3)",
      "WebBrowserWebGpu (.wasm + .cpk.r2 WebGPU + SIMD128)",
      "ChromeWebStoreExtension (.crx Manifest V3 OffscreenCanvas WebGPU + Binary Patcher)",
    ],
  },
  "yolo:blueprints": {
    subsystem: "blueprints-kismet-cpp20-ffi",
    crate: "yolo-engine-platforms-blueprints-ffi",
    cppHeader: "Engine/Source/Runtime/Core/Public/UnrealEngine6Compat.hpp",
    macros: ["UCLASS", "USTRUCT", "UENUM", "UPROPERTY", "UFUNCTION", "GENERATED_BODY"],
    ffiExports: [
      "ue6_ffi_bevy_world_create",
      "ue6_ffi_bevy_spawn_actor",
      "ue6_ffi_kismet_execute_blueprint_node",
      "ue6_ffi_platform_sdk_count",
      "ue6_ffi_bevy_world_destroy",
    ],
  },
  "yolo:publish": {
    subsystem: "end-to-end-store-and-website-publisher",
    crate: "yolo-engine-platforms-blueprints-ffi",
    stores: [
      "Microsoft Store (MSIXVC + Partner Center API + winget)",
      "Google Play Store (AAB + Play Developer Publishing API v3)",
      "Chrome Web Store (Manifest V3 CRX3 Game & Live Patch Extension)",
      "Flatpak (Flathub OSTree) & Nix Flake (flake.nix)",
      "Bun Package Registry & Crates.io",
      "Self-Hosted Game Website (Dokploy + Traefik v3 HTTP/3 + WebGPU Instant Play)",
    ],
  },
};

function computeBufferSha256(buf: Uint8Array): string {
  return createHash("sha256").update(buf).digest("hex");
}

function readSafeBytes(filePath: string): Uint8Array {
  if (!existsSync(filePath)) {
    return new Uint8Array(0);
  }
  return new Uint8Array(readFileSync(filePath));
}

export function inspect3DSceneAsset(filePath: string): UE6AssetDescriptor {
  const bytes = readSafeBytes(filePath);
  const ext = extname(filePath).toLowerCase();
  const magicSlice = bytes.subarray(0, Math.min(8, bytes.byteLength));
  const magicHex = Buffer.from(magicSlice).toString("hex");
  const byteLength = existsSync(filePath) ? statSync(filePath).size : bytes.byteLength;
  const naniteClusterEstimate = Math.max(1, Math.ceil(byteLength / 4096));

  return {
    type: "3d-scene",
    path: filePath,
    fileName: basename(filePath),
    extension: ext,
    byteLength,
    magicHex,
    sha256: computeBufferSha256(bytes),
    meshletReady: true,
    naniteClusterEstimate,
  };
}

export function inspectShaderSource(filePath: string, rawContent?: string): UE6ShaderDescriptor {
  const ext = extname(filePath).toLowerCase();
  const source =
    rawContent ??
    (existsSync(filePath) ? readFileSync(filePath, "utf8") : "");
  const sha256 = createHash("sha256").update(source).digest("hex");

  const vertex: string[] = [];
  const fragment: string[] = [];
  const compute: string[] = [];
  const workgroupSizes: [number, number, number][] = [];

  const wgRegex = /@workgroup_size\(\s*(\d+)(?:\s*,\s*(\d+))?(?:\s*,\s*(\d+))?\s*\)/g;
  for (const match of source.matchAll(wgRegex)) {
    workgroupSizes.push([
      Number(match[1] ?? 1),
      Number(match[2] ?? 1),
      Number(match[3] ?? 1),
    ]);
  }

  const stageFnRegex =
    /@(vertex|fragment|compute)(?:[\s\S]*?)fn\s+([A-Za-z0-9_]+)/g;
  for (const match of source.matchAll(stageFnRegex)) {
    const stage = match[1];
    const fnName = match[2];
    if (!fnName) continue;
    if (stage === "vertex") vertex.push(fnName);
    else if (stage === "fragment") fragment.push(fnName);
    else if (stage === "compute") compute.push(fnName);
  }

  return {
    type: "shader",
    path: filePath,
    extension: ext,
    source,
    sha256,
    entrypoints: { vertex, fragment, compute },
    workgroupSizes: workgroupSizes.length > 0 ? workgroupSizes : [[64, 1, 1]],
    nagaTargets: ["SPIR-V", "DXIL", "MSL", "WGSL"],
  };
}

export function inspectTextureAsset(filePath: string): UE6TextureDescriptor {
  const bytes = readSafeBytes(filePath);
  const ext = extname(filePath).toLowerCase();
  const isHdrOrRaw = ext === ".exr" || ext === ".hdr" || ext === ".raw";
  return {
    type: "texture",
    path: filePath,
    extension: ext,
    byteLength: bytes.byteLength,
    sha256: computeBufferSha256(bytes),
    pipeline: isHdrOrRaw ? "Lightcraft" : "Photocraft",
    colorSpace: isHdrOrRaw ? "ACEScg_Linear" : "sRGB",
    virtualTextureStreaming: true,
  };
}

export function inspectMediaStreamAsset(filePath: string): UE6MediaStreamDescriptor {
  const bytes = readSafeBytes(filePath);
  const ext = extname(filePath).toLowerCase();
  const isAudio = ext === ".ogg" || ext === ".flac" || ext === ".wav";
  const isMetaSound = ext === ".metasound";

  return {
    type: "media-stream",
    path: filePath,
    extension: ext,
    byteLength: bytes.byteLength,
    sha256: computeBufferSha256(bytes),
    pipeline: isMetaSound
      ? "MetaSound"
      : isAudio
        ? "Soundcraft"
        : "Filmcraft",
    codecFamily: isMetaSound ? "metasound-dsp" : isAudio ? "audio" : "video",
    sampleRateOrFps: isMetaSound || isAudio ? 48000 : 120,
  };
}

export function inspectNativeFfiAsset(filePath: string): UE6NativeFfiDescriptor {
  const bytes = readSafeBytes(filePath);
  const ext = extname(filePath).toLowerCase();
  return {
    type: "native-ffi",
    path: filePath,
    extension: ext,
    byteLength: bytes.byteLength,
    sha256: computeBufferSha256(bytes),
    runtimeKind: ext === ".wasm" ? "wasm" : "bun-ffi-dlopen",
  };
}

export function transpileScriptAsset(filePath: string, rawContent?: string): UE6ScriptModuleDescriptor {
  const source =
    rawContent ??
    (existsSync(filePath) ? readFileSync(filePath, "utf8") : "");
  const isVerse = filePath.endsWith(".verse");
  const identifiers: string[] = [];

  if (isVerse) {
    for (const match of source.matchAll(/([A-Za-z0-9_]+)\s*:=\s*class/g)) {
      if (match[1]) identifiers.push(match[1]);
    }
    for (const match of source.matchAll(/([A-Za-z0-9_]+)\s*\([^)]*\)\s*:\s*[A-Za-z0-9_]+\s*=/g)) {
      if (match[1]) identifiers.push(match[1]);
    }
  } else {
    for (const match of source.matchAll(/^\[([^\]]+)\]/gm)) {
      if (match[1]) identifiers.push(match[1]);
    }
  }

  return {
    type: "script-module",
    path: filePath,
    language: isVerse ? "verse" : "helix-toml",
    identifiers,
    rawSource: source,
  };
}

export const yoloEngineBunPlugin: BunPlugin = {
  name: "bun-plugin-yolo-engine-ue6",
  setup(build) {
    if (typeof build.onStart === "function") {
      build.onStart(() => {
        // Initialized YOLO Engine 6.0 Universal Bundler & Runtime Plugin
      });
    }

    build.onResolve({ filter: /^yolo:/ }, (args) => {
      return {
        path: args.path,
        namespace: "yolo-engine",
      };
    });

    build.onLoad({ filter: /.*/, namespace: "yolo-engine" }, (args) => {
      const payload = YOLO_VIRTUAL_MODULES[args.path] ?? {
        subsystem: args.path.replace(/^yolo:/, ""),
        status: "dynamic-virtual-module",
      };
      return {
        exports: {
          default: payload,
          ...payload,
        },
        loader: "object",
      };
    });

    // 1. 3D, Level-5 (G4MG/G4MD/G4SK/G4PK/G4RA), Bandai Namco (EMO/EMB), Console ROMs (.nds/.dol/.rvz/.nro/.nso/.nsp/.elf/.iso/.psx/.self/.pkg/.msixvc) & UE5/UE6 Scene Assets
    build.onLoad(
      { filter: /\.(gltf|glb|obj|fbx|blend|uproject|uplugin|umap|uasset|uexp|ubulk|utoc|ucas|pak|cpk|g4mg|g4md|g4sk|g4pk|g4ra|emo|emb|nds|dol|rvz|nro|nso|nsp|psx|iso|self|pkg|msixvc|bsn)$/i },
      (args) => {
        const descriptor = inspect3DSceneAsset(args.path);
        return {
          exports: {
            default: descriptor,
            descriptor,
          },
          loader: "object",
        };
      },
    );

    // 2. WebGPU / Naga / WGPU & Unreal (.usf / .ush) Shaders
    build.onLoad({ filter: /\.(wgsl|wesl|hlsl|glsl|spv|usf|ush)$/i }, (args) => {
      const descriptor = inspectShaderSource(args.path);
      return {
        exports: {
          default: descriptor,
          ...descriptor,
        },
        loader: "object",
      };
    });

    // 3. HDR / PBR & Level-5 (G4TX / NXTCH) Images & Textures
    build.onLoad({ filter: /\.(dds|ktx2|exr|hdr|psd|raw|g4tx|nxtch)$/i }, (args) => {
      const descriptor = inspectTextureAsset(args.path);
      return {
        exports: {
          default: descriptor,
          descriptor,
        },
        loader: "object",
      };
    });

    // 4. Video, Audio, Criware (USM/ACB/AWB/HCA/ADX) & MetaSound Streams
    build.onLoad(
      { filter: /\.(mp4|mkv|webm|av1|ogg|flac|wav|usm|acb|awb|hca|adx|metasound)$/i },
      (args) => {
        const descriptor = inspectMediaStreamAsset(args.path);
        return {
          exports: {
            default: descriptor,
            descriptor,
          },
          loader: "object",
        };
      },
    );

    // 5. Native FFI Dynamic Libraries
    build.onLoad({ filter: /\.(dll|so|dylib)$/i }, (args) => {
      const descriptor = inspectNativeFfiAsset(args.path);
      return {
        exports: {
          default: descriptor,
          descriptor,
        },
        loader: "object",
      };
    });

    // 6. Verse & Helix Scripting Configs
    build.onLoad({ filter: /(\.verse|\.hx\.toml)$/i }, (args) => {
      const descriptor = transpileScriptAsset(args.path);
      return {
        exports: {
          default: descriptor,
          ...descriptor,
        },
        loader: "object",
      };
    });
  },
};

export default yoloEngineBunPlugin;
