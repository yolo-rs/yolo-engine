---
name: yolo-re-python-re
description: Use yolo-re's isolated uv Python project for binary RE, target evidence ingestion, local RAG/ML, and native PyGhidra.
---

# yolo-re Python RE

Use `src/py` as the sole Python RE/ML project in this repository. Keep dependencies in its `pyproject.toml` and `uv.lock`; do not install into system Python or use pip. Magika comes from the pinned upstream checkout in `vendor/magika/python`.

## Setup

```powershell
uv sync --project src/py --locked --extra analysis --extra ie --extra ingest --extra storage --extra rag --extra mcp --extra ghidra
```

Use `--extra full` or `--extra full-cuda` for the heavyweight complete CPU/GPU RE and ML profile. The CUDA profile selects the official PyTorch CUDA 13.4 wheel index. Use narrow profiles for smaller installs.

## Project evidence and RAG

```powershell
uv run --project src/py --locked yolo-re-py projects
uv run --project src/py --locked yolo-re-py project init nie-ievr
uv run --project src/py --locked yolo-re-py project run nie-ievr --embed --no-rea
uv run --project src/py --locked yolo-re-py project embed nie-ievr
uv run --project src/py --locked yolo-re-py project search nie-ievr "archive formats"
uv run --project src/py --locked yolo-re-py project ask nie-ievr "How is this archive parsed?"
uv run --project src/py --locked yolo-re-py cache up nie-ievr
```

Each configured target has a separate SQLite database under `var/py/projects/<id>` with source provenance, SHA-256 fingerprints, classifications, analyses, Markdown reports, FTS5, and optional FastEmbed vectors. Redis is a volatile cache with a target-specific key prefix. Ingestion reads local files and public/private API sources but does not execute analyzed binaries. Binary triage is delegated to the yolo-re MCP tools.

Use `GITHUB_TOKEN`/`GH_TOKEN`, `GITLAB_TOKEN`, and `CONTEXT7_API_KEY` as process environment variables when available. Never write credentials into project TOML or evidence. `IEVR_GAME_DIR` and `NIE_GAME_DIR` add optional user-owned install roots to the `nie-ievr` project.

## Native PyGhidra

```powershell
uv run --project src/py --locked --extra ghidra yolo-re-py ghidra doctor
uv run --project src/py --locked --extra ghidra yolo-re-py ghidra analyze nie-ievr <triaged-binary>
uv run --project src/py --locked --extra ghidra yolo-re-py ghidra analyze nie-ievr <triaged-binary> --max-functions 50000 --batch-size 250 --timeout 3600
uv run --project src/py --locked --extra ghidra yolo-re-py ghidra functions nie-ievr <run-id> --offset 0 --limit 100
```

Point `GHIDRA_INSTALL_DIR` at an extracted upstream Ghidra 12+ distribution and keep `ghidra-stubs` pinned to that installation's version. PyGhidra runs in a child process to isolate JVM lifecycle. It validates the target with yolo-re triage, then persists SHA-256-bound function facts per analysis run into the project's `ghidra_function_facts` SQLite table in committed bounded batches. Ctrl+C, timeout, or a function cap leaves already committed facts available and records a cancelled, timed-out, or truncated result. This batch inventory is distinct from the richer live TypeScript REA/Ghidra analysis API.

Use the printed `run_id` with `ghidra functions` to read a bounded page. Partial and interrupted runs remain queryable. Raising `--max-functions` starts a new run from the beginning; inventory does not resume.

## Single-file CLI

```powershell
uv run --project src/py --locked --extra analysis yolo-re-forensic classify <file>
uv run --project src/py --locked --extra analysis yolo-re-forensic triage <binary>
uv run --project src/py --locked --extra analysis yolo-re-forensic disasm <binary> --arch x86-64 --offset 0
uv run --project src/py --locked --extra analysis yolo-re-forensic yara <file> --rule-text '<rule>'
```
