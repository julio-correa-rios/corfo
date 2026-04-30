import { ExploradorFilters } from "./explorador-filters";
import {
  fetchFundLines,
  fetchFundNames,
  fetchLineIdsForReport,
  fetchReports,
} from "@/lib/corfo/queries";
import type { VcReportRow } from "@/lib/corfo/types";
import { formatDateCl, formatOptionalRatio, formatUf } from "@/lib/corfo/format";

function resolveReportId(
  raw: string | string[] | undefined,
  reports: VcReportRow[],
): number {
  if (!reports.length) return 0;
  const s = Array.isArray(raw) ? raw[0] : raw;
  const id = s ? Number(s) : NaN;
  if (!Number.isFinite(id) || !reports.some((r) => r.id === id)) {
    return reports[0].id;
  }
  return id;
}

function resolveLine(
  raw: string | string[] | undefined,
  allowed: Set<string>,
): string {
  const s = Array.isArray(raw) ? raw[0] : raw;
  if (!s || !allowed.has(s)) return "";
  return s;
}

function resolveFund(
  raw: string | string[] | undefined,
  allowed: Set<string>,
): string {
  const s = Array.isArray(raw) ? raw[0] : raw;
  if (!s || !allowed.has(s)) return "";
  return s;
}

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ExploradorPage({ searchParams }: PageProps) {
  let reports: VcReportRow[] = [];
  let loadError: string | null = null;

  try {
    reports = await fetchReports();
  } catch (e) {
    loadError = e instanceof Error ? e.message : "Error al cargar informes.";
  }

  const sp = searchParams ? await searchParams : {};
  const reportId = resolveReportId(sp.report, reports);

  if (loadError) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          Explorador — Capital de riesgo CORFO
        </h1>
        <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
          {loadError}
        </p>
      </div>
    );
  }

  if (!reports.length) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          Explorador — Capital de riesgo CORFO
        </h1>
        <p className="mt-4 text-zinc-600 dark:text-zinc-400">
          No hay informes en la base de datos. Carga un PDF con{" "}
          <code className="rounded bg-zinc-200 px-1 dark:bg-zinc-800">
            corfo-etl load
          </code>{" "}
          y vuelve a intentar.
        </p>
      </div>
    );
  }

  const lineIds = await fetchLineIdsForReport(reportId);
  const lineAllowed = new Set(lineIds);
  const selectedLine = resolveLine(sp.line, lineAllowed);

  const fundNames = await fetchFundNames(
    reportId,
    selectedLine || null,
  );
  const fundAllowed = new Set(fundNames);
  const selectedFund = resolveFund(sp.fund, fundAllowed);

  const rows = await fetchFundLines(
    reportId,
    selectedLine || null,
    selectedFund || null,
  );

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-8 px-4 py-10">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Explorador — Fondos por línea
        </h1>
        <p className="mt-2 max-w-3xl text-sm text-zinc-600 dark:text-zinc-400">
          Datos de la tabla de fondos del informe (montos en{" "}
          <strong>UF</strong>). Filtra por fecha de corte del informe, línea y
          fondo. Las etiquetas siguen el informe público de CORFO.
        </p>
      </header>

      <ExploradorFilters
        reports={reports}
        lineIds={lineIds}
        fundNames={fundNames}
        selectedReportId={reportId}
        selectedLine={selectedLine}
        selectedFund={selectedFund}
      />

      <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800">
        <table className="min-w-full text-left text-sm text-zinc-900 dark:text-zinc-100">
          <thead className="border-b border-zinc-200 bg-zinc-50 text-xs font-semibold uppercase tracking-wide text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400">
            <tr>
              <th className="px-3 py-3">Línea</th>
              <th className="px-3 py-3">Fondo de inversión</th>
              <th className="px-3 py-3">Fecha apertura de línea</th>
              <th className="px-3 py-3 text-right">Línea aprobada (UF)</th>
              <th className="px-3 py-3 text-right">Deuda / capital</th>
              <th className="px-3 py-3 text-right">Desembolso (UF)</th>
              <th className="px-3 py-3 text-right">Monto invertido (UF)</th>
              <th className="px-3 py-3 text-right">N° empresas</th>
              <th className="px-3 py-3">Estado línea</th>
              <th className="px-3 py-3 text-right">Línea por girar (UF)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={10}
                  className="px-3 py-8 text-center text-zinc-500 dark:text-zinc-400"
                >
                  No hay filas para los filtros seleccionados.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr
                  key={row.id}
                  className="bg-white hover:bg-zinc-50 dark:bg-zinc-950 dark:hover:bg-zinc-900/80"
                >
                  <td className="whitespace-nowrap px-3 py-2 font-medium">
                    {row.line_id}
                  </td>
                  <td className="max-w-xs px-3 py-2">{row.fund_name}</td>
                  <td className="whitespace-nowrap px-3 py-2">
                    {formatDateCl(row.line_opening_date)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">
                    {formatUf(row.credit_approved_uf)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">
                    {formatOptionalRatio(row.debt_to_capital_ratio)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">
                    {formatUf(row.disbursement_uf)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">
                    {formatUf(row.amounts_invested_uf)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">
                    {row.entity_count ?? "—"}
                  </td>
                  <td className="px-3 py-2">{row.line_status}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">
                    {formatUf(row.credit_to_draw_uf)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-zinc-500 dark:text-zinc-500">
        Los montos en UF corresponden a la tabla de fondos del PDF; el
        resumen por línea en US$ está en{" "}
        <code className="rounded bg-zinc-200 px-1 dark:bg-zinc-800">
          line_summary
        </code>{" "}
        (próxima iteración del explorador).
      </p>
    </div>
  );
}
