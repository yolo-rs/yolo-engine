---
name: ievr-terminologie
description: "Verify any Inazuma Eleven Victory Road term (format, extension, character/technique code, reversed symbol, virtual address, VFS path, table name) before stating it or writing it in code, a commit or docs. Use whenever an IEVR identifier appears."
---

# ievr-terminologie

Follow [IECODE scope and execution](../../references/workflow.md).

Verify identifiers against actual parser modules, native VFS queries or the current reference binary/KB. Never infer resource codes, format offsets, addresses or crate paths. `G4MD` and `G4MG` differ; `.g4nv` uses `NAVM`; `.cfg.bin` has RDBN and T2B branches.

Use `nie vfs chara` / `waza` for native VFS entities; only explicit `--db` selects the wiki mirror. Preserve hexadecimal address precision and binary identity. Read [term-specific verification and numeric contracts](references/details.md) for the identifier in question.
