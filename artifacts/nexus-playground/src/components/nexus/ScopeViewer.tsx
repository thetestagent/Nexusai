import React from "react";
import type { NexusValue } from "@/lib/nexus/interpreter";

interface ScopeViewerProps {
  scope: Record<string, NexusValue>;
}

export default function ScopeViewer({ scope }: ScopeViewerProps) {
  const entries = Object.entries(scope);
  
  if (entries.length === 0) {
    return <div className="p-4 text-xs text-muted-foreground italic">Scope is empty</div>;
  }

  return (
    <div className="h-full overflow-y-auto p-2 bg-card">
      <table className="w-full text-left text-[11px] font-mono">
        <thead>
          <tr className="border-b border-border/50 text-muted-foreground">
            <th className="font-normal py-1">Name</th>
            <th className="font-normal py-1">Type</th>
            <th className="font-normal py-1">Value</th>
          </tr>
        </thead>
        <tbody>
          {entries.map(([name, value]) => {
            let typeColor = "text-muted-foreground";
            let valStr = "";
            let kindStr: string = value.kind;

            if (value.kind === "int" || value.kind === "float") {
              typeColor = "text-orange-400";
              valStr = String(value.value);
            } else if (value.kind === "unit") {
              typeColor = "text-amber-400";
              valStr = `${value.value}${value.unit}`;
              kindStr = `unit(${value.unit})`;
            } else if (value.kind === "string") {
              typeColor = "text-green-400";
              valStr = `"${value.value}"`;
            } else if (value.kind === "bool") {
              typeColor = "text-cyan-400";
              valStr = String(value.value);
            } else if (value.kind === "fn") {
              typeColor = "text-blue-400";
              valStr = `fn(${value.params.join(", ")})`;
            } else if (value.kind === "entity") {
              typeColor = "text-purple-400";
              valStr = `{...}`;
            } else {
              valStr = "null";
            }

            return (
              <tr key={name} className="border-b border-border/20 hover:bg-muted/50 transition-colors">
                <td className="py-1.5 text-foreground font-bold">{name}</td>
                <td className={`py-1.5 ${typeColor}`}>{kindStr}</td>
                <td className="py-1.5 text-foreground/80">{valStr}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
