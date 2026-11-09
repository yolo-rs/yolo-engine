---
name: nie-architecture
description: "Settled NIE (Inazuma Eleven Victory Road) architecture: one library owner per capability behind thin API/CLI/MCP/web bindings, and the native game UI as a separate reconstruction target. Use before placing NIE code or adding a parser, UI or binding."
---

# nie-architecture

Follow [IECODE scope and execution](../../references/workflow.md).

Keep capabilities in their existing Rust library owner; API, CLI, MCP, FFI and web adapters remain thin. Native game reconstruction and shared application behavior have separate acceptance criteria. Reuse native resources with verified locale, VFS and hash provenance; captures never become runtime screen textures.

Read [ownership and resource contracts](references/details.md) when placing a capability or migrating a consumer. Confirm current manifests before using a historical path. Application UI is canonical in Aphrody `packages/ui/app-ui` and `crates/ui/*`; the IECODE browser remains `apps/web`.
