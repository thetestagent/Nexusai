import React, { useEffect, useRef } from "react";
import type { PipelineResult } from "@/lib/nexus";

interface ConsoleOutputProps {
  result: PipelineResult | null;
}

export default function ConsoleOutput({ result }: ConsoleOutputProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [result]);

  if (!result) {
    return <div className="p-4 text-xs text-muted-foreground font-mono italic">Waiting for execution...</div>;
  }

  const { lexErrors, parseErrors, result: runResult } = result;
  
  const hasErrors = lexErrors.length > 0 || parseErrors.length > 0 || (runResult && runResult.errors.length > 0);

  return (
    <div ref={scrollRef} className="h-full overflow-y-auto p-3 font-mono text-[11px] bg-card text-foreground space-y-1">
      {lexErrors.map((e, i) => (
        <div key={`lex-${i}`} className="text-destructive flex gap-2">
          <span className="shrink-0">[LEX ERROR]</span>
          <span>{e.message} at [{e.span.start}:{e.span.end}]</span>
        </div>
      ))}
      {parseErrors.map((e, i) => (
        <div key={`parse-${i}`} className="text-destructive flex gap-2">
          <span className="shrink-0">[PARSE ERROR]</span>
          <span>{e.message} at [{e.span.start}:{e.span.end}]</span>
        </div>
      ))}
      
      {runResult?.output.map((line, i) => {
        let color = "text-foreground";
        let prefix = ">";
        if (line.type === "error") { color = "text-destructive"; prefix = "[ERR]"; }
        if (line.type === "warn") { color = "text-amber-400"; prefix = "[WARN]"; }
        if (line.type === "info") { color = "text-cyan-400"; prefix = "[INFO]"; }
        
        return (
          <div key={`out-${i}`} className={`flex gap-2 ${color}`}>
            <span className="shrink-0 text-muted-foreground">{prefix}</span>
            <span className="whitespace-pre-wrap">{line.text}</span>
          </div>
        );
      })}

      {!hasErrors && runResult?.output.length === 0 && (
        <div className="text-muted-foreground italic">Program exited with no output.</div>
      )}
      
      {!hasErrors && (
        <div className="text-green-500/80 mt-2 font-bold flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-green-500/80"></span> Process finished.
        </div>
      )}
    </div>
  );
}
