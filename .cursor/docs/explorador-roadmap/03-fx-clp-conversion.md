# Step 3 — Exchange rates → Chilean pesos (CLP)

**Branch:** `feat/explorador-fx-clp`  
**Complexity:** Hardest (reference data + product decisions + web)  
**Status:** Planned — branch from `main` after step 2 merges

## Goal

Show fund/investment amounts in **CLP** using historical exchange rates, especially aligned with **opening year** or report year from step 2.

## Currencies in the app today

| Vista | Stored unit | Table |
|-------|-------------|-------|
| Fondos | UF | `fund_line` |
| Empresas | US$ | `company_investment` |

CLP conversion needs rates for **both** UF→CLP and USD→CLP (unless you only convert one vista first).

## Product decisions (decide before coding)

1. **Which FX date?**
   - Opening year (average or end-of-year)?
   - Report `as_of_date` year?
   - Report cut-off date spot rate?
2. **Which rate source?** BCCh, mindicador.cl, manual CSV, etc.
3. **UX:** toggle “Moneda: UF | US$ | CLP”, extra columns, or CLP-only in time-series chart?

Document the chosen rule in this file once decided.

## Suggested schema

```sql
CREATE TABLE fx_year (
  year        SMALLINT PRIMARY KEY,
  usd_clp     NUMERIC(12, 2) NOT NULL,
  uf_clp      NUMERIC(12, 4) NOT NULL,  -- UF value in CLP for that year
  source      TEXT,
  updated_at  TIMESTAMPTZ DEFAULT now()
);
```

Optional: `fx_daily` if you need report-date spot rates later.

## ETL / data loading

- New loader script or `corfo_etl` command to fetch/populate `fx_year`.
- Idempotent upsert by `year`.
- Seed minimum years covered by `fund_line.line_opening_date` in your dataset.

## Web work (sketch)

1. `fetchFxByYears(years: number[])` in `web/lib/corfo/queries.ts`.
2. Conversion helpers in `web/lib/corfo/format.ts` (e.g. `formatClp`) and a small `convert.ts`:
   - `ufToClp(uf, year)` → `uf * fx_year.uf_clp`
   - `usdToClp(usd, year)` → `usd * fx_year.usd_clp`
3. Apply in table columns and/or time-series chart from step 2.
4. Show rate used in tooltip or footnote (transparency).

## Dependencies

- **Step 2** should define how “year” is chosen per row (opening vs report).
- Step 1 multi-select filters apply unchanged.

## Risks

- UF is inflation-indexed; “year average UF in CLP” vs “Dec 31 UF” can differ materially — state methodology clearly in UI.
- Missing FX for a year → show “—” or exclude from CLP totals; do not silently use wrong year.
