from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date
from decimal import Decimal


@dataclass
class ParsedLineSummary:
    line_id: str
    num_funds: int
    credit_lines_granted_usd: Decimal
    disbursements_usd: Decimal
    credit_to_draw_usd: Decimal
    accumulated_investments_usd: Decimal


@dataclass
class ParsedFundLine:
    line_id: str
    fund_name: str
    line_opening_date: date | None
    credit_approved_uf: Decimal
    debt_to_capital_ratio: Decimal | None
    disbursement_uf: Decimal
    amounts_invested_uf: Decimal
    entity_count: int | None
    line_status: str  # Vigente | No Vigente
    credit_to_draw_uf: Decimal
    is_subtotal: bool = False


@dataclass
class ParsedCompanyInvestment:
    line_id: str
    fund_name: str
    company_legal_name: str
    company_size: str
    economic_activity: str
    first_investment_date: date | None
    total_invested_usd: Decimal


@dataclass
class ParseResult:
    title_hint: str
    as_of_date: date | None
    line_summaries: list[ParsedLineSummary] = field(default_factory=list)
    fund_lines: list[ParsedFundLine] = field(default_factory=list)
    company_investments: list[ParsedCompanyInvestment] = field(default_factory=list)
