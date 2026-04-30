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
import { select } from "d3-selection";
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

export function CompanyFundGraph({ graph }: { graph: BipartiteGraphPayload }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const wrap = wrapRef.current;
    const svgEl = svgRef.current;
    if (!wrap || !svgEl || graph.nodes.length === 0) return;

    const width = Math.max(wrap.clientWidth, 320);
    const height = 480;
    const n = graph.nodes.length;
    const nodes: SimNode[] = graph.nodes.map((node, i) => {
      const angle = (i / n) * 2 * Math.PI;
      return {
        ...node,
        x: width / 2 + Math.cos(angle) * 140,
        y: height / 2 + Math.sin(angle) * 140,
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
      .attr("height", height);

    const g = svg.append("g");
    const linkLayer = g.append("g").attr("class", "links");
    const nodeLayer = g.append("g").attr("class", "nodes");

    const linkSel = linkLayer
      .selectAll<SVGLineElement, SimLink>("line")
      .data(linksRaw)
      .join("line")
      .attr("stroke", "currentColor")
      .attr("stroke-opacity", 0.35)
      .attr("stroke-width", (d) => strokeForWeight(d.weight));

    const linkForce = forceLink<SimNode, SimLink>(linksRaw)
      .id((d) => d.id)
      .distance(90)
      .strength(0.55);

    const simulation = forceSimulation<SimNode>(nodes)
      .force("link", linkForce)
      .force("charge", forceManyBody<SimNode>().strength(-260))
      .force("center", forceCenter<SimNode>(width / 2, height / 2))
      .force(
        "collide",
        forceCollide<SimNode>().radius((d) =>
          d.type === "fund" ? 20 : 16,
        ),
      );

    const nodeSel = nodeLayer
      .selectAll<SVGGElement, SimNode>("g")
      .data(nodes)
      .join("g");

    const dragBehavior = d3Drag<SVGGElement, SimNode>()
      .on("start", (event, d) => {
        if (!event.active) simulation.alphaTarget(0.35).restart();
        d.fx = d.x;
        d.fy = d.y;
      })
      .on("drag", (event, d) => {
        d.fx = event.x;
        d.fy = event.y;
      })
      .on("end", (event, d) => {
        if (!event.active) simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
      });

    nodeSel.call(dragBehavior);

    nodeSel
      .append("circle")
      .attr("r", (d) => (d.type === "fund" ? 10 : 8))
      .attr("class", (d) =>
        d.type === "fund"
          ? "fill-blue-600 dark:fill-blue-400"
          : "fill-emerald-600 dark:fill-emerald-400",
      );

    nodeSel
      .append("text")
      .attr("dx", 14)
      .attr("dy", 4)
      .attr("class", "fill-zinc-800 text-[10px] dark:fill-zinc-100")
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
      simulation.stop();
    };
  }, [graph]);

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
        <svg
          ref={svgRef}
          className="block max-w-full"
          aria-label="Red fondos y empresas"
        />
      </div>
      <p className="text-xs text-zinc-500 dark:text-zinc-400">
        Grosor de línea proporcional a la inversión normalizada en este
        subconjunto. Arrastra los nodos para reacomodar.
      </p>
    </div>
  );
}
