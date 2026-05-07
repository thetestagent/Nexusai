import React, { useMemo } from "react";
import type { ReactiveNode } from "@/lib/nexus/interpreter";
import type { IrGraph, IrNode } from "@/lib/nexus/ir";
import { dimensionLabel } from "@/lib/nexus/ir";

interface ReactiveGraphProps {
  nodes: ReactiveNode[];
  irGraph?: IrGraph | null;
}

const KIND_COLOR: Record<string, string> = {
  entity:     "#a855f7",
  sensor:     "#06b6d4",
  equation:   "#f97316",
  variable:   "#3b82f6",
  skill:      "#22c55e",
  Binding:    "#3b82f6",
  Equation:   "#f97316",
  Entity:     "#a855f7",
  Sensor:     "#06b6d4",
  Skill:      "#22c55e",
  Reaction:   "#ec4899",
  Prediction: "#eab308",
  Literal:    "#71717a",
  Operation:  "#71717a",
};

const DIM_COLOR: Record<string, string> = {
  voltage:    "#facc15",
  current:    "#60a5fa",
  resistance: "#fb923c",
  frequency:  "#22d3ee",
  time:       "#c084fc",
  power:      "#4ade80",
  energy:     "#f472b6",
  scalar:     "#71717a",
  unknown:    "#ef4444",
};

interface LayoutNode {
  id: string;
  label: string;
  kind: string;
  value?: string;
  dimension?: string;
  valueType?: string;
  x: number;
  y: number;
}

interface LayoutEdge {
  id: string;
  x1: number; y1: number;
  x2: number; y2: number;
}

const NODE_W = 130;
const NODE_H = 44;
const X_GAP = 210;
const Y_GAP = 80;

function computeLayout(
  items: { id: string; label: string; kind: string; value?: string; dimension?: string; valueType?: string; deps: string[] }[]
): { nodes: LayoutNode[]; edges: LayoutEdge[]; width: number; height: number } {
  if (items.length === 0) return { nodes: [], edges: [], width: 0, height: 0 };

  const byId = new Map(items.map(n => [n.id, n]));
  const byLabel = new Map(items.map(n => [n.label, n]));
  const levels = new Map<string, number>();

  function getLevel(id: string, visiting = new Set<string>()): number {
    if (levels.has(id)) return levels.get(id)!;
    if (visiting.has(id)) return 0;
    visiting.add(id);
    const node = byId.get(id);
    if (!node || node.deps.length === 0) { levels.set(id, 0); return 0; }
    const depLevels = node.deps.map(depLabel => {
      const dn = byLabel.get(depLabel) ?? items.find(n => n.id === depLabel);
      return dn ? getLevel(dn.id, visiting) : -1;
    });
    visiting.delete(id);
    const lvl = Math.max(-1, ...depLevels) + 1;
    levels.set(id, lvl);
    return lvl;
  }

  items.forEach(n => getLevel(n.id));

  const levelGroups: Record<number, string[]> = {};
  let maxLevel = 0;
  levels.forEach((lvl, id) => {
    (levelGroups[lvl] = levelGroups[lvl] || []).push(id);
    if (lvl > maxLevel) maxLevel = lvl;
  });

  const positions = new Map<string, { x: number; y: number }>();
  const maxNodesPerLevel = Math.max(...Object.values(levelGroups).map(g => g.length), 1);

  for (let l = 0; l <= maxLevel; l++) {
    const group = levelGroups[l] || [];
    const totalH = group.length * Y_GAP - (Y_GAP - NODE_H);
    const centreY = (maxNodesPerLevel * Y_GAP) / 2;
    const startY = centreY - totalH / 2;
    group.forEach((id, idx) => {
      positions.set(id, { x: 40 + l * X_GAP, y: Math.max(20, startY + idx * Y_GAP) });
    });
  }

  const laidOut: LayoutNode[] = items.map(n => ({
    id: n.id,
    label: n.label,
    kind: n.kind,
    value: n.value,
    dimension: n.dimension,
    valueType: n.valueType,
    ...positions.get(n.id)!,
  }));

  const edges: LayoutEdge[] = [];
  laidOut.forEach(target => {
    (byId.get(target.id)?.deps ?? []).forEach(depLabel => {
      const src = laidOut.find(n => n.label === depLabel) ?? laidOut.find(n => n.id === depLabel);
      if (src) {
        edges.push({
          id: `${src.id}-${target.id}`,
          x1: src.x + NODE_W,
          y1: src.y + NODE_H / 2,
          x2: target.x,
          y2: target.y + NODE_H / 2,
        });
      }
    });
  });

  let maxY = 0;
  positions.forEach(p => { if (p.y > maxY) maxY = p.y; });
  const width = 80 + (maxLevel + 1) * X_GAP + NODE_W;
  const height = Math.max(maxY + NODE_H + 60, 200);

  return { nodes: laidOut, edges, width, height };
}

export default function ReactiveGraph({ nodes, irGraph }: ReactiveGraphProps) {
  const layout = useMemo(() => {
    // Prefer IR graph if available (richer data)
    if (irGraph && irGraph.nodes.size > 0) {
      const items = Array.from(irGraph.nodes.values()).map((n: IrNode) => {
        const tag = n.kind.tag;
        const label =
          "name" in n.kind ? n.kind.name :
          "skillName" in n.kind ? `${(n.kind as any).entityName}.${(n.kind as any).skillName}` :
          "target" in n.kind ? n.kind.target :
          "trigger" in n.kind ? n.kind.trigger :
          "repr" in n.kind ? n.kind.repr : n.id;

        // Deps from IR edges
        const deps: string[] = [];
        (irGraph.dependencies.get(n.id) ?? new Set()).forEach(depId => {
          const depNode = irGraph.nodes.get(depId);
          if (depNode) {
            const depLabel =
              "name" in depNode.kind ? depNode.kind.name :
              "skillName" in depNode.kind ? `${(depNode.kind as any).entityName}.${(depNode.kind as any).skillName}` :
              depId;
            deps.push(depLabel);
          }
        });

        return {
          id: n.id,
          label,
          kind: tag,
          value: n.displayValue,
          dimension: n.dimension,
          valueType: n.valueType,
          deps,
        };
      });
      return computeLayout(items);
    }

    // Fallback to interpreter reactive nodes
    if (nodes.length > 0) {
      const items = nodes.map(n => ({
        id: n.id,
        label: n.label,
        kind: n.kind,
        value: n.value,
        dimension: undefined,
        valueType: undefined,
        deps: n.dependencies ?? [],
      }));
      return computeLayout(items);
    }

    return { nodes: [], edges: [], width: 0, height: 0 };
  }, [nodes, irGraph]);

  if (layout.nodes.length === 0) {
    return (
      <div className="p-4 text-xs text-muted-foreground italic flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-zinc-600 inline-block" />
        No reactive nodes registered
      </div>
    );
  }

  return (
    <div className="w-full h-full overflow-auto bg-[#070710] relative">
      {/* Legend */}
      <div className="absolute top-2 right-2 z-10 flex flex-wrap gap-1.5 max-w-[160px] justify-end">
        {[
          { kind: "Entity", label: "entity" },
          { kind: "Sensor", label: "sensor" },
          { kind: "Equation", label: "equation" },
          { kind: "Binding", label: "binding" },
          { kind: "Skill", label: "skill" },
          { kind: "Reaction", label: "reaction" },
        ].map(({ kind, label }) => (
          <div key={kind} className="flex items-center gap-1 text-[9px] text-zinc-400">
            <span className="w-2 h-2 rounded-full inline-block shrink-0" style={{ background: KIND_COLOR[kind] }} />
            {label}
          </div>
        ))}
      </div>

      <svg width={layout.width} height={layout.height} className="min-w-full min-h-full">
        <defs>
          <marker id="arr" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
            <polygon points="0 0, 8 3, 0 6" fill="#374151" />
          </marker>
          <marker id="arr-glow" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
            <polygon points="0 0, 8 3, 0 6" fill="#38bdf8" opacity="0.4" />
          </marker>
          <filter id="glow">
            <feGaussianBlur stdDeviation="2" result="coloredBlur" />
            <feMerge><feMergeNode in="coloredBlur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        {/* Edges */}
        {layout.edges.map(e => {
          const mx = (e.x1 + e.x2) / 2;
          const path = `M ${e.x1} ${e.y1} C ${mx} ${e.y1}, ${mx} ${e.y2}, ${e.x2} ${e.y2}`;
          return (
            <g key={e.id}>
              <path d={path} fill="none" stroke="#1f2937" strokeWidth="2" markerEnd="url(#arr)" />
              <path
                d={path} fill="none" stroke="#38bdf8" strokeWidth="1.5"
                opacity="0.25" className="animate-pulse" style={{ animationDuration: "2.5s" }}
              />
            </g>
          );
        })}

        {/* Nodes */}
        {layout.nodes.map(n => {
          const color = KIND_COLOR[n.kind] ?? "#71717a";
          const dimColor = n.dimension ? (DIM_COLOR[n.dimension] ?? "#71717a") : null;
          const dimLabel = n.dimension ? dimensionLabel(n.dimension as any) : null;
          const shortLabel = n.label.length > 14 ? n.label.slice(0, 12) + "…" : n.label;
          const shortKind = n.kind.length > 8 ? n.kind.slice(0, 7) : n.kind;

          return (
            <g key={n.id} transform={`translate(${n.x}, ${n.y})`}>
              {/* Glow backing */}
              <rect
                width={NODE_W} height={NODE_H} rx="7"
                fill={color} opacity="0.06"
                filter="url(#glow)"
              />
              {/* Card */}
              <rect
                width={NODE_W} height={NODE_H} rx="6"
                fill="#111118" stroke={color} strokeWidth="1.5"
              />
              {/* Left accent bar */}
              <rect x="0" y="0" width="4" height={NODE_H} rx="3"
                fill={color} opacity="0.9" />

              {/* Kind label top-right */}
              <text x={NODE_W - 6} y="12" fill={color} fontSize="8"
                fontFamily="monospace" textAnchor="end" opacity="0.7">
                {shortKind.toLowerCase()}
              </text>

              {/* Name */}
              <text x="12" y="20" fill="#e4e4e7" fontSize="11.5"
                fontFamily="monospace" fontWeight="bold">
                {shortLabel}
              </text>

              {/* Bottom row: valueType + dimension */}
              <text x="12" y="35" fill="#71717a" fontSize="9" fontFamily="monospace">
                {n.valueType ?? ""}
              </text>
              {dimLabel && (
                <text x={NODE_W - 6} y="35" fill={dimColor ?? "#71717a"}
                  fontSize="9" fontFamily="monospace" textAnchor="end" fontWeight="bold">
                  [{dimLabel}]
                </text>
              )}
              {n.value && !dimLabel && (
                <text x={NODE_W - 6} y="35" fill="#a1a1aa"
                  fontSize="9" fontFamily="monospace" textAnchor="end">
                  {n.value}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
