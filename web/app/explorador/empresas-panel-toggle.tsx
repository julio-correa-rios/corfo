import { exploradorHref } from "@/lib/explorador-href";
import type { EmpresasPanel } from "@/lib/corfo/types";

type Props = {
  panel: EmpresasPanel;
  reportId: number;
  lines: string[];
  funds: string[];
};

export function EmpresasPanelToggle({ panel, reportId, lines, funds }: Props) {
  const datosHref = exploradorHref({
    reportId,
    lines,
    funds,
    vista: "empresas",
    empresasPanel: "datos",
  });
  const grafoHref = exploradorHref({
    reportId,
    lines,
    funds,
    vista: "empresas",
    empresasPanel: "grafo",
  });

  const pill =
    "inline-flex items-center rounded-lg border px-4 py-2 text-sm font-medium transition-colors";
  const active =
    "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900";
  const inactive =
    "border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800";

  return (
    <div
      className="flex flex-wrap gap-2"
      role="tablist"
      aria-label="Contenido vista empresas"
    >
      <a
        role="tab"
        aria-selected={panel === "datos"}
        href={datosHref}
        className={`${pill} ${panel === "datos" ? active : inactive}`}
      >
        Tabla y ranking
      </a>
      <a
        role="tab"
        aria-selected={panel === "grafo"}
        href={grafoHref}
        className={`${pill} ${panel === "grafo" ? active : inactive}`}
      >
        Red fondos–empresas (grafo)
      </a>
    </div>
  );
}
