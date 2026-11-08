#!/usr/bin/env bun
// SPDX-License-Identifier: MIT OR Apache-2.0
// Validate/apply version-pinned Bun platform patches owned by yolo-cross.
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

type Queue = {
  schemaVersion: 1;
  upstreamCommit: string;
  patches: Array<{ file: string; sha256: string }>;
};

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const queue = (await Bun.file(
  join(root, "patches", "bun", "queue.json"),
).json()) as Queue;
const args = Bun.argv.slice(2);
let execute = false;
let source: string | undefined;
for (let i = 0; i < args.length; i++) {
  if (args[i] === "--execute" && !execute) execute = true;
  else if (args[i] === "--source" && !source && args[i + 1])
    source = resolve(args[++i]!);
  else {
    console.error(
      "Usage: bun run bun:patches [--source <bun-checkout>] [--execute]",
    );
    process.exit(2);
  }
}

function git(sourcePath: string, ...gitArgs: string[]): string {
  const result = Bun.spawnSync(["git", "-C", sourcePath, ...gitArgs], {
    stdout: "pipe",
    stderr: "pipe",
  });
  if (result.exitCode !== 0) {
    throw new Error(
      `git ${gitArgs.join(" ")} failed: ${result.stderr.toString().trim()}`,
    );
  }
  return result.stdout.toString().trim();
}

if (queue.schemaVersion !== 1 || !/^[0-9a-f]{40}$/.test(queue.upstreamCommit))
  throw new Error("Invalid Bun patch queue schema or upstream commit");

const patches: Array<{ file: string; sha256: string; path: string }> = [];
const patchNames = new Set<string>();
if (!Array.isArray(queue.patches))
  throw new Error("Bun patch queue must contain a patches array");
for (const item of queue.patches) {
  if (
    !/^[a-z0-9][a-z0-9._-]*\.patch$/.test(item.file) ||
    !/^[0-9a-f]{64}$/.test(item.sha256) ||
    patchNames.has(item.file)
  )
    throw new Error(`Invalid patch entry: ${JSON.stringify(item)}`);
  patchNames.add(item.file);
  const path = join(root, "patches", "bun", item.file);
  const actual = new Bun.CryptoHasher("sha256")
    .update(await Bun.file(path).arrayBuffer())
    .digest("hex");
  if (actual !== item.sha256) throw new Error(`SHA-256 mismatch: ${item.file}`);
  patches.push({ ...item, path });
}

if (!source) {
  console.log(
    JSON.stringify(
      {
        action: "plan",
        upstreamCommit: queue.upstreamCommit,
        patchCount: patches.length,
        patches: patches.map(({ file, sha256 }) => ({ file, sha256 })),
        execute:
          "bun run bun:patches -- --source <clean-bun-checkout> --execute",
      },
      null,
      2,
    ),
  );
  process.exit(0);
}

const head = git(source, "rev-parse", "HEAD");
if (head !== queue.upstreamCommit)
  throw new Error(
    `Bun checkout HEAD ${head} does not match pinned ${queue.upstreamCommit}`,
  );
if (git(source, "status", "--porcelain"))
  throw new Error(`Refusing to patch a dirty Bun checkout: ${source}`);

const patchPaths = patches.map(({ path }) => path);
if (patchPaths.length > 0) git(source, "apply", "--check", ...patchPaths);
if (!execute) {
  console.log(
    JSON.stringify(
      { action: "check-only", source, head, patchCount: patches.length },
      null,
      2,
    ),
  );
  process.exit(0);
}
if (patchPaths.length > 0) git(source, "apply", ...patchPaths);
console.log(
  JSON.stringify(
    { action: "applied", source, head, patchCount: patches.length },
    null,
    2,
  ),
);
