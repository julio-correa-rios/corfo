"use client";

import { useRouter } from "next/navigation";
import { exploradorHref } from "@/lib/explorador-href";
import type {
  EmpresasPanel,
  ExploradorVista,
  VcReportRow,
} from "@/lib/corfo/types";
import { MultiSelectFilter } from "./multi-select-filter";

type Props = {
  vista: ExploradorVista;
  empresasPanel: EmpresasPanel;
  reports: VcReportRow[];
  lineIds: string[];
  fundNames: string[];
  selectedReportId: number;
  selectedLines: string[];
  selectedFunds: string[];
};

function formatFundName(name: string): string {
  return name.length > 80 ? `${name.slice(0, 77)}…` : name;
}

export function ExploradorFilters({
  vista,
  empresasPanel,
  reports,
  lineIds,
  fundNames,
  selectedReportId,
  selectedLines,
  selectedFunds,
}: Props) {
  const router = useRouter();

  function navigate(
    overrides: Partial<{
      reportId: number;
      lines: string[];
      funds: string[];
    }> = {},
  ) {
    router.push(
      exploradorHref({
        reportId: overrides.reportId ?? selectedReportId,
        lines: overrides.lines ?? selectedLines,
        funds: overrides.funds ?? selectedFunds,
        vista,
        empresasPanel: vista === "empresas" ? empresasPanel : undefined,
      }),
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-zinc-700 dark:text-zinc-300">
          Informe (corte)
        </span>
        <select
          className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
          value={selectedReportId}
          onChange={(e) => {
            navigate({ reportId: Number(e.target.value), lines: [], funds: [] });
          }}
        >
          {reports.map((r) => (
            <option key={r.id} value={r.id}>
              {r.as_of_date}
              {r.title ? ` — ${r.title.slice(0, 60)}` : ""}
            </option>
          ))}
        </select>
      </label>

      <MultiSelectFilter
        label="Línea CORFO"
        options={lineIds}
        selected={selectedLines}
        allLabel="Todas las líneas"
        onChange={(lines) => {
          navigate({ lines, funds: [] });
        }}
      />

      <MultiSelectFilter
        label="Fondo"
        options={fundNames}
        selected={selectedFunds}
        allLabel="Todos los fondos"
        formatOption={formatFundName}
        onChange={(funds) => {
          navigate({ funds });
        }}
      />
    </div>
  );
}
