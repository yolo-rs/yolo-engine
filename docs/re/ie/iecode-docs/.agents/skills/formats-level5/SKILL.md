---
name: formats-level5
description: "Level-5/Criware formats of Inazuma Eleven Victory Road (CPK, cfg.bin RDBN/T2B, G4TX/G4MD/G4MG/G4SK, NAVM, PXCL, HCA/ACB/AWB, USM, @UTF). Use when reading, decoding, writing or porting one, or identifying a file by its magic."
---

# formats-level5

Follow [IECODE scope and execution](../../references/workflow.md).

Identify by magic and actual parser, not extension: `NAVM`/`.g4nv`, separate G4MD/G4MG, and RDBN/T2B `.cfg.bin` branches. Use `FileFormat`, native VFS/MCP decoding and existing Rust owners. Never invent offsets or assume an encoder exists. Confirm supported round trips and complete-family golden evidence before claiming a port.

Read [decoder routes and family index](references/details.md), then only the needed format sheet: [containers](references/conteneurs.md), [configuration](references/configuration.md), [models](references/modeles-animation.md), [textures](references/textures.md), [world](references/monde.md), [audio/video](references/audio-video.md). Search existing data modules by marker before adding a family.
