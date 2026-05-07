// ─────────────────────────────────────────────────
// NEXUS Type Checker — Semantic Analyzer + Unit Checker
// Ported from nexus-typeck (Rust) to TypeScript
// Pipeline: AST → TypeCheck → IrGraph
// ─────────────────────────────────────────────────

import type { AstNode, Program, UnitSuffix } from "./ast";
import {
  type Dimension,
  type ValueType,
  type IrGraph,
  type IrNode,
  type NodeId,
  createGraph,
  addIrNode,
  addIrEdge,
  newNodeId,
  topoSort,
  multiplyDimensions,
  divideDimensions,
  dimensionFromUnit,
} from "./ir";

export interface TypeDiagnostic {
  kind: "error" | "warning" | "info";
  message: string;
  span?: { start: number; end: number };
  nodeId?: string;
}

export interface SymbolInfo {
  valueType: ValueType;
  dimension: Dimension;
  irNodeId?: NodeId;
  mutable: boolean;
  displayValue?: string;
}

export interface TypeCheckResult {
  diagnostics: TypeDiagnostic[];
  irGraph: IrGraph;
  symbolTable: Map<string, SymbolInfo>;
  ok: boolean;
}

type Scope = Map<string, SymbolInfo>;

function childScope(parent: Scope): Scope {
  return new Map(parent);
}

export class TypeChecker {
  private diagnostics: TypeDiagnostic[] = [];
  private graph: IrGraph = createGraph();
  private scope: Scope = new Map();

  constructor() {
    // Built-in functions
    this.scope.set("print", { valueType: "fn", dimension: "scalar", mutable: false });
    this.scope.set("sqrt", { valueType: "fn", dimension: "scalar", mutable: false });
    this.scope.set("abs", { valueType: "fn", dimension: "scalar", mutable: false });
    this.scope.set("solve", { valueType: "fn", dimension: "scalar", mutable: false });
  }

  check(program: Program): TypeCheckResult {
    this.diagnostics = [];
    this.graph = createGraph();
    this.scope = new Map(this.scope);

    for (const decl of program.decls) {
      this.checkDecl(decl, this.scope);
    }

    topoSort(this.graph);

    const ok = this.diagnostics.filter(d => d.kind === "error").length === 0;
    return {
      diagnostics: this.diagnostics,
      irGraph: this.graph,
      symbolTable: new Map(this.scope),
      ok,
    };
  }

  private checkDecl(node: AstNode, scope: Scope): void {
    switch (node.type) {
      case "LetBinding": {
        const [vt, dim] = this.inferType(node.value, scope);

        // Type annotation check
        if (node.typeAnn) {
          const [, annDim] = this.inferType(node.typeAnn, scope);
          if (annDim !== "scalar" && dim !== "scalar" && annDim !== dim) {
            this.diagnostics.push({
              kind: "error",
              message: `Type annotation mismatch: expected ${annDim}, found ${dim}`,
              span: node.span,
              nodeId: node.id,
            });
          }
        }

        const irId = newNodeId();
        const irNode: IrNode = {
          id: irId,
          kind: { tag: "Binding", name: node.name },
          valueType: vt,
          dimension: dim,
          dirty: true,
        };
        addIrNode(this.graph, irNode);

        // Wire up dependencies from value expression
        this.addExprDeps(irId, node.value, scope);

        scope.set(node.name, {
          valueType: vt,
          dimension: dim,
          irNodeId: irId,
          mutable: node.mutable,
        });
        break;
      }

      case "EquationDef": {
        const irId = newNodeId();
        addIrNode(this.graph, {
          id: irId,
          kind: { tag: "Equation", name: node.name },
          valueType: "equation",
          dimension: "scalar",
          dirty: true,
        });
        this.addExprDeps(irId, node.body, scope);
        scope.set(node.name, {
          valueType: "equation",
          dimension: "scalar",
          irNodeId: irId,
          mutable: false,
        });
        break;
      }

      case "EntityDef": {
        const irId = newNodeId();
        addIrNode(this.graph, {
          id: irId,
          kind: { tag: "Entity", name: node.name },
          valueType: "entity",
          dimension: "scalar",
          dirty: false,
        });
        scope.set(node.name, {
          valueType: "entity",
          dimension: "scalar",
          irNodeId: irId,
          mutable: true,
        });

        const entityScope = childScope(scope);
        for (const skill of node.skills) {
          const skillId = newNodeId();
          addIrNode(this.graph, {
            id: skillId,
            kind: { tag: "Skill", entityName: node.name, skillName: skill.name },
            valueType: "fn",
            dimension: "scalar",
            dirty: false,
          });
          addIrEdge(this.graph, irId, skillId, "skill");
          for (const stmt of skill.body.stmts) {
            this.checkDecl(stmt, entityScope);
          }
        }
        for (const react of node.reactions) {
          const reactId = newNodeId();
          const [, trigDim] = this.inferType(react.trigger, entityScope);
          addIrNode(this.graph, {
            id: reactId,
            kind: { tag: "Reaction", trigger: react.trigger.type === "Identifier" ? react.trigger.name : "signal" },
            valueType: "unknown",
            dimension: trigDim,
            dirty: false,
          });
          addIrEdge(this.graph, irId, reactId, "react");
        }
        break;
      }

      case "SensorDef": {
        const hz = node.frequency ? node.frequency.value : 1;
        const irId = newNodeId();
        addIrNode(this.graph, {
          id: irId,
          kind: { tag: "Sensor", name: node.name, hz },
          valueType: "signal",
          dimension: "scalar",
          displayValue: `${hz}Hz`,
          dirty: false,
        });
        scope.set(node.name, {
          valueType: "signal",
          dimension: "scalar",
          irNodeId: irId,
          mutable: false,
        });
        break;
      }

      case "FnDef": {
        scope.set(node.name, { valueType: "fn", dimension: "scalar", mutable: false });
        break;
      }

      default:
        // Expression statements — still type-check them
        this.inferType(node, scope);
        break;
    }
  }

  // Returns [ValueType, Dimension]
  inferType(node: AstNode, scope: Scope): [ValueType, Dimension] {
    switch (node.type) {
      case "UnitLit": {
        const dim = dimensionFromUnit(node.unit);
        return ["unit", dim];
      }
      case "IntLit":
        return ["int", "scalar"];
      case "FloatLit":
        return ["float", "scalar"];
      case "StringLit":
        return ["string", "scalar"];
      case "BoolLit":
        return ["bool", "scalar"];
      case "Identifier": {
        const sym = scope.get(node.name);
        if (!sym) {
          // Not an error at typeck time for unknowns (may be forward-ref)
          return ["unknown", "scalar"];
        }
        return [sym.valueType, sym.dimension];
      }
      case "BinaryExpr": {
        const [lVT, lDim] = this.inferType(node.left, scope);
        const [rVT, rDim] = this.inferType(node.right, scope);

        if (node.op === "+" || node.op === "-") {
          // Must be same dimension (if both are unit-typed)
          if (lDim !== "scalar" && rDim !== "scalar" && lDim !== rDim) {
            this.diagnostics.push({
              kind: "error",
              message: `Unit mismatch: cannot ${node.op === "+" ? "add" : "subtract"} ${lDim} and ${rDim}`,
              span: node.span,
              nodeId: node.id,
            });
            return ["unknown", "unknown"];
          }
          const dim = lDim !== "scalar" ? lDim : rDim;
          return [combineVT(lVT, rVT), dim];
        }

        if (node.op === "*") {
          const resDim = multiplyDimensions(lDim, rDim);
          if (resDim === "unknown") {
            this.diagnostics.push({
              kind: "warning",
              message: `Multiplying ${lDim} × ${rDim} produces unknown dimension`,
              span: node.span,
              nodeId: node.id,
            });
          }
          return [combineVT(lVT, rVT), resDim];
        }

        if (node.op === "/") {
          const resDim = divideDimensions(lDim, rDim);
          return [combineVT(lVT, rVT), resDim];
        }

        // Comparison / logical
        if (["==", "!=", "<", ">", "<=", ">=", "&&", "||"].includes(node.op)) {
          return ["bool", "scalar"];
        }

        return [combineVT(lVT, rVT), "scalar"];
      }

      case "UnaryExpr": {
        const [vt, dim] = this.inferType(node.operand, scope);
        return [vt, dim];
      }

      case "CallExpr": {
        // Built-in solve() returns a unit value
        if (node.callee.type === "Identifier" && node.callee.name === "solve") {
          return ["unit", "scalar"];
        }
        return ["unknown", "scalar"];
      }

      case "Block": {
        if (node.stmts.length === 0) return ["void", "scalar"];
        let last: [ValueType, Dimension] = ["void", "scalar"];
        const blockScope = childScope(scope);
        for (const stmt of node.stmts) {
          this.checkDecl(stmt, blockScope);
          last = this.inferType(stmt, blockScope);
        }
        return last;
      }

      case "IfExpr": {
        const [, thenDim] = this.inferType(node.then, scope);
        if (node.else) {
          const [, elseDim] = this.inferType(node.else, scope);
          if (thenDim !== elseDim && thenDim !== "scalar" && elseDim !== "scalar") {
            this.diagnostics.push({
              kind: "warning",
              message: `If branches have different dimensions: ${thenDim} vs ${elseDim}`,
              span: node.span,
            });
          }
        }
        return ["unknown", thenDim];
      }

      default:
        return ["unknown", "scalar"];
    }
  }

  private addExprDeps(targetId: NodeId, node: AstNode, scope: Scope): void {
    switch (node.type) {
      case "Identifier": {
        const sym = scope.get(node.name);
        if (sym?.irNodeId) addIrEdge(this.graph, sym.irNodeId, targetId);
        break;
      }
      case "BinaryExpr":
        this.addExprDeps(targetId, node.left, scope);
        this.addExprDeps(targetId, node.right, scope);
        break;
      case "UnaryExpr":
        this.addExprDeps(targetId, node.operand, scope);
        break;
      case "CallExpr":
        this.addExprDeps(targetId, node.callee, scope);
        for (const arg of node.args) this.addExprDeps(targetId, arg, scope);
        break;
      case "Block":
        for (const s of node.stmts) this.addExprDeps(targetId, s, scope);
        break;
      default:
        break;
    }
  }
}

function combineVT(a: ValueType, b: ValueType): ValueType {
  if (a === "float" || b === "float") return "float";
  if (a === "unit" || b === "unit") return "unit";
  if (a === "int" && b === "int") return "int";
  return a === "unknown" ? b : a;
}

export function typeCheck(program: Program): TypeCheckResult {
  return new TypeChecker().check(program);
}
