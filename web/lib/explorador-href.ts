import type { EmpresasPanel, ExploradorVista } from "@/lib/corfo/types";

export function exploradorHref(params: {
  reportId: number;
  line: string;
  fund: string;
  vista: ExploradorVista;
  /** Solo aplica si `vista` es empresas; con fondos se ignora. */
  empresasPanel?: EmpresasPanel;
}): string {
  const p = new URLSearchParams();
  p.set("report", String(params.reportId));
  p.set("vista", params.vista);
  if (params.line) p.set("line", params.line);
  if (params.fund) p.set("fund", params.fund);
  if (params.vista === "empresas") {
    p.set("panel", params.empresasPanel ?? "datos");
  }
  return `/explorador?${p.toString()}`;
}
