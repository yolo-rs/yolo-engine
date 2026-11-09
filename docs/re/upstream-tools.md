# Upstream RE toolchains

This workspace tracks upstream sources without vendoring release binaries.
Runtime installs stay explicit and local; CI and deployment scripts verify
release checksums before unpacking tools.

## Ghidra

- Source: [NationalSecurityAgency/ghidra](https://github.com/NationalSecurityAgency/ghidra)
- Source submodule path: `vendor/ghidra`
- Pin: `Ghidra_12.2_build`, commit
  `8ca9077040cc43cd790babcfccf19475622a3e9a`.
- The source submodule is intentionally uninitialized by default because the
  repository is large. Initialize it only for Ghidra source or extension work:
  `git submodule update --init --depth 1 -- vendor/ghidra`.
- The workstation runtime remains a user-managed Ghidra 12.1.4 installation at
  `GHIDRA_INSTALL_DIR`; the REA provider reads `GHIDRA_INSTALL_DIR` or
  `GHIDRA_HOME` and `JAVA_HOME`. It does not install or upgrade either tool.
- The REA bridge accepts both 12.1.x and 12.2.x. The official 12.2 ZIP was
  separately checksum-verified and exercised on Windows x64 with JDK 25; this
  validation runtime lives under the user cache and does not replace the
  configured 12.1.4 installation.
- The VPS worker uses the official Ghidra 12.2 release. Its release ZIP digest
  is `sha256:2c2cd776db3c1f6a097ba418922378ac3649cadd5e844a6f5f088ae628a7be67`,
  from the [official 12.2 release](https://github.com/NationalSecurityAgency/ghidra/releases/tag/Ghidra_12.2_build).
  `infra/ghidra/vps/up.sh` verifies this digest before extraction.
- A separate one-shot Alpine `linux/amd64` headless profile is available under
  `infra/ghidra/alpine/`. It runs as UID 10001 with a read-only target mount,
  a mounted output project directory, JDK 25 and `gcompat` for the Ghidra Linux
  native decompiler. The Ubuntu VPS worker is unchanged; see that directory's
  README for the run command and validation details.
- Apache-2.0 source license, NOTICE, and disclaimer remain available from the
  upstream source. REA also keeps the applicable license reference files in
  `packages/yolo-rea/licenses/`.

### Use and update

```powershell
bun run re ghidra-win probe
bun run re ghidra-win inspect .\sample.exe
```

After checking the upstream release/tag and REA provider compatibility, update
the source pin deliberately:

```powershell
git -C vendor/ghidra fetch origin --tags
git -C vendor/ghidra checkout <verified-release-commit>
git add vendor/ghidra
```

The local 12.1.4 runtime is deliberately not replaced by changing this source
gitlink.

## Rizin and Cutter

- Rizin is integrated as an upstream CLI provider by REA, not linked into
  `packages/iecode-cpp`. The provider uses the selected Rizin executable for
  static commands and debug sessions; set `REA_RIZIN_COMMAND` when it is not
  available as `rizin` on `PATH`.
- Cutter remains a separate GUI provider. REA's real-Cutter verification uses
  Cutter's Rizin-backed command interface and reports an unavailable provider
  when the executable or IPC bridge is missing.
- The local Rizin 0.9.1 CLI was verified on `C:\Windows\System32\whoami.exe`;
  `rizin -q -c ij <binary>` returned architecture, format, and file-size
  metadata. `bun run check:polyglot` performs this read-only PE probe on
  Windows when Rizin is installed, and reports an optional skip otherwise.
- Upstream source and Windows runtime installers are not copied into this
  workspace. For offline deployments, retain the upstream installer hash and
  license/provenance records with the machine image.

## Magika

- Source: [google/magika](https://github.com/google/magika)
- Source submodule path: `vendor/magika`
- Pin: commit `d92b3c5f6c35cc4dcaea3aaa51ec1a3350130405` from the canonical
  upstream repository.
- The checked-in TypeScript bridge resolves the yolo-re root rather than
  inheriting `BUN_OS_ROOT` or `BUN_ENGINE_HOME`, so Magika setup always targets
  `yolo-re/vendor/magika/python`.
- `bun run re magika setup` runs upstream `uv sync --locked --no-dev` against
  the submodule's `python/uv.lock`. This builds Magika's real PyO3 extension
  with the local Rust toolchain. The model inference and JSON prediction data
  come from Google's upstream `Magika` API.
- Upstream license: Apache-2.0, included in `vendor/magika/LICENSE`.

Update Magika by selecting and reviewing an upstream commit, then updating the
submodule gitlink. Rebuild the upstream Python project and verify the REA
provider before changing the pin:

```powershell
git -C vendor/magika fetch origin
git -C vendor/magika checkout <verified-upstream-commit>
uv sync --project vendor/magika/python --locked --no-dev
git add vendor/magika
```

No Magika source, Python virtual environment, model, or runtime dependency is
owned by Bun OS after the migration.
