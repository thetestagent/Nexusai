import React from "react";
import { Link } from "wouter";
import { ArrowRight, Code2, Bot, Activity, Zap, Cpu, Settings2, Sparkles, Stars, ArrowUpRight, Layers3, MessageSquareText, FileCode2, BrainCircuit, TerminalSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import nexusLogo from "@assets/7E757832-9D98-4AF5-BF60-7510B7E43169_1778345404687.png";

export default function Landing() {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.95),_rgba(245,242,255,0.92)_35%,_rgba(231,238,255,0.85)_68%,_rgba(223,231,255,0.92))] text-foreground flex flex-col font-sans relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 opacity-80" style={{ backgroundImage: "radial-gradient(circle at 15% 20%, rgba(59,130,246,0.2), transparent 28%), radial-gradient(circle at 80% 12%, rgba(168,85,247,0.18), transparent 26%), radial-gradient(circle at 50% 75%, rgba(250,204,21,0.12), transparent 30%)" }} />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.22)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.22)_1px,transparent_1px)] bg-[size:84px_84px] opacity-20" />
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-[10%] top-[14%] h-56 w-56 rounded-full bg-cyan-300/20 blur-3xl animate-pulse" />
        <div className="absolute right-[12%] top-[26%] h-64 w-64 rounded-full bg-purple-400/20 blur-3xl animate-pulse" />
        <div className="absolute left-[45%] bottom-[10%] h-72 w-72 rounded-full bg-amber-200/20 blur-3xl animate-pulse" />
      </div>
      <header className="h-20 border-b border-white/40 bg-white/35 backdrop-blur-3xl shadow-[0_8px_40px_rgba(120,120,200,0.12)] flex items-center justify-between px-5 lg:px-10 shrink-0 sticky top-0 z-50">
        <Link href="/" className="flex items-center gap-3">
          <img src={nexusLogo} alt="NEXUS" className="w-11 h-11 rounded-2xl object-cover shadow-[0_0_30px_rgba(111,76,255,0.35)]" />
          <div>
            <span className="block font-semibold tracking-[0.28em] text-[11px] text-slate-500">NEXUS</span>
            <span className="block text-sm font-semibold text-slate-900">Cosmic Intelligence</span>
          </div>
        </Link>
        <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-600">
          {["Home", "Docs", "Playground", "AI Studio", "Community"].map((item) => (
            <a key={item} href="#" className="hover:text-slate-900 transition-colors">
              {item}
            </a>
          ))}
        </nav>
        <Link href="/ide">
          <Button size="sm" className="rounded-full bg-gradient-to-r from-cyan-500 via-indigo-500 to-purple-500 text-white shadow-[0_0_30px_rgba(99,102,241,0.35)] hover:scale-[1.02] transition-transform">
            Try NEXUS <ArrowUpRight className="w-4 h-4 ml-2" />
          </Button>
        </Link>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative py-20 lg:py-28 px-6 lg:px-12 text-center max-w-6xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/35 backdrop-blur-2xl border border-white/50 text-slate-700 text-xs font-semibold uppercase tracking-[0.35em] mb-8 shadow-[0_12px_40px_rgba(122,92,255,0.1)]">
            <Sparkles className="w-3.5 h-3.5 text-cyan-500" /> Premium Cosmic Glassmorphism
          </div>
          <div className="flex justify-center mb-8">
            <img src={nexusLogo} alt="NEXUS logo" className="w-44 h-44 lg:w-56 lg:h-56 object-cover drop-shadow-[0_0_40px_rgba(103,80,255,0.45)]" />
          </div>
          <h1 className="text-6xl lg:text-8xl font-semibold tracking-tight text-slate-900 mb-4 leading-none">
            NEXUS
          </h1>
          <p className="text-xl lg:text-2xl text-slate-700 mb-4 font-medium">
            Where Code Meets Cosmic Intelligence
          </p>
          <p className="text-base lg:text-lg text-slate-600 mb-10 max-w-2xl mx-auto leading-relaxed">
            Program with AI that truly understands you.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/ide">
              <Button size="lg" className="h-12 px-8 rounded-full bg-gradient-to-r from-cyan-500 via-indigo-500 to-purple-500 text-white shadow-[0_0_30px_rgba(99,102,241,0.35)]">
                Start Coding
              </Button>
            </Link>
            <Button size="lg" variant="outline" className="h-12 px-8 rounded-full border-white/60 bg-white/35 backdrop-blur-2xl text-slate-800 hover:bg-white/50">
              Talk to Nexus AI
            </Button>
          </div>
        </section>

        <section className="py-6 px-6 lg:px-12 max-w-7xl mx-auto">
          <div className="rounded-[32px] overflow-hidden border border-white/50 bg-white/35 backdrop-blur-3xl shadow-[0_20px_80px_rgba(123,92,255,0.18)]">
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/40 bg-white/20">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-rose-400/80" />
                <div className="w-3 h-3 rounded-full bg-amber-300/80" />
                <div className="w-3 h-3 rounded-full bg-emerald-400/80" />
                <span className="ml-3 text-xs font-mono text-slate-500">nexus-ai.window</span>
              </div>
              <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500">
                <BrainCircuit className="w-3.5 h-3.5" /> Live AI Showcase
              </div>
            </div>
            <div className="grid lg:grid-cols-5">
              <div className="lg:col-span-2 p-6 lg:p-8 border-b lg:border-b-0 lg:border-r border-white/40">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-slate-500 mb-4">
                  <MessageSquareText className="w-4 h-4 text-cyan-500" /> User
                </div>
                <div className="rounded-3xl bg-white/55 border border-white/70 p-4 text-left text-slate-800 shadow-inner">
                  Create a React dashboard with dark mode
                </div>
              </div>
              <div className="lg:col-span-3 p-6 lg:p-8 text-left">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-slate-500 mb-4">
                  <Sparkles className="w-4 h-4 text-purple-500" /> Nexus AI
                </div>
                <div className="rounded-[28px] bg-slate-950/90 border border-slate-800 p-5 text-slate-100 shadow-[0_0_50px_rgba(59,130,246,0.18)]">
                  <div className="flex items-center gap-2 text-[11px] text-slate-400 mb-4 font-mono">
                    <Layers3 className="w-3.5 h-3.5 text-cyan-300" /> src/
                    <FileCode2 className="w-3.5 h-3.5 text-purple-300 ml-3" /> App.tsx
                    <TerminalSquare className="w-3.5 h-3.5 text-amber-300 ml-3" /> ui/
                  </div>
                  <pre className="overflow-x-auto text-sm leading-6 font-mono">
                    <code>
<span className="text-cyan-300">export</span> <span className="text-purple-300">default</span> <span className="text-cyan-300">function</span> <span className="text-white">Dashboard</span>() {"{"}
  <span className="text-cyan-300">return</span> (
    <span className="text-white">&lt;div className=</span><span className="text-amber-300">"min-h-screen bg-slate-950 text-white"</span><span className="text-white">&gt;</span>
      <span className="text-slate-400">// AI-generated structure</span>
      <span className="text-white">&lt;Sidebar /&gt;</span>
      <span className="text-white">&lt;StatsGrid /&gt;</span>
      <span className="text-white">&lt;ThemeToggle mode=</span><span className="text-amber-300">"dark"</span><span className="text-white"> /&gt;</span>
    <span className="text-white">&lt;/div&gt;</span>
  );
{"}"}
                    </code>
                  </pre>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="py-12 px-6 lg:px-12 max-w-6xl mx-auto grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[
            { icon: <Activity className="w-5 h-5" />, title: "Reactive graphs", desc: "Live data flow with elegant compiler feedback." },
            { icon: <Bot className="w-5 h-5" />, title: "AI-native coding", desc: "Predict, generate, and refine with context-aware assistance." },
            { icon: <Cpu className="w-5 h-5" />, title: "Engineered semantics", desc: "Units, signals, and equations remain structurally sound." },
          ].map((f) => (
            <div key={f.title} className="rounded-[28px] border border-white/45 bg-white/30 backdrop-blur-3xl p-6 shadow-[0_12px_40px_rgba(99,102,241,0.08)]">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-cyan-400/30 via-indigo-400/30 to-purple-400/30 border border-white/50 text-slate-900 flex items-center justify-center mb-4">
                {f.icon}
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">{f.title}</h3>
              <p className="text-sm text-slate-600 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </section>
      </main>
    </div>
  );
}
