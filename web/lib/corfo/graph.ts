import "server-only";

import { Buffer } from "node:buffer";

import type {
  BipartiteGraphLink,
  BipartiteGraphNode,
  BipartiteGraphPayload,
  CompanyInvestmentRow,
  CompanyTotalUsd,
} from "@/lib/corfo/types";

const GRAPH_MAX_LINKS = 500;

export function fundNodeId(lineId: string, fundName: string): string {
  const enc = Buffer.from(fundName, "utf8").toString("base64url");
  return `fund:${lineId}:${enc}`;
}

export function companyNodeId(companyId: number): string {
  return `co:${companyId}`;
}

function toUsdNumber(v: number | string): number {
  const n = typeof v === "string" ? Number(v) : v;
  return Number.isFinite(n) ? n : 0;
}

/** Grafo bipartito fondos ↔ empresas; trunca a los mayores montos si hay muchos enlaces. */
export function buildBipartiteGraphFromInvestments(
  rows: CompanyInvestmentRow[],
): BipartiteGraphPayload {
  type LinkAcc = {
    source: string;
    target: string;
    amountUsd: number;
    labelFund: string;
    labelCompany: string;
  };

  const acc: LinkAcc[] = [];
  for (const r of rows) {
    const amount = toUsdNumber(r.total_invested_usd);
    const legal = r.company?.legal_name?.trim() || `Empresa #${r.company_id}`;
    acc.push({
      source: fundNodeId(r.line_id, r.fund_name),
      target: companyNodeId(r.company_id),
      amountUsd: amount,
      labelFund: `${r.line_id} · ${r.fund_name}`,
      labelCompany: legal,
    });
  }

  acc.sort((a, b) => b.amountUsd - a.amountUsd);
  const truncated = acc.length > GRAPH_MAX_LINKS;
  const slice = truncated ? acc.slice(0, GRAPH_MAX_LINKS) : acc;

  const nodeMap = new Map<string, BipartiteGraphNode>();
  for (const L of slice) {
    if (!nodeMap.has(L.source)) {
      nodeMap.set(L.source, {
        id: L.source,
        type: "fund",
        label: L.labelFund,
      });
    }
    if (!nodeMap.has(L.target)) {
      nodeMap.set(L.target, {
        id: L.target,
        type: "company",
        label: L.labelCompany,
      });
    }
  }

  const maxUsd = slice.reduce((m, L) => Math.max(m, L.amountUsd), 0) || 1;
  const links: BipartiteGraphLink[] = slice.map((L) => ({
    source: L.source,
    target: L.target,
    amountUsd: L.amountUsd,
    weight: maxUsd > 0 ? L.amountUsd / maxUsd : 0,
  }));

  return {
    nodes: [...nodeMap.values()],
    links,
    truncated,
  };
}

/** Suma por empresa en el slice filtrado (sin truncar). */
export function aggregateTotalsByCompany(
  rows: CompanyInvestmentRow[],
): CompanyTotalUsd[] {
  const map = new Map<number, { legalName: string; totalUsd: number }>();
  for (const r of rows) {
    const name = r.company?.legal_name?.trim() || `Empresa #${r.company_id}`;
    const prev = map.get(r.company_id);
    const add = toUsdNumber(r.total_invested_usd);
    if (prev) {
      prev.totalUsd += add;
    } else {
      map.set(r.company_id, { legalName: name, totalUsd: add });
    }
  }
  return [...map.entries()]
    .map(([companyId, v]) => ({
      companyId,
      legalName: v.legalName,
      totalUsd: v.totalUsd,
    }))
    .sort((a, b) => b.totalUsd - a.totalUsd);
}
