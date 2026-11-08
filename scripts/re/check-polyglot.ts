#!/usr/bin/env bun
/** Non-installing verification of yolo-re's independent language surfaces. */

import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

type Status = "PASS" | "FAIL" | "SKIP";
type Result = { label: string; status: Status; code?: number; detail?: string };

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const results: Result[] = [];
const isWindows = process.platform === "win32";

function log(result: Result): void {
  results.push(result);
  const code = result.code === undefined ? "" : ` (exit ${result.code})`;
  console.log(`${result.status} ${result.label}${code}${result.detail ? `: ${result.detail}` : ""}`);
}

function available(command: string): boolean {
  return Bun.which(command) !== null;
}

function run(
  label: string,
  command: string[],
  cwd = root,
  options: {
    required?: boolean;
    outputLimit?: number;
    validateJson?: (value: unknown) => string | undefined;
  } = {},
): Result {
  if (!available(command[0]!)) {
    const result = {
      label,
      status: "SKIP" as const,
      detail: `${command[0]} is not installed${options.required === false ? " (optional check)" : " (required for full polyglot qualification)"}`,
    };
    log(result);
    return result;
  }

  const child = Bun.spawnSync(command, {
    cwd,
    stdin: "ignore",
    stdout: "pipe",
    stderr: "pipe",
    env: process.env,
  });
  const stdout = new TextDecoder().decode(child.stdout);
  const stderr = new TextDecoder().decode(child.stderr);
  const output = [stdout, stderr]
    .filter(Boolean)
    .join("\n")
    .trim();
  const limit = options.outputLimit ?? 5000;
  const detail = output.length > limit ? `${output.slice(-limit)}\n[output truncated]` : output;
  let validationError: string | undefined;
  if (child.exitCode === 0 && options.validateJson) {
    try {
      validationError = options.validateJson(JSON.parse(stdout));
    } catch (error) {
      validationError = `invalid JSON response: ${String(error)}`;
    }
  }
  const result: Result = {
    label,
    status: child.exitCode === 0 && !validationError ? "PASS" : "FAIL",
    code: child.exitCode,
    detail: validationError ? `${validationError}${detail ? `\n${detail}` : ""}` : detail || undefined,
  };
  log(result);
  return result;
}

function skip(label: string, reason: string, required = true): void {
  log({ label, status: "SKIP", detail: `${reason}${required ? " (required for full polyglot qualification)" : " (optional check)"}` });
}

console.log("yolo-re polyglot verification (no installs, upgrades, tests, or target writes)\n");

// Rust owns the native RE core and its CLI. Cargo writes only normal build artifacts.
run("Rust workspace compile check", ["cargo", "check", "--workspace", "--locked"]);

// Root Bun entry points plus REA's own non-test type/lint gate, following its nested AGENTS.md.
run("Root RE CLI entrypoint", ["bun", "run", "re", "--help"]);
run("REA provider inventory", ["bun", "packages/yolo-rea/scripts/rea.mjs", "providers", "--format", "json"], root, {
  validateJson: (value) => {
    if (typeof value !== "object" || value === null || !("capabilities" in value))
      return "provider inventory response has no capabilities field";
    return Array.isArray(value.capabilities) ? undefined : "capabilities is not an array";
  },
});
run("Replica skill catalog", ["bun", "run", "replica", "skills"]);
run("REA typecheck and lint", ["bun", `--cwd=${join(root, "packages", "yolo-rea")}`, "run", "check:fast"], root);

// Python checks call existing executables directly: uv run is intentionally avoided because it
// may create or synchronize an environment. The lock check is read-only.
if (available("uv")) {
  run("Python uv lock consistency", ["uv", "lock", "--check", "--project", "src/py"]);
} else {
  skip("Python uv lock consistency", "uv is not installed");
}

const py = join(root, "src", "py", ".venv", isWindows ? "Scripts/python.exe" : "bin/python");
if (existsSync(py)) {
  run("Python project CLI", [py, "-m", "yolo_re_forensic.project_cli", "--help"]);
  run("Python PyGhidra doctor", [py, "-m", "yolo_re_forensic.project_cli", "ghidra", "doctor"], root, {
    validateJson: (value) => {
      if (typeof value !== "object" || value === null || !("ready" in value))
        return "doctor response has no readiness field";
      return value.ready === true ? undefined : "PyGhidra doctor reports ready=false";
    },
  });
} else {
  skip("Python project CLI and PyGhidra doctor", `existing uv environment not found at ${py}`);
}

// .NET is a separate product workspace. --no-restore prevents this check from fetching packages.
const dotnetSolution = join(root, "apps", "iecode-dotnet", "IECODE.sln");
if (existsSync(dotnetSolution)) {
  run("IEcode .NET solution build", ["dotnet", "build", dotnetSolution, "--no-restore", "--configuration", "Debug"]);
} else {
  skip("IEcode .NET solution build", "apps/iecode-dotnet/IECODE.sln is absent");
}

// Build C++ only when a caller has already configured an out-of-source build tree.
const cppRoot = join(root, "packages", "iecode-cpp");
const cacheCandidates = [
  join(cppRoot, "build", "CMakeCache.txt"),
  join(cppRoot, "out", "build", "CMakeCache.txt"),
];
const configuredBuild = cacheCandidates.find(existsSync);
if (!configuredBuild) {
  skip("IEcode C++ CMake build", "no supported configured build directory found; configure explicitly with the documented vcpkg feature", false);
} else {
  run("IEcode C++ CMake build", ["cmake", "--build", dirname(configuredBuild), "--config", "Debug"]);
}

// Rizin is an optional upstream CLI provider in REA, not a CMake-linked IEcode library.
const rizinProbe = isWindows ? "C:\\Windows\\System32\\whoami.exe" : undefined;
if (available("rizin") && rizinProbe && existsSync(rizinProbe)) {
  run("REA Rizin provider analysis", [
    "bun", "packages/yolo-rea/scripts/rea.mjs", "execute-rizin-command", rizinProbe, "ij", "--format", "json",
  ], root, {
    required: false,
    validateJson: (value) => {
      if (typeof value !== "object" || value === null || !("provider" in value) || !("raw_result" in value))
        return "REA Rizin response has no provider or process evidence";
      const evidence = value as Record<string, unknown>;
      const provider = evidence.provider as Record<string, unknown> | null;
      const raw = evidence.raw_result as Record<string, unknown> | null;
      if (provider?.id !== "rizin" || raw?.exit_code !== 0 || raw.artifact_changed !== false)
        return "REA Rizin command failed or changed its target";
      if (typeof raw.stdout !== "string") return "REA Rizin response has no stdout evidence";
      let inspection: Record<string, unknown>;
      try {
        inspection = JSON.parse(raw.stdout) as Record<string, unknown>;
      } catch {
        return "Rizin ij command returned invalid JSON";
      }
      const core = inspection.core as Record<string, unknown> | undefined;
      const bin = inspection.bin as Record<string, unknown> | undefined;
      if (typeof core?.size !== "number" || core.size <= 0 || bin?.bintype !== "pe")
        return "Rizin did not report a positive PE target size and format";
      return undefined;
    },
  });
} else {
  skip("REA Rizin provider analysis", "optional Rizin CLI or Windows PE fixture is unavailable", false);
}

// The Magika integration uses Google's upstream Python package. Classification reads the checked-in
// README only and runs only when that upstream environment already exists.
const magikaPython = join(root, "vendor", "magika", "python", ".venv", isWindows ? "Scripts/python.exe" : "bin/python");
if (existsSync(magikaPython)) {
  const bridge = join(root, "packages", "yolo-rea", "python");
  const sample = join(root, "README.md");
  const script = `import sys; sys.path.insert(0, ${JSON.stringify(bridge)}); import magika_bridge; print(magika_bridge.identify_path_json(${JSON.stringify(sample)}))`;
  run("Google Magika upstream inference", [magikaPython, "-c", script], root, {
    validateJson: (value) =>
      typeof value === "object" && value !== null && "ok" in value && value.ok === true
        ? undefined
        : "Magika did not return a successful classification",
  });
} else {
  skip("Google Magika upstream import", `existing upstream Magika environment not found at ${magikaPython}`);
}

const passed = results.filter((result) => result.status === "PASS").length;
const failed = results.filter((result) => result.status === "FAIL").length;
const skippedRequired = results.filter((result) => result.status === "SKIP" && result.detail?.includes("required for full polyglot qualification")).length;
const skippedOptional = results.length - passed - failed - skippedRequired;
console.log(`\nSummary: ${passed} passed, ${failed} failed, ${skippedRequired} required checks skipped, ${skippedOptional} optional checks skipped.`);
console.log("A skipped check is never reported as passed. Required skips mean full polyglot qualification is incomplete.");
process.exitCode = failed > 0 || skippedRequired > 0 ? 1 : 0;
