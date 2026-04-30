export type VcReportRow = {
  id: number;
  as_of_date: string;
  title: string | null;
};

export type FundLineRow = {
  id: number;
  report_id: number;
  line_id: string;
  fund_name: string;
  line_opening_date: string | null;
  credit_approved_uf: number | string;
  debt_to_capital_ratio: number | string | null;
  disbursement_uf: number | string;
  amounts_invested_uf: number | string;
  entity_count: number | null;
  line_status: string;
  credit_to_draw_uf: number | string;
  is_subtotal: boolean;
};

/** Vista del explorador en la query string */
export type ExploradorVista = "fondos" | "empresas";

export type CompanyInvestmentRow = {
  id: number;
  report_id: number;
  line_id: string;
  fund_name: string;
  company_id: number;
  company_size: string;
  economic_activity: string;
  first_investment_date: string | null;
  total_invested_usd: number | string;
  company: { id: number; legal_name: string } | null;
};

export type BipartiteGraphNode = {
  id: string;
  type: "fund" | "company";
  label: string;
};

export type BipartiteGraphLink = {
  source: string;
  target: string;
  amountUsd: number;
  weight: number;
};

export type BipartiteGraphPayload = {
  nodes: BipartiteGraphNode[];
  links: BipartiteGraphLink[];
  truncated: boolean;
};

/** Serie agregada para el gráfico de barras (Top-N empresas) */
export type CompanyTotalUsd = {
  companyId: number;
  legalName: string;
  totalUsd: number;
};
