import React, { useState } from "react";
import type { AstNode, Program } from "@/lib/nexus/ast";
import { ChevronRight, ChevronDown } from "lucide-react";

interface AstViewerProps {
  program?: Program | null;
}

export default function AstViewer({ program }: AstViewerProps) {
  if (!program) return <div className="p-4 text-xs text-muted-foreground italic">No AST available</div>;

  return (
    <div className="h-full overflow-y-auto p-2 font-mono text-[11px] bg-card">
      <div className="text-muted-foreground mb-2">Program ({program.decls.length} declarations)</div>
      {program.decls.map((decl, i) => (
        <AstNodeView key={decl.id || i} node={decl} defaultOpen={true} />
      ))}
    </div>
  );
}

function AstNodeView({ node, name, defaultOpen = false }: { node: any, name?: string, defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);

  if (node === null || node === undefined) {
    return <span className="text-muted-foreground">null</span>;
  }

  if (typeof node !== "object") {
    let color = "text-foreground";
    if (typeof node === "string") color = "text-green-400";
    if (typeof node === "number") color = "text-orange-400";
    if (typeof node === "boolean") color = "text-cyan-400";
    return <span className={color}>{typeof node === "string" ? `"${node}"` : String(node)}</span>;
  }

  if (Array.isArray(node)) {
    if (node.length === 0) return <span className="text-muted-foreground">[]</span>;
    return (
      <div className="ml-4">
        {node.map((item, i) => (
          <div key={i} className="flex">
            <span className="text-muted-foreground mr-2">-</span>
            <AstNodeView node={item} />
          </div>
        ))}
      </div>
    );
  }

  // It's an AST node or sub-object
  const isAstNode = "type" in node;
  const keys = Object.keys(node).filter(k => k !== "id" && k !== "span");

  return (
    <div className="">
      <div 
        className="flex items-center cursor-pointer hover:bg-muted/50 py-0.5 rounded -ml-4 pl-4"
        onClick={() => setOpen(!open)}
      >
        {open ? <ChevronDown className="w-3 h-3 text-muted-foreground shrink-0 mr-1" /> : <ChevronRight className="w-3 h-3 text-muted-foreground shrink-0 mr-1" />}
        {name && <span className="text-primary/70 mr-1">{name}:</span>}
        {isAstNode ? (
          <span className="text-blue-400 font-bold">{node.type}</span>
        ) : (
          <span className="text-muted-foreground">{'{...}'}</span>
        )}
        {!open && isAstNode && "span" in node && (
           <span className="text-muted-foreground/40 ml-2">[{node.span.start}:{node.span.end}]</span>
        )}
      </div>
      
      {open && (
        <div className="ml-4 border-l border-border/50 pl-2">
          {keys.map(k => (
            <div key={k} className="mt-0.5">
              <span className="text-muted-foreground mr-2">{k}:</span>
              <AstNodeView node={node[k]} />
            </div>
          ))}
          {isAstNode && "span" in node && (
            <div className="mt-0.5 text-muted-foreground/40">
              span: [{node.span.start}:{node.span.end}]
            </div>
          )}
        </div>
      )}
    </div>
  );
}
