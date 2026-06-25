# Step 2 — Time series + línea de apertura (year)

**Branch:** `feat/explorador-timeseries-opening-year`  
**Complexity:** Medium (web + likely DB/ETL)  
**Status:** Planned — branch from `main` after step 1 merges

## Goal

Analyze data **over time** (across report cut-off dates) and filter by **línea de apertura** — the year the instrument/line was opened (`fund_line.line_opening_date`).

## Two time axes in the data model

| Axis | Field | Meaning |
|------|-------|---------|
| Report time | `vc_report.as_of_date` | PDF cut-off date (snapshot) |
| Opening time | `fund_line.line_opening_date` | When the línea was opened |

A natural time series: **x = `as_of_date`**, **y = metric** (UF totals in Fondos view, US$ in Empresas), with filters including opening year.

## Data gap (important)

`company_investment` has **no** `line_opening_date`. Opening year exists only on `fund_line`.

For **Empresas** view filtering by apertura year, pick one:

1. **Recommended:** Denormalize in ETL — add `line_opening_date` or `line_opening_year` to `company_investment` when loading from PDF.
2. **Alternative:** Postgres view / join at query time (harder with Supabase JS client).

Files likely involved:

- `supabase/migrations/` — new column on `company_investment`
- `corfo_etl/supabase_load.py` — populate from matching `fund_line` row (same `report_id`, `line_id`, `fund_name`)
- `corfo_etl/models.py` — extend `ParsedCompanyInvestment` if needed

## Web work (sketch)

1. **Opening-year filter** — distinct years from `EXTRACT(YEAR FROM line_opening_date)` on `fund_line` (and/or denormalized column on investments).
2. **New query(s)** — aggregate metrics **per report** `as_of_date`, respecting línea/fondo/opening-year filters. Today everything is scoped to a single `reportId`; time series needs **cross-report** reads.
3. **New UI panel or vista** — e.g. “Serie temporal” with line chart (D3 or lightweight chart lib); reuse existing D3 usage in `investment-bar-chart.tsx` / `company-fund-graph.tsx`.
4. **URL params** — e.g. `openingYear=2018&openingYear=2019` (same repeated-param pattern as step 1).

## Metrics to expose (pick per vista)

**Fondos (UF):** sum of `amounts_invested_uf`, `disbursement_uf`, or `credit_approved_uf` from `fund_line`.

**Empresas (US$):** sum of `total_invested_usd` from `company_investment`.

## Suggested implementation order

1. Migration + ETL for `line_opening_year` on `company_investment` (if Empresas must filter by year).
2. `fetchOpeningYears(reportId)` and `fetchTimeSeries(...)` in `web/lib/corfo/queries.ts`.
3. Filter UI + chart component under `web/app/explorador/`.
4. Extend `exploradorHref` / `parseMultiParam` for opening-year params.

## Out of scope for this step

- CLP conversion (step 3).
- Replacing the single-report table view — time series is additive.
