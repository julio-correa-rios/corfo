import { CompanyFundGraph } from "./company-fund-graph";
import { EmpresasPanelToggle } from "./empresas-panel-toggle";
import { ExploradorFilters } from "./explorador-filters";
import { ExploradorVistaToggle } from "./explorador-vista-toggle";
import { FundFilterTags } from "./fund-filter-tags";
import { InvestmentBarChart } from "./investment-bar-chart";
import {
  fetchCompanyInvestments,
  fetchFundLines,
  fetchFundNames,
  fetchFundNamesForCompanyInvestments,
  fetchLineIdsForCompanyInvestments,
  fetchLineIdsForReport,
  fetchReports,
} from "@/lib/corfo/queries";
import type {
  EmpresasPanel,
  ExploradorVista,
  VcReportRow,
} from "@/lib/corfo/types";
import {
  aggregateTotalsByCompany,
  buildBipartiteGraphFromInvestments,
} from "@/lib/corfo/graph";
import { parseMultiParam } from "@/lib/explorador-params";
import {
  formatDateCl,
  formatOptionalRatio,
  formatUsd,
  formatUf,
} from "@/lib/corfo/format";

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

function resolveVista(raw: string | string[] | undefined): ExploradorVista {
  const s = Array.isArray(raw) ? raw[0] : raw;
  if (s === "empresas") return "empresas";
  return "fondos";
}

function resolveEmpresasPanel(
  raw: string | string[] | undefined,
): EmpresasPanel {
  const s = Array.isArray(raw) ? raw[0] : raw;
  if (s === "grafo") return "grafo";
  return "datos";
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
  const vista = resolveVista(sp.vista);
  const empresasPanel =
    vista === "empresas" ? resolveEmpresasPanel(sp.panel) : "datos";

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

  const lineIds =
    vista === "empresas"
      ? await fetchLineIdsForCompanyInvestments(reportId)
      : await fetchLineIdsForReport(reportId);

  const lineAllowed = new Set(lineIds);
  const selectedLines = parseMultiParam(sp.line, lineAllowed);

  const fundNames =
    vista === "empresas"
      ? await fetchFundNamesForCompanyInvestments(reportId, selectedLines)
      : await fetchFundNames(reportId, selectedLines);

  const fundAllowed = new Set(fundNames);
  const selectedFunds = parseMultiParam(sp.fund, fundAllowed);

  const fundRows =
    vista === "fondos"
      ? await fetchFundLines(reportId, selectedLines, selectedFunds)
      : [];

  const companyRows =
    vista === "empresas"
      ? await fetchCompanyInvestments(reportId, selectedLines, selectedFunds)
      : [];

  const graphPayload =
    vista === "empresas"
      ? buildBipartiteGraphFromInvestments(companyRows)
      : { nodes: [], links: [], truncated: false };

  const companyTotals =
    vista === "empresas" ? aggregateTotalsByCompany(companyRows) : [];

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-8 px-4 py-10">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Explorador — Capital de riesgo CORFO
        </h1>
        <p className="mt-2 max-w-3xl text-sm text-zinc-600 dark:text-zinc-400">
          Informe público: tabla de fondos en <strong>UF</strong> e inversiones
          en empresas en <strong>US$</strong>. Filtra por corte, línea y fondo.
        </p>
      </header>

      <ExploradorVistaToggle
        vista={vista}
        reportId={reportId}
        lines={selectedLines}
        funds={selectedFunds}
        empresasPanel={empresasPanel}
      />

      <ExploradorFilters
        vista={vista}
        empresasPanel={empresasPanel}
        reports={reports}
        lineIds={lineIds}
        fundNames={fundNames}
        selectedReportId={reportId}
        selectedLines={selectedLines}
        selectedFunds={selectedFunds}
      />

      {vista === "empresas" ? (
        <div className="flex flex-col gap-3">
          <EmpresasPanelToggle
            panel={empresasPanel}
            reportId={reportId}
            lines={selectedLines}
            funds={selectedFunds}
          />
          <FundFilterTags
            reportId={reportId}
            lines={selectedLines}
            funds={selectedFunds}
            vista={vista}
            empresasPanel={empresasPanel}
          />
        </div>
      ) : (
        <FundFilterTags
          reportId={reportId}
          lines={selectedLines}
          funds={selectedFunds}
          vista={vista}
        />
      )}

      {vista === "fondos" ? (
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
              {fundRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={10}
                    className="px-3 py-8 text-center text-zinc-500 dark:text-zinc-400"
                  >
                    No hay filas para los filtros seleccionados.
                  </td>
                </tr>
              ) : (
                fundRows.map((row) => (
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
      ) : empresasPanel === "grafo" ? (
        <section className="rounded-xl border border-zinc-200 bg-zinc-50/80 p-4 dark:border-zinc-800 dark:bg-zinc-900/40">
          <h2 className="mb-3 text-sm font-semibold text-zinc-800 dark:text-zinc-100">
            Red fondos ↔ empresas
          </h2>
          <CompanyFundGraph graph={graphPayload} tall />
        </section>
      ) : (
        <>
          {companyTotals.length > 0 ? (
            <section className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
              <InvestmentBarChart data={companyTotals} maxBars={10} />
            </section>
          ) : null}

          <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800">
            <table className="min-w-full text-left text-sm text-zinc-900 dark:text-zinc-100">
              <thead className="border-b border-zinc-200 bg-zinc-50 text-xs font-semibold uppercase tracking-wide text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400">
                <tr>
                  <th className="px-3 py-3">Línea</th>
                  <th className="px-3 py-3">Fondo</th>
                  <th className="px-3 py-3">Razón social</th>
                  <th className="px-3 py-3">Tamaño</th>
                  <th className="px-3 py-3">Actividad</th>
                  <th className="px-3 py-3">1ª inversión</th>
                  <th className="px-3 py-3 text-right">
                    Monto total invertido (US$)
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {companyRows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-3 py-8 text-center text-zinc-500 dark:text-zinc-400"
                    >
                      No hay inversiones registradas para estos filtros.
                    </td>
                  </tr>
                ) : (
                  companyRows.map((row) => (
                    <tr
                      key={row.id}
                      className="bg-white hover:bg-zinc-50 dark:bg-zinc-950 dark:hover:bg-zinc-900/80"
                    >
                      <td className="whitespace-nowrap px-3 py-2 font-medium">
                        {row.line_id}
                      </td>
                      <td className="max-w-[14rem] px-3 py-2">{row.fund_name}</td>
                      <td className="max-w-xs px-3 py-2">
                        {row.company?.legal_name ??
                          `Empresa #${row.company_id}`}
                      </td>
                      <td className="px-3 py-2">{row.company_size}</td>
                      <td className="max-w-[12rem] px-3 py-2 text-xs">
                        {row.economic_activity}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2">
                        {formatDateCl(row.first_investment_date)}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">
                        {formatUsd(row.total_invested_usd)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      <p className="text-xs text-zinc-500 dark:text-zinc-500">
        Vista <strong>Fondos</strong>: montos en UF (tabla de fondos del PDF).
        Vista <strong>Empresas</strong>: montos en US$; usa{" "}
        <strong>Tabla y ranking</strong> o <strong>Red (grafo)</strong> (
        <code className="rounded bg-zinc-200 px-1 dark:bg-zinc-800">
          panel=datos|grafo
        </code>
        ). El resumen por línea en US$ sigue en{" "}
        <code className="rounded bg-zinc-200 px-1 dark:bg-zinc-800">
          line_summary
        </code>
        .
      </p>
    </div>
  );
}
