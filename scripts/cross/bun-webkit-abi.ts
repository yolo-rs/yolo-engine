#!/usr/bin/env bun
// SPDX-License-Identifier: MIT OR Apache-2.0
// Check the known MSVC <compare> header used by a specific prebuilt WebKit.
import { join, resolve } from "node:path";

const args = Bun.argv.slice(2);
if (
  args[0] !== "--webkit-commit" ||
  !args[1] ||
  !(
    (args[2] === "--compare" && args.length === 4 && args[3]) ||
    (args[2] === "--include-env" && args.length === 3)
  )
) {
  console.error(
    "Usage: bun scripts/bun-webkit-abi.ts --webkit-commit <sha> (--compare <header> | --include-env)",
  );
  process.exit(2);
}
const manifestPath = join(
  import.meta.dir,
  "..",
  "patches",
  "bun",
  "windows-webkit-abi.json",
);
const manifest = await Bun.file(manifestPath).json();
if (
  manifest.schemaVersion !== 1 ||
  args[1] !== manifest.webkitCommit ||
  !/^[a-f0-9]{64}$/.test(manifest.expectedSha256)
) {
  throw new Error("Unknown WebKit revision or invalid ABI evidence manifest");
}
let header: string | undefined;
if (args[2] === "--compare") header = resolve(args[3]!);
else {
  if (process.platform !== "win32")
    throw new Error("--include-env requires Windows");
  for (const entry of (process.env.INCLUDE ?? "").split(";")) {
    const directory = entry.trim().replace(/^"|"$/g, "");
    if (!directory) continue;
    const candidate = resolve(directory, "compare");
    if (await Bun.file(candidate).exists()) {
      header = candidate;
      break;
    }
  }
  if (!header) throw new Error("No compare header found in INCLUDE");
}
const bytes = new Uint8Array(await Bun.file(header).arrayBuffer());
const actual = new Bun.CryptoHasher("sha256").update(bytes).digest("hex");
const matches = actual === manifest.expectedSha256;
console.log(
  JSON.stringify(
    {
      target: manifest.target,
      webkitCommit: manifest.webkitCommit,
      header,
      sha256: actual,
      matches,
      scope: `${manifest.evidence} Explicit compiler include flags and other header paths can override INCLUDE.`,
    },
    null,
    2,
  ),
);
if (!matches) process.exitCode = 1;
