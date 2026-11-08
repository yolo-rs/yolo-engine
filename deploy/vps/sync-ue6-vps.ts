#!/usr/bin/env bun
// SPDX-License-Identifier: MIT OR Apache-2.0
/**
 * YOLO Engine 6.0 (`UE6`) — VPS SSH Lightweight Unreal Engine 6 Clone & Sync Orchestrator
 *
 * Target: `vps` (`10.200.77.1`) -> `/srv/build/sources/unreal-engine-6-lite`
 * - Clones/syncs `https://github.com/yolo-rs/yolo-engine.git` (`--depth 1`).
 * - Configures `upstream-epic` (`https://github.com/EpicGames/UnrealEngine.git`) with sparse-checkout
 *   for `Engine/Build`, `Engine/Config`, `Engine/Source/Runtime`, `Engine/Source/Editor`, `Engine/Source/Programs`.
 * - Verifies remote `rustc --version` and `bun --version`.
 */

export interface VpsUe6SyncResult {
  readonly host: string;
  readonly targetDir: string;
  readonly originUrl: string;
  readonly upstreamEpicUrl: string;
  readonly sparsePaths: readonly string[];
  readonly rustcVersion: string;
  readonly bunVersion: string;
  readonly headCommit: string;
  readonly success: boolean;
}

export const SPARSE_CHECKOUT_PATHS = [
  "Engine/Build",
  "Engine/Config",
  "Engine/Source/Runtime",
  "Engine/Source/Editor",
  "Engine/Source/Programs",
] as const;

export async function syncUe6OnVps(host = "vps"): Promise<VpsUe6SyncResult> {
  const targetDir = "/srv/build/sources/unreal-engine-6-lite";
  const originUrl = "https://github.com/yolo-rs/yolo-engine.git";
  const upstreamEpicUrl = "https://github.com/EpicGames/UnrealEngine.git";

  const remoteScript = [
    "set -e",
    "export PATH=\"$HOME/.bun/bin:$HOME/.cargo/bin:/usr/local/bin:/usr/bin:/bin:$PATH\"",
    `sudo -n mkdir -p /srv/build/sources && sudo -n chown -R "$(id -un):$(id -gn)" /srv/build || mkdir -p /srv/build/sources`,
    `if [ ! -d "${targetDir}/.git" ]; then`,
    `  git clone --depth 1 "${originUrl}" "${targetDir}" || (mkdir -p "${targetDir}" && cd "${targetDir}" && git init && git remote add origin "${originUrl}")`,
    `fi`,
    `cd "${targetDir}"`,
    `git remote set-url origin "${originUrl}" 2>/dev/null || git remote add origin "${originUrl}"`,
    `git remote set-url upstream-epic "${upstreamEpicUrl}" 2>/dev/null || git remote add upstream-epic "${upstreamEpicUrl}"`,
    `git config core.sparseCheckout true`,
    `mkdir -p .git/info`,
    `printf "%s\\n" ${SPARSE_CHECKOUT_PATHS.map((p) => `"${p}"`).join(" ")} > .git/info/sparse-checkout`,
    `git fetch --depth 1 origin main 2>/dev/null && git reset --hard origin/main 2>/dev/null || true`,
    `echo "RUSTC_VER=$(rustc --version 2>/dev/null || echo 'rustc-unavailable')"`,
    `echo "BUN_VER=$(bun --version 2>/dev/null || echo 'bun-unavailable')"`,
    `echo "HEAD_SHA=$(git rev-parse --short HEAD 2>/dev/null || echo 'unborn')"`,
  ].join("\n");

  const proc = Bun.spawn(
    [
      "ssh",
      "-o",
      "BatchMode=yes",
      "-o",
      "ConnectTimeout=15",
      host,
      "bash -s",
    ],
    {
      stdin: new TextEncoder().encode(remoteScript),
      stdout: "pipe",
      stderr: "pipe",
    },
  );

  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);

  const rustcMatch = stdout.match(/RUSTC_VER=(.+)/);
  const bunMatch = stdout.match(/BUN_VER=(.+)/);
  const headMatch = stdout.match(/HEAD_SHA=(.+)/);

  if (exitCode !== 0) {
    throw new Error(`VPS sync failed (exit ${exitCode}): ${stderr || stdout}`);
  }

  return {
    host,
    targetDir,
    originUrl,
    upstreamEpicUrl,
    sparsePaths: SPARSE_CHECKOUT_PATHS,
    rustcVersion: (rustcMatch?.[1] ?? "").trim(),
    bunVersion: (bunMatch?.[1] ?? "").trim(),
    headCommit: (headMatch?.[1] ?? "").trim(),
    success: true,
  };
}

if (import.meta.main) {
  const result = await syncUe6OnVps(Bun.argv[2] ?? "vps");
  console.log(JSON.stringify(result, null, 2));
}
