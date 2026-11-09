# Chromium package ownership audit — 2026-11-04

## Result

`yolo-web` owns the browser wrapper and browser-engine integrations. The
maintained Bun package is `@yolo-web/chromium` in `yolo-web/packages/chromium`;
the release/catalog tracker is `yolo-web/packages/chromium-tracker`. The
wrapper exposes Chromium/CDP launch and connection helpers, browser profiles,
and an Obscura alias. It is not a Chromium engine source tree or a claim of
Blink/web-platform parity.

The active `yolo-cross` checkout contains no `packages/chromium`,
`crates/chromium`, or `@yolo-web/chromium` workspace/catalog entry. Its Cargo
workspace, Bun workspace/lock, and `workspace.json` do not include such a
package. There was therefore no duplicate source or catalog registration to
delete in this checkout, and no source was moved or rewritten during this
audit.

The remaining browser-name references in yolo-cross are build-host tooling:

- `packages/buncc/src/providers/gn.ts` locates or obtains Chromium `depot_tools`
  and runs GN/Ninja provider commands for Chromium-style builds.
- `tools/windows/chromium-toolchain-status.ps1` inspects the local Visual
  Studio/MSVC/SDK prerequisites before a browser-engine source build.
- `docs/windows-toolchains.md` directs engine source builds to yolo-web while
  retaining host qualification and cross compilation in yolo-cross.

These are cross-build capabilities, not browser code. The CEF/Tauri runtime is
not present in either active cross workspace; the archived integration remains
documented separately in `bun-os.md`.

## Evidence snapshot

Before updating this ownership record, the relevant cross workspace manifests,
catalog, GN/MSVC tooling, yolo-web manifests, and maintained Chromium package
were copied to the external snapshot
`C:\src\migration-backups\yolo-cross-chromium-ownership-2026-11-04`.
`snapshot-manifest.json` records file paths, byte sizes, and SHA-256 hashes.
The snapshot is evidence of the audited state; it is not a second active
package source.

## Verification

- `bun run list` in yolo-cross lists the active repositories; none is a Chromium
  browser package.
- `cargo metadata --no-deps --format-version 1` contains no package named
  Chromium, CEF, or Obscura. Cargo emits only its existing warning that the
  nested `cargo-zigbuild` release profile is ignored by the root workspace.
- `bun check --no-script packages/buncc/src/providers/gn.ts` reports no type
  errors in six provider files.
- `bun --filter '@yolo-web/chromium' check` reports no type errors in 15 files.
- `bun check --no-script packages/chromium-tracker/src` reports no type errors
  in six files; its catalog tests pass 3/3 and the complete tracker suite passes
  11/11. The live depot_tools author assertion now checks the returned
  `name <email>` shape rather than assuming a `google.com` domain.
