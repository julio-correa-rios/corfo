"""Optional text extraction via pdfplumber (same downstream parsers as pypdf)."""

from __future__ import annotations

from corfo_etl.normalize import fix_pdf_typography


def extract_text_pdfplumber(path: str) -> str:
    import pdfplumber

    parts: list[str] = []
    with pdfplumber.open(path) as pdf:
        for page in pdf.pages:
            t = page.extract_text() or ""
            parts.append(t)
    return fix_pdf_typography("\n".join(parts))
