---
name: yolo-re-uv-project
description: Maintain yolo-re's isolated Python RE/ML project under src/py with uv.
---

# yolo-re uv project

The only Python reverse-engineering environment for this repository is `src/py`. Edit `src/py/pyproject.toml`, regenerate its lock with `uv lock --project src/py`, and sync only the profile the task needs:

```powershell
uv sync --project src/py --locked --extra analysis --extra ie
uv run --project src/py --locked yolo-re-py --help
```

For ingestion, SQLite-backed RAG, Redis, MCP, and native PyGhidra, add `--extra ingest --extra storage --extra rag --extra mcp --extra ghidra`. `--extra full` and `--extra full-cuda` install the heavyweight whole-stack profiles, with CUDA using the explicit official cu134 index.

Use the project's Python 3.12 pin and run commands through `uv run --project src/py --locked`. Keep global standalone CLIs isolated with `uv tool`; never install Python packages globally or use `pip`/`pipx` for this project.
