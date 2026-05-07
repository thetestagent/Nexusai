import React from "react";
import type { Token } from "@/lib/nexus/lexer";
import { getTokenColor } from "@/lib/nexus/lexer";

interface TokenListProps {
  tokens: Token[];
}

export default function TokenList({ tokens }: TokenListProps) {
  return (
    <div className="h-full overflow-y-auto p-2 space-y-1 bg-card">
      {tokens.map((t, i) => {
        const colorType = getTokenColor(t.kind);
        let colorClass = "text-muted-foreground";
        if (colorType === "keyword") colorClass = "text-cyan-400 font-bold";
        else if (colorType === "unit") colorClass = "text-amber-400 font-bold";
        else if (colorType === "number") colorClass = "text-orange-400";
        else if (colorType === "string") colorClass = "text-green-400";
        else if (colorType === "identifier") colorClass = "text-foreground";
        else if (colorType === "operator") colorClass = "text-muted-foreground";

        return (
          <div key={i} className="flex items-center text-[11px] font-mono hover:bg-muted/50 p-1 rounded cursor-pointer group">
            <span className="w-8 text-muted-foreground/50 text-right mr-3 group-hover:text-muted-foreground transition-colors">{i}</span>
            <span className="w-24 text-muted-foreground/70">{t.kind}</span>
            <span className={`flex-1 truncate ${colorClass}`}>
              {t.lexeme ? (t.kind === "StringLiteral" ? `"${t.lexeme}"` : t.lexeme) : ""}
            </span>
            <span className="text-muted-foreground/40 shrink-0">
              [{t.span.start}:{t.span.end}]
            </span>
          </div>
        );
      })}
    </div>
  );
}
