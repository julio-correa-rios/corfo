"use client";

import { useEffect, useRef } from "react";
import { scaleBand, scaleLinear } from "d3-scale";
import { select } from "d3-selection";
import type { CompanyTotalUsd } from "@/lib/corfo/types";
import { formatUsd } from "@/lib/corfo/format";

type Props = {
  data: CompanyTotalUsd[];
  maxBars?: number;
};

export function InvestmentBarChart({ data, maxBars = 10 }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const slice = data.slice(0, maxBars);

  useEffect(() => {
    const rows = data.slice(0, maxBars);
    const wrap = wrapRef.current;
    const svgEl = svgRef.current;
    if (!wrap || !svgEl || rows.length === 0) return;

    const margin = { top: 8, right: 24, bottom: 8, left: 8 };
    const width400 = Math.max(wrap.clientWidth, 320);
    const barHeight = 26;
    const height = margin.top + margin.bottom + rows.length * barHeight;

    const labelFor = (d: CompanyTotalUsd) =>
      d.legalName.length > 36
        ? `${d.legalName.slice(0, 33)}…`
        : d.legalName;

    const svg = select(svgEl);
    svg.selectAll("*").remove();
    svg.attr("viewBox", `0 0 ${width400} ${height}`).attr("width", "100%");

    const ids = rows.map((d) => d.companyId);
    const maxVal = Math.max(...rows.map((d) => d.totalUsd), 1);

    const y = scaleBand<number>()
      .domain(ids)
      .range([margin.top, height - margin.bottom])
      .padding(0.25);

    const x = scaleLinear()
      .domain([0, maxVal])
      .range([margin.left + 168, width400 - margin.right]);

    const g = svg.append("g");

    g.selectAll("rect")
      .data(rows)
      .join("rect")
      .attr("x", margin.left + 168)
      .attr("y", (d) => y(d.companyId)!)
      .attr("height", y.bandwidth())
      .attr("rx", 4)
      .attr("class", "fill-blue-500/80 dark:fill-blue-400/80")
      .attr("width", (d) => Math.max(0, x(d.totalUsd) - x(0)));

    g.selectAll("text.label")
      .data(rows)
      .join("text")
      .attr("class", "label fill-zinc-800 text-[11px] dark:fill-zinc-100")
      .attr("x", margin.left)
      .attr("y", (d) => y(d.companyId)! + y.bandwidth() / 2)
      .attr("dy", "0.35em")
      .text((d) => labelFor(d));

    g.selectAll("text.value")
      .data(rows)
      .join("text")
      .attr(
        "class",
        "fill-zinc-600 text-[10px] tabular-nums dark:fill-zinc-400",
      )
      .attr("x", (d) => x(d.totalUsd) + 6)
      .attr("y", (d) => y(d.companyId)! + y.bandwidth() / 2)
      .attr("dy", "0.35em")
      .text((d) => formatUsd(d.totalUsd));
  }, [data, maxBars]);

  if (slice.length === 0) {
    return null;
  }

  const barHeight = 26;
  const h = 8 + 8 + slice.length * barHeight;

  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">
        Top {slice.length} empresas por monto invertido (US$)
      </h3>
      <div ref={wrapRef} className="w-full">
        <svg ref={svgRef} height={h} className="block max-w-full" />
      </div>
    </div>
  );
}
