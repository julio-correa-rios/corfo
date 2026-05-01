"use client";

import { useEffect, useRef } from "react";
import {
  type SimulationLinkDatum,
  forceCenter,
  forceCollide,
  forceLink,
  forceManyBody,
  forceSimulation,
} from "d3-force";
import { drag as d3Drag } from "d3-drag";
import { scaleLinear } from "d3-scale";
import { pointer, select } from "d3-selection";
import { type ZoomBehavior, zoom, zoomIdentity } from "d3-zoom";
import type { BipartiteGraphPayload } from "@/lib/corfo/types";

type SimNode = BipartiteGraphPayload["nodes"][number] & {
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
};

type SimLink = SimulationLinkDatum<SimNode> & {
  weight: number;
  amountUsd: number;
};

const strokeForWeight = scaleLinear<number>().domain([0, 1]).range([1, 8]);

export function CompanyFundGraph({
  graph,
  tall = false,
}: {
  graph: BipartiteGraphPayload;
  /** Más alto cuando el grafo es la vista principal. */
  tall?: boolean;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const wrap = wrapRef.current;
    const svgEl = svgRef.current;
    if (!wrap || !svgEl || graph.nodes.length === 0) return;

    const width = Math.max(wrap.clientWidth, 320);
    const height = tall ? 720 : 520;
    const n = graph.nodes.length;
    const nodes: SimNode[] = graph.nodes.map((node, i) => {
      const angle = (i / Math.max(n, 1)) * 2 * Math.PI;
      return {
        ...node,
        x: width / 2 + Math.cos(angle) * Math.min(140, width / 4),
        y: height / 2 + Math.sin(angle) * Math.min(140, height / 4),
      };
    });
    const byId = new Map(nodes.map((d) => [d.id, d]));
    const linksRaw = graph.links
      .map((l) => {
        const s = byId.get(l.source);
        const t = byId.get(l.target);
        if (!s || !t) return null;
        return {
          source: s,
          target: t,
          weight: l.weight,
          amountUsd: l.amountUsd,
        };
      })
      .filter(Boolean) as SimLink[];

    const svg = select(svgEl);
    svg.selectAll("*").remove();
    svg
      .attr("viewBox", `0 0 ${width} ${height}`)
      .attr("width", "100%")
      .attr("height", height)
      .attr("class", "block max-w-full touch-none");

    svg
      .append("rect")
      .attr("width", width)
      .attr("height", height)
      .attr("fill", "transparent")
      .attr("pointer-events", "all");

    const chart = svg.append("g").attr("class", "chart");

    const linkLayer = chart.append("g").attr("class", "links");
    const nodeLayer = chart.append("g").attr("class", "nodes");

    const linkSel = linkLayer
      .selectAll<SVGLineElement, SimLink>("line")
      .data(linksRaw)
      .join("line")
      .attr("stroke", "currentColor")
      .attr("stroke-opacity", 0.35)
      .attr("stroke-width", (d) => strokeForWeight(d.weight));

    const chargeMag = Math.min(380, 120 + n * 6);

    const linkForce = forceLink<SimNode, SimLink>(linksRaw)
      .id((d) => d.id)
      .distance(Math.max(70, Math.min(130, 2800 / Math.max(linksRaw.length, 1))))
      .strength(0.5);

    const simulation = forceSimulation<SimNode>(nodes)
      .force("link", linkForce)
      .force("charge", forceManyBody<SimNode>().strength(-chargeMag))
      .force("center", forceCenter<SimNode>(width / 2, height / 2))
      .force(
        "collide",
        forceCollide<SimNode>().radius((d) =>
          d.type === "fund" ? 22 : 18,
        ),
      );

    const chartNode = chart.node();

    const zoomFn: ZoomBehavior<SVGSVGElement, unknown> = zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.04, 14])
      .extent([
        [0, 0],
        [width, height],
      ])
      .filter((event) => {
        if (event.type === "wheel") {
          event.preventDefault();
          return true;
        }
        if ((event as MouseEvent).button !== 0) return false;
        const el = event.target as Element | null;
        if (el?.closest?.(".node-drag")) return false;
        return true;
      })
      .on("zoom", (event) => {
        chart.attr("transform", event.transform.toString());
      });

    svg.call(zoomFn);

    function fitGraphToView() {
      let minX = Infinity;
      let minY = Infinity;
      let maxX = -Infinity;
      let maxY = -Infinity;
      const labelPadX = 128;
      for (const d of nodes) {
        const baseR = d.type === "fund" ? 14 : 12;
        const x = d.x ?? 0;
        const y = d.y ?? 0;
        minX = Math.min(minX, x - baseR);
        maxX = Math.max(maxX, x + baseR + labelPadX);
        minY = Math.min(minY, y - baseR);
        maxY = Math.max(maxY, y + baseR);
      }
      if (!Number.isFinite(minX) || !Number.isFinite(minY)) return;

      const pad = 48;
      const bw = Math.max(maxX - minX, 100);
      const bh = Math.max(maxY - minY, 80);
      const k = Math.min(
        (width - pad * 2) / bw,
        (height - pad * 2) / bh,
        2.8,
      );
      const midX = (minX + maxX) / 2;
      const midY = (minY + maxY) / 2;
      const t = zoomIdentity
        .translate(width / 2, height / 2)
        .scale(k)
        .translate(-midX, -midY);
      svg.call(zoomFn.transform, t);
    }

    let initialFitDone = false;
    function scheduleInitialFit() {
      if (initialFitDone) return;
      initialFitDone = true;
      requestAnimationFrame(() => fitGraphToView());
    }

    simulation.on("end", scheduleInitialFit);
    const fitFallback = window.setTimeout(scheduleInitialFit, 1200);

    const nodeSel = nodeLayer
      .selectAll<SVGGElement, SimNode>("g")
      .data(nodes)
      .join("g")
      .attr("class", "node-drag cursor-grab");

    const dragBehavior = d3Drag<SVGGElement, SimNode>()
      .on("start", (event, d) => {
        event.sourceEvent?.stopPropagation?.();
        if (!event.active) simulation.alphaTarget(0.35).restart();
        const [x, y] = pointer(event, chartNode!);
        d.fx = x;
        d.fy = y;
      })
      .on("drag", (event, d) => {
        const [x, y] = pointer(event, chartNode!);
        d.fx = x;
        d.fy = y;
      })
      .on("end", (event, d) => {
        if (!event.active) simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
      });

    nodeSel.call(dragBehavior);

    nodeSel
      .append("circle")
      .attr("r", (d) => (d.type === "fund" ? 22 : 18))
      .attr("fill", "transparent");

    nodeSel
      .append("circle")
      .attr("r", (d) => (d.type === "fund" ? 10 : 8))
      .attr("class", (d) =>
        d.type === "fund"
          ? "fill-blue-600 dark:fill-blue-400 pointer-events-none"
          : "fill-emerald-600 dark:fill-emerald-400 pointer-events-none",
      );

    nodeSel
      .append("text")
      .attr("dx", 14)
      .attr("dy", 4)
      .attr(
        "class",
        "fill-zinc-800 text-[10px] dark:fill-zinc-100 pointer-events-none",
      )
      .text((d) =>
        d.label.length > 42 ? `${d.label.slice(0, 39)}…` : d.label,
      );

    nodeSel.append("title").text((d) => d.label);

    simulation.on("tick", () => {
      linkSel
        .attr("x1", (d) => (d.source as SimNode).x ?? 0)
        .attr("y1", (d) => (d.source as SimNode).y ?? 0)
        .attr("x2", (d) => (d.target as SimNode).x ?? 0)
        .attr("y2", (d) => (d.target as SimNode).y ?? 0);

      nodeSel.attr(
        "transform",
        (d) => `translate(${d.x ?? 0},${d.y ?? 0})`,
      );
    });

    return () => {
      clearTimeout(fitFallback);
      simulation.stop();
      svg.on(".zoom", null);
    };
  }, [graph, tall]);

  if (graph.links.length === 0) {
    return (
      <p className="rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-6 text-center text-sm text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900/50 dark:text-zinc-400">
        No hay enlaces fondo–empresa para graficar con estos filtros.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {graph.truncated ? (
        <p className="text-xs text-amber-800 dark:text-amber-200">
          Se muestran solo los {graph.links.length} mayores montos invertidos
          (US$) para mantener el gráfico fluido.
        </p>
      ) : null}
      <div
        ref={wrapRef}
        className="w-full text-zinc-400 dark:text-zinc-500"
      >
        <svg ref={svgRef} aria-label="Red fondos y empresas" />
      </div>
      <p className="text-xs text-zinc-500 dark:text-zinc-400">
        <strong>Rueda del ratón o pellizco:</strong> acercar o alejar.{" "}
        <strong>Arrastrar el fondo:</strong> desplazar la vista.{" "}
        <strong>Nodos:</strong> reacomodar. El encuadre inicial ajusta el
        conjunto visible; si no ves algo, aleja el zoom.
      </p>
    </div>
  );
}
