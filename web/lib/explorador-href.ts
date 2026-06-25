import type { EmpresasPanel, ExploradorVista } from "@/lib/corfo/types";

export function exploradorHref(params: {
  reportId: number;
  lines: string[];
  funds: string[];
  vista: ExploradorVista;
  /** Solo aplica si `vista` es empresas; con fondos se ignora. */
  empresasPanel?: EmpresasPanel;
}): string {
  const p = new URLSearchParams();
  p.set("report", String(params.reportId));
  p.set("vista", params.vista);
  for (const line of params.lines) {
    p.append("line", line);
  }
  for (const fund of params.funds) {
    p.append("fund", fund);
  }
  if (params.vista === "empresas") {
    p.set("panel", params.empresasPanel ?? "datos");
  }
  return `/explorador?${p.toString()}`;
}
