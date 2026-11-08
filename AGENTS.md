# AGENTS.md — YOLO Engine 6.0 (`C:\src\yolo-engine`)

## 1. Role & Architecture
`C:\src\yolo-engine` is the unified **YOLO Engine 6.0 (`UE6`)** monorepo replacing Epic Games Unreal Engine 6 in pure Rust 2024, Upstream Bun v1.4.4+, Zig 0.15+, and C11/C++20, and absorbing `yolo-re`, `yolo-cross`, and `yolo-zig`.

- **46 `yolo-rs` Forks**: Indexed in [`Engine/Source/ThirdParty/yolo-rs-forks.json`](file:///C:/src/yolo-engine/Engine/Source/ThirdParty/yolo-rs-forks.json) and [`Engine/Build/Commit.gitdeps.xml`](file:///C:/src/yolo-engine/Engine/Build/Commit.gitdeps.xml).
- **11 Platform SDKs & 8 Store Publishers**: Implemented in [`Engine/Source/Runtime/yolo-engine-platforms-blueprints-ffi/src/lib.rs`](file:///C:/src/yolo-engine/Engine/Source/Runtime/yolo-engine-platforms-blueprints-ffi/src/lib.rs).
- **Game Porters (`Criware`, `Level-5 nie*`, `Bandai Namco UE4/5/6`) & 100% Offline Ownership Verification**: Implemented in [`Engine/Source/Runtime/yolo-engine-re-game-porters/src/lib.rs`](file:///C:/src/yolo-engine/Engine/Source/Runtime/yolo-engine-re-game-porters/src/lib.rs).
- **Bun Bundler Plugin (20 `yolo:*` Virtual Modules)**: Implemented in [`packages/bun-plugin-yolo-engine/src/index.ts`](file:///C:/src/yolo-engine/packages/bun-plugin-yolo-engine/src/index.ts).

## 2. Verification Workflows
- `cargo test --workspace` (12/12 Rust workspace tests)
- `bun run test` (11/11 Bun test suites, 91 assertions)
- `bun run deploy/vps/sync-ue6-vps.ts` (syncs `/srv/build/sources/unreal-engine-6-lite` on `vps`)

## 3. Operating Rules (NHITL)
- Strictly zero emojis in code, commits, or logs.
- Pure Rust 2024 + Upstream Bun v1.4.4+ + Zig 0.15+; zero Node.js, npm, yarn, or pnpm.
