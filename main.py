"""Backward-compatible entrypoint; prefer `uv run corfo-etl`."""

from corfo_etl.cli import main

if __name__ == "__main__":
    main()
