---
name: pe-symbol-recovery
description: "Recover function/structure symbols in Windows PE and .NET binaries: stripped functions, call graphs, method tables, packed binaries. Use when asked what a stripped .exe/.dll does or to name its functions."
allowed-tools: Read, Grep, Glob, Bash
---

# pe-symbol-recovery

Follow [IECODE scope and execution](../../references/workflow.md).

Perform static-first PE/.NET symbol recovery for IECODE inputs. Use existing NIE `pe`, `re` and `index` owners; inspect PE machine type, exports/imports, `.pdata`, RTTI, string/constant references and call graphs before assigning names. Record inferred names as hypotheses until corroborated; anchor addresses to the exact reference binary.

Use [the NIE RE workflow](../nie-re-workflow/SKILL.md) for atlas/KB/forge qualification. Managed metadata or supplied PDBs can guide recovery; never execute unknown binaries merely to inspect them. Live tracing belongs to `aphrody-nie-trace`, not this static procedure. Check native tool availability and `--help`; consume shared Aphrody capabilities only through their interface, within IECODE scope.
