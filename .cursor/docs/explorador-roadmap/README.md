# Explorador roadmap

Planned enhancements for `/explorador` (CORFO capital de riesgo), ordered from easiest to most complex.

| Step | Feature | Branch | Status |
|------|---------|--------|--------|
| 1 | Multi-select filters (línea + fondo) | `feat/explorador-multi-select-filters` | Done |
| 2 | Time series + filter by línea de apertura (year) | `feat/explorador-timeseries-opening-year` | Planned |
| 3 | Exchange rates → amounts in CLP | `feat/explorador-fx-clp` | Planned |

## Branch strategy

Use **one branch and one PR per step**. Merge in order; each step builds on the previous.

```
main
 └── feat/explorador-multi-select-filters      ← PR #1 (web only)
       merge
 └── feat/explorador-timeseries-opening-year   ← PR #2 (web + maybe DB/ETL)
       merge
 └── feat/explorador-fx-clp                    ← PR #3 (DB + ETL + web)
```

Do **not** bundle all three in a single branch — different scope, risk, and review surface.

## Current architecture (relevant to all steps)

- **Stack:** Next.js App Router (`web/`), Supabase (`fund_line`, `company_investment`, `vc_report`), ETL in `corfo_etl/`.
- **Filters are URL-driven:** `searchParams` on `web/app/explorador/page.tsx` → Supabase queries in `web/lib/corfo/queries.ts`.
- **Views:** `fondos` (UF table from `fund_line`) and `empresas` (US$ from `company_investment`, table/graph/bar chart).
- **Opening date today:** `fund_line.line_opening_date` only — **not** on `company_investment` (matters for step 2 in Empresas view).

## Docs in this folder

- [01-multi-select-filters.md](./01-multi-select-filters.md)
- [02-timeseries-opening-year.md](./02-timeseries-opening-year.md)
- [03-fx-clp-conversion.md](./03-fx-clp-conversion.md)
