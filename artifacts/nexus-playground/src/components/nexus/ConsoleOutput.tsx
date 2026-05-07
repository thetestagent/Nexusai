import React, { useEffect, useRef } from "react";
import type { PipelineResult } from "@/lib/nexus";
import { Bot } from "lucide-react";

interface ConsoleOutputProps {
  result: PipelineResult | null;
  resolvedPredictions?: Record<string, string>;
}

export default function ConsoleOutput({ result, resolvedPredictions = {} }: ConsoleOutputProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [result, resolvedPredictions]);

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
        const isPredictLine = line.type === "warn" && line.text.startsWith("predict ");
        let color = "text-foreground";
        let prefix = ">";
        if (line.type === "error") { color = "text-destructive"; prefix = "[ERR]"; }
        if (line.type === "warn") { color = "text-amber-400"; prefix = "[WARN]"; }
        if (line.type === "info") { color = "text-cyan-400"; prefix = "[INFO]"; }

        // Extract prediction target
        let predictionKey: string | null = null;
        if (isPredictLine) {
          const match = line.text.match(/^predict (\S+)/);
          if (match) predictionKey = match[1];
        }

        const resolved = predictionKey ? resolvedPredictions[predictionKey] : null;

        return (
          <React.Fragment key={`out-${i}`}>
            <div className={`flex gap-2 ${color}`}>
              <span className="shrink-0 text-muted-foreground">{prefix}</span>
              <span className="whitespace-pre-wrap">{line.text}</span>
            </div>
            {resolved && (
              <div className="ml-10 mb-1 rounded border border-primary/20 bg-primary/5 px-2.5 py-1.5 text-primary/90 flex gap-2 items-start">
                <Bot className="w-3 h-3 shrink-0 mt-0.5 text-primary" />
                <span className="whitespace-pre-wrap leading-relaxed">{resolved}</span>
              </div>
            )}
          </React.Fragment>
        );
      })}

      {!hasErrors && runResult?.output.length === 0 && (
        <div className="text-muted-foreground italic">Program exited with no output.</div>
      )}

      {!hasErrors && (
        <div className="text-green-500/80 mt-2 font-bold flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-green-500/80" /> Process finished.
        </div>
      )}
    </div>
  );
}
