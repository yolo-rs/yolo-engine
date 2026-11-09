---
name: yolo-re-google
description: Single-owner Reverse Engineering, Auto-ML (Magika), Ghidra Sleigh Decompiler, Electron Fuse/DPAPI/AES-256-GCM Decryptor, ASAR Code Extractor, and Electron/Tauri/GPUI Feature Matrix & Migration Plan Generator for Google Windows, Gemini Desktop, and Antigravity (agy) targeting Gemini 4 Argon & Carbon.
---

# `yolo-re-google` — Google, Gemini Desktop & Antigravity Reverse Engineering Skill

`packages/yolo-re-google` (`@yolo/re-google`) in `C:\src\yolo-re` is the single domain owner for reverse engineering, binary triage, decompilation, Electron decryption/patching, and GPUI migration planning across the Google, Gemini Desktop (`Gemini.exe`), and Antigravity (`agy.exe`) ecosystem.

## Capabilities & MCP Tools (`yolo-re-mcp`)

1. **`google_app_setup` (`setupGeminiWindowsAppBinary`)**:
   - Resolves the official Google Omaha 3.0 / Update2 installer manifest (`https://dl.google.com/gemini/windows/installers/GeminiSetup.exe`), `agy.exe`, extracted `app.asar` modules (`main.js`, `preload.js`, `voice_bridge_native.js`, `top_bar.html`, `stc_pill.html`), and the decrypted 24-cookie DPAPI/AES-256-GCM Google session vault.
2. **`google_re_analyze` (`runAutoMlAndBinaryRe`)**:
   - Executes native Rust `bunre` (`crates/yolo-re-core`) PE64/ELF/Mach-O triage, `analyze_google` endpoint/OAuth/gRPC/WGA extraction, `iced-x86` disassembly, and `ghidra-decompiler` Sleigh P-code C decompilation.
3. **`electron_decrypt_and_extract` (`decryptAndExtractElectronApp`)**:
   - Decodes Electron Fuse V1 wires (`dL7pKGdnNz796PbbjQWNKmHXBZaB9tsX`), classifies extracted ASAR payloads with `MagikaDetector`, extracts `ipcMain`/`ipcRenderer` channels and `.node` native addons, and audits the DPAPI + AES-256-GCM cookie vault.
4. **`generate_gpui_migration_matrix` (`generateFeatureMatrixAndMigrationPlan`)**:
   - Generates `var/reports/yolo-re-google-migration-plan.json` and `var/reports/yolo-re-google-migration-plan.md` comparing Electron (`Gemini.exe`), Tauri v3 (`WebView2`), and Native Rust GPUI + Upstream Bun (`Carbon` + `yolo-gpui`).

## CLI Usage

```bash
bun run --cwd C:/src/yolo-re packages/yolo-re-google/src/cli.ts
```
