# Follow-up — Stable graph layout on fondo filter

**Branch (suggested):** `fix/web-graph-stable-filter`  
**Complexity:** Medium (web only, `company-fund-graph.tsx`)  
**Status:** Planned — after step 1 merges to `main`

## Problem

When adding/removing fondo filters (tags or dropdown), the empresa **grafo** fully re-renders:

1. `router.push` → server rebuilds filtered `graphPayload`
2. `CompanyFundGraph` `useEffect([graph, tall])` tears down the SVG (`selectAll("*").remove()`)
3. Nodes get new initial positions; force simulation runs again
4. `fitGraphToView()` resets zoom/pan

Disconnected fund↔company clusters also drift far apart because global `forceManyBody` repels all nodes.

## Goals

1. **Stable positions** — nodes that remain visible keep their `x/y` when filters change
2. **Stable viewport** — do not re-run `fitGraphToView` on filter updates (only first load, or manual “Reencuadrar”)
3. **Tighter layout** — bring disconnected components closer together

## Recommended implementation

### 1. Position cache

- `useRef<Map<nodeId, { x, y }>>` (optionally `sessionStorage` keyed by `reportId`)
- On filter change: hide nodes/links not in filter (`opacity: 0`, `pointer-events: none`) instead of removing from simulation
- New nodes only: run local layout for enter; existing nodes reuse cache

### 2. Simulation lifecycle

- Run `forceSimulation` once on first full graph load
- On `simulation.on("end")`: `simulation.stop()`; optionally freeze with `fx/fy` or cache final positions
- Filter updates: no full SVG teardown; D3 `.join()` enter/update/exit on links and node groups

### 3. Optional: client-side fondo filter for grafo panel

- Pass **unfiltered** graph for current `reportId` to client (or fetch via route handler)
- Filter visibility client-side; sync URL with `history.replaceState` if shareable links matter
- Table/ranking can stay server-filtered

### 4. Tighter disconnected components

Pick one:

| Approach | Notes |
|----------|--------|
| Weaker repulsion | Lower `chargeMag`; `forceManyBody().distanceMax(200)` |
| Per-component layout | Union-find/BFS components; layout each star locally; grid-pack component bounding boxes |
| Fixed fund anchors | Funds on circle/grid; companies use link force only toward their fund |

Best fit for bipartite fondo↔empresa: **per-fund local layout** or **component grid** after a short simulation.

## Files to touch

- `web/app/explorador/company-fund-graph.tsx` — main work
- `web/app/explorador/page.tsx` — may pass full graph + `selectedFunds` for client filter
- `web/lib/corfo/graph.ts` — optional helper to build full graph once per report

## Out of scope

- Time series (step 2)
- CLP conversion (step 3)

## Verify

1. Open grafo with several fondos visible; note node positions and zoom
2. Remove one fondo tag — remaining nodes stay put; zoom unchanged
3. Multiple disconnected clusters appear reasonably close in initial layout
