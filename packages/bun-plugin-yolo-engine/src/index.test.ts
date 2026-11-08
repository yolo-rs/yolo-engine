// SPDX-License-Identifier: MIT OR Apache-2.0
import { describe, expect, test } from "bun:test";
import { resolve } from "node:path";
import {
  inspect3DSceneAsset,
  inspectMediaStreamAsset,
  inspectNativeFfiAsset,
  inspectShaderSource,
  inspectTextureAsset,
  transpileScriptAsset,
  YOLO_VIRTUAL_MODULES,
  yoloEngineBunPlugin,
} from "./index.ts";

const ENGINE_ROOT = resolve(import.meta.dir, "../../..");

describe("@yolo-rs/bun-plugin-yolo-engine — Virtual Modules & UE6 Asset Loaders", () => {
  test("exposes all 20 yolo:* virtual modules in YOLO_VIRTUAL_MODULES and via runtime import", async () => {
    const requiredModules = [
      "yolo:engine",
      "yolo:bevy",
      "yolo:wgpu",
      "yolo:craft",
      "yolo:gpui",
      "yolo:egui",
      "yolo:storyteller",
      "yolo:helix",
      "yolo:zed",
      "yolo:steam",
      "yolo:epic",
      "yolo:cross",
      "yolo:re",
      "yolo:criware",
      "yolo:level5",
      "yolo:bandai",
      "yolo:zig",
      "yolo:platforms",
      "yolo:blueprints",
      "yolo:publish",
    ];
    for (const modName of requiredModules) {
      expect(YOLO_VIRTUAL_MODULES[modName]).toBeDefined();
    }

    const engineMod = await import("yolo:engine");
    expect(engineMod.version).toBe("6.0.0");
    expect(engineMod.yoloRsForksCount).toBe(46);

    const craftMod = await import("yolo:craft");
    expect(craftMod.totalApps).toBe(16);

    const crossMod = await import("yolo:cross");
    expect(crossMod.targets.length).toBe(6);
  });

  test("parses WGSL compute shaders via custom loader and inspectShaderSource", async () => {
    const nanitePath = resolve(
      ENGINE_ROOT,
      "Engine/Shaders/Private/NaniteClusterCull.wgsl",
    );
    const shader = inspectShaderSource(nanitePath);
    expect(shader.type).toBe("shader");
    expect(shader.extension).toBe(".wgsl");
    expect(shader.entrypoints.compute).toContain("main");
    expect(shader.workgroupSizes[0]).toEqual([64, 1, 1]);
    expect(shader.nagaTargets).toEqual(["SPIR-V", "DXIL", "MSL", "WGSL"]);

    const importedShader = await import(nanitePath);
    expect(importedShader.default.type).toBe("shader");
    expect(importedShader.entrypoints.compute).toContain("main");
  });

  test("inspects 3D scenes, HDR textures, media streams, native FFI, and Verse scripts", () => {
    const scene = inspect3DSceneAsset("NaniteCity.umap");
    expect(scene.type).toBe("3d-scene");
    expect(scene.meshletReady).toBe(true);

    const hdrTex = inspectTextureAsset("SkyDome.exr");
    expect(hdrTex.pipeline).toBe("Lightcraft");
    expect(hdrTex.colorSpace).toBe("ACEScg_Linear");

    const pbrTex = inspectTextureAsset("Albedo.ktx2");
    expect(pbrTex.pipeline).toBe("Photocraft");
    expect(pbrTex.colorSpace).toBe("sRGB");

    const metasound = inspectMediaStreamAsset("CombatMusic.metasound");
    expect(metasound.pipeline).toBe("MetaSound");
    expect(metasound.sampleRateOrFps).toBe(48000);

    const video = inspectMediaStreamAsset("IntroCinematic.av1");
    expect(video.pipeline).toBe("Filmcraft");
    expect(video.sampleRateOrFps).toBe(120);

    const ffi = inspectNativeFfiAsset("EOSSDK-Win64-Shipping.dll");
    expect(ffi.runtimeKind).toBe("bun-ffi-dlopen");

    const verse = transpileScriptAsset(
      "hero_controller.verse",
      "hero_device := class(creative_device):\n    OnBegin():void = {}",
    );
    expect(verse.language).toBe("verse");
    expect(verse.identifiers).toContain("hero_device");
    expect(verse.identifiers).toContain("OnBegin");
  });

  test("bundles virtual modules and WGSL shaders cleanly with Bun.build", async () => {
    const entryPath = resolve(import.meta.dir, "preload.ts");
    const result = await Bun.build({
      entrypoints: [entryPath],
      plugins: [yoloEngineBunPlugin],
      target: "bun",
    });
    expect(result.success).toBe(true);
  });
});
