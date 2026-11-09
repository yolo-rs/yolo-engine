---
name: nie-monorepo
description: "Navigate the NIE (IEVR) Rust crates and Bun packages inside the IECODE workspace: pick the existing owner, dependency and validation conventions, and commit hygiene. Use before placing files, changing NIE packages or running NIE builds and tests."
---

# nie-monorepo

Follow [IECODE scope and execution](../../references/workflow.md).

Find the owner in root Cargo/Bun/Python/.NET/CMake manifests; preserve one graph per language and existing features. NIE libraries live under `crates/nie/aphrody-nie-*`; emulator logic under `crates/emu`; graphics research forks are retired, not build owners.

Read [layout and dependency procedures](references/details.md) for the selected language. Discover game sources through the shared native resolver and `nie vfs locate`; explicit hints, private remembered sources and Steam discovery precede a deliberate scan. Local and supported HTTP/SSH VFS are input sources, not a prerequisite dataset dump.
