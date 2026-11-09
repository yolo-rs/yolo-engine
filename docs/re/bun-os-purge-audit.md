# Bun OS RE source purge audit

Audit date: 2026-11-04

This audit removes only exact migrated duplicates. Shared crates and sources
with active Bun OS consumers remain in place.

## Exact copies verified and purged

The five Python tools below were byte-for-byte identical to copies under
`yolo-re/tools/ie/re/` (SHA-256 compared immediately before removal):

- `packages/iecode-scripts/re/extent.py`
- `packages/iecode-scripts/re/extract_save_editor_hooks.py`
- `packages/iecode-scripts/re/ievr_ultimate_team.py`
- `packages/iecode-scripts/re/vtable.py`
- `packages/iecode-scripts/re/xref.py`

Those exact files have been removed from the nested submodule index and
working tree. Destination copies remain intact. The nested repository remains
dirty for review, with unrelated existing modifications in
`upstream/gecko/data/game_index.json`,
`upstream/gecko/data/game_index_wii.json`, `upstream/nie/deploy-target.test.ts`,
`upstream/nie/deploy-target.ts`, and `upstream/nie/release-all.ts`. No
neighboring files were touched; no submodule commit or parent pointer update
was made.

Six additional exact copies were removed after a path-preserving SHA-256
comparison against `yolo-re/tools/ie/` and repository-wide consumer searches:

- `packages/iecode-scripts/audit/audit-serving-assets.py`
- `packages/iecode-scripts/forge/analyse_invalides.py`
- `packages/iecode-scripts/forge/analyse_loadconfig.py`
- `packages/iecode-scripts/forge/analyse_padding.py`
- `packages/iecode-scripts/forge/analyse_rdata.py`
- `packages/iecode-scripts/forge/mesure_decodable.py`

After an exact hash comparison, these Ghidra and vtable sources were also
removed from the Bun OS submodule; their yolo-re copies and setup instructions
remain under `tools/ie/`:

- `packages/iecode-scripts/dev/setup_ghidra.ps1`
- `packages/iecode-scripts/forge/verif_vtables.py`
- `packages/iecode-scripts/ghidra/ExportDecompiled.java`
- `packages/iecode-scripts/ghidra/ExportSingleFunction.java`
- `packages/iecode-scripts/ghidra/ExportSymbols.java`
- `packages/iecode-scripts/ghidra/IECODEAnalyzer.java`

`crates/aphrody-nie-index` is also retained in `bun-os`. It remains a Bun OS
workspace crate consumed by `aphrody-nie-cli`, `aphrody-nie-seed`,
`aphrody-nie-wasm`, `aphrody-nie-computer-use`, and `aphrody-nie-camera`.
Deleting it would break those workspace members.

The small `packages/re` facade has been migrated to
`tools/bun-os-re-facade/` with its MIT license, executable delegation, pipeline
re-export, and package metadata. Bun OS no longer lists `packages/re` or
`@bun-os/re` in its workspace/dependencies, and its root `re` command alias was
removed. The lockfile was regenerated with `bun install --lockfile-only`.

`packages/bun-engine` remains as shared format/emulation infrastructure. Its
IE-specific skill and Ghidra profile metadata links to `packages/re` were
removed. Its formats detector no longer dynamically imports the REA Magika
bridge; Magika remains available through yolo-re's REA and native feature.
The shared `bun-os-platform` file registry's Magika bridge into `packages/re`
was also removed. General engine format detection, emulator, WASM, and WGPU
code remain in Bun OS.

## Other paths retained

No other exact-copy source was both independently owned by the Bun OS root
repository and free of active Bun OS consumers in this audit. In particular,
`aphrody-nie-index` remains consumed by five Bun OS crates. `vendor/rea` is
retained because Bun OS still exposes the independent root `rea` command,
keeps `rea-agents` as a workspace package/version exception, initializes the
submodule through `scripts/setup-re-vendors.ts`, and lists it in the workspace
submodule profile. These consumers still rely on the canonical REA owner and
are separate from the removed `@bun-os/re` facade.

No exact copies remain in the scanned IEVR/Ghidra/vtable paths. The migrated
README and Ghidra setup script now reference `tools/ie/...` paths.
