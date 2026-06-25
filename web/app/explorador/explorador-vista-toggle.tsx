import { exploradorHref } from "@/lib/explorador-href";
import type { EmpresasPanel, ExploradorVista } from "@/lib/corfo/types";

type Props = {
  vista: ExploradorVista;
  reportId: number;
  lines: string[];
  funds: string[];
  empresasPanel: EmpresasPanel;
};

export function ExploradorVistaToggle({
  vista,
  reportId,
  lines,
  funds,
  empresasPanel,
}: Props) {
  const fondosHref = exploradorHref({
    reportId,
    lines,
    funds,
    vista: "fondos",
  });
  const empresasHref = exploradorHref({
    reportId,
    lines,
    funds,
    vista: "empresas",
    empresasPanel,
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
      aria-label="Vista del explorador"
    >
      <a
        role="tab"
        aria-selected={vista === "fondos"}
        href={fondosHref}
        className={`${pill} ${vista === "fondos" ? active : inactive}`}
      >
        Fondos (UF)
      </a>
      <a
        role="tab"
        aria-selected={vista === "empresas"}
        href={empresasHref}
        className={`${pill} ${vista === "empresas" ? active : inactive}`}
      >
        Empresas invertidas (US$)
      </a>
    </div>
  );
}
