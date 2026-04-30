from __future__ import annotations

from datetime import date
from decimal import Decimal
from pathlib import Path
from typing import Any

from supabase import Client, create_client

from corfo_etl.models import ParseResult
from corfo_etl.normalize import normalize_company_name


def get_client() -> Client:
    import os

    from dotenv import load_dotenv

    load_dotenv()
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        raise SystemExit(
            "Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env (project root)."
        )
    return create_client(url, key)


def _num(d: Decimal) -> float:
    return float(d)


def delete_report_cascade(client: Client, report_id: int) -> None:
    client.table("vc_report").delete().eq("id", report_id).execute()


def _collect_line_codes(parsed: ParseResult) -> set[str]:
    codes: set[str] = set()
    for s in parsed.line_summaries:
        codes.add(s.line_id)
    for fl in parsed.fund_lines:
        if not fl.is_subtotal:
            codes.add(fl.line_id)
    for ci in parsed.company_investments:
        codes.add(ci.line_id)
    return codes


def ensure_corfo_lines(client: Client, parsed: ParseResult) -> None:
    """Insert missing línea codes so FK checks pass (migration seed may be absent)."""
    codes = _collect_line_codes(parsed)
    if not codes:
        return
    rows = [{"line_code": c} for c in sorted(codes)]
    client.table("corfo_line").upsert(
        rows,
        on_conflict="line_code",
        ignore_duplicates=True,
    ).execute()


def find_report_by_source(client: Client, source_path: str) -> int | None:
    r = (
        client.table("vc_report")
        .select("id")
        .eq("source_path", source_path)
        .limit(1)
        .execute()
    )
    rows = r.data or []
    return int(rows[0]["id"]) if rows else None


def load_parse_result(
    client: Client | None,
    parsed: ParseResult,
    *,
    pdf_path: Path,
    dry_run: bool = False,
    replace_existing: bool = True,
) -> dict[str, Any]:
    source = str(pdf_path.resolve())
    as_of: date = parsed.as_of_date or date.today()

    if dry_run:
        return {
            "dry_run": True,
            "source_path": source,
            "as_of_date": as_of.isoformat(),
            "line_summaries": len(parsed.line_summaries),
            "fund_lines": len([f for f in parsed.fund_lines if not f.is_subtotal]),
            "fund_subtotals": len([f for f in parsed.fund_lines if f.is_subtotal]),
            "company_investments": len(parsed.company_investments),
        }

    if client is None:
        raise ValueError("client is required when dry_run is False")

    ensure_corfo_lines(client, parsed)

    if replace_existing:
        existing_id = find_report_by_source(client, source)
        if existing_id is not None:
            delete_report_cascade(client, existing_id)

    ins = (
        client.table("vc_report")
        .insert(
            {
                "title": parsed.title_hint[:500] if parsed.title_hint else None,
                "as_of_date": as_of.isoformat(),
                "source_path": source,
            }
        )
        .execute()
    )
    if not ins.data:
        raise RuntimeError("vc_report insert returned no data")
    report_id = int(ins.data[0]["id"])

    for s in parsed.line_summaries:
        client.table("line_summary").insert(
            {
                "report_id": report_id,
                "line_id": s.line_id,
                "num_funds": s.num_funds,
                "credit_lines_granted_usd": _num(s.credit_lines_granted_usd),
                "disbursements_usd": _num(s.disbursements_usd),
                "credit_to_draw_usd": _num(s.credit_to_draw_usd),
                "accumulated_investments_usd": _num(s.accumulated_investments_usd),
            }
        ).execute()

    for fl in parsed.fund_lines:
        if fl.is_subtotal:
            continue
        row: dict[str, Any] = {
            "report_id": report_id,
            "line_id": fl.line_id,
            "fund_name": fl.fund_name,
            "credit_approved_uf": _num(fl.credit_approved_uf),
            "disbursement_uf": _num(fl.disbursement_uf),
            "amounts_invested_uf": _num(fl.amounts_invested_uf),
            "line_status": fl.line_status,
            "credit_to_draw_uf": _num(fl.credit_to_draw_uf),
            "is_subtotal": False,
        }
        if fl.line_opening_date:
            row["line_opening_date"] = fl.line_opening_date.isoformat()
        if fl.debt_to_capital_ratio is not None:
            row["debt_to_capital_ratio"] = _num(fl.debt_to_capital_ratio)
        if fl.entity_count is not None:
            row["entity_count"] = fl.entity_count
        client.table("fund_line").insert(row).execute()

    by_norm: dict[str, str] = {}
    for ci in parsed.company_investments:
        nn = normalize_company_name(ci.company_legal_name)
        by_norm.setdefault(nn, ci.company_legal_name)

    norm_to_id: dict[str, int] = {}
    for nn, legal in by_norm.items():
        sel = (
            client.table("company")
            .select("id")
            .eq("name_normalized", nn)
            .limit(1)
            .execute()
        )
        rows = sel.data or []
        if rows:
            norm_to_id[nn] = int(rows[0]["id"])
        else:
            ins_c = (
                client.table("company")
                .insert({"legal_name": legal, "name_normalized": nn})
                .execute()
            )
            if not ins_c.data:
                raise RuntimeError(f"company insert failed: {legal!r}")
            norm_to_id[nn] = int(ins_c.data[0]["id"])

    for ci in parsed.company_investments:
        nn = normalize_company_name(ci.company_legal_name)
        cid = norm_to_id[nn]
        client.table("company_investment").insert(
            {
                "report_id": report_id,
                "line_id": ci.line_id,
                "fund_name": ci.fund_name,
                "company_id": cid,
                "company_size": ci.company_size,
                "economic_activity": ci.economic_activity[:2000],
                "first_investment_date": ci.first_investment_date.isoformat()
                if ci.first_investment_date
                else None,
                "total_invested_usd": _num(ci.total_invested_usd),
            }
        ).execute()

    return {
        "dry_run": False,
        "report_id": report_id,
        "line_summaries": len(parsed.line_summaries),
        "fund_lines": len([f for f in parsed.fund_lines if not f.is_subtotal]),
        "company_investments": len(parsed.company_investments),
    }
