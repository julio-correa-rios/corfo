import "server-only";

import { createServiceClient } from "@/lib/supabase/server";
import type { FundLineRow, VcReportRow } from "@/lib/corfo/types";

export async function fetchReports(): Promise<VcReportRow[]> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("vc_report")
    .select("id, as_of_date, title")
    .order("as_of_date", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as VcReportRow[];
}

export async function fetchLineIdsForReport(reportId: number): Promise<string[]> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("fund_line")
    .select("line_id")
    .eq("report_id", reportId)
    .eq("is_subtotal", false);

  if (error) throw new Error(error.message);
  const set = new Set<string>();
  for (const row of data ?? []) {
    if (row.line_id) set.add(row.line_id as string);
  }
  return [...set].sort();
}

export async function fetchFundNames(
  reportId: number,
  lineId: string | null,
): Promise<string[]> {
  const supabase = createServiceClient();
  let q = supabase
    .from("fund_line")
    .select("fund_name")
    .eq("report_id", reportId)
    .eq("is_subtotal", false);

  if (lineId) q = q.eq("line_id", lineId);

  const { data, error } = await q;
  if (error) throw new Error(error.message);
  const set = new Set<string>();
  for (const row of data ?? []) {
    if (row.fund_name) set.add(row.fund_name as string);
  }
  return [...set].sort((a, b) => a.localeCompare(b, "es"));
}

export async function fetchFundLines(
  reportId: number,
  lineId: string | null,
  fundName: string | null,
): Promise<FundLineRow[]> {
  const supabase = createServiceClient();
  let q = supabase
    .from("fund_line")
    .select(
      "id, report_id, line_id, fund_name, line_opening_date, credit_approved_uf, debt_to_capital_ratio, disbursement_uf, amounts_invested_uf, entity_count, line_status, credit_to_draw_uf, is_subtotal",
    )
    .eq("report_id", reportId)
    .eq("is_subtotal", false)
    .order("line_id", { ascending: true })
    .order("fund_name", { ascending: true });

  if (lineId) q = q.eq("line_id", lineId);
  if (fundName) q = q.eq("fund_name", fundName);

  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return (data ?? []) as FundLineRow[];
}
