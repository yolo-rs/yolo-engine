---
name: nie-re-workflow
description: "Atlas-driven reverse-engineering loop for nie.exe (IEVR): search the RE surfaces with nie atlas, read the ranked gaps, pick the next forge target, run the measure loop. Use for: atlas, where are we, what next, coverage, forge, road to 100 %."
---

# nie-re-workflow

Follow [IECODE scope and execution](../../references/workflow.md).

Measure → index → rank → act once → measure again. Query `nie atlas status`, `search`, `gaps` and `next`; build an absent index only when local inputs are available. Persist each metric with the command that produced it; absent measurements are unknown, never fabricated zeroes.

Qualification order: forge output must match reference SHA-256; uemu compares actual binary functions bit for bit; data golden tests compare the complete family corpus. Never weaken these oracles. A data-gated empty MCP test proves nothing. Anchor addresses to the reference `.pdata` and fingerprint; KB builds may differ.

Read [commands, oracles and RE traps](references/details.md) before executing the selected stage. Keep forge-unit counts distinct from `cover.json` coverage; byte-exact data does not establish pixel fidelity.
