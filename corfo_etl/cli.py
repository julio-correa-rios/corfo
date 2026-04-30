from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path


def main() -> None:
    parser = argparse.ArgumentParser(prog="corfo-etl", description="CORFO PDF → Supabase ETL")
    sub = parser.add_subparsers(dest="cmd", required=True)

    p_load = sub.add_parser("load", help="Parse PDF and load into Supabase")
    p_load.add_argument("pdf", type=Path, help="Path to CORFO informe PDF")
    p_load.add_argument("--dry-run", action="store_true", help="Parse only; print summary JSON")
    p_load.add_argument(
        "--parser",
        choices=["pypdf", "pdfplumber"],
        default="pypdf",
        help="Text extraction backend (pdfplumber: uv sync --extra pdfplumber)",
    )
    p_load.add_argument(
        "--no-replace",
        action="store_true",
        help="Do not delete existing vc_report with the same source_path first",
    )

    p_inspect = sub.add_parser("inspect", help="Parse PDF and print counts (no DB)")
    p_inspect.add_argument("pdf", type=Path)
    p_inspect.add_argument(
        "--parser",
        choices=["pypdf", "pdfplumber"],
        default="pypdf",
    )

    args = parser.parse_args()

    if args.cmd == "inspect":
        _inspect(args.pdf, args.parser)
        return

    if args.cmd == "load":
        _load(args.pdf, args.dry_run, args.parser, not args.no_replace)
        return


def _inspect(pdf: Path, backend: str) -> None:
    from corfo_etl.parse_pdf import parse_corfo_pdf

    if backend == "pdfplumber":
        try:
            import pdfplumber  # noqa: F401
        except ImportError:
            print(
                "Install pdfplumber: uv sync --extra pdfplumber",
                file=sys.stderr,
            )
            sys.exit(1)
    parsed = parse_corfo_pdf(str(pdf), text_backend=backend)
    print(
        json.dumps(
            {
                "title_hint": parsed.title_hint,
                "as_of_date": parsed.as_of_date.isoformat()
                if parsed.as_of_date
                else None,
                "line_summaries": len(parsed.line_summaries),
                "fund_lines": len([f for f in parsed.fund_lines if not f.is_subtotal]),
                "fund_subtotals_skipped": len(
                    [f for f in parsed.fund_lines if f.is_subtotal]
                ),
                "company_investments": len(parsed.company_investments),
            },
            indent=2,
        )
    )


def _load(pdf: Path, dry_run: bool, backend: str, replace_existing: bool) -> None:
    from corfo_etl.parse_pdf import parse_corfo_pdf
    from corfo_etl.supabase_load import get_client, load_parse_result

    if not pdf.is_file():
        print(f"File not found: {pdf}", file=sys.stderr)
        sys.exit(1)

    if backend == "pdfplumber":
        try:
            import pdfplumber  # noqa: F401
        except ImportError:
            print(
                "Install pdfplumber: uv sync --extra pdfplumber",
                file=sys.stderr,
            )
            sys.exit(1)

    parsed = parse_corfo_pdf(str(pdf), text_backend=backend)

    client = None if dry_run else get_client()

    result = load_parse_result(
        client,
        parsed,
        pdf_path=pdf,
        dry_run=dry_run,
        replace_existing=replace_existing,
    )
    print(json.dumps(result, indent=2, default=str))


if __name__ == "__main__":
    main()
