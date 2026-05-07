import React, { useState, useRef, useEffect, useCallback } from "react";
import { Send, Bot, Sparkles, Loader2, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { PredictCallRecord } from "@/lib/nexus/interpreter";

interface Message {
  role: "user" | "assistant";
  content: string;
  pending?: boolean;
}

interface PredictResult {
  prediction: string;
  entity: string;
  result: string;
}

interface AiPanelProps {
  currentCode: string;
  predictQueue: PredictCallRecord[];
  onPredictResolved: (prediction: string, result: string) => void;
}

const SUGGESTIONS = [
  "Explain Ohm's Law in NEXUS",
  "Write a battery monitoring entity",
  "How do I define a sensor at 60Hz?",
  "Show me dimensional algebra examples",
  "Generate a power grid model",
];

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";

async function streamChat(
  message: string,
  code: string,
  history: { role: "user" | "assistant"; content: string }[],
  onChunk: (text: string) => void,
  onDone: () => void,
  onError: (e: string) => void
) {
  try {
    const res = await fetch(`${BASE}/api/ai/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, code, history }),
    });

    if (!res.ok || !res.body) {
      onError("AI service unavailable");
      return;
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        if (line.startsWith("data: ")) {
          try {
            const data = JSON.parse(line.slice(6));
            if (data.content) onChunk(data.content);
            if (data.done) { onDone(); return; }
            if (data.error) { onError(data.error); return; }
          } catch { /* skip malformed */ }
        }
      }
    }
    onDone();
  } catch (e) {
    onError(String(e));
  }
}

async function resolvePredict(
  entity: string,
  prediction: string,
  scope: Record<string, string>,
  skills: string[]
): Promise<string> {
  try {
    const res = await fetch(`${BASE}/api/ai/predict`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entity, prediction, scope, skills }),
    });
    if (!res.ok) return "Prediction service unavailable.";
    const data = await res.json() as PredictResult;
    return data.result;
  } catch {
    return "Could not connect to AI prediction service.";
  }
}

function MarkdownText({ text }: { text: string }) {
  // Very lightweight markdown: code blocks, inline code, bold, line breaks
  const lines = text.split("\n");
  const elements: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    if (lines[i].startsWith("```")) {
      const lang = lines[i].slice(3).trim();
      i++;
      const codeLines: string[] = [];
      while (i < lines.length && !lines[i].startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }
      i++; // skip closing ```
      elements.push(
        <pre key={i} className="bg-zinc-900 border border-zinc-700 rounded p-2 my-1.5 overflow-x-auto text-[10px] font-mono text-zinc-200">
          <code>{codeLines.join("\n")}</code>
        </pre>
      );
    } else {
      const line = lines[i];
      // inline code + bold
      const parsed = line
        .replace(/\*\*(.*?)\*\*/g, "<b>$1</b>")
        .replace(/`([^`]+)`/g, '<code class="bg-zinc-800 px-1 rounded text-teal-300 font-mono text-[10px]">$1</code>');
      elements.push(
        <p key={i} className="leading-relaxed" dangerouslySetInnerHTML={{ __html: parsed || "&nbsp;" }} />
      );
      i++;
    }
  }

  return <div className="space-y-0.5">{elements}</div>;
}

export default function AiPanel({ currentCode, predictQueue, onPredictResolved }: AiPanelProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Hi! I'm the NEXUS AI assistant. I understand NEXUS syntax, dimensional analysis, and engineering unit semantics. Ask me anything or paste some code to get help.\n\nI also power the `predict` calls in your NEXUS entities — when your code runs `predict battery_failure`, I'll generate a real prediction based on the entity's context.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [resolvedPredictions, setResolvedPredictions] = useState<Record<string, string>>({});
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const processingPredictsRef = useRef(new Set<string>());

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Auto-resolve predict queue
  useEffect(() => {
    for (const item of predictQueue) {
      const key = `${item.entity}:${item.prediction}`;
      if (processingPredictsRef.current.has(key)) continue;
      processingPredictsRef.current.add(key);

      resolvePredict(item.entity, item.prediction, item.scope, item.skills).then(result => {
        setResolvedPredictions(prev => ({ ...prev, [key]: result }));
        onPredictResolved(item.prediction, result);
        // Also show as a message
        setMessages(prev => [
          ...prev,
          {
            role: "assistant",
            content: `**\`predict ${item.prediction}\`** resolved by ${item.entity || "entity"}:\n\n${result}`,
          },
        ]);
      });
    }
  }, [predictQueue, onPredictResolved]);

  const sendMessage = useCallback(async (text?: string) => {
    const msg = (text ?? input).trim();
    if (!msg || loading) return;

    setInput("");
    setLoading(true);

    const history = messages.map(m => ({ role: m.role, content: m.content }));

    setMessages(prev => [
      ...prev,
      { role: "user", content: msg },
      { role: "assistant", content: "", pending: true },
    ]);

    let accumulated = "";

    await streamChat(
      msg,
      currentCode,
      history,
      (chunk) => {
        accumulated += chunk;
        setMessages(prev => {
          const next = [...prev];
          next[next.length - 1] = { role: "assistant", content: accumulated, pending: true };
          return next;
        });
      },
      () => {
        setMessages(prev => {
          const next = [...prev];
          next[next.length - 1] = { role: "assistant", content: accumulated };
          return next;
        });
        setLoading(false);
      },
      (err) => {
        setMessages(prev => {
          const next = [...prev];
          next[next.length - 1] = { role: "assistant", content: `Error: ${err}` };
          return next;
        });
        setLoading(false);
      }
    );
  }, [input, messages, loading, currentCode]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#070710]">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 text-xs">
        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-2 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
            <div className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center mt-0.5
              ${msg.role === "assistant"
                ? "bg-primary/20 text-primary border border-primary/30"
                : "bg-zinc-700 text-zinc-300"}`}>
              {msg.role === "assistant"
                ? <Bot className="w-3.5 h-3.5" />
                : <User className="w-3 h-3" />}
            </div>
            <div className={`max-w-[85%] rounded-lg px-3 py-2 leading-relaxed
              ${msg.role === "assistant"
                ? "bg-zinc-900 border border-zinc-800 text-zinc-200"
                : "bg-primary/15 border border-primary/25 text-zinc-100"}`}>
              {msg.pending && !msg.content
                ? <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
                : <MarkdownText text={msg.content} />}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Suggestions (only when no user messages yet) */}
      {messages.filter(m => m.role === "user").length === 0 && (
        <div className="px-3 pb-2 flex flex-wrap gap-1.5">
          {SUGGESTIONS.map(s => (
            <button
              key={s}
              onClick={() => sendMessage(s)}
              className="text-[10px] px-2.5 py-1 rounded-full border border-zinc-700 text-zinc-400 hover:border-primary/50 hover:text-primary transition-colors bg-zinc-900/50"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Input area */}
      <div className="p-3 border-t border-border bg-card">
        <div className="flex gap-2 items-end">
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about NEXUS, or paste code for help…"
              rows={2}
              className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-zinc-200 placeholder:text-zinc-600 resize-none focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-colors font-mono"
            />
          </div>
          <Button
            size="icon"
            onClick={() => sendMessage()}
            disabled={loading || !input.trim()}
            className="shrink-0 h-9 w-9 bg-primary text-primary-foreground hover:bg-primary/80 disabled:opacity-30"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </div>
        <div className="flex items-center gap-1.5 mt-1.5">
          <Sparkles className="w-3 h-3 text-primary/50" />
          <span className="text-[9px] text-zinc-600">Powered by OpenAI · context-aware · shift+enter for newline</span>
        </div>
      </div>
    </div>
  );
}
