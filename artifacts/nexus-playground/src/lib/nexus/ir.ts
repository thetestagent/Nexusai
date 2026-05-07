// ─────────────────────────────────────────────────
// NEXUS IR — Intermediate Graph Representation
// Ported from nexus-ir (Rust) to TypeScript
// ─────────────────────────────────────────────────

export type NodeId = string;

export type Dimension =
  | "voltage"
  | "current"
  | "resistance"
  | "frequency"
  | "time"
  | "power"
  | "energy"
  | "scalar"
  | "unknown";

export type ValueType =
  | "int"
  | "float"
  | "string"
  | "bool"
  | "unit"
  | "signal"
  | "entity"
  | "equation"
  | "fn"
  | "unknown"
  | "void";

export type NodeKind =
  | { tag: "Binding"; name: string }
  | { tag: "Equation"; name: string }
  | { tag: "Entity"; name: string }
  | { tag: "Sensor"; name: string; hz: number }
  | { tag: "Literal"; repr: string }
  | { tag: "Operation"; op: string }
  | { tag: "Reaction"; trigger: string }
  | { tag: "Skill"; entityName: string; skillName: string }
  | { tag: "Prediction"; target: string };

export interface IrNode {
  id: NodeId;
  kind: NodeKind;
  valueType: ValueType;
  dimension: Dimension;
  displayValue?: string;
  dirty: boolean;
}

export interface IrEdge {
  from: NodeId;
  to: NodeId;
  label?: string;
}

export interface IrGraph {
  nodes: Map<NodeId, IrNode>;
  edges: IrEdge[];
  dependents: Map<NodeId, Set<NodeId>>;
  dependencies: Map<NodeId, Set<NodeId>>;
  evalOrder: NodeId[];
}

export function createGraph(): IrGraph {
  return {
    nodes: new Map(),
    edges: [],
    dependents: new Map(),
    dependencies: new Map(),
    evalOrder: [],
  };
}

let _nodeSeq = 0;
export function newNodeId(): NodeId {
  return `n${(++_nodeSeq).toString(36)}`;
}

export function addIrNode(graph: IrGraph, node: IrNode): NodeId {
  graph.nodes.set(node.id, node);
  if (!graph.dependents.has(node.id)) graph.dependents.set(node.id, new Set());
  if (!graph.dependencies.has(node.id)) graph.dependencies.set(node.id, new Set());
  return node.id;
}

export function addIrEdge(graph: IrGraph, from: NodeId, to: NodeId, label?: string) {
  graph.edges.push({ from, to, label });
  graph.dependencies.get(to)?.add(from);
  graph.dependents.get(from)?.add(to);
}

export function markDirty(graph: IrGraph, nodeId: NodeId): void {
  const queue = [nodeId];
  const seen = new Set<NodeId>();
  while (queue.length > 0) {
    const cur = queue.pop()!;
    if (seen.has(cur)) continue;
    seen.add(cur);
    const node = graph.nodes.get(cur);
    if (node) node.dirty = true;
    const deps = graph.dependents.get(cur);
    if (deps) for (const d of deps) queue.push(d);
  }
}

export function topoSort(graph: IrGraph): NodeId[] {
  const visited = new Set<NodeId>();
  const order: NodeId[] = [];
  function visit(id: NodeId) {
    if (visited.has(id)) return;
    visited.add(id);
    const deps = graph.dependencies.get(id) ?? new Set();
    for (const dep of deps) visit(dep);
    order.push(id);
  }
  for (const id of graph.nodes.keys()) visit(id);
  graph.evalOrder = order;
  return order;
}

// ── Dimensional arithmetic (mirrors nexus-typeck) ──

export function multiplyDimensions(a: Dimension, b: Dimension): Dimension {
  if (a === "scalar") return b;
  if (b === "scalar") return a;
  if (a === "voltage" && b === "current") return "power";
  if (a === "current" && b === "voltage") return "power";
  if (a === "current" && b === "resistance") return "voltage";
  if (a === "resistance" && b === "current") return "voltage";
  if (a === b) return a;
  return "unknown";
}

export function divideDimensions(a: Dimension, b: Dimension): Dimension {
  if (b === "scalar") return a;
  if (a === b) return "scalar";
  if (a === "voltage" && b === "current") return "resistance";
  if (a === "power" && b === "current") return "voltage";
  if (a === "power" && b === "voltage") return "current";
  if (a === "voltage" && b === "resistance") return "current";
  return "unknown";
}

export function dimensionLabel(d: Dimension): string {
  switch (d) {
    case "voltage": return "V";
    case "current": return "A";
    case "resistance": return "Ω";
    case "frequency": return "Hz";
    case "time": return "s";
    case "power": return "W";
    case "energy": return "J";
    case "scalar": return "—";
    default: return "?";
  }
}

export function dimensionFromUnit(unit: string): Dimension {
  switch (unit) {
    case "V": return "voltage";
    case "A": return "current";
    case "ohm": return "resistance";
    case "Hz": return "frequency";
    case "ms": case "s": return "time";
    case "W": case "kW": case "MW": return "power";
    default: return "scalar";
  }
}
