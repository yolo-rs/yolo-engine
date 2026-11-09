---
name: gamebanana
description: Search and inspect public GameBanana submissions through the read-only GameBanana API, with links to original mod pages.
---

# GameBanana discovery

Use the REA command or MCP tools to search public GameBanana listings and inspect a mod profile. Search returns listing metadata and the authoritative profile URL; profile inspection returns the API's raw profile data.

## CLI

```sh
bun run re gamebanana search "Inazuma Eleven" --limit 20
bun run re gamebanana search "Victory Road" --game-id 20069 --page 2 --limit 10
bun run re gamebanana mod 627212
```

Limits: page is 1–10000, requested page size is 1–50, query is 1–200 characters. Game-scoped search uses the public `Mod/Index` endpoint and filters the returned page locally by query; global search uses `Util/Search/Results`. The client only makes read requests. It does not download, extract, or install mod files. Confirm game/version requirements and permissions on the author's page before using any download.

## MCP

- `gamebanana_search` accepts `query`, optional `page`, `limit`, and GameBanana `gameId`.
- `gamebanana_mod` accepts the numeric `id` from a GameBanana profile URL.

GameBanana API endpoint shapes can change. API errors are returned to the caller rather than replaced with cached or fabricated data.
