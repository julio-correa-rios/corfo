from __future__ import annotations

import re
from datetime import date
from decimal import Decimal

from corfo_etl.models import (
    ParseResult,
    ParsedCompanyInvestment,
    ParsedFundLine,
    ParsedLineSummary,
)
from corfo_etl.normalize import (
    fix_pdf_typography,
    normalize_company_name,
    parse_cl_decimal,
    parse_date_dd_mm_yyyy,
    parse_report_as_of_date,
    parse_usd_integer,
)

LINE_CODE = r"(?:F[123]|FEM|K1|FC|FT|FET)"

# Fund name must start with a letter (excludes resumen rows like "F1 5 29.065…" and
# subtotal tails like "F2 2.327.707 … 0 F3 …" where the code is followed by a digit).
_FUND_ROW_RE = re.compile(
    rf"({LINE_CODE})\s+"
    rf"(?=[A-Za-zÁÉÍÓÚÜÑáéíóúüñ])(.+?)\s+(\d{{2}}-\d{{2}}-\d{{4}})\s+"
    rf"([\d.]+\s+[\d.,]+\s+[\d.]+\s+[\d.]+\s+\d+\s+(?:No\s+Vigente|Vigente)\s+[\d.]+)",
    re.UNICODE,
)

_SUBTOTAL_RE = re.compile(
    rf"Total\s+L[ií]nea\s+({LINE_CODE})\s+([\d.]+\s+[\d.]+\s+[\d.]+\s+\d+\s+[\d.]+)",
    re.UNICODE | re.IGNORECASE,
)

# Summary rows are often glued on one line: "F1 5 29.065.277 ... F2 5 ..."
_SUMMARY_ROW_RE = re.compile(
    rf"({LINE_CODE})\s+(\d{{1,3}})\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)"
    rf"(?=\s+(?:{LINE_CODE})\s+\d{{1,3}}\s+[\d.]|\s+Total|$)",
)

_TAIL_NUMS_RE = re.compile(
    r"^([\d.]+)\s+([\d.,]+)\s+([\d.]+)\s+([\d.]+)\s+(\d+)\s+(No\s+Vigente|Vigente)\s+([\d.]+)\s*$",
    re.UNICODE,
)


def _valid_fund_name(name: str) -> bool:
    """Reject 'Total Línea F2 2.327…' bleed where fund captures numeric tail + next fondo."""
    n = name.strip()
    if len(n) < 2 or n[0].isdigit():
        return False
    return bool(re.search(r"[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]", n))


def extract_text_pypdf(path: str) -> str:
    from pypdf import PdfReader

    reader = PdfReader(path)
    parts: list[str] = []
    for page in reader.pages:
        t = page.extract_text() or ""
        parts.append(t)
    return fix_pdf_typography("\n".join(parts))


def _split_line_starts(text: str) -> list[str]:
    """Split detail text into chunks starting at a línea code."""
    t = fix_pdf_typography(text)
    pattern = re.compile(rf"(?:^|\s)({LINE_CODE})\s+")
    matches = list(pattern.finditer(t))
    if not matches:
        return []
    chunks: list[str] = []
    for i, m in enumerate(matches):
        start = m.start(1)
        end = matches[i + 1].start(1) if i + 1 < len(matches) else len(t)
        chunk = t[start:end].strip()
        if chunk:
            chunks.append(chunk)
    return chunks


def _parse_fund_tail(tail: str) -> tuple[Decimal, Decimal | None, Decimal, Decimal, int | None, str, Decimal]:
    m = _TAIL_NUMS_RE.match(tail.strip())
    if not m:
        raise ValueError(f"fund tail: {tail!r}")
    credit = parse_cl_decimal(m.group(1).replace(" ", ""))
    ratio_raw = m.group(2).replace(" ", "")
    ratio: Decimal | None
    try:
        ratio = parse_cl_decimal(ratio_raw) if ratio_raw else None
    except Exception:
        ratio = None
    disb = parse_cl_decimal(m.group(3).replace(" ", ""))
    inv = parse_cl_decimal(m.group(4).replace(" ", ""))
    ent = int(m.group(5))
    status = "No Vigente" if m.group(6).strip().startswith("No") else "Vigente"
    draw = parse_cl_decimal(m.group(7).replace(" ", ""))
    return credit, ratio, disb, inv, ent, status, draw


def parse_fund_lines(text: str) -> list[ParsedFundLine]:
    out: list[ParsedFundLine] = []
    for m in _FUND_ROW_RE.finditer(text):
        line_id = m.group(1)
        fund_and_rest = m.group(2).strip()
        d_str = m.group(3)
        tail = m.group(4).strip()
        odate = parse_date_dd_mm_yyyy(d_str)
        try:
            credit, ratio, disb, inv, ent, status, draw = _parse_fund_tail(tail)
        except ValueError:
            continue
        fund_name = fund_and_rest.strip()
        if not _valid_fund_name(fund_name):
            continue  # safety net
        out.append(
            ParsedFundLine(
                line_id=line_id,
                fund_name=fund_name,
                line_opening_date=odate,
                credit_approved_uf=credit,
                debt_to_capital_ratio=ratio,
                disbursement_uf=disb,
                amounts_invested_uf=inv,
                entity_count=ent,
                line_status=status,
                credit_to_draw_uf=draw,
                is_subtotal=False,
            )
        )
    for m in _SUBTOTAL_RE.finditer(text):
        line_id = m.group(1)
        parts = m.group(2).split()
        if len(parts) < 5:
            continue
        try:
            a, b, c = parse_cl_decimal(parts[0]), parse_cl_decimal(parts[1]), parse_cl_decimal(parts[2])
            ent = int(parts[3])
            d = parse_cl_decimal(parts[4])
        except Exception:
            continue
        out.append(
            ParsedFundLine(
                line_id=line_id,
                fund_name=f"__subtotal_{line_id}__",
                line_opening_date=None,
                credit_approved_uf=a,
                debt_to_capital_ratio=None,
                disbursement_uf=b,
                amounts_invested_uf=c,
                entity_count=ent,
                line_status="No Vigente",
                credit_to_draw_uf=d,
                is_subtotal=True,
            )
        )
    return out


def parse_line_summaries(text: str) -> list[ParsedLineSummary]:
    head = text[:25000]
    out: list[ParsedLineSummary] = []
    for m in _SUMMARY_ROW_RE.finditer(head):
        if m.group(0).strip().lower().startswith("total"):
            continue
        try:
            out.append(
                ParsedLineSummary(
                    line_id=m.group(1),
                    num_funds=int(m.group(2)),
                    credit_lines_granted_usd=parse_usd_integer(m.group(3)),
                    disbursements_usd=parse_usd_integer(m.group(4)),
                    credit_to_draw_usd=parse_usd_integer(m.group(5)),
                    accumulated_investments_usd=parse_usd_integer(m.group(6)),
                )
            )
        except Exception:
            continue
    return out


def _funds_by_line(fund_lines: list[ParsedFundLine]) -> dict[str, list[str]]:
    m: dict[str, set[str]] = {}
    for fl in fund_lines:
        if fl.is_subtotal:
            continue
        m.setdefault(fl.line_id, set()).add(fl.fund_name.strip())
    return {k: sorted(v, key=len, reverse=True) for k, v in m.items()}


# S/I = sin información (appears in older rows in the informe)
_SIZE_RE = re.compile(
    r"\s(Gran Empresa|Microempresa|Mediana Empresa|Mediana|Pequeña|S/I)\s+"
)


def _parse_company_chunk(
    chunk: str,
    funds_by_line: dict[str, list[str]],
) -> ParsedCompanyInvestment | None:
    chunk = chunk.strip()
    if len(chunk) < 30:
        return None
    low = chunk.lower()
    if "receptora de la" in low and "inversión" in low:
        return None
    if "tabla n" in low and "detalle" in low:
        return None

    m0 = re.match(rf"^({LINE_CODE})\s+(.*)$", chunk, re.UNICODE)
    if not m0:
        return None
    line_id, rest = m0.group(1), m0.group(2).strip()
    funds = funds_by_line.get(line_id, [])
    fund_name = None
    rest_after = rest
    for f in funds:
        if rest.startswith(f + " ") or rest == f:
            fund_name = f
            rest_after = rest[len(f) :].strip()
            break
    if not fund_name:
        return None

    sm = _SIZE_RE.search(rest_after)
    if not sm:
        return None
    company_name = rest_after[: sm.start()].strip()
    if not company_name or len(company_name) < 2:
        return None
    size = sm.group(1)
    tail = rest_after[sm.end() :].strip()

    m_end = re.search(r"(\d{2}-\d{2}-\d{4})\s+([\d.]+)\s*$", tail)
    if not m_end:
        return None
    inv_date = parse_date_dd_mm_yyyy(m_end.group(1))
    try:
        usd = parse_usd_integer(m_end.group(2))
    except Exception:
        return None
    activity = tail[: m_end.start()].strip()
    if not activity:
        return None

    return ParsedCompanyInvestment(
        line_id=line_id,
        fund_name=fund_name,
        company_legal_name=company_name,
        company_size=size,
        economic_activity=activity,
        first_investment_date=inv_date,
        total_invested_usd=usd,
    )


def parse_company_investments(
    text: str,
    fund_lines: list[ParsedFundLine],
) -> list[ParsedCompanyInvestment]:
    low = text.lower()
    idx = low.find("detalle de inversiones")
    if idx == -1:
        idx = text.find("TABLA N° 3")
    if idx == -1:
        idx = low.find("monto total")
    detail = text[idx:] if idx != -1 else text

    fb = _funds_by_line(fund_lines)
    out: list[ParsedCompanyInvestment] = []
    for chunk in _split_line_starts(detail):
        row = _parse_company_chunk(chunk, fb)
        if row:
            out.append(row)
    return out


def parse_report_meta(text: str) -> tuple[str, date | None]:
    t = fix_pdf_typography(text[:3000])
    title = "CORFO Capital de Riesgo"
    # Cover is often one line: "1 Informe Público … 2 Introducción …"
    cut = re.split(r"\s+\d+\s+Introducci", t, maxsplit=1, flags=re.I)
    head = cut[0].strip() if cut else t
    head = re.sub(r"^\d+\s+", "", head).strip()
    if head:
        title = head[:200]
    as_of = parse_report_as_of_date(text)
    return title, as_of


def parse_corfo_pdf(path: str, *, text_backend: str = "pypdf") -> ParseResult:
    if text_backend == "pdfplumber":
        from corfo_etl.parse_pdf_plumber import extract_text_pdfplumber

        raw = extract_text_pdfplumber(path)
    else:
        raw = extract_text_pypdf(path)

    title, as_of = parse_report_meta(raw)
    summaries = parse_line_summaries(raw)
    funds = parse_fund_lines(raw)
    companies = parse_company_investments(raw, funds)

    return ParseResult(
        title_hint=title,
        as_of_date=as_of,
        line_summaries=summaries,
        fund_lines=funds,
        company_investments=companies,
    )
