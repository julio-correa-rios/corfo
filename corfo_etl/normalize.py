from __future__ import annotations

import re
import unicodedata
from datetime import date
from decimal import Decimal, InvalidOperation


def fix_pdf_typography(s: str) -> str:
    """Repair common pypdf spacing glitches in this CORFO report."""
    s = s.replace("T otal", "Total").replace("t otal", "total")
    s = s.replace("T ech", "Tech").replace("t ech", "tech")
    s = re.sub(r"\s+", " ", s)
    return s.strip()


def parse_cl_decimal(s: str) -> Decimal:
    """Chilean-style number: thousands '.', decimal ','."""
    s = s.strip().replace(".", "").replace(",", ".")
    return Decimal(s)


def parse_cl_decimal_maybe(s: str) -> Decimal | None:
    try:
        if not s or not s.strip():
            return None
        return parse_cl_decimal(s)
    except (InvalidOperation, ValueError):
        return None


def parse_usd_integer(s: str) -> Decimal:
    """USD in report: integer-like with '.' thousands, no decimals."""
    s = s.strip().replace(".", "").replace(",", "")
    return Decimal(s)


def parse_date_dd_mm_yyyy(s: str) -> date | None:
    s = s.strip()
    m = re.fullmatch(r"(\d{2})-(\d{2})-(\d{4})", s)
    if not m:
        return None
    d, mo, y = int(m.group(1)), int(m.group(2)), int(m.group(3))
    try:
        return date(y, mo, d)
    except ValueError:
        return None


def parse_report_as_of_date(text: str) -> date | None:
    """e.g. 'AL 31 DE DICIEMBRE DE 2025' or '31-12-2025'."""
    t = text.upper()
    m = re.search(r"31\s+DE\s+DICIEMBRE\s+DE\s+(\d{4})", t)
    if m:
        try:
            return date(int(m.group(1)), 12, 31)
        except ValueError:
            pass
    m = re.search(r"AL\s+(\d{1,2})[-/](\d{1,2})[-/](\d{4})", t)
    if m:
        d, mo, y = int(m.group(1)), int(m.group(2)), int(m.group(3))
        try:
            return date(y, mo, d)
        except ValueError:
            pass
    return None


def normalize_company_name(name: str) -> str:
    n = fix_pdf_typography(name).upper()
    n = unicodedata.normalize("NFKD", n)
    n = "".join(c for c in n if not unicodedata.combining(c))
    n = re.sub(r"\s+", " ", n).strip()
    return n
