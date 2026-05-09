import React from "react";
import { Link } from "wouter";
import { ArrowRight, Code2, Bot, Activity, Zap, Cpu, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans">
      {/* Navbar (simplified for marketing page, real navbar used elsewhere) */}
      <header className="h-16 border-b border-border bg-card flex items-center justify-between px-6 lg:px-12 shrink-0 sticky top-0 z-50">
        <Link href="/" className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center">
            <span className="text-primary font-bold text-xs tracking-tight">NX</span>
          </div>
          <span className="font-bold tracking-wide text-foreground">NEXUS</span>
        </Link>
        <div className="flex items-center gap-4">
          <Link href="/sign-in" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
            Sign In
          </Link>
          <Link href="/sign-up">
            <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90">
              Get Started <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="py-24 lg:py-32 px-6 lg:px-12 text-center max-w-5xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold uppercase tracking-widest mb-8 border border-primary/20">
            <Zap className="w-3.5 h-3.5" /> Introducing Nexus v0.1
          </div>
          <h1 className="text-5xl lg:text-7xl font-bold tracking-tight text-foreground mb-6 leading-tight">
            The programming language for <br className="hidden lg:block" />
            <span className="text-primary">hardware engineers.</span>
          </h1>
          <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed">
            Write reactive, AI-powered programs with first-class engineering unit semantics. 
            NEXUS is designed from the ground up for embedded systems, IoT, and reactive control networks.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link href="/sign-up">
              <Button size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90 text-base h-12 px-8">
                Try It Free
              </Button>
            </Link>
            <Link href="/ide">
              <Button size="lg" variant="outline" className="text-base h-12 px-8 border-border bg-card hover:bg-muted text-foreground">
                Open Playground
              </Button>
            </Link>
          </div>
        </section>

        {/* Demo Section */}
        <section className="py-12 px-6 lg:px-12 max-w-6xl mx-auto">
          <div className="rounded-xl overflow-hidden shadow-2xl border border-border bg-[#0d1117]">
            <div className="h-10 bg-card border-b border-border flex items-center px-4 gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500/80" />
              <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
              <div className="w-3 h-3 rounded-full bg-green-500/80" />
              <span className="ml-4 text-xs font-mono text-muted-foreground">main.nx</span>
            </div>
            <div className="p-6 font-mono text-sm leading-relaxed overflow-x-auto">
              <pre>
                <code className="text-slate-300">
<span className="text-indigo-400">entity</span> Battery {"{"}
  capacity: <span className="text-teal-400">5000mAh</span>
  voltage: <span className="text-teal-400">12V</span>
  
  <span className="text-slate-500">// AI resolves abstract predictions contextually</span>
  <span className="text-indigo-400">fn</span> check_health() {"{"}
    <span className="text-indigo-400">return</span> <span className="text-pink-400">predict</span> battery_failure_probability
  {"}"}
{"}"}

<span className="text-indigo-400">entity</span> Motor {"{"}
  current_draw: <span className="text-teal-400">3A</span>
{"}"}

<span className="text-slate-500">// Reactive computations with dimensional analysis</span>
<span className="text-indigo-400">let</span> total_power = Motor.current_draw * Battery.voltage <span className="text-slate-500">// 36W</span>
                </code>
              </pre>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-24 px-6 lg:px-12 bg-card border-y border-border">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold mb-4 text-foreground">Engineered for Reality</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Stop fighting string-parsing APIs and loosely-typed JSON. Build systems that understand physics.
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[
                {
                  icon: <Activity className="w-6 h-6" />,
                  title: "Dimensional Typing",
                  desc: "Compiler errors if you add volts to amps. Built-in SI units (V, A, W, Hz, m/s) natively checked."
                },
                {
                  icon: <Bot className="w-6 h-6" />,
                  title: "AI Entity Prediction",
                  desc: "Use the `predict` keyword to seamlessly resolve physical heuristics using LLMs at runtime."
                },
                {
                  icon: <Cpu className="w-6 h-6" />,
                  title: "Reactive Graphs",
                  desc: "Variables are data-flow nodes. Changes propagate through the AST automatically without manual state management."
                },
                {
                  icon: <Code2 className="w-6 h-6" />,
                  title: "Python Interop",
                  desc: "Drop into Python via Pyodide when you need NumPy or SciPy. Share state across language boundaries."
                },
                {
                  icon: <Settings2 className="w-6 h-6" />,
                  title: "Equation Solving",
                  desc: "NEXUS solves multi-variable algebraic equations automatically during the evaluation step."
                },
                {
                  icon: <Zap className="w-6 h-6" />,
                  title: "Real-time Execution",
                  desc: "Evaluate code instantly in the browser playground. See the IR and reactive data flows live."
                }
              ].map((f, i) => (
                <div key={i} className="p-6 rounded-xl border border-border bg-background shadow-sm hover:shadow-md transition-shadow">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-4">
                    {f.icon}
                  </div>
                  <h3 className="text-lg font-bold mb-2 text-foreground">{f.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {f.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="py-12 px-6 lg:px-12 bg-background border-t border-border text-center">
        <p className="text-sm text-muted-foreground">
          © {new Date().getFullYear()} NEXUS Language Playground. All rights reserved.
        </p>
      </footer>
    </div>
  );
}
