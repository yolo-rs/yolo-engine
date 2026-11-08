#!/usr/bin/env bun
// A deliberately narrow first fleet build lane: the dependency-free yolo-vps binary.
import { createHash } from "node:crypto";
import { resolve } from "node:path";

const args = Bun.argv.slice(2);
if (args.some((arg) => arg !== "--execute") || args.length > 1) {
  console.error("Usage: bun scripts/fleet-build-vps.ts [--execute]");
  process.exit(2);
}
const source = resolve(import.meta.dir, "../../yolo-vps");
const sourcePaths = Array.from(new Bun.Glob("src/**/*.rs").scanSync({ cwd: source, onlyFiles: true }), (path) => path.replaceAll("\\", "/")).sort();
if (!sourcePaths.includes("src/main.rs")) throw new Error("yolo-vps src/main.rs missing");
const paths = ["Cargo.toml", "Cargo.lock", ...sourcePaths];
const files = await Promise.all(paths.map(async (path) => {
  const data = new Uint8Array(await Bun.file(resolve(source, path)).arrayBuffer());
  return { path, data: Buffer.from(data).toString("base64"), sha256: createHash("sha256").update(data).digest("hex") };
}));
const ssh = Bun.which("ssh.exe") ?? Bun.which("ssh");
if (!ssh) throw new Error("OpenSSH client unavailable");
console.log("Lane: vps; project: yolo-vps; build: cargo --locked --offline --release; maximum 4 jobs; production deployment: none");
for (const file of files) console.log(`${file.sha256}  ${file.path}`);
if (!args.includes("--execute")) process.exit(0);

// Payload is generated locally from a fixed allowlist and verified again remotely.
const payload = Buffer.from(JSON.stringify(files)).toString("base64");
const script = `import base64, hashlib, json, os, pathlib, shutil, subprocess, tempfile\n` +
  `files = json.loads(base64.b64decode('${payload}'))\n` +
  `root = pathlib.Path.home() / '.cache' / 'yolo-build' / 'runs'\n` +
  `root.mkdir(parents=True, exist_ok=True)\n` +
  `run = pathlib.Path(tempfile.mkdtemp(prefix='yolo-vps-', dir=root))\n` +
  `for item in files:\n` +
  `    path = pathlib.PurePosixPath(item['path'])\n` +
  `    assert item['path'] in ('Cargo.toml', 'Cargo.lock') or (path.parts[0] == 'src' and '..' not in path.parts and path.suffix == '.rs')\n` +
  `    data = base64.b64decode(item['data'], validate=True)\n` +
  `    assert hashlib.sha256(data).hexdigest() == item['sha256']\n` +
  `    target = run / item['path']; target.parent.mkdir(parents=True, exist_ok=True); target.write_bytes(data)\n` +
  `env = os.environ.copy(); env['CARGO_TARGET_DIR'] = str(run / 'target'); env['CARGO_BUILD_JOBS'] = '4'\n` +
  `cache = shutil.which('sccache')\n` +
  `if cache: env['RUSTC_WRAPPER'] = cache\n` +
  `command = ['cargo', 'build', '--locked', '--offline', '--release']\n` +
  `if shutil.which('nice'): command = ['nice', '-n', '10'] + command\n` +
  `print('source_run=' + str(run), flush=True)\n` +
  `subprocess.run(command, cwd=run, env=env, check=True)\n` +
  `artifact = pathlib.Path(env['CARGO_TARGET_DIR']) / 'release' / 'yolo-vps'\n` +
  `digest = hashlib.sha256(artifact.read_bytes()).hexdigest()\n` +
  `receipt = {'files': {item['path']: item['sha256'] for item in files}, 'artifact': str(artifact), 'sha256': digest, 'cargo': subprocess.check_output(['cargo', '--version'], env=env, text=True).strip(), 'rustc': subprocess.check_output(['rustc', '--version'], env=env, text=True).strip(), 'sccache': bool(cache), 'jobs': 4}\n` +
  `(run / 'receipt.json').write_text(json.dumps(receipt, indent=2) + '\\n')\n` +
  `print('artifact=' + str(artifact), flush=True)\n` +
  `print('sha256=' + digest, flush=True)\n` +
  `subprocess.run([str(artifact), 'inventory'], check=True)\n`;
const proc = Bun.spawn([ssh, "-o", "BatchMode=yes", "-o", "ConnectTimeout=8", "-o", "StrictHostKeyChecking=yes", "vps", "python3 -"], {
  stdin: "pipe", stdout: "inherit", stderr: "inherit",
});
proc.stdin.write(script);
proc.stdin.end();
process.exit(await proc.exited);
