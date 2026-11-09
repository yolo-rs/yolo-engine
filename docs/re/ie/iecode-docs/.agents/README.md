# Local agent tools

[AGENTS.md](../AGENTS.md) is the sole repository instruction contract;
[PLAN.md](../PLAN.md) is the active execution ledger.

| Skill                                | Source and boundary                                                                                                                 |
| ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------- |
| [Dust CLI](skills/dust-cli/SKILL.md) | Thin Python client for an externally supplied compatible headless Dust TCP server; the client is owned by `crates/emu/cli/dust-cli` |
| Switch decompilation                 | Moved to the Bun OS RE plugin: `packages/re/plugin/skills/switch-reverse`                                                           |

Skill adapters do not own emulator source or another Cargo workspace.
The removed Dust snapshot is recorded in
[its source mapping](../docs/upstream/dust/DUST-CLI-SNAPSHOT.md).
Historical Switch/Ruzu agent notes are indexed under
[the Ruzu history](../docs/ruzu/history/agent-state/).
