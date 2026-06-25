# Step 1 — Multi-select filters (línea + fondo)

**Branch:** `feat/explorador-multi-select-filters`  
**Complexity:** Easiest (web only, no DB migration)  
**Status:** Implemented

## Goal

Allow selecting **more than one** CORFO línea (F1, F2, …) and **more than one** fondo at the same time. Previously: one value or “all”.

## URL convention

Repeated query params (Next.js gives `string | string[]`):

```
/explorador?report=1&vista=fondos&line=F1&line=F2&fund=Fondo+A&fund=Fondo+B
```

Empty `line` / `fund` lists mean “all”. Single-value URLs (`?line=F1`) remain valid.

## Files touched

| File | Role |
|------|------|
| `web/lib/explorador-params.ts` | `parseMultiParam()` — parse + validate against allowed set |
| `web/lib/explorador-href.ts` | `lines` / `funds` arrays → repeated `line` / `fund` params |
| `web/lib/corfo/queries.ts` | `.eq()` → `.in()` when arrays non-empty |
| `web/app/explorador/page.tsx` | Resolve multi-select from `searchParams`, pass arrays to children |
| `web/app/explorador/explorador-filters.tsx` | Wire `MultiSelectFilter` + navigation |
| `web/app/explorador/multi-select-filter.tsx` | Checkbox dropdown UI |
| `web/app/explorador/explorador-vista-toggle.tsx` | Preserve `lines` / `funds` in hrefs |
| `web/app/explorador/empresas-panel-toggle.tsx` | Same |

## Query signature change

```ts
// Before
fetchFundLines(reportId, lineId: string | null, fundName: string | null)

// After
fetchFundLines(reportId, lineIds: string[], fundNames: string[])
```

Same pattern for `fetchFundNames`, `fetchFundNamesForCompanyInvestments`, `fetchCompanyInvestments`.

## UX rules preserved

- Changing **Informe (corte)** clears línea and fondo selections.
- Changing **Línea** clears fondo selection (fondo options depend on línea).
- Trigger label: “Todas las líneas” / “Todos los fondos”, single name, or “N seleccionados”.

## Verify

```bash
cd web && pnpm dev
```

Open `/explorador`, multi-select líneas and fondos; confirm table/graph updates and URL reflects selections.
