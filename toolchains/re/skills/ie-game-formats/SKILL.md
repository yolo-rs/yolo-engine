---
name: ie-game-formats
description: Inspect and extract Inazuma Eleven / Level-5 / Criware assets with the native Rust decoders exposed through REA and MCP.
---

# Inazuma Eleven and Criware format analysis

The Rust `aphrody-nie-formats` crate provides the shared parsers. REA forwards these operations to `bunre`; MCP exposes the same native operations. These commands analyze local files and do not execute game code.

## Build the native tool

```sh
cargo build -p yolo-re-core --bin bunre --features game-formats
```

Set `BUNRE_BIN` if the binary is outside `target/debug`.

## REA commands

```sh
bun run re ie-format inspect path/to/asset.bin
bun run re ie-format cpk-list path/to/archive.cpk
bun run re ie-format cpk-extract path/to/archive.cpk path/inside/archive.bin output.bin
bun run re ie-format cpk-extract-all path/to/archive.cpk output/directory
bun run re ie-format cpk-pack input/directory output.cpk
bun run re ie-format cri-audio path/to/cue-or-bank.acb output.wav
```

`inspect` auto-detects supported Level-5 / Criware structures and emits JSON. `cpk-list` reports the archive encryption state, entry offsets, stored and extracted sizes. Extraction requires an explicit output location and rejects archive paths that escape it. `cpk-pack` emits a plain, uncompressed CPK; it does not preserve an input archive's compression or encryption profile. `cri-audio` decodes supported HCA, ADX, AWB, and ACB payloads to PCM WAV.

## MCP tools

- `ie_format_inspect(path)`
- `ie_cpk_list(path)`
- `ie_cpk_extract(path, member, output)`
- `ie_cpk_extract_all(path, outputDir)`
- `ie_cpk_pack(inputDir, output)`
- `ie_cri_audio_decode(path, output)`

CriWare HCA/ADX and additional Level-5 formats share the crate decoder dispatcher. Unsupported or malformed files fail with an error; no format is guessed from its filename alone.
