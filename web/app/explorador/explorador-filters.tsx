"use client";

import { useRouter } from "next/navigation";
import { exploradorHref } from "@/lib/explorador-href";
import type {
  EmpresasPanel,
  ExploradorVista,
  VcReportRow,
} from "@/lib/corfo/types";

type Props = {
  vista: ExploradorVista;
  empresasPanel: EmpresasPanel;
  reports: VcReportRow[];
  lineIds: string[];
  fundNames: string[];
  selectedReportId: number;
  selectedLine: string;
  selectedFund: string;
};

export function ExploradorFilters({
  vista,
  empresasPanel,
  reports,
  lineIds,
  fundNames,
  selectedReportId,
  selectedLine,
  selectedFund,
}: Props) {
  const router = useRouter();

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
            const id = Number(e.target.value);
            router.push(
              exploradorHref({
                reportId: id,
                line: "",
                fund: "",
                vista,
                empresasPanel:
                  vista === "empresas" ? empresasPanel : undefined,
              }),
            );
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

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-zinc-700 dark:text-zinc-300">
          Línea CORFO
        </span>
        <select
          className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
          value={selectedLine}
          onChange={(e) => {
            const line = e.target.value;
            router.push(
              exploradorHref({
                reportId: selectedReportId,
                line,
                fund: "",
                vista,
                empresasPanel:
                  vista === "empresas" ? empresasPanel : undefined,
              }),
            );
          }}
        >
          <option value="">Todas las líneas</option>
          {lineIds.map((code) => (
            <option key={code} value={code}>
              {code}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-zinc-700 dark:text-zinc-300">
          Fondo
        </span>
        <select
          className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
          value={selectedFund}
          onChange={(e) => {
            const fund = e.target.value;
            router.push(
              exploradorHref({
                reportId: selectedReportId,
                line: selectedLine,
                fund,
                vista,
                empresasPanel:
                  vista === "empresas" ? empresasPanel : undefined,
              }),
            );
          }}
        >
          <option value="">Todos los fondos</option>
          {fundNames.map((name) => (
            <option key={name} value={name}>
              {name.length > 80 ? `${name.slice(0, 77)}…` : name}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
