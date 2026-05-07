import type { AstNode, Program, UnitSuffix } from "./ast";
import { unitDimension } from "./ast";

export type NexusValue =
  | { kind: "int"; value: number }
  | { kind: "float"; value: number }
  | { kind: "unit"; value: number; unit: UnitSuffix }
  | { kind: "bool"; value: boolean }
  | { kind: "string"; value: string }
  | { kind: "null" }
  | { kind: "fn"; params: string[]; body: AstNode; env: Env }
  | { kind: "entity"; name: string; memory: Record<string, NexusValue> };

export interface OutputLine {
  type: "log" | "error" | "warn" | "info";
  text: string;
}

export interface ReactiveNode {
  id: string;
  label: string;
  kind: "entity" | "sensor" | "equation" | "variable" | "skill";
  dependencies: string[];
  value?: string;
}

export interface InterpreterResult {
  output: OutputLine[];
  scope: Record<string, NexusValue>;
  reactiveGraph: ReactiveNode[];
  errors: string[];
}

type Env = Map<string, NexusValue>;

class ReturnSignal {
  constructor(public value: NexusValue) {}
}

function numericVal(v: NexusValue): number {
  if (v.kind === "int" || v.kind === "float") return v.value;
  if (v.kind === "unit") return v.value;
  if (v.kind === "bool") return v.value ? 1 : 0;
  return NaN;
}

function displayValue(v: NexusValue): string {
  switch (v.kind) {
    case "int": return String(v.value);
    case "float": return v.value.toFixed(6).replace(/\.?0+$/, "");
    case "unit": return `${v.value}${v.unit}`;
    case "bool": return String(v.value);
    case "string": return `"${v.value}"`;
    case "null": return "null";
    case "fn": return `<fn>`;
    case "entity": return `<entity:${v.name}>`;
  }
}

class Interpreter {
  private output: OutputLine[] = [];
  private errors: string[] = [];
  private reactiveGraph: ReactiveNode[] = [];
  private globalEnv: Env = new Map();

  constructor() {
    // Built-in functions
    this.globalEnv.set("print", { kind: "fn", params: ["value"], body: { type: "Block", id: "", span: { start: 0, end: 0 }, stmts: [] }, env: new Map() });
    this.globalEnv.set("sqrt", { kind: "fn", params: ["x"], body: { type: "Block", id: "", span: { start: 0, end: 0 }, stmts: [] }, env: new Map() });
    this.globalEnv.set("abs", { kind: "fn", params: ["x"], body: { type: "Block", id: "", span: { start: 0, end: 0 }, stmts: [] }, env: new Map() });
  }

  run(program: Program): InterpreterResult {
    const env: Env = new Map(this.globalEnv);
    for (const decl of program.decls) {
      try {
        this.evalNode(decl, env);
      } catch (e) {
        if (e instanceof ReturnSignal) break;
        this.errors.push(String(e));
        this.output.push({ type: "error", text: `Runtime error: ${e}` });
      }
    }
    const scope: Record<string, NexusValue> = {};
    for (const [k, v] of env) {
      if (k !== "print" && k !== "sqrt" && k !== "abs") scope[k] = v;
    }
    return { output: this.output, scope, reactiveGraph: this.reactiveGraph, errors: this.errors };
  }

  private evalNode(node: AstNode, env: Env): NexusValue {
    switch (node.type) {
      case "LetBinding": {
        const val = this.evalNode(node.value, env);
        env.set(node.name, val);
        this.reactiveGraph.push({ id: node.id, label: node.name, kind: "variable", dependencies: this.collectDeps(node.value), value: displayValue(val) });
        return val;
      }
      case "EquationDef": {
        this.reactiveGraph.push({ id: node.id, label: node.name, kind: "equation", dependencies: this.collectDeps(node.body), value: undefined });
        env.set(node.name, { kind: "fn", params: [], body: node.body, env: new Map(env) });
        return { kind: "null" };
      }
      case "EntityDef": {
        const memory: Record<string, NexusValue> = {};
        const entity: NexusValue = { kind: "entity", name: node.name, memory };
        env.set(node.name, entity);
        const deps = node.skills.map(s => s.name).concat(node.reactions.map((r, i) => `reaction_${i}`));
        this.reactiveGraph.push({ id: node.id, label: node.name, kind: "entity", dependencies: deps });
        for (const skill of node.skills) {
          env.set(`${node.name}.${skill.name}`, { kind: "fn", params: [], body: skill.body, env: new Map(env) });
          this.reactiveGraph.push({ id: skill.id, label: `${node.name}.${skill.name}`, kind: "skill", dependencies: [] });
        }
        this.output.push({ type: "info", text: `entity ${node.name} defined [memory: ${node.memory ?? "transient"}, skills: ${node.skills.length}]` });
        return entity;
      }
      case "SensorDef": {
        this.reactiveGraph.push({ id: node.id, label: node.name, kind: "sensor", dependencies: [], value: node.frequency ? `${node.frequency.value}${node.frequency.unit}` : undefined });
        this.output.push({ type: "info", text: `sensor ${node.name} registered [pin: ${node.pin}]` });
        return { kind: "null" };
      }
      case "FnDef": {
        const fn: NexusValue = { kind: "fn", params: node.params.map(p => p.name), body: node.body, env: new Map(env) };
        env.set(node.name, fn);
        return fn;
      }
      case "ReactBlock": {
        this.output.push({ type: "info", text: `react block registered` });
        return { kind: "null" };
      }
      case "IfExpr": {
        const cond = this.evalNode(node.condition, env);
        if (this.isTruthy(cond)) return this.evalNode(node.then, env);
        if (node.else) return this.evalNode(node.else, env);
        return { kind: "null" };
      }
      case "ForExpr": {
        const iter = this.evalNode(node.iterable, env);
        // simple range or array simulation
        if (iter.kind === "int") {
          for (let i = 0; i < iter.value; i++) {
            const loopEnv = new Map(env);
            loopEnv.set(node.binding, { kind: "int", value: i });
            try { this.evalNode(node.body, loopEnv); }
            catch (e) { if (!(e instanceof ReturnSignal)) throw e; }
          }
        }
        return { kind: "null" };
      }
      case "ReturnStmt": {
        const val = node.value ? this.evalNode(node.value, env) : { kind: "null" as const };
        throw new ReturnSignal(val);
      }
      case "Block": {
        const blockEnv = new Map(env);
        let last: NexusValue = { kind: "null" };
        for (const stmt of node.stmts) {
          last = this.evalNode(stmt, blockEnv);
        }
        return last;
      }
      case "AssignExpr": {
        const val = this.evalNode(node.value, env);
        if (node.target.type === "Identifier") env.set(node.target.name, val);
        return val;
      }
      case "BinaryExpr": return this.evalBinary(node.op, node.left, node.right, env);
      case "UnaryExpr": {
        const v = this.evalNode(node.operand, env);
        if (node.op === "-") {
          if (v.kind === "int") return { kind: "int", value: -v.value };
          if (v.kind === "float") return { kind: "float", value: -v.value };
          if (v.kind === "unit") return { kind: "unit", value: -v.value, unit: v.unit };
        }
        if (node.op === "!") return { kind: "bool", value: !this.isTruthy(v) };
        return { kind: "null" };
      }
      case "CallExpr": {
        const callee = this.evalNode(node.callee, env);
        const args = node.args.map(a => this.evalNode(a, env));
        return this.callFn(callee, args, env, node);
      }
      case "FieldExpr": {
        const obj = this.evalNode(node.object, env);
        if (obj.kind === "entity") {
          return obj.memory[node.field] ?? { kind: "null" };
        }
        return { kind: "null" };
      }
      case "IndexExpr": {
        return { kind: "null" };
      }
      case "MatchExpr": {
        const scrutinee = this.evalNode(node.scrutinee, env);
        for (const arm of node.arms) {
          // Simple literal pattern matching
          const pat = this.evalNode(arm.pattern, new Map(env));
          if (displayValue(scrutinee) === displayValue(pat)) {
            return this.evalNode(arm.body, env);
          }
        }
        return { kind: "null" };
      }
      case "PredictCall": {
        this.output.push({ type: "warn", text: `predict ${node.target} → [AI prediction not yet implemented in playground]` });
        return { kind: "null" };
      }
      case "UnitLit": return { kind: "unit", value: node.value, unit: node.unit };
      case "IntLit": return { kind: "int", value: node.value };
      case "FloatLit": return { kind: "float", value: node.value };
      case "StringLit": return { kind: "string", value: node.value };
      case "BoolLit": return { kind: "bool", value: node.value };
      case "Identifier": {
        const name = node.name;
        if (env.has(name)) return env.get(name)!;
        this.errors.push(`Undefined identifier: '${name}'`);
        return { kind: "null" };
      }
      case "SkillDef": return { kind: "null" };
      default: return { kind: "null" };
    }
  }

  private callFn(callee: NexusValue, args: NexusValue[], env: Env, node: AstNode): NexusValue {
    // Built-ins
    if (callee.kind === "fn") {
      // Check identifier for built-ins
      if (node.type === "CallExpr" && node.callee.type === "Identifier") {
        const name = node.callee.name;
        if (name === "print") {
          const text = args.map(displayValue).join(" ");
          this.output.push({ type: "log", text });
          return { kind: "null" };
        }
        if (name === "sqrt") {
          const n = numericVal(args[0] ?? { kind: "null" });
          return { kind: "float", value: Math.sqrt(n) };
        }
        if (name === "abs") {
          const n = numericVal(args[0] ?? { kind: "null" });
          return { kind: "float", value: Math.abs(n) };
        }
      }
      const callEnv: Env = new Map(callee.env);
      for (let i = 0; i < callee.params.length; i++) {
        callEnv.set(callee.params[i], args[i] ?? { kind: "null" });
      }
      try {
        return this.evalNode(callee.body, callEnv);
      } catch (e) {
        if (e instanceof ReturnSignal) return e.value;
        throw e;
      }
    }
    return { kind: "null" };
  }

  private evalBinary(op: string, leftNode: AstNode, rightNode: AstNode, env: Env): NexusValue {
    const left = this.evalNode(leftNode, env);
    const right = this.evalNode(rightNode, env);

    // Unit compatibility check
    if (left.kind === "unit" && right.kind === "unit" && (op === "+" || op === "-")) {
      const ld = unitDimension(left.unit);
      const rd = unitDimension(right.unit);
      if (ld !== rd) {
        this.errors.push(`Unit mismatch: cannot ${op} ${ld} (${left.unit}) and ${rd} (${right.unit})`);
        this.output.push({ type: "error", text: `Unit mismatch: ${left.unit} vs ${right.unit} — incompatible dimensions (${ld} vs ${rd})` });
        return { kind: "null" };
      }
    }

    const lv = numericVal(left);
    const rv = numericVal(right);
    const unitResult = (left.kind === "unit" ? left.unit : right.kind === "unit" ? right.unit : null);

    switch (op) {
      case "+": {
        const v = lv + rv;
        if (unitResult) return { kind: "unit", value: v, unit: unitResult };
        return left.kind === "float" || right.kind === "float" ? { kind: "float", value: v } : { kind: "int", value: v };
      }
      case "-": {
        const v = lv - rv;
        if (unitResult) return { kind: "unit", value: v, unit: unitResult };
        return left.kind === "float" || right.kind === "float" ? { kind: "float", value: v } : { kind: "int", value: v };
      }
      case "*": {
        const v = lv * rv;
        if (left.kind === "unit" && right.kind === "unit") {
          // V * A = W (special case)
          if ((left.unit === "V" && right.unit === "A") || (left.unit === "A" && right.unit === "V"))
            return { kind: "unit", value: v, unit: "W" };
          return { kind: "float", value: v };
        }
        if (unitResult) return { kind: "unit", value: v, unit: unitResult };
        return left.kind === "float" || right.kind === "float" ? { kind: "float", value: v } : { kind: "int", value: v };
      }
      case "/": {
        if (rv === 0) { this.output.push({ type: "error", text: "Division by zero" }); return { kind: "null" }; }
        const v = lv / rv;
        if (unitResult && left.kind === "unit" && right.kind !== "unit") return { kind: "unit", value: v, unit: unitResult };
        return { kind: "float", value: v };
      }
      case "%": return { kind: "int", value: ((lv % rv) + rv) % rv };
      case "**": return { kind: "float", value: Math.pow(lv, rv) };
      case "==": return { kind: "bool", value: lv === rv || (left.kind === "string" && right.kind === "string" && left.value === right.value) };
      case "!=": return { kind: "bool", value: lv !== rv };
      case "<": return { kind: "bool", value: lv < rv };
      case ">": return { kind: "bool", value: lv > rv };
      case "<=": return { kind: "bool", value: lv <= rv };
      case ">=": return { kind: "bool", value: lv >= rv };
      case "&&": return { kind: "bool", value: this.isTruthy(left) && this.isTruthy(right) };
      case "||": return { kind: "bool", value: this.isTruthy(left) || this.isTruthy(right) };
      default: return { kind: "null" };
    }
  }

  private isTruthy(v: NexusValue): boolean {
    switch (v.kind) {
      case "bool": return v.value;
      case "int": case "float": return v.value !== 0;
      case "unit": return v.value !== 0;
      case "string": return v.value.length > 0;
      case "null": return false;
      default: return true;
    }
  }

  private collectDeps(node: AstNode): string[] {
    const deps: string[] = [];
    const visit = (n: AstNode) => {
      if (n.type === "Identifier") deps.push(n.name);
      if ("left" in n && (n as any).left) visit((n as any).left);
      if ("right" in n && (n as any).right) visit((n as any).right);
      if ("value" in n && typeof (n as any).value === "object" && (n as any).value !== null) visit((n as any).value);
      if ("body" in n && typeof (n as any).body === "object" && (n as any).body !== null) visit((n as any).body);
      if ("stmts" in n) (n as any).stmts.forEach(visit);
    };
    visit(node);
    return [...new Set(deps)];
  }
}

export function interpret(program: Program): InterpreterResult {
  return new Interpreter().run(program);
}

