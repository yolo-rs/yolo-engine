#!/usr/bin/env bun

import { getoptLong, HasArg } from "../packages/yolo-posix-bun/src/index.ts";

type Fork = {
  id: string;
  path: string;
  upstream: string;
  role: string;
  targets: string;
};

const root = `${import.meta.dir}/..`;
const forks: Fork[] = [
  {
    id: "lightpanda-browser",
    path: "forks/lightpanda-browser",
    upstream: "https://github.com/lightpanda-io/browser",
    role: "headless browser and CDP benchmark",
    targets: "Linux native; Windows through WSL2",
  },
  {
    id: "electrobun",
    path: "forks/electrobun",
    upstream: "https://github.com/blackboardsh/electrobun",
    role: "Bun + Zig desktop bridge and updater reference",
    targets: "Windows/Linux native host builds",
  },
  {
    id: "vercel-native",
    path: "forks/vercel-native",
    upstream: "https://github.com/vercel-labs/native",
    role: "experimental Zig/native desktop SDK reference",
    targets: "Windows x64 native + Windows x64/arm64 release assets; validate its pinned Zig SDK",
  },
  {
    id: "vercel-fx",
    path: "forks/vercel-fx",
    upstream: "https://github.com/vercel-labs/fx",
    role: "Zig AI coding agent and terminal automation source",
    targets: "macOS/Linux upstream; Windows uses Linux x86_64 through WSL2",
  },
  {
    id: "zig-bsdiff",
    path: "forks/zig-bsdiff",
    upstream: "https://github.com/blackboardsh/zig-bsdiff",
    role: "candidate for signed differential OS updates",
    targets: "Validate Windows/Linux natively",
  },
];

async function run(
  command: string[],
  cwd = root,
  capture = false,
): Promise<{ code: number; stdout: string; stderr: string }> {
  try {
    const child = Bun.spawn(command, {
      cwd,
      stdout: capture ? "pipe" : "inherit",
      stderr: capture ? "pipe" : "inherit",
    });
    const [code, stdout, stderr] = await Promise.all([
      child.exited,
      capture ? new Response(child.stdout).text() : Promise.resolve(""),
      capture ? new Response(child.stderr).text() : Promise.resolve(""),
    ]);
    return { code, stdout: stdout.trim(), stderr: stderr.trim() };
  } catch (error) {
    return { code: 127, stdout: "", stderr: error instanceof Error ? error.message : String(error) };
  }
}

async function listForks(args: string[]): Promise<number> {
  const parsed = getoptLong(args, "h", [
    { name: "json", hasArg: HasArg.NoArgument, val: "json" },
    { name: "help", hasArg: HasArg.NoArgument, val: "h" },
  ]);
  if (parsed.some((item) => item.type === "unknown" || item.type === "missing-arg" || item.type === "non-opt")) {
    console.error("Usage: bun tools/yolo-zig.ts forks status [--json]");
    return 2;
  }
  if (parsed.some((item) => item.type === "opt" && item.val === "h")) {
    console.log("Usage: bun tools/yolo-zig.ts forks status [--json]");
    return 0;
  }
  const json = parsed.some((item) => item.type === "opt" && item.val === "json");
  const entries = [];
  for (const fork of forks) {
    const path = `${root}/${fork.path}`;
    const [head, branch, dirty] = await Promise.all([
      run(["git", "rev-parse", "--short=12", "HEAD"], path, true),
      run(["git", "branch", "--show-current"], path, true),
      run(["git", "status", "--porcelain"], path, true),
    ]);
    const state = head.code === 0 ? `${branch.stdout}@${head.stdout}` : "not initialized";
    const worktree = dirty.code === 0 && dirty.stdout.length > 0 ? "dirty" : "clean";
    entries.push({ ...fork, revision: state, worktree });
  }
  if (json) console.log(JSON.stringify(entries, null, 2));
  else for (const fork of entries) {
    console.log(`${fork.id}\t${fork.revision}\t${fork.worktree}\t${fork.targets}`);
    console.log(`  ${fork.role}\n  ${fork.upstream}`);
  }
  return 0;
}

async function doctor(): Promise<number> {
  const compiler = process.env.YOLO_ZIG_COMPILER;
  const osRoot = bunOsRoot().replaceAll("\\", "/");
  const localBuncc = `${osRoot}/packages/buncc/src/cli.ts`;
  const bunccPath = Bun.which("buncc") ?? (await Bun.file(localBuncc).exists() ? `source:${localBuncc}` : undefined);
  const tools = [
    { name: "zig", required: true, path: compiler ?? Bun.which("zig") },
    { name: "git", required: true, path: Bun.which("git") },
    { name: "buncc", required: false, path: bunccPath },
    { name: "xwin", required: false, path: Bun.which("xwin") },
    { name: "cargo-xwin", required: false, path: Bun.which("cargo-xwin") },
    { name: "cargo-zigbuild", required: false, path: Bun.which("cargo-zigbuild") },
    { name: "wsl.exe", required: process.platform === "win32", path: Bun.which("wsl.exe") },
    { name: "make", required: process.platform !== "win32", path: Bun.which("make") },
    { name: "hutch", required: false, path: Bun.which("hutch") },
  ];
  console.log(`Host: ${process.platform}-${process.arch}`);
  console.log("Tool discovery uses Bun.which and argv-based spawning; no shell-specific PATH assumptions.");
  for (const tool of tools) {
    const state = tool.path ? tool.path : tool.required ? "MISSING (required)" : "not installed (optional)";
    console.log(`${tool.name}\t${state}`);
  }
  console.log("Capabilities:");
  console.log("  root Zig graph: native and cross targets through Zig Build");
  console.log("  Rust FFI example: buncc prepares the native Windows MSVC environment");
  console.log(process.platform === "win32"
    ? "  fx and Lightpanda: Linux build/run through WSL; fx cross-compiles on Windows"
    : "  fx: native Linux build; Lightpanda: upstream-supported host build");
  console.log("  Electrobun: upstream Hutch builds on native host; no cross-build claim");
  console.log(`  Windows plugin + WinClean source: ${await Bun.file(`${osRoot}/packages/windows/src/bun-plugin.ts`).exists() && await Bun.file(`${osRoot}/packages/winclean/src/bun-windows.ts`).exists() ? "available" : "set YOLO_BUN_OS_ROOT"}`);
  return tools.some((tool) => tool.required && !tool.path) ? 1 : 0;
}

async function runBuiltBinary(name: "bsdiff" | "bspatch", args: string[]): Promise<number> {
  const suffix = process.platform === "win32" ? ".exe" : "";
  const executable = `${root}/zig-out/bin/${name}${suffix}`;
  if (!(await Bun.file(executable).exists())) {
    console.error(`Missing ${name} binary. Build the workspace first with: bun run zig:build`);
    return 1;
  }
  const child = Bun.spawn([executable, ...args], {
    cwd: root,
    stdin: "inherit",
    stdout: "inherit",
    stderr: "inherit",
  });
  return await child.exited;
}

async function delta(action: string | undefined, args: string[]): Promise<number> {
  if (action === "create" && args.length >= 3) {
    const [oldFile, newFile, patchFile, ...options] = args;
    return await runBuiltBinary("bsdiff", [oldFile, newFile, patchFile, "--use-zstd", ...options]);
  }
  if (action === "apply" && args.length === 3) {
    const [oldFile, newFile, patchFile] = args;
    return await runBuiltBinary("bspatch", [oldFile, newFile, patchFile]);
  }
  console.error("Usage: bun tools/yolo-zig.ts delta create <old> <new> <patch> [--search-effort=N]\n       bun tools/yolo-zig.ts delta apply <old> <output> <patch>");
  return 2;
}

async function launch(executable: string, args: string[], cwd: string, env?: Record<string, string>): Promise<number> {
  if (process.platform === "win32" && !executable.includes("\\") && !Bun.which(executable)) {
    console.error(`Required executable not found on PATH: ${executable}`);
    return 127;
  }
  try {
    const child = Bun.spawn([executable, ...args], {
      cwd,
      ...(env ? { env: { ...process.env, ...env } } : {}),
      stdin: "inherit",
      stdout: "inherit",
      stderr: "inherit",
    });
    return await child.exited;
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    return 127;
  }
}

function bunOsRoot(): string {
  return process.env.YOLO_BUN_OS_ROOT ?? `${root}/../bun-os`;
}

async function wslPath(windowsPath: string): Promise<string | undefined> {
  const result = await run(["wsl.exe", "--exec", "wslpath", "-a", windowsPath.replaceAll("\\", "/")], root, true);
  if (result.code !== 0 || !result.stdout.startsWith("/")) {
    console.error(`Could not map the Windows checkout into WSL. Install and initialize a WSL2 Linux distribution, then verify it can access ${windowsPath}.`);
    return undefined;
  }
  return result.stdout;
}

async function inspectWindows(): Promise<number> {
  if (process.platform !== "win32") {
    console.error("The bun:windows plugin and Windows WinClean host are Windows-only.");
    return 2;
  }
  const osRoot = bunOsRoot().replaceAll("\\", "/");
  const pluginPath = `${osRoot}/packages/windows/src/bun-plugin.ts`;
  const wincleanPath = `${osRoot}/packages/winclean/src/bun-windows.ts`;
  if (!(await Bun.file(pluginPath).exists()) || !(await Bun.file(wincleanPath).exists())) {
    console.error(`Set YOLO_BUN_OS_ROOT to the Bun OS checkout (missing packages/windows or packages/winclean): ${osRoot}`);
    return 1;
  }
  try {
    const plugin = (await import(pluginPath)).default;
    Bun.plugin(plugin);
    const virtualModule = "bun:windows";
    const windows = await import(virtualModule);
    const winclean = await import(wincleanPath);
    const [memory, disks, wslServices] = await Promise.all([
      winclean.callBunWindows("get_memory_info", {}),
      winclean.callBunWindows("get_disk_info", {}),
      winclean.callBunWindows("list_services", { nameFilter: "wsl" }),
    ]);
    const processes = windows.processes.list() as Array<{ name: string }>;
    const relevant = new Map<string, number>();
    for (const process of processes) {
      if (/^(bun|zig|cargo|rustc|ninja|gn|clang|clang-cl|make|hutch|lightpanda|fx)(\.exe)?$/i.test(process.name)) {
        relevant.set(process.name, (relevant.get(process.name) ?? 0) + 1);
      }
    }
    console.log(JSON.stringify({
      host: { platform: process.platform, arch: process.arch, windows: windows.version() },
      memory: memory.value,
      disks: disks.value,
      wslServices: wslServices.value,
      developmentProcesses: [...relevant].map(([name, count]) => ({ name, count })),
      source: "Bun OS @aphrody/windows plugin + @aphrody/winclean read-only host calls",
    }, null, 2));
    return 0;
  } catch (error) {
    console.error(`Windows inspection failed: ${error instanceof Error ? error.message : String(error)}`);
    return 1;
  }
}

async function runBunccCargo(args: string[], env: Record<string, string>): Promise<number> {
  const osRoot = bunOsRoot().replaceAll("\\", "/");
  const bunccSource = `${osRoot}/packages/buncc/src/cli.ts`;
  const installedBuncc = Bun.which("buncc");
  const executable = installedBuncc ?? (await Bun.file(bunccSource).exists() ? process.execPath : undefined);
  if (!executable) {
    console.log("Buncc is unavailable; using the host Cargo toolchain directly.");
    return await launch("cargo", args, root, env);
  }
  const bunccArgs = ["exec", "--", ...args];
  if (!installedBuncc) bunccArgs.unshift(bunccSource);
  return await launch(executable, bunccArgs, root, env);
}

async function buildZigTarget(target: string, prefix: string): Promise<number> {
  const zig = process.env.YOLO_ZIG_COMPILER ?? Bun.which("zig");
  if (!zig) {
    console.error("Zig was not found. Set YOLO_ZIG_COMPILER or install the pinned workspace toolchain.");
    return 127;
  }
  if (!(await ensureBsdiffCompatibilityPatch())) return 1;
  return await launch(zig, ["build", "--summary", "all", "--prefix", prefix, `-Dtarget=${target}`, "-Doptimize=ReleaseFast", "-Dcpu=baseline"], root);
}

async function ensureRustTarget(target: string): Promise<number> {
  const installed = await run(["rustup", "target", "list", "--installed"], root, true);
  if (installed.code !== 0) {
    console.error("rustup is required to install the Cargo target standard library.");
    return installed.code || 127;
  }
  if (installed.stdout.split(/\r?\n/).includes(target)) return 0;
  return await launch("rustup", ["target", "add", target], root);
}

async function buildRustFfi(kind: string, args: string[]): Promise<number> {
  let zigTarget: string;
  let cargoTarget: string;
  let prefix: string;
  let cargoCommand: string[];
  let targetDir: string;
  let env: Record<string, string> = {};

  if (kind === "windows-msvc") {
    if (process.platform !== "win32") {
      console.error("Use `build rust-ffi-windows-xwin --accept-ms-license` from Linux/macOS for the MSVC cross-build.");
      return 2;
    }
    zigTarget = "x86_64-windows-msvc";
    cargoTarget = "x86_64-pc-windows-msvc";
    prefix = "zig-out/x86_64-windows-msvc";
    cargoCommand = ["build"];
    targetDir = "target/rust-ffi-msvc";
  } else if (kind === "windows-gnu") {
    zigTarget = "x86_64-windows-gnu";
    cargoTarget = "x86_64-pc-windows-gnu";
    prefix = "zig-out/x86_64-windows-gnu";
    cargoCommand = ["zigbuild"];
    targetDir = "target/rust-ffi-windows-gnu";
  } else if (kind === "linux") {
    if (process.platform === "win32") {
      console.error("cargo-zigbuild's Linux link lane requires Linux/macOS. Run it in a Linux host or WSL distribution.");
      return 2;
    }
    zigTarget = "x86_64-linux-gnu.2.35";
    cargoTarget = "x86_64-unknown-linux-gnu.2.35";
    prefix = "zig-out/x86_64-linux-gnu";
    cargoCommand = ["zigbuild"];
    targetDir = "target/rust-ffi-linux-gnu";
  } else if (kind === "windows-xwin") {
    if (process.platform === "win32") {
      console.error("cargo-xwin is the Linux/macOS-to-Windows MSVC lane; use `rust-ffi-windows` on Windows.");
      return 2;
    }
    if (!args.includes("--accept-ms-license")) {
      console.error("cargo xwin downloads Microsoft's CRT and SDK. Review its terms, then pass --accept-ms-license to continue.");
      return 2;
    }
    if (!Bun.which("cargo-xwin")) {
      console.error("Install the Bun OS provider with `buncc install cargo-xwin --run`, or `cargo install --locked cargo-xwin`.");
      return 127;
    }
    zigTarget = "x86_64-windows-msvc";
    cargoTarget = "x86_64-pc-windows-msvc";
    prefix = "zig-out/x86_64-windows-msvc";
    cargoCommand = ["xwin", "build"];
    targetDir = "target/rust-ffi-xwin";
    env = { XWIN_ACCEPT_LICENSE: "1" };
  } else {
    console.error("Usage: bun tools/yolo-zig.ts build rust-ffi-windows-msvc|rust-ffi-windows-gnu|rust-ffi-linux|rust-ffi-windows-xwin [--accept-ms-license]");
    return 2;
  }

  if (cargoCommand[0] === "zigbuild" && !Bun.which("cargo-zigbuild")) {
    console.error("Install cargo-zigbuild with `buncc install cargo-zigbuild --run` or `cargo install --locked cargo-zigbuild`.");
    return 127;
  }
  const zigCode = await buildZigTarget(zigTarget, prefix);
  if (zigCode !== 0) return zigCode;
  const rustTargetCode = await ensureRustTarget(cargoTarget);
  if (rustTargetCode !== 0) return rustTargetCode;
  const libraryDir = `${root}/${prefix}/lib`.replaceAll("\\", "/");
  return await runBunccCargo([
    ...cargoCommand,
    "--manifest-path", "examples/rust-ffi/Cargo.toml",
    "--target", cargoTarget,
    "--target-dir", targetDir,
  ], { YOLO_ZIG_LIB_DIR: libraryDir, ...env });
}

async function ensureBsdiffCompatibilityPatch(): Promise<boolean> {
  const forkDir = `${root}/forks/zig-bsdiff`;
  const patchedSource = await Bun.file(`${forkDir}/bspatch.zig`).text();
  if (patchedSource.includes("y = (y << 8) |")) return true;

  const patchFile = `${root}/patches/zig-bsdiff/zig-0.18-operator-precedence.patch`;
  const result = await run(["git", "apply", patchFile], forkDir, true);
  if (result.code !== 0) {
    console.error(`Could not apply the pinned Zig 0.18 bsdiff compatibility patch: ${result.stderr}`);
    return false;
  }
  return true;
}

async function ensureFxWindowsPatch(): Promise<boolean> {
  const forkDir = `${root}/forks/vercel-fx`;
  const source = `${forkDir}/src/ui/terminal/terminal.zig`;
  const contents = await Bun.file(source).text();
  if (contents.includes("GetConsoleScreenBufferInfo")) return true;
  const patchFile = `${root}/patches/vercel-fx/windows-console-size.patch`;
  const result = await run(["git", "apply", patchFile], forkDir, true);
  if (result.code !== 0) {
    console.error(`Could not apply the pinned fx native Windows console patch: ${result.stderr}`);
    return false;
  }
  return true;
}

async function nativeSdkZigCompiler(): Promise<string | undefined> {
  if (process.env.YOLO_NATIVE_ZIG_COMPILER) return process.env.YOLO_NATIVE_ZIG_COMPILER;
  if (process.env.YOLO_ZIG_COMPILER) return process.env.YOLO_ZIG_COMPILER;
  if (process.platform === "win32" && process.env.LOCALAPPDATA) {
    const pinned = `${process.env.LOCALAPPDATA}/Aphrody/cache/zig/0.16.0/zig-x86_64-windows-0.16.0/zig.exe`;
    if (await Bun.file(pinned).exists()) return pinned;
  }
  return Bun.which("zig");
}

async function runUpstream(group: string | undefined, name: string | undefined, args: string[]): Promise<number> {
  if (group === "agent" && name === "fx") {
    const windowsWsl = process.platform === "win32";
    const binary = windowsWsl
      ? `${root}/forks/vercel-fx/zig-out/linux-x86_64-gnu/bin/fx`
      : `${root}/forks/vercel-fx/zig-out/bin/fx`;
    if (!(await Bun.file(binary).exists())) {
      console.error("Build fx from its pinned source first: bun tools/yolo-zig.ts build fx");
      return 1;
    }
    if (windowsWsl) {
      if (!Bun.which("wsl.exe")) {
        console.error("fx is Linux-only upstream; install WSL2 to run its Linux build from Windows.");
        return 1;
      }
      const linuxRoot = await wslPath(root);
      if (!linuxRoot) return 1;
      return await launch("wsl.exe", ["--exec", `${linuxRoot}/forks/vercel-fx/zig-out/linux-x86_64-gnu/bin/fx`, ...args], root);
    }
    return await launch(binary, args, `${root}/forks/vercel-fx`);
  }
  if (group === "browser" && name === "lightpanda") {
    const cwd = `${root}/forks/lightpanda-browser`;
    if (process.platform === "win32") {
      if (!Bun.which("wsl.exe")) {
        console.error("Lightpanda has no native Windows build. Install WSL and build its checkout there first.");
        return 1;
      }
      const linuxRoot = await wslPath(root);
      if (!linuxRoot) return 1;
      return await launch("wsl.exe", ["--exec", `${linuxRoot}/forks/lightpanda-browser/zig-out/bin/lightpanda`, ...args], root);
    }
    const suffix = process.platform === "win32" ? ".exe" : "";
    const binary = `${cwd}/zig-out/bin/lightpanda${suffix}`;
    if (!(await Bun.file(binary).exists())) {
      console.error("Build Lightpanda on Linux first with `make build` inside forks/lightpanda-browser.");
      return 1;
    }
    return await launch(binary, args, cwd);
  }
  if (group === "desktop" && name === "electrobun") {
    return await launch("hutch", args, `${root}/forks/electrobun`);
  }
  console.error("Usage: bun tools/yolo-zig.ts agent fx [args...]\n       bun tools/yolo-zig.ts browser lightpanda [args...]\n       bun tools/yolo-zig.ts desktop electrobun <hutch args...>");
  return 2;
}

async function buildUpstream(name: string | undefined, args: string[]): Promise<number> {
  if (name === "rust-ffi-windows" || name === "rust-ffi-windows-msvc") return await buildRustFfi("windows-msvc", args);
  if (name === "rust-ffi-windows-gnu") return await buildRustFfi("windows-gnu", args);
  if (name === "rust-ffi-linux") return await buildRustFfi("linux", args);
  if (name === "rust-ffi-windows-xwin") return await buildRustFfi("windows-xwin", args);
  if (name === "fx" || name === "fx-windows") {
    const zig = process.env.YOLO_ZIG_COMPILER ?? Bun.which("zig");
    if (!zig) {
      console.error("Zig was not found. Set YOLO_ZIG_COMPILER or install the pinned workspace toolchain.");
      return 127;
    }
    if (name === "fx-windows") {
      if (!(await ensureFxWindowsPatch())) return 1;
      return await launch(zig, [
        "build",
        "--summary",
        "all",
        "-Dtarget=x86_64-windows-msvc",
        "-Dcpu=baseline",
        "-Doptimize=ReleaseFast",
        "--prefix",
        "zig-out/windows-x86_64-msvc",
      ], `${root}/forks/vercel-fx`);
    }
    if (process.platform === "win32") {
      return await launch(zig, [
        "build", "--summary", "all", "-Dtarget=x86_64-linux-gnu.2.35",
        "-Dcpu=baseline", "-Doptimize=ReleaseFast", "--prefix", "zig-out/linux-x86_64-gnu",
      ], `${root}/forks/vercel-fx`);
    }
    return await launch(zig, ["build", "--summary", "all", "-Dcpu=baseline", "-Doptimize=ReleaseFast"], `${root}/forks/vercel-fx`);
  }
  if (name === "lightpanda") {
    if (process.platform === "win32") {
      if (!Bun.which("wsl.exe")) {
        console.error("Lightpanda has no native Windows build. Install WSL2, then build through its Linux checkout.");
        return 2;
      }
      const linuxFork = await wslPath(`${root}/forks/lightpanda-browser`);
      if (!linuxFork) return 1;
      return await launch("wsl.exe", ["--exec", "make", "-C", linuxFork, "build"], root);
    }
    return await launch("make", ["build"], `${root}/forks/lightpanda-browser`);
  }
  if (name === "native-windows-x64" || name === "native-windows-desktop") {
    const zig = await nativeSdkZigCompiler();
    if (!zig) {
      console.error("Zig 0.16.0 is required by the pinned Vercel Native SDK. Set YOLO_NATIVE_ZIG_COMPILER to its executable.");
      return 127;
    }
    const version = await run([zig, "version"], root, true);
    if (version.code !== 0 || version.stdout !== "0.16.0") {
      console.error(`The pinned Vercel Native SDK requires Zig 0.16.0; ${zig} reports ${version.stdout || "an unknown version"}. Set YOLO_NATIVE_ZIG_COMPILER to Zig 0.16.0.`);
      return 2;
    }
    if (name === "native-windows-desktop") {
      return await launch(zig, ["build", "-Dtarget=x86_64-windows", "-Doptimize=ReleaseSmall", "--prefix", "zig-out/yolo-win11", ...args], `${root}/forks/vercel-native/examples/hello`);
    }
    return await launch(zig, ["build", "cli", "-Dtarget=x86_64-windows", "-Doptimize=ReleaseSmall", "--prefix", "zig-out/yolo-windows-x64", ...args], `${root}/forks/vercel-native`);
  }
  console.error("Usage: bun tools/yolo-zig.ts build <fx|fx-windows|lightpanda|native-windows-x64|native-windows-desktop|rust-ffi-windows-msvc|rust-ffi-windows-gnu|rust-ffi-linux|rust-ffi-windows-xwin>\nDelta tools are part of the root `zig build` graph; Electrobun uses its upstream Hutch workflow.");
  return 2;
}

function help(): void {
  console.log("  bun tools/yolo-zig.ts build native-windows-x64|native-windows-desktop\n                          Build Vercel Native SDK CLI or WebView2 desktop app");
  console.log(`yolo-zig — Zig native workspace\n\nCommands:\n  bun run zig:build       Build the root CLI, C ABI, bsdiff, and bspatch\n  bun run zig:format      Check root Zig formatting\n  bun run forks:status    Show pinned source fork commits and worktree state\n  bun run doctor          Show host tools and supported platform routes\n  bun tools/yolo-zig.ts inspect windows\n                          Read Windows host data through bun:windows and WinClean\n  bun tools/yolo-zig.ts forks status --json\n                          Print fork revisions and worktree state as JSON\n  bun tools/yolo-zig.ts build rust-ffi-windows-msvc\n  bun tools/yolo-zig.ts build rust-ffi-windows-gnu\n  bun tools/yolo-zig.ts build rust-ffi-linux\n  bun tools/yolo-zig.ts build rust-ffi-windows-xwin --accept-ms-license\n                          Build the Zig ABI and Rust consumer through Cargo\n  bun tools/yolo-zig.ts build fx|lightpanda\n                          Build an upstream tool on a supported host\n  bun tools/yolo-zig.ts agent fx [args...]\n  bun tools/yolo-zig.ts browser lightpanda [args...]\n  bun tools/yolo-zig.ts desktop electrobun <hutch args...>\n                          Dispatch to the corresponding upstream tool`);
  console.log("  git submodule update --init --recursive\n                          Initialize complete upstream source trees");
  console.log("  bun tools/yolo-zig.ts delta create <old> <new> <patch> [options]\n                          Create a Zstandard TRDIFF10 update patch\n  bun tools/yolo-zig.ts delta apply <old> <output> <patch>\n                          Apply a trusted, previously authenticated patch");
}

const [group, action, ...args] = Bun.argv.slice(2);
if (group === "forks" && action === "status") {
  process.exitCode = await listForks(args);
} else if (group === "doctor" && !action) {
  process.exitCode = await doctor();
} else if (group === "inspect" && action === "windows") {
  process.exitCode = await inspectWindows();
} else if (group === "delta") {
  process.exitCode = await delta(action, args);
} else if (group === "build") {
  if (action === "root") {
    if (!(await ensureBsdiffCompatibilityPatch())) process.exitCode = 1;
    else {
      const zig = process.env.YOLO_ZIG_COMPILER ?? Bun.which("zig");
      if (!zig) {
        console.error("Zig was not found. Set YOLO_ZIG_COMPILER or install the pinned workspace toolchain.");
        process.exitCode = 127;
      } else {
        process.exitCode = await launch(zig, ["build", "--summary", "all", ...args], root);
      }
    }
  } else if (action === "rust-ffi-windows") {
    process.exitCode = await buildRustFfiWindows();
  } else {
    process.exitCode = await buildUpstream(action, args);
  }
} else if (group === "agent" || group === "browser" || group === "desktop") {
  process.exitCode = await runUpstream(group, action, args);
} else if (group === "help" || !group) {
  help();
} else {
  console.error(`Unknown command: ${[group, action].filter(Boolean).join(" ")}`);
  help();
  process.exitCode = 2;
}
