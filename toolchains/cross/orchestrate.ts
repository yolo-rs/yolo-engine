import { resolve } from "node:path";

type Repository = {
  name: string;
  path: string;
  kind: "cargo" | "bun-package" | "container-images";
  targetCatalog: boolean;
};

type Workspace = { schemaVersion: number; repositories: Repository[] };
type Task =
  | "list"
  | "check"
  | "test"
  | "fmt"
  | "clippy"
  | "lint"
  | "bun:check"
  | "bun:fmt"
  | "bun:lint"
  | "aot:check"
  | "aot:explain"
  | "targets"
  | "submodules";

const workspace = (await Bun.file("workspace.json").json()) as Workspace;
const task = Bun.argv[2] as Task | undefined;
const tasks: Task[] = [
  "list",
  "check",
  "test",
  "fmt",
  "clippy",
  "lint",
  "bun:check",
  "bun:fmt",
  "bun:lint",
  "aot:check",
  "aot:explain",
  "targets",
  "submodules",
];

function validateWorkspace(value: Workspace): void {
  if (
    value.schemaVersion !== 1 ||
    !Array.isArray(value.repositories) ||
    value.repositories.length === 0
  ) {
    throw new Error(
      "workspace.json does not match workspace.schema.json (schemaVersion/repositories)",
    );
  }
  const names = new Set<string>();
  for (const repo of value.repositories) {
    if (
      !repo.name ||
      !repo.path ||
      !["cargo", "bun-package", "container-images"].includes(repo.kind) ||
      typeof repo.targetCatalog !== "boolean"
    ) {
      throw new Error(`Invalid repository entry: ${JSON.stringify(repo)}`);
    }
    if (names.has(repo.name))
      throw new Error(`Duplicate repository name: ${repo.name}`);
    names.add(repo.name);
  }
}

async function run(command: string[], cwd: string): Promise<number> {
  const child = Bun.spawn(command, {
    cwd,
    stdin: "inherit",
    stdout: "inherit",
    stderr: "inherit",
  });
  return await child.exited;
}

validateWorkspace(workspace);
if (!task || !tasks.includes(task)) {
  console.error(`Usage: bun orchestrate.ts <${tasks.join("|")}>`);
  process.exit(2);
}

function bunHelp(...args: string[]): string {
  const cwd = Bun.env.TEMP ?? Bun.env.TMPDIR ?? process.cwd();
  const result = Bun.spawnSync(["bun", ...args], { cwd });
  const decoder = new TextDecoder();
  return `${decoder.decode(result.stdout)}${decoder.decode(result.stderr)}`;
}

if (task === "lint" || task === "bun:lint") {
  if (!bunHelp("lint", "--help").includes("Usage: bun lint")) {
    console.error(
      "This workspace lint task requires an upstream Bun canary with the native `bun lint` command; stable Bun 1.4.4 does not expose it.",
    );
    process.exit(2);
  }
}
if (task === "aot:check" || task === "aot:explain") {
  if (!bunHelp("check", "--help").includes("--aot")) {
    console.error(
      "This workspace AOT task requires an upstream Bun canary with `bun check --aot`; stable Bun 1.4.4 does not expose this flag.",
    );
    process.exit(2);
  }
}

if (task === "list") {
  for (const repo of workspace.repositories)
    console.log(`${repo.name}\t${repo.kind}\t${repo.path}`);
  process.exit(0);
}

const root = process.cwd();
if (task === "targets") {
  const targetOwner = workspace.repositories.find((repo) => repo.targetCatalog);
  if (!targetOwner) throw new Error("No repository owns the target catalog");
  process.exit(await run(["cargo", "xtask", "ci-job", "target-matrix"], root));
}

if (task === "submodules") {
  process.exit(
    await run(["git", "submodule", "update", "--init", "--recursive"], root),
  );
}

const bunPackages = workspace.repositories.filter(
  (entry) => entry.kind === "bun-package",
);
const ignoredFormatDirectories = new Set([
  ".git",
  ".cache",
  "bin",
  "coverage",
  "data",
  "dist",
  "node_modules",
  "obj",
  "target",
  "vendor",
]);
const formatExtensions = new Set([
  ".css",
  ".html",
  ".js",
  ".jsx",
  ".json",
  ".json5",
  ".jsonc",
  ".md",
  ".mdx",
  ".toml",
  ".ts",
  ".tsx",
  ".yaml",
  ".yml",
]);
const rootQualityFiles = [
  "DEVELOPMENT.md",
  "README.md",
  "docs/migration/bun-os.md",
  "docs/toolchain-2026.md",
  "orchestrate.ts",
  "package.json",
  "workspace.json",
  "workspace.schema.json",
];

async function formatFiles(packageRoot: string): Promise<string[]> {
  const files: string[] = [];
  const glob = new Bun.Glob("**/*");
  for await (const path of glob.scan({
    cwd: packageRoot,
    onlyFiles: true,
    dot: true,
  })) {
    const parts = path.split(/[\\/]/);
    if (parts.some((part) => ignoredFormatDirectories.has(part))) continue;
    const extension = path.slice(path.lastIndexOf(".")).toLowerCase();
    if (formatExtensions.has(extension)) files.push(path);
  }
  return files.sort();
}

if (
  task === "bun:check" ||
  task === "bun:fmt" ||
  task === "bun:lint" ||
  task === "lint"
) {
  let failed = false;
  for (const repo of bunPackages) {
    console.log(`[${task}] ${repo.name}`);
    const packageRoot = resolve(root, repo.path);
    let command: string[];
    if (task === "bun:check") command = ["check", "--no-script", "--noEmit"];
    else if (task === "bun:lint" || task === "lint")
      command = ["lint", "--no-script"];
    else {
      const files = await formatFiles(packageRoot);
      const write = Bun.argv.includes("--write");
      command = ["fmt", ...(write ? [] : ["--check"]), "--no-script", ...files];
    }
    const status = await run(["bun", ...command], packageRoot);
    if (status !== 0) failed = true;
  }
  if (task === "bun:check") {
    const status = await run(
      ["bun", "check", "--no-script", "--noEmit", "orchestrate.ts"],
      root,
    );
    if (status !== 0) failed = true;
  } else if (task === "bun:lint" || task === "lint") {
    const status = await run(
      ["bun", "lint", "--no-script", "orchestrate.ts"],
      root,
    );
    if (status !== 0) failed = true;
  } else {
    const write = Bun.argv.includes("--write");
    const command = [
      "bun",
      "fmt",
      ...(write ? [] : ["--check"]),
      "--no-script",
      ...rootQualityFiles,
    ];
    const status = await run(command, root);
    if (status !== 0) failed = true;
  }
  process.exit(failed ? 1 : 0);
}

if (task === "aot:check" || task === "aot:explain") {
  console.log(
    "AOT static checks use this Bun version; they build no binary and do not claim cross-target AOT support.",
  );
  if (task === "aot:explain")
    console.log(
      "AOT explain mode reports code paths that remain on slower compiler paths.",
    );
  let failed = false;
  for (const repo of bunPackages) {
    const packageRoot = resolve(root, repo.path);
    const manifestPath = resolve(packageRoot, "package.json");
    if (!(await Bun.file(manifestPath).exists())) continue;
    const manifest = (await Bun.file(manifestPath).json()) as {
      name?: string;
      bin?: string | Record<string, string>;
    };
    const entries =
      typeof manifest.bin === "string"
        ? [[manifest.name ?? repo.name, manifest.bin] as const]
        : Object.entries(manifest.bin ?? {});
    for (const [name, entry] of entries) {
      const path = resolve(packageRoot, entry);
      if (!(await Bun.file(path).exists())) {
        console.error(
          `[aot:check] ${repo.name}/${name}: missing CLI entrypoint ${entry}`,
        );
        failed = true;
        continue;
      }
      console.log(`[aot:check] ${repo.name}/${name}: ${entry}`);
      const status = await run(
        [
          "bun",
          "check",
          "--no-script",
          "--aot",
          ...(task === "aot:explain" ? ["--explain"] : []),
          entry,
        ],
        packageRoot,
      );
      if (status !== 0) failed = true;
    }
  }
  process.exit(failed ? 1 : 0);
}

// Features whose dependencies live outside this repository are declared in the owning crate's
// `[package.metadata.yolo] external-features`; every other feature of every workspace member is
// enabled, which is `--all-features` minus the features this checkout cannot resolve.
async function workspaceFeatures(): Promise<string[]> {
  const proc = Bun.spawn(
    ["cargo", "metadata", "--format-version", "1", "--no-deps", "--locked"],
    { cwd: root, stdout: "pipe", stderr: "inherit" },
  );
  const [text, code] = await Promise.all([
    new Response(proc.stdout).text(),
    proc.exited,
  ]);
  if (code !== 0) throw new Error("cargo metadata failed");
  const metadata = JSON.parse(text) as {
    packages: {
      name: string;
      features: Record<string, string[]>;
      metadata?: { yolo?: { "external-features"?: string[] } } | null;
    }[];
  };
  const features: string[] = [];
  for (const pkg of metadata.packages) {
    const external = new Set(pkg.metadata?.yolo?.["external-features"] ?? []);
    for (const feature of Object.keys(pkg.features)) {
      if (feature !== "default" && !external.has(feature))
        features.push(`${pkg.name}/${feature}`);
    }
  }
  return features;
}

const featureArgs = ["test", "clippy"].includes(task)
  ? ["--features", (await workspaceFeatures()).join(",")]
  : [];

const cargoArgs: Partial<Record<Task, string[]>> = {
  check: ["check", "--workspace", "--all-targets", "--locked"],
  test: ["test", "--workspace", "--all-targets", ...featureArgs, "--locked"],
  fmt: ["fmt", "--all", "--", "--check"],
  clippy: [
    "clippy",
    "--workspace",
    "--all-targets",
    ...featureArgs,
    "--locked",
    "--",
    "-D",
    "warnings",
  ],
};
const cargoTaskArgs = cargoArgs[task];
if (!cargoTaskArgs) throw new Error(`No runner configured for ${task}`);
const cargoStatus = await run(["cargo", ...cargoTaskArgs], root);
if (task === "check") {
  let bunStatus = 0;
  for (const repo of bunPackages) {
    console.log(`[bun:check] ${repo.name}`);
    const status = await run(
      ["bun", "check", "--no-script", "--noEmit"],
      resolve(root, repo.path),
    );
    if (status !== 0) bunStatus = 1;
  }
  const rootStatus = await run(
    ["bun", "check", "--no-script", "--noEmit", "orchestrate.ts"],
    root,
  );
  if (rootStatus !== 0) bunStatus = 1;
  process.exit(cargoStatus === 0 && bunStatus === 0 ? 0 : 1);
}
if (task !== "test") process.exit(cargoStatus);

let failed = cargoStatus !== 0;
for (const repo of workspace.repositories.filter(
  (entry) => entry.kind === "bun-package",
)) {
  const status = await run(
    ["bun", "test", "--pass-with-no-tests"],
    resolve(root, repo.path),
  );
  if (status !== 0) failed = true;
}
process.exit(failed ? 1 : 0);
