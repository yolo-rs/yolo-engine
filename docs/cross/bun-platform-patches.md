# Bun platform patch queue

`yolo-cross` owns platform build and toolchain patches for Bun. This keeps
Windows/MSVC and cross-compilation work outside the runtime fork. The runtime
mirror remains patch-free; runtime changes belong in `yolo-bun` only when they
extend Bun's own APIs or compatibility surface.

The queue under `patches/bun/` pins each patch to a full upstream commit and
SHA-256. `bun run bun:patches` verifies the patch files and prints the planned
revision. Add `-- --source <path>` to require an exact, clean Bun checkout and
run one combined `git apply --check` for the full patch set without changing
it. Add `--execute` only to apply the complete patch set after all checks pass.
The manifest rejects duplicate names, non-patch paths, invalid digests, and
dirty or mismatched checkouts.

The current Windows code-generation patch reduces command-line length by
emitting repository-relative bindgen paths. Its receipt records byte-identity
comparisons for generated output in the measured Windows configuration. A Windows
release/ThinLTO binary was built with MSVC 14.51 headers, but its AOT compile
did not finish in the observed fixture. Its Bun object and the prebuilt WebKit
object used different return ABIs for `std::partial_ordering`. The WebKit
header checksum matches the CRT 14.44.17.14 package pinned by Bun's cross-build
CI. A separate build using that sysroot completed and compiled and ran one AOT
fixture. Broader AOT and toolchain qualification remain open.
Performance parity is still unverified. See
[`patches/bun/windows-codegen-relative-paths.receipt.json`](../patches/bun/windows-codegen-relative-paths.receipt.json).

For WebKit revision `4d45755fed4aeef19e95beb90d3d0c884a2812bd`, run
`bun scripts/bun-webkit-abi.ts --webkit-commit 4d45755fed4aeef19e95beb90d3d0c884a2812bd --compare <path-to-msvc-include/compare>`
before compiling. It compares the selected header with the known 14.44 header
fingerprint; a match is only one compatibility check, not a complete ABI proof.
On Windows, `--include-env` may replace `--compare <path>` to inspect the first
`compare` file in `INCLUDE` order. Explicit compiler include flags and other
search paths can take precedence, so verify the actual compiler invocation too.
