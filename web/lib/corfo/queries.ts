import "server-only";

import { createServiceClient } from "@/lib/supabase/server";
import type {
  CompanyInvestmentRow,
  FundLineRow,
  VcReportRow,
} from "@/lib/corfo/types";

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
  lineIds: string[],
): Promise<string[]> {
  const supabase = createServiceClient();
  let q = supabase
    .from("fund_line")
    .select("fund_name")
    .eq("report_id", reportId)
    .eq("is_subtotal", false);

  if (lineIds.length) q = q.in("line_id", lineIds);

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
  lineIds: string[],
  fundNames: string[],
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

  if (lineIds.length) q = q.in("line_id", lineIds);
  if (fundNames.length) q = q.in("fund_name", fundNames);

  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return (data ?? []) as FundLineRow[];
}

export async function fetchLineIdsForCompanyInvestments(
  reportId: number,
): Promise<string[]> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("company_investment")
    .select("line_id")
    .eq("report_id", reportId);

  if (error) throw new Error(error.message);
  const set = new Set<string>();
  for (const row of data ?? []) {
    if (row.line_id) set.add(row.line_id as string);
  }
  return [...set].sort();
}

export async function fetchFundNamesForCompanyInvestments(
  reportId: number,
  lineIds: string[],
): Promise<string[]> {
  const supabase = createServiceClient();
  let q = supabase
    .from("company_investment")
    .select("fund_name")
    .eq("report_id", reportId);

  if (lineIds.length) q = q.in("line_id", lineIds);

  const { data, error } = await q;
  if (error) throw new Error(error.message);
  const set = new Set<string>();
  for (const row of data ?? []) {
    if (row.fund_name) set.add(row.fund_name as string);
  }
  return [...set].sort((a, b) => a.localeCompare(b, "es"));
}

export async function fetchCompanyInvestments(
  reportId: number,
  lineIds: string[],
  fundNames: string[],
): Promise<CompanyInvestmentRow[]> {
  const supabase = createServiceClient();
  let q = supabase
    .from("company_investment")
    .select(
      `
      id,
      report_id,
      line_id,
      fund_name,
      company_id,
      company_size,
      economic_activity,
      first_investment_date,
      total_invested_usd,
      company ( id, legal_name )
    `,
    )
    .eq("report_id", reportId);

  if (lineIds.length) q = q.in("line_id", lineIds);
  if (fundNames.length) q = q.in("fund_name", fundNames);

  q = q.order("total_invested_usd", { ascending: false });

  const { data, error } = await q;
  if (error) throw new Error(error.message);
  const raw = (data ?? []) as unknown as CompanyInvestmentRow[];
  return raw.map((row) => {
    const c = row.company as unknown;
    let company: { id: number; legal_name: string } | null = null;
    if (Array.isArray(c) && c[0]) {
      company = c[0] as { id: number; legal_name: string };
    } else if (c && typeof c === "object" && "legal_name" in c) {
      company = c as { id: number; legal_name: string };
    }
    return { ...row, company };
  });
}
