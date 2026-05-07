import React from "react";
import { CheckCircle, XCircle, AlertTriangle, Info, Cpu, GitBranch } from "lucide-react";
import type { TypeCheckResult, SymbolInfo } from "@/lib/nexus/typeck";
import { dimensionLabel } from "@/lib/nexus/ir";

interface TypeCheckViewerProps {
  result: TypeCheckResult | null;
}

const DIM_COLOR: Record<string, string> = {
  voltage:    "text-yellow-400",
  current:    "text-blue-400",
  resistance: "text-orange-400",
  frequency:  "text-cyan-400",
  time:       "text-purple-400",
  power:      "text-green-400",
  energy:     "text-pink-400",
  scalar:     "text-zinc-400",
  unknown:    "text-red-400",
};

const VT_COLOR: Record<string, string> = {
  int:      "text-sky-300",
  float:    "text-sky-200",
  unit:     "text-amber-300",
  string:   "text-green-300",
  bool:     "text-violet-300",
  entity:   "text-fuchsia-400",
  equation: "text-orange-300",
  signal:   "text-cyan-300",
  fn:       "text-zinc-400",
  unknown:  "text-red-400",
  void:     "text-zinc-600",
};

export default function TypeCheckViewer({ result }: TypeCheckViewerProps) {
  if (!result) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="text-xs text-muted-foreground italic">Run the pipeline to see type analysis</div>
      </div>
    );
  }

  const errors = result.diagnostics.filter(d => d.kind === "error");
  const warnings = result.diagnostics.filter(d => d.kind === "warning");
  const infos = result.diagnostics.filter(d => d.kind === "info");

  const nodeCount = result.irGraph.nodes.size;
  const edgeCount = result.irGraph.edges.length;

  const symbols = Array.from(result.symbolTable.entries()).filter(
    ([name]) => !["print", "sqrt", "abs", "solve"].includes(name)
  );

  return (
    <div className="flex-1 overflow-y-auto font-mono text-xs">
      {/* Status Bar */}
      <div className={`flex items-center gap-2 p-3 border-b border-border ${result.ok ? "bg-green-950/30" : "bg-red-950/30"}`}>
        {result.ok ? (
          <CheckCircle className="w-4 h-4 text-green-400 shrink-0" />
        ) : (
          <XCircle className="w-4 h-4 text-red-400 shrink-0" />
        )}
        <div>
          <div className={`font-bold ${result.ok ? "text-green-400" : "text-red-400"}`}>
            {result.ok ? "Type Check Passed" : `${errors.length} Error${errors.length !== 1 ? "s" : ""}`}
          </div>
          {warnings.length > 0 && (
            <div className="text-yellow-400 text-[10px]">{warnings.length} warning{warnings.length !== 1 ? "s" : ""}</div>
          )}
        </div>
      </div>

      {/* IR Graph Stats */}
      <div className="flex gap-4 p-3 border-b border-border bg-muted/20">
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <Cpu className="w-3.5 h-3.5 text-primary/70" />
          <span className="text-foreground font-bold">{nodeCount}</span>
          <span>IR nodes</span>
        </div>
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <GitBranch className="w-3.5 h-3.5 text-primary/70" />
          <span className="text-foreground font-bold">{edgeCount}</span>
          <span>edges</span>
        </div>
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <span className="text-foreground font-bold">{symbols.length}</span>
          <span>symbols</span>
        </div>
      </div>

      {/* Diagnostics */}
      {result.diagnostics.length > 0 && (
        <div className="p-2 border-b border-border space-y-1">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground px-1 mb-2">Diagnostics</div>
          {result.diagnostics.map((d, i) => (
            <div
              key={i}
              className={`flex items-start gap-2 px-2 py-1.5 rounded text-[11px] ${
                d.kind === "error"
                  ? "bg-red-950/40 border border-red-900/50"
                  : d.kind === "warning"
                  ? "bg-yellow-950/40 border border-yellow-900/50"
                  : "bg-blue-950/40 border border-blue-900/50"
              }`}
            >
              {d.kind === "error" ? (
                <XCircle className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />
              ) : d.kind === "warning" ? (
                <AlertTriangle className="w-3.5 h-3.5 text-yellow-400 shrink-0 mt-0.5" />
              ) : (
                <Info className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />
              )}
              <span className={d.kind === "error" ? "text-red-300" : d.kind === "warning" ? "text-yellow-300" : "text-blue-300"}>
                {d.message}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Symbol Table */}
      {symbols.length > 0 && (
        <div className="p-2">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground px-1 mb-2">Symbol Table</div>
          <div className="space-y-1">
            {symbols.map(([name, sym]) => (
              <SymbolRow key={name} name={name} sym={sym} />
            ))}
          </div>
        </div>
      )}

      {/* IR Node List */}
      {nodeCount > 0 && (
        <div className="p-2 border-t border-border">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground px-1 mb-2">IR Nodes ({nodeCount})</div>
          <div className="space-y-0.5">
            {Array.from(result.irGraph.nodes.values()).map(node => {
              const tag = node.kind.tag;
              const name = "name" in node.kind ? node.kind.name :
                           "skillName" in node.kind ? `${(node.kind as any).entityName}.${(node.kind as any).skillName}` :
                           "target" in node.kind ? node.kind.target :
                           "trigger" in node.kind ? node.kind.trigger :
                           "repr" in node.kind ? node.kind.repr : "";
              const evalPos = result.irGraph.evalOrder.indexOf(node.id);
              return (
                <div key={node.id} className="flex items-center gap-2 px-2 py-1 rounded hover:bg-muted/30 transition-colors group">
                  <span className="text-zinc-600 w-4 text-right shrink-0">{evalPos >= 0 ? evalPos + 1 : "—"}</span>
                  <NodeKindBadge tag={tag} />
                  <span className="text-zinc-200 flex-1 truncate">{name}</span>
                  <span className={`${VT_COLOR[node.valueType] ?? "text-zinc-400"} shrink-0`}>{node.valueType}</span>
                  <span className={`${DIM_COLOR[node.dimension] ?? "text-zinc-400"} shrink-0`}>[{dimensionLabel(node.dimension)}]</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function SymbolRow({ name, sym }: { name: string; sym: SymbolInfo }) {
  return (
    <div className="flex items-center gap-2 px-2 py-1 rounded hover:bg-muted/30 transition-colors">
      <span className="text-zinc-200 font-bold w-24 truncate shrink-0">{name}</span>
      <span className={`${VT_COLOR[sym.valueType] ?? "text-zinc-400"} shrink-0`}>{sym.valueType}</span>
      <span className="text-zinc-600 shrink-0">·</span>
      <span className={`${DIM_COLOR[sym.dimension] ?? "text-zinc-400"} shrink-0`}>[{dimensionLabel(sym.dimension)}]</span>
      {sym.mutable && <span className="text-violet-500 text-[9px] shrink-0">mut</span>}
    </div>
  );
}

function NodeKindBadge({ tag }: { tag: string }) {
  const colors: Record<string, string> = {
    Binding:   "bg-blue-950 text-blue-300 border-blue-800",
    Equation:  "bg-orange-950 text-orange-300 border-orange-800",
    Entity:    "bg-purple-950 text-purple-300 border-purple-800",
    Sensor:    "bg-cyan-950 text-cyan-300 border-cyan-800",
    Skill:     "bg-green-950 text-green-300 border-green-800",
    Reaction:  "bg-pink-950 text-pink-300 border-pink-800",
    Prediction:"bg-yellow-950 text-yellow-300 border-yellow-800",
    Literal:   "bg-zinc-800 text-zinc-300 border-zinc-700",
    Operation: "bg-zinc-800 text-zinc-300 border-zinc-700",
  };
  const cls = colors[tag] ?? "bg-zinc-800 text-zinc-400 border-zinc-700";
  return (
    <span className={`text-[9px] px-1.5 py-0.5 rounded border font-bold uppercase tracking-wide shrink-0 ${cls}`}>
      {tag.slice(0, 3)}
    </span>
  );
}
