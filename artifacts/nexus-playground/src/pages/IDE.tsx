import React, { useState, useEffect, useCallback } from "react";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import {
  Play, Terminal, Activity, Code2, Beaker, Menu, Database,
  ShieldCheck, Cpu
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EXAMPLES } from "@/lib/nexus/examples";
import { runPipeline, PipelineResult } from "@/lib/nexus";
import NexusEditor from "@/components/nexus/NexusEditor";
import TokenList from "@/components/nexus/TokenList";
import AstViewer from "@/components/nexus/AstViewer";
import ScopeViewer from "@/components/nexus/ScopeViewer";
import ConsoleOutput from "@/components/nexus/ConsoleOutput";
import ReactiveGraph from "@/components/nexus/ReactiveGraph";
import TypeCheckViewer from "@/components/nexus/TypeCheckViewer";

const CATEGORIES = ["basics", "engineering", "ai", "reactive", "math"] as const;

export default function IDE() {
  const [code, setCode] = useState(() => {
    return localStorage.getItem("nexus-code") || EXAMPLES[0].code;
  });

  const [result, setResult] = useState<PipelineResult | null>(null);
  const [selectedExample, setSelectedExample] = useState(EXAMPLES[0].id);

  // Debounced run
  useEffect(() => {
    localStorage.setItem("nexus-code", code);
    const timeout = setTimeout(() => {
      setResult(runPipeline(code));
    }, 300);
    return () => clearTimeout(timeout);
  }, [code]);

  const handleRun = useCallback(() => {
    setResult(runPipeline(code));
  }, [code]);

  const handleSelectExample = useCallback((id: string) => {
    const ex = EXAMPLES.find(e => e.id === id);
    if (ex) {
      setSelectedExample(id);
      setCode(ex.code);
    }
  }, []);

  const hasTypeErrors = result?.typeCheck && !result.typeCheck.ok;
  const hasLexErrors = (result?.lexErrors?.length ?? 0) > 0;
  const hasParseErrors = (result?.parseErrors?.length ?? 0) > 0;

  return (
    <div className="h-screen w-full flex flex-col bg-background text-foreground overflow-hidden font-sans">
      {/* Header */}
      <header className="h-12 border-b border-border flex items-center justify-between px-4 shrink-0 bg-card">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-primary/20 flex items-center justify-center">
            <span className="text-primary font-bold text-xs tracking-tight">NX</span>
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-wide flex items-center gap-2">
              NEXUS{" "}
              <span className="text-xs text-muted-foreground font-normal bg-muted px-1.5 py-0.5 rounded">
                v0.1
              </span>
            </h1>
            <p className="text-[10px] text-primary/70 uppercase tracking-widest">
              AI-Native Reactive Engineering Language
            </p>
          </div>
        </div>

        {/* Status indicators */}
        <div className="flex items-center gap-3">
          {result && (
            <div className="flex items-center gap-2 text-[10px] font-mono">
              {hasLexErrors || hasParseErrors ? (
                <span className="text-red-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-400 inline-block" />
                  Parse Error
                </span>
              ) : hasTypeErrors ? (
                <span className="text-yellow-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 inline-block" />
                  Type Error
                </span>
              ) : (
                <span className="text-green-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block animate-pulse" />
                  {result.typeCheck?.irGraph.nodes.size ?? 0} IR nodes
                </span>
              )}
            </div>
          )}
          <Button
            onClick={handleRun}
            size="sm"
            className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90 font-mono text-xs font-bold"
          >
            <Play className="w-3.5 h-3.5" />
            COMPILE & RUN
          </Button>
        </div>
      </header>

      {/* Main Workspace */}
      <div className="flex-1 overflow-hidden">
        <PanelGroup direction="horizontal">

          {/* Sidebar */}
          <Panel
            defaultSize={15}
            minSize={10}
            maxSize={25}
            className="bg-card flex flex-col border-r border-border"
          >
            <div className="p-3 border-b border-border text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <Menu className="w-3.5 h-3.5" />
              Programs
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-4">
              {CATEGORIES.map(category => {
                const items = EXAMPLES.filter(e => e.category === category);
                if (items.length === 0) return null;
                return (
                  <div key={category}>
                    <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2 px-2 flex items-center gap-1.5">
                      {category === "math" && <Cpu className="w-3 h-3 text-primary/60" />}
                      {category}
                    </div>
                    <div className="space-y-1">
                      {items.map(ex => (
                        <button
                          key={ex.id}
                          onClick={() => handleSelectExample(ex.id)}
                          className={`w-full text-left px-2 py-1.5 rounded text-xs transition-colors ${
                            selectedExample === ex.id
                              ? "bg-primary/20 text-primary border border-primary/30"
                              : "text-muted-foreground hover:bg-muted hover:text-foreground"
                          }`}
                        >
                          <div className="font-medium truncate">{ex.title}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </Panel>

          <PanelResizeHandle className="w-1 bg-border hover:bg-primary/50 transition-colors" />

          {/* Center Column: Editor & Console/Graph */}
          <Panel defaultSize={55} minSize={30}>
            <PanelGroup direction="vertical">
              {/* Editor */}
              <Panel defaultSize={68} minSize={20} className="flex flex-col">
                <div className="h-9 border-b border-border bg-card flex items-center px-3 text-xs font-mono text-muted-foreground gap-2 shrink-0">
                  <Code2 className="w-3.5 h-3.5" />
                  main.nx
                  {result && (
                    <span className="ml-auto text-[10px]">
                      {result.tokens.length} tokens
                      {result.typeCheck && (
                        <span className="ml-2 text-primary/60">
                          · {result.typeCheck.irGraph.nodes.size} IR nodes
                          · eval order: {result.typeCheck.irGraph.evalOrder.length}
                        </span>
                      )}
                    </span>
                  )}
                </div>
                <div className="flex-1 relative overflow-hidden bg-[#0d1117]">
                  <NexusEditor
                    code={code}
                    onChange={setCode}
                    errors={result?.parseErrors || []}
                    lexErrors={result?.lexErrors || []}
                  />
                </div>
              </Panel>

              <PanelResizeHandle className="h-1 bg-border hover:bg-primary/50 transition-colors" />

              {/* Console, Graph */}
              <Panel defaultSize={32} minSize={10} className="bg-card flex flex-col">
                <Tabs defaultValue="console" className="flex-1 flex flex-col">
                  <div className="h-9 border-b border-border flex items-center px-2 bg-muted/50 shrink-0">
                    <TabsList className="h-7 bg-transparent">
                      <TabsTrigger
                        value="console"
                        className="text-xs font-mono data-[state=active]:bg-card data-[state=active]:text-primary border border-transparent data-[state=active]:border-border data-[state=active]:border-b-card -mb-px px-3 gap-1.5"
                      >
                        <Terminal className="w-3.5 h-3.5" /> Console
                      </TabsTrigger>
                      <TabsTrigger
                        value="graph"
                        className="text-xs font-mono data-[state=active]:bg-card data-[state=active]:text-primary border border-transparent data-[state=active]:border-border data-[state=active]:border-b-card -mb-px px-3 gap-1.5"
                      >
                        <Activity className="w-3.5 h-3.5" /> Reactive Graph
                      </TabsTrigger>
                    </TabsList>
                  </div>
                  <TabsContent
                    value="console"
                    className="flex-1 overflow-hidden m-0 data-[state=active]:flex flex-col"
                  >
                    <ConsoleOutput result={result} />
                  </TabsContent>
                  <TabsContent
                    value="graph"
                    className="flex-1 overflow-hidden m-0 data-[state=active]:flex flex-col"
                  >
                    <ReactiveGraph
                      nodes={result?.result?.reactiveGraph || []}
                      irGraph={result?.typeCheck?.irGraph ?? null}
                    />
                  </TabsContent>
                </Tabs>
              </Panel>
            </PanelGroup>
          </Panel>

          <PanelResizeHandle className="w-1 bg-border hover:bg-primary/50 transition-colors" />

          {/* Right Panel: Inspector */}
          <Panel
            defaultSize={30}
            minSize={20}
            className="bg-card flex flex-col border-l border-border"
          >
            <Tabs defaultValue="typeck" className="flex-1 flex flex-col">
              <div className="h-9 border-b border-border flex items-center px-2 bg-muted/50 shrink-0">
                <TabsList className="h-7 bg-transparent w-full justify-start">
                  <TabsTrigger
                    value="typeck"
                    className="text-xs font-mono data-[state=active]:bg-card data-[state=active]:text-foreground border border-transparent data-[state=active]:border-border data-[state=active]:border-b-card -mb-px px-2.5 gap-1"
                  >
                    <ShieldCheck className="w-3.5 h-3.5 inline-block" />
                    <span className="ml-1">TypeChk</span>
                    {hasTypeErrors && (
                      <span className="ml-1 text-[9px] bg-red-900/60 text-red-300 rounded px-1">!</span>
                    )}
                  </TabsTrigger>
                  <TabsTrigger
                    value="ast"
                    className="text-xs font-mono data-[state=active]:bg-card data-[state=active]:text-foreground border border-transparent data-[state=active]:border-border data-[state=active]:border-b-card -mb-px px-2.5 gap-1"
                  >
                    <Beaker className="w-3.5 h-3.5 inline-block" /> AST
                  </TabsTrigger>
                  <TabsTrigger
                    value="scope"
                    className="text-xs font-mono data-[state=active]:bg-card data-[state=active]:text-foreground border border-transparent data-[state=active]:border-border data-[state=active]:border-b-card -mb-px px-2.5 gap-1"
                  >
                    <Database className="w-3.5 h-3.5 inline-block" /> Scope
                  </TabsTrigger>
                  <TabsTrigger
                    value="tokens"
                    className="text-xs font-mono data-[state=active]:bg-card data-[state=active]:text-foreground border border-transparent data-[state=active]:border-border data-[state=active]:border-b-card -mb-px px-2.5"
                  >
                    Tokens
                  </TabsTrigger>
                </TabsList>
              </div>

              <TabsContent
                value="typeck"
                className="flex-1 overflow-hidden m-0 data-[state=active]:flex flex-col"
              >
                <TypeCheckViewer result={result?.typeCheck ?? null} />
              </TabsContent>
              <TabsContent
                value="ast"
                className="flex-1 overflow-hidden m-0 data-[state=active]:flex flex-col"
              >
                <AstViewer program={result?.program} />
              </TabsContent>
              <TabsContent
                value="scope"
                className="flex-1 overflow-hidden m-0 data-[state=active]:flex flex-col"
              >
                <ScopeViewer scope={result?.result?.scope || {}} />
              </TabsContent>
              <TabsContent
                value="tokens"
                className="flex-1 overflow-hidden m-0 data-[state=active]:flex flex-col"
              >
                <TokenList tokens={result?.tokens || []} />
              </TabsContent>
            </Tabs>
          </Panel>

        </PanelGroup>
      </div>
    </div>
  );
}
