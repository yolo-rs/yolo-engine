import { describe, expect, test } from "bun:test";
import { existsSync } from "node:fs";
import { join } from "node:path";
import {
  ENGINE_ROOT,
  executeUnrealBuildTool,
  loadEngineBuildVersion,
  UNREAL_BUILD_TOOL_MODULES,
  UNREAL_MCP_SKILLS_MATRIX,
} from "./cli.ts";

describe("YOLO Engine 6.0 (UE6) — Architecture, UBT, UHT, Shaders & 35 MCP Skills Matrix", () => {
  test("verifies Unreal Engine 6.0 Build.version and Default*.ini hierarchy", () => {
    const version = loadEngineBuildVersion();
    expect(version.MajorVersion).toBe(6);
    expect(version.MinorVersion).toBe(0);
    expect(version.BranchName).toBe("++UE6+Release-6.0-YoloEngine");

    expect(
      existsSync(join(ENGINE_ROOT, "Engine", "Config", "DefaultEngine.ini")),
    ).toBe(true);
    expect(
      existsSync(join(ENGINE_ROOT, "Engine", "Config", "DefaultEditor.ini")),
    ).toBe(true);
    expect(
      existsSync(join(ENGINE_ROOT, "Engine", "Config", "DefaultGame.ini")),
    ).toBe(true);
    expect(
      existsSync(join(ENGINE_ROOT, "Engine", "Config", "DefaultInput.ini")),
    ).toBe(true);
    expect(
      existsSync(
        join(ENGINE_ROOT, "Engine", "Shaders", "Private", "NaniteClusterCull.wgsl"),
      ),
    ).toBe(true);
    expect(
      existsSync(
        join(
          ENGINE_ROOT,
          "Engine",
          "Shaders",
          "Private",
          "LumenScreenProbeGather.wgsl",
        ),
      ),
    ).toBe(true);
  });

  test("executes UnrealBuildTool (UBT 6.0) module graph and Shipping/Development plans", () => {
    expect(UNREAL_BUILD_TOOL_MODULES.length).toBe(4);
    const shippingPlan = executeUnrealBuildTool({
      target: "YoloEditor",
      platform: "Win64",
      configuration: "Shipping",
    });
    expect(shippingPlan.cargoInvocation).toBe("cargo build --workspace --release");
    expect(shippingPlan.sccacheEnabled).toBe(true);
  });

  test("validates all 35 Unreal Engine 6 MCP skills across all 7 domains", () => {
    expect(UNREAL_MCP_SKILLS_MATRIX.length).toBe(35);
    const domains = new Set(UNREAL_MCP_SKILLS_MATRIX.map((s) => s.domain));
    expect(domains.size).toBe(7);
    expect(domains.has("world-ecs")).toBe(true);
    expect(domains.has("rendering-rhi")).toBe(true);
    expect(domains.has("artcraft-dcc")).toBe(true);
    expect(domains.has("unrealed-gpui")).toBe(true);
    expect(domains.has("helix-treesitter")).toBe(true);
    expect(domains.has("physics-animation")).toBe(true);
    expect(domains.has("networking-eos-r2")).toBe(true);
  });
});
