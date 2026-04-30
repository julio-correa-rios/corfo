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
