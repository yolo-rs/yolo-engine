---
name: assembler-modeles-textures
description: "Assemble NIE (IEVR) 3D parts and textures (materials, UV, skeleton, GLB export) with the existing parsers: body/face/outfit seams, atlases, missing parts. Use when parts must be combined; not for writing a new parser."
---

# assembler-modeles-textures

Follow [IECODE scope and execution](../../references/workflow.md).

Anchor each body/face/outfit association in native metadata and keep uncertain joins explicit. Reuse `aphrody-nie-formats::assemble`, verified format parsers and existing Blender importers. Trace primitive → material → texture → image; check UV, skeleton, rest pose, weights, units and axes before merging.

Read [assembly and integration checks](references/details.md) for the selected consumer. Export a separate candidate, inspect seams and another orientation, and exercise supported animation when required. Keep original game inputs private; deliver association evidence, captures and unresolved pieces.
