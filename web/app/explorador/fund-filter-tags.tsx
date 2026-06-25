"use client";

import { useRouter } from "next/navigation";
import { exploradorHref } from "@/lib/explorador-href";
import type { EmpresasPanel, ExploradorVista } from "@/lib/corfo/types";

type Props = {
  reportId: number;
  lines: string[];
  funds: string[];
  vista: ExploradorVista;
  empresasPanel?: EmpresasPanel;
};

function formatFundTag(name: string): string {
  return name.length > 48 ? `${name.slice(0, 45)}…` : name;
}

export function FundFilterTags({
  reportId,
  lines,
  funds,
  vista,
  empresasPanel,
}: Props) {
  const router = useRouter();

  if (funds.length === 0) return null;

  function navigate(nextFunds: string[]) {
    router.push(
      exploradorHref({
        reportId,
        lines,
        funds: nextFunds,
        vista,
        empresasPanel: vista === "empresas" ? empresasPanel : undefined,
      }),
    );
  }

  const tagClass =
    "inline-flex max-w-xs items-center gap-1 rounded-full border border-zinc-300 bg-zinc-100 py-1 pl-3 pr-1.5 text-xs text-zinc-800 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100";

  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <span className="shrink-0 font-medium text-zinc-600 dark:text-zinc-400">
        Fondos activos:
      </span>
      {funds.map((fund) => (
        <span key={fund} className={tagClass} title={fund}>
          <span className="truncate">{formatFundTag(fund)}</span>
          <button
            type="button"
            className="shrink-0 rounded-full p-0.5 text-zinc-500 hover:bg-zinc-200 hover:text-zinc-900 dark:hover:bg-zinc-700 dark:hover:text-zinc-50"
            aria-label={`Quitar filtro ${fund}`}
            onClick={() => navigate(funds.filter((f) => f !== fund))}
          >
            ×
          </button>
        </span>
      ))}
      {funds.length > 1 ? (
        <button
          type="button"
          className="text-xs text-zinc-500 underline-offset-2 hover:text-zinc-800 hover:underline dark:text-zinc-400 dark:hover:text-zinc-200"
          onClick={() => navigate([])}
        >
          Limpiar todos
        </button>
      ) : null}
    </div>
  );
}
