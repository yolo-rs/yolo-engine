---
name: mod-package
description: Validate and inspect mod package manifests and use common package safety conventions across GameBanana, Modrinth, Thunderstore and mod managers.
---

# Mod package metadata

Use `bun run re mod validate <manifest.json>` or MCP `mod_manifest_validate` to verify the YOLO-RE v1 package contract before sharing an asset package. Validation checks semantic version, target game, HTTPS source, a license declaration, safe relative source/destination paths, unique destinations and the SHA-256 of every payload file. It never installs a package or executes scripts.

The contract intentionally uses explicit target game/version metadata and content hashes. It complements platform manifests rather than claiming to replace them: Thunderstore uses its own `manifest.json` and dependency identifiers, Modrinth `.mrpack` has `modrinth.index.json`, and Vortex extensions have their own discovery manifest. Preserve the native manifest when publishing to those platforms.

## Release checklist

- Record exact game IDs/build ranges and supported platforms.
- Include only redistributable files; prefer patches/deltas where game assets are copyrighted.
- Pin payload SHA-256 values and publish source/release URLs.
- State license and attribution for every third-party asset.
- Declare dependencies and conflicts; test clean install and removal with the target manager.
- Include reversible deployment/backup instructions and a changelog for each release.

References: [Thunderstore package manifest](https://wiki.thunderstore.io/mods/creating-a-package), [Modrinth modpack format](https://support.modrinth.com/en/articles/8802351-modrinth-modpack-format-mrpack), and [Vortex extension packaging](https://github.com/Nexus-Mods/Vortex/wiki/How-to-package-a-game-extension).
