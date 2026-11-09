# nie monorepo

Read `iecode:PLAN.md` (execution ledger) and `iecode:AGENTS.md` (the only agent contract) first, then the
nearest `AGENTS.md` before editing. Use `nie-architecture` for ownership boundaries. Historical
documents under `iecode:docs/` keep the terminology of their dated source checkout: their paths
and commands are not current instructions.

## Source layout

| Path (IECODE root)                                                     | Responsibility                                                                                                                                                                                      |
| ---------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `iecode:crates/nie/aphrody-nie-*`                                      | All NIE Rust owners (formats, data, lua, runtime, render, render3d, model-serve, wiki, explore, forge, re, index, pe, asm, trace, mcp, cli, ffi, wasm, ...); package name equals the directory name |
| `iecode:crates/emu/`, `aphrody:crates/native/gpu-backend`              | Emulation and the shared graphics adapter; graphics research forks are retired                                                                                                                      |
| `iecode:apps/web`                                                      | Browser frontend of IECODE (Bun workspace member)                                                                                                                                                   |
| `iecode:packages/{ieverse,iecode-homebrew,azalee,inagle,inagle-cross}` | Bun workspace members declared in the root `package.json`                                                                                                                                           |
| `iecode:src/`, `iecode:IECODE.sln`                                     | Managed (.NET) and C/C++ owners, plus Python extraction tools                                                                                                                                       |
| `iecode:docs/nie/`                                                     | NIE domain reference; `iecode:docs/documentation.json` classifies current vs retained documents                                                                                                     |
| `iecode:data/`, `iecode:var/`                                          | Private game resources, measurements and generated evidence; preserve user content                                                                                                                  |

The former NIE web application, its Bun packages and the Inacord Tauri host are not members of the
IECODE tree (`iecode:docs/nie/README.md`). The Aphrody desktop lives in the Aphrody monorepo
(`crates/ui/app`). A shared build entry alone does not prove that a capability works in the browser.

## Dependency ownership

- Root `Cargo.toml` owns dependency versions and local crate paths. Members use
  `workspace = true`, retaining role-specific features, optional flags and target conditions.
  Rust package IDs follow the `aphrody-` convention (checked by `bun scripts/validation/rust-crate-names.ts`).
- Cargo path dependencies on Aphrody crates require the sibling Aphrody checkout (`../aphrody`);
  `APHRODY_ROOT` only selects shared operations, it does not rewrite Cargo paths.
- SQLite and PostgreSQL sessions and migration runners belong to `aphrody-nie-sql`;
  `aphrody-nie-explore` is the adapter. Do not reintroduce a parallel SQL stack.
- Root `package.json` owns Bun workspaces and catalogs; keep one root `bun.lock` (`bunfig.toml`
  uses the isolated linker). A library owns its direct imports.

## Scoped commands

Run from the IECODE root. Select gates for the changed owners; narrowest first.

```bash
bun run check:workspace            # layout, Bun workspace, crate-name and script-layout checks
bun run docs:check                 # documentation links and agent entry points
cargo check -p aphrody-nie-<x> --locked
cargo test  -p aphrody-nie-<x> --locked <test-filter>
bun run typecheck                  # Bun packages (typecheck:web for apps/web)
```

`bun run check:all` is the broad gate. Never run `cargo build --workspace --all-targets` on a
constrained host. Python commands go through `uv run` (root `pyproject.toml`).

## Source discovery

Use the shared native resolver and `nie vfs locate`. Explicit hints/environment, private remembered sources, ancestors and Steam discovery precede an explicit scan; supported HTTP/SSH inputs use native VFS. Verify consumer-specific current help.
