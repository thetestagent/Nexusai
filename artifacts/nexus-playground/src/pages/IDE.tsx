import React, { useState, useEffect, useCallback, useRef } from "react";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import {
  Play, Terminal, Activity, Code2, Beaker, Menu, Database,
  ShieldCheck, Bot, Sparkles
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EXAMPLES } from "@/lib/nexus/examples";
import { runPipeline, PipelineResult } from "@/lib/nexus";
import type { PredictCallRecord } from "@/lib/nexus/interpreter";
import NexusEditor from "@/components/nexus/NexusEditor";
import TokenList from "@/components/nexus/TokenList";
import AstViewer from "@/components/nexus/AstViewer";
import ScopeViewer from "@/components/nexus/ScopeViewer";
import ConsoleOutput from "@/components/nexus/ConsoleOutput";
import ReactiveGraph from "@/components/nexus/ReactiveGraph";
import TypeCheckViewer from "@/components/nexus/TypeCheckViewer";
import AiPanel from "@/components/nexus/AiPanel";
import Navbar from "@/components/nexus/Navbar";
import { usePyodide } from "@/hooks/usePyodide";

import CodeMirror from "@uiw/react-codemirror";
import { python } from "@codemirror/lang-python";
import { oneDark } from "@codemirror/theme-one-dark";

const CATEGORIES = ["basics", "engineering", "ai", "reactive", "math"] as const;

export default function IDE() {
  const [language, setLanguage] = useState<"nexus" | "python">("nexus");
  
  // Nexus state
  const [code, setCode] = useState(() => {
    return localStorage.getItem("nexus-code") || EXAMPLES[0].code;
  });
  const [result, setResult] = useState<PipelineResult | null>(null);
  const [selectedExample, setSelectedExample] = useState(EXAMPLES[0].id);
  const [bottomTab, setBottomTab] = useState("console");
  const [resolvedPredictions, setResolvedPredictions] = useState<Record<string, string>>({});
  const seenPredictKeys = useRef(new Set<string>());

  // Python state
  const [pythonCode, setPythonCode] = useState(() => localStorage.getItem("python-code") || "print('Hello from Python!')\n");
  const { status: pyStatus, runCode: runPythonCode } = usePyodide();
  const [pythonOutput, setPythonOutput] = useState<{ output: string; error: string | null } | null>(null);

  // Debounced run for Nexus
  useEffect(() => {
    if (language !== "nexus") return;
    localStorage.setItem("nexus-code", code);
    const timeout = setTimeout(() => {
      setResult(runPipeline(code));
    }, 300);
    return () => clearTimeout(timeout);
  }, [code, language]);

  // Persist python
  useEffect(() => {
    localStorage.setItem("python-code", pythonCode);
  }, [pythonCode]);

  const handleRun = useCallback(async () => {
    if (language === "nexus") {
      setResult(runPipeline(code));
      seenPredictKeys.current.clear();
      setResolvedPredictions({});
      setBottomTab("console");
    } else {
      setPythonOutput(null);
      setBottomTab("console");
      const res = await runPythonCode(pythonCode);
      setPythonOutput(res);
    }
  }, [language, code, pythonCode, runPythonCode]);

  const handleSelectExample = useCallback((id: string) => {
    const ex = EXAMPLES.find(e => e.id === id);
    if (ex) {
      setLanguage("nexus");
      setSelectedExample(id);
      setCode(ex.code);
      seenPredictKeys.current.clear();
      setResolvedPredictions({});
    }
  }, []);

  // When new predict calls appear, switch to AI tab (Nexus only)
  const predictCalls: PredictCallRecord[] = result?.result?.predictCalls ?? [];
  useEffect(() => {
    if (language !== "nexus") return;
    const newOnes = predictCalls.filter(p => {
      const key = `${p.entity}:${p.prediction}`;
      return !seenPredictKeys.current.has(key);
    });
    if (newOnes.length > 0) {
      newOnes.forEach(p => seenPredictKeys.current.add(`${p.entity}:${p.prediction}`));
      setBottomTab("ai");
    }
  }, [predictCalls, language]);

  const handlePredictResolved = useCallback((prediction: string, result: string) => {
    setResolvedPredictions(prev => ({ ...prev, [prediction]: result }));
  }, []);

  const hasTypeErrors = result?.typeCheck && !result.typeCheck.ok;
  const hasLexErrors = (result?.lexErrors?.length ?? 0) > 0;
  const hasParseErrors = (result?.parseErrors?.length ?? 0) > 0;
  const hasPredicts = predictCalls.length > 0;

  return (
    <div className="h-screen w-full flex flex-col bg-background text-foreground overflow-hidden font-sans">
      <Navbar />

      {/* Toolbar */}
      <div className="h-12 border-b border-border flex items-center justify-between px-4 shrink-0 bg-card">
        <div className="flex items-center gap-4">
          <Select value={language} onValueChange={(v: any) => setLanguage(v)}>
            <SelectTrigger className="w-[140px] h-8 text-xs font-semibold bg-background border-border">
              <SelectValue placeholder="Language" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="nexus">NEXUS</SelectItem>
              <SelectItem value="python">Python (Pyodide)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Status indicators */}
        <div className="flex items-center gap-3">
          {language === "nexus" && result && (
            <div className="flex items-center gap-2 text-[10px] font-mono font-medium">
              {hasLexErrors || hasParseErrors ? (
                <span className="text-destructive flex items-center gap-1 bg-destructive/10 px-2 py-1 rounded">
                  <span className="w-1.5 h-1.5 rounded-full bg-destructive inline-block" />
                  Parse Error
                </span>
              ) : hasTypeErrors ? (
                <span className="text-yellow-600 dark:text-yellow-400 flex items-center gap-1 bg-yellow-500/10 px-2 py-1 rounded">
                  <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 inline-block" />
                  Type Error
                </span>
              ) : (
                <span className="text-green-600 dark:text-green-400 flex items-center gap-1 bg-green-500/10 px-2 py-1 rounded">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block animate-pulse" />
                  {result.typeCheck?.irGraph.nodes.size ?? 0} IR nodes
                </span>
              )}
              {hasPredicts && (
                <span className="text-primary flex items-center gap-1 ml-1 bg-primary/10 px-2 py-1 rounded">
                  <Bot className="w-3 h-3" />
                  {predictCalls.length} AI predict{predictCalls.length !== 1 ? "s" : ""}
                </span>
              )}
            </div>
          )}
          {language === "python" && (
            <div className="text-[10px] font-mono px-2 py-1 rounded bg-muted text-muted-foreground flex items-center gap-2">
              <span className={`w-1.5 h-1.5 rounded-full ${pyStatus === "ready" ? "bg-green-500" : pyStatus === "loading" ? "bg-yellow-500 animate-pulse" : pyStatus === "error" ? "bg-destructive" : "bg-muted-foreground"}`} />
              Pyodide: {pyStatus}
            </div>
          )}

          <Button
            onClick={handleRun}
            size="sm"
            disabled={language === "python" && pyStatus !== "ready"}
            className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90 font-mono text-xs font-bold"
          >
            <Play className="w-3.5 h-3.5" />
            RUN {language === "python" ? "PYTHON" : "NEXUS"}
          </Button>
        </div>
      </div>

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
              Nexus Examples
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-4">
              {CATEGORIES.map(category => {
                const items = EXAMPLES.filter(e => e.category === category);
                if (items.length === 0) return null;
                return (
                  <div key={category}>
                    <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2 px-2">
                      {category}
                    </div>
                    <div className="space-y-1">
                      {items.map(ex => (
                        <button
                          key={ex.id}
                          onClick={() => handleSelectExample(ex.id)}
                          className={`w-full text-left px-2 py-1.5 rounded-md text-xs transition-colors ${
                            language === "nexus" && selectedExample === ex.id
                              ? "bg-primary/10 text-primary font-semibold"
                              : "text-muted-foreground hover:bg-muted hover:text-foreground font-medium"
                          }`}
                        >
                          <div className="truncate">{ex.title}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </Panel>

          <PanelResizeHandle className="w-1 bg-border hover:bg-primary/50 transition-colors" />

          {/* Center: Editor + Bottom Panel */}
          <Panel defaultSize={55} minSize={30}>
            <PanelGroup direction="vertical">
              {/* Editor */}
              <Panel defaultSize={65} minSize={20} className="flex flex-col">
                <div className="h-9 border-b border-border bg-card flex items-center px-3 text-xs font-mono font-medium text-muted-foreground gap-2 shrink-0">
                  <Code2 className="w-3.5 h-3.5" />
                  {language === "nexus" ? "main.nx" : "script.py"}
                  {language === "nexus" && result && (
                    <span className="ml-auto text-[10px] font-normal opacity-70">
                      {result.tokens.length} tokens
                    </span>
                  )}
                </div>
                <div className="flex-1 relative overflow-hidden bg-white dark:bg-[#0d1117]">
                  {language === "nexus" ? (
                    <NexusEditor
                      code={code}
                      onChange={setCode}
                      errors={result?.parseErrors || []}
                      lexErrors={result?.lexErrors || []}
                    />
                  ) : (
                    <CodeMirror
                      value={pythonCode}
                      height="100%"
                      theme={oneDark}
                      extensions={[python()]}
                      onChange={setPythonCode}
                      className="h-full text-sm font-mono"
                    />
                  )}
                </div>
              </Panel>

              <PanelResizeHandle className="h-1 bg-border hover:bg-primary/50 transition-colors" />

              {/* Bottom: Console / Graph / AI */}
              <Panel defaultSize={35} minSize={12} className="bg-card flex flex-col">
                <Tabs value={bottomTab} onValueChange={setBottomTab} className="flex-1 flex flex-col">
                  <div className="h-9 border-b border-border flex items-center px-2 bg-muted/50 shrink-0">
                    <TabsList className="h-7 bg-transparent">
                      <TabsTrigger
                        value="console"
                        className="text-xs font-mono font-medium data-[state=active]:bg-card data-[state=active]:text-primary border border-transparent data-[state=active]:border-border data-[state=active]:border-b-card -mb-px px-3 gap-1.5"
                      >
                        <Terminal className="w-3.5 h-3.5" /> Console
                      </TabsTrigger>
                      {language === "nexus" && (
                        <TabsTrigger
                          value="graph"
                          className="text-xs font-mono font-medium data-[state=active]:bg-card data-[state=active]:text-primary border border-transparent data-[state=active]:border-border data-[state=active]:border-b-card -mb-px px-3 gap-1.5"
                        >
                          <Activity className="w-3.5 h-3.5" /> Graph
                        </TabsTrigger>
                      )}
                      <TabsTrigger
                        value="ai"
                        className="text-xs font-mono font-medium data-[state=active]:bg-card data-[state=active]:text-primary border border-transparent data-[state=active]:border-border data-[state=active]:border-b-card -mb-px px-3 gap-1.5"
                      >
                        <Bot className="w-3.5 h-3.5" />
                        AI Assistant
                        {language === "nexus" && hasPredicts && (
                          <span className="ml-1 w-1.5 h-1.5 rounded-full bg-primary animate-pulse inline-block" />
                        )}
                      </TabsTrigger>
                    </TabsList>
                  </div>
                  <TabsContent
                    value="console"
                    className="flex-1 overflow-hidden m-0 data-[state=active]:flex flex-col bg-background"
                  >
                    {language === "nexus" ? (
                      <ConsoleOutput result={result} resolvedPredictions={resolvedPredictions} />
                    ) : (
                      <div className="h-full overflow-y-auto p-4 font-mono text-[13px] bg-[#0d1117] text-gray-200">
                        {pythonOutput ? (
                          <>
                            {pythonOutput.output && <div className="whitespace-pre-wrap">{pythonOutput.output}</div>}
                            {pythonOutput.error && <div className="text-red-400 whitespace-pre-wrap mt-2">{pythonOutput.error}</div>}
                            {!pythonOutput.output && !pythonOutput.error && <div className="text-gray-500 italic">Program finished with no output.</div>}
                          </>
                        ) : (
                          <div className="text-gray-500 italic">Waiting for execution...</div>
                        )}
                      </div>
                    )}
                  </TabsContent>
                  {language === "nexus" && (
                    <TabsContent
                      value="graph"
                      className="flex-1 overflow-hidden m-0 data-[state=active]:flex flex-col bg-background"
                    >
                      <ReactiveGraph
                        nodes={result?.result?.reactiveGraph || []}
                        irGraph={result?.typeCheck?.irGraph ?? null}
                      />
                    </TabsContent>
                  )}
                  <TabsContent
                    value="ai"
                    className="flex-1 overflow-hidden m-0 data-[state=active]:flex flex-col bg-background"
                  >
                    <AiPanel
                      currentCode={language === "nexus" ? code : pythonCode}
                      predictQueue={language === "nexus" ? predictCalls : []}
                      onPredictResolved={handlePredictResolved}
                    />
                  </TabsContent>
                </Tabs>
              </Panel>
            </PanelGroup>
          </Panel>

          <PanelResizeHandle className="w-1 bg-border hover:bg-primary/50 transition-colors" />

          {/* Right: Inspector */}
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
                    className="text-xs font-mono font-medium data-[state=active]:bg-card data-[state=active]:text-foreground border border-transparent data-[state=active]:border-border data-[state=active]:border-b-card -mb-px px-2.5 gap-1"
                  >
                    <ShieldCheck className="w-3.5 h-3.5 inline-block" />
                    <span className="ml-1">TypeChk</span>
                    {language === "nexus" && hasTypeErrors && (
                      <span className="ml-1 text-[9px] bg-red-100 text-red-600 dark:bg-red-900/60 dark:text-red-300 rounded px-1">!</span>
                    )}
                  </TabsTrigger>
                  <TabsTrigger
                    value="ast"
                    className="text-xs font-mono font-medium data-[state=active]:bg-card data-[state=active]:text-foreground border border-transparent data-[state=active]:border-border data-[state=active]:border-b-card -mb-px px-2.5 gap-1"
                  >
                    <Beaker className="w-3.5 h-3.5 inline-block" /> AST
                  </TabsTrigger>
                  <TabsTrigger
                    value="scope"
                    className="text-xs font-mono font-medium data-[state=active]:bg-card data-[state=active]:text-foreground border border-transparent data-[state=active]:border-border data-[state=active]:border-b-card -mb-px px-2.5 gap-1"
                  >
                    <Database className="w-3.5 h-3.5 inline-block" /> Scope
                  </TabsTrigger>
                  <TabsTrigger
                    value="tokens"
                    className="text-xs font-mono font-medium data-[state=active]:bg-card data-[state=active]:text-foreground border border-transparent data-[state=active]:border-border data-[state=active]:border-b-card -mb-px px-2.5"
                  >
                    Tokens
                  </TabsTrigger>
                </TabsList>
              </div>
              
              {language === "python" ? (
                <div className="flex-1 p-6 flex items-center justify-center text-center">
                  <div className="max-w-[200px] text-muted-foreground text-sm font-medium">
                    Inspector panels are only available in NEXUS mode.
                  </div>
                </div>
              ) : (
                <>
                  <TabsContent
                    value="typeck"
                    className="flex-1 overflow-hidden m-0 data-[state=active]:flex flex-col bg-background"
                  >
                    <TypeCheckViewer result={result?.typeCheck ?? null} />
                  </TabsContent>
                  <TabsContent
                    value="ast"
                    className="flex-1 overflow-hidden m-0 data-[state=active]:flex flex-col bg-background"
                  >
                    <AstViewer program={result?.program} />
                  </TabsContent>
                  <TabsContent
                    value="scope"
                    className="flex-1 overflow-hidden m-0 data-[state=active]:flex flex-col bg-background"
                  >
                    <ScopeViewer scope={result?.result?.scope || {}} />
                  </TabsContent>
                  <TabsContent
                    value="tokens"
                    className="flex-1 overflow-hidden m-0 data-[state=active]:flex flex-col bg-background"
                  >
                    <TokenList tokens={result?.tokens || []} />
                  </TabsContent>
                </>
              )}
            </Tabs>
          </Panel>

        </PanelGroup>
      </div>
    </div>
  );
}
