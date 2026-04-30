import type { ExploradorVista } from "@/lib/corfo/types";

type Props = {
  vista: ExploradorVista;
  reportId: number;
  line: string;
  fund: string;
};

function hrefFor(vista: ExploradorVista, reportId: number, line: string, fund: string) {
  const p = new URLSearchParams();
  p.set("report", String(reportId));
  p.set("vista", vista);
  if (line) p.set("line", line);
  if (fund) p.set("fund", fund);
  return `/explorador?${p.toString()}`;
}

export function ExploradorVistaToggle({
  vista,
  reportId,
  line,
  fund,
}: Props) {
  const fondosHref = hrefFor("fondos", reportId, line, fund);
  const empresasHref = hrefFor("empresas", reportId, line, fund);

  const pill =
    "inline-flex items-center rounded-lg border px-4 py-2 text-sm font-medium transition-colors";
  const active =
    "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900";
  const inactive =
    "border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800";

  return (
    <div className="flex flex-wrap gap-2" role="tablist" aria-label="Vista del explorador">
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
