# Build lane: yolo-vps on vps

`bun scripts/fleet-build-vps.ts` prints the lane and SHA-256 of the current
local Cargo manifest, lockfile and Rust source files. Add `--execute` to send
that minimal snapshot over the configured SSH alias `vps` and build it there.
The snapshot includes local uncommitted source changes; the printed digests
identify the actual input, not a Git revision.

The builder uses a fresh directory under `~/.cache/yolo-build/runs`, a separate
Cargo target directory for each run, `cargo build --locked --offline --release`,
at most four jobs, `nice -n 10` where available and `sccache` where available.
It verifies every input digest remotely, writes `receipt.json` with source and
artifact digests and toolchain versions, then runs the binary's `inventory`
command. Builds can fail when the project gains dependencies not already cached
or requires inputs other than the manifest, lockfile and Rust files. This lane
does not transfer secrets, synchronize the whole workspace, deploy an artifact,
or schedule jobs on `bunos` or `prod`.

On 2026-11-04 a build and inventory check succeeded on `vps` with Cargo and
rustc 1.99.1. The run is
`~/.cache/yolo-build/runs/yolo-vps-gye12mf5`; the artifact SHA-256 is
`5beda341029ed08b5d7547edb990efcf5a7278e82a0b3fae40b2c7cdf5f40d47`.
This single small build does not qualify the rest of the workspace, cross
targets, binary compatibility with production, or a high-load schedule.
