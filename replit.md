# NEXUS Language Playground

An in-browser IDE for NEXUS — an AI-native, reactive-graph programming language with engineering unit semantics (12V, 3A, 60Hz, etc.).

## Run & Operate

- `pnpm --filter @workspace/nexus-playground run dev` — run the playground (PORT env var)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite, Tailwind CSS, CodeMirror 6 (@uiw/react-codemirror)
- Panels: react-resizable-panels
- No backend — compiler runs entirely in-browser

## Where things live

```
artifacts/nexus-playground/src/
├── lib/nexus/
│   ├── lexer.ts        — tokenizer with engineering unit literals
│   ├── ast.ts          — AST node types + UnitSuffix + Dimension
│   ├── parser.ts       — recursive-descent + Pratt parser
│   ├── interpreter.ts  — tree-walking interpreter, unit arithmetic
│   ├── ir.ts           — IR graph: NodeId, IrNode, IrGraph, topo sort
│   ├── typeck.ts       — type checker: dimensional analysis, IR builder
│   ├── math.ts         — EquationSolver (Ohm's Law, symbolic rearrangement)
│   ├── index.ts        — runPipeline() entry point
│   └── examples.ts     — 9 example programs
├── components/nexus/
│   ├── NexusEditor.tsx — CodeMirror editor with NEXUS syntax highlighting
│   ├── TypeCheckViewer.tsx — IR nodes, symbol table, diagnostics
│   ├── AstViewer.tsx   — collapsible AST tree
│   ├── ScopeViewer.tsx — runtime variable bindings
│   ├── TokenList.tsx   — raw token stream
│   ├── ConsoleOutput.tsx — interpreter output
│   └── ReactiveGraph.tsx — SVG DAG of IR/reactive nodes
└── pages/IDE.tsx       — main IDE layout
```

## Pipeline

Source → Lex → Parse → **TypeCheck** (dimensional analysis, IR build, topo sort) → Interpret (unit arithmetic, V×A=W, V/A=Ω, A×Ω=V, etc.)

## Architecture decisions

- All compilation runs in-browser; no server required
- Type checker (`typeck.ts`) is a separate pass that builds the IR graph independently of the interpreter
- IR graph uses topological sort for evaluation order — matches the Rust `nexus-ir` crate design
- `Dimension` is defined in `ir.ts` (not `ast.ts`) since the IR owns dimensional analysis
- `UnitSuffix` stays in `ast.ts` as it's a lexical property of unit literals
- `multiplyUnits`/`divideUnits` tables in `interpreter.ts` encode physical identities: V×A=W, A×Ω=V, W/A=V, W/V=A, V/A=Ω

## Product

NEXUS v0.1 playground — a complete IDE with:
- **Type Checker panel**: IR node table (with topo order), symbol table (name → type + dimension), diagnostics with error/warning/info
- **AST viewer**: collapsible syntax tree
- **Scope viewer**: runtime variable bindings after execution
- **Token list**: raw lexer output
- **Console**: interpreter output (print, entity info, sensor registration, predict calls)
- **Reactive Graph**: SVG DAG built from the IR graph, with dimensional annotations on each node
- **9 example programs**: basics, engineering (Ohm's Law, power grid), AI (Battery entity), reactive (sensor network), math (equation solver, dimensional algebra, type error demo)

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- `Dimension` and `NodeId` are exported from `ir.ts`; `ast.ts` also has its own `Dimension` type (subset). Re-export from `index.ts` carefully to avoid TS2308 ambiguous export errors.
- `newNodeId()` has a module-level counter — it resets on hot reload in dev, which is fine.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
- NEXUS language spec: attached_assets/Pasted--skills-activated-Systems-Architecture-Compiler-Design-_1778194590198.txt
