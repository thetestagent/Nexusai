import type { Span } from "./lexer";

export type NodeId = string;

function newId(): NodeId {
  return Math.random().toString(36).slice(2, 10);
}

// ── Engineering units ──
export type UnitSuffix = "V" | "A" | "ohm" | "Hz" | "ms" | "s" | "W" | "kW" | "MW";
export type Dimension = "voltage" | "current" | "resistance" | "frequency" | "time" | "power" | "scalar";

export function unitDimension(u: UnitSuffix): Dimension {
  switch (u) {
    case "V": return "voltage";
    case "A": return "current";
    case "ohm": return "resistance";
    case "Hz": return "frequency";
    case "ms": case "s": return "time";
    case "W": case "kW": case "MW": return "power";
  }
}

// ── AST node types ──
export type AstNode =
  | LetBinding
  | EquationDef
  | EntityDef
  | SensorDef
  | FnDef
  | SkillDef
  | ReactBlock
  | IfExpr
  | ForExpr
  | ReturnStmt
  | Block
  | AssignExpr
  | BinaryExpr
  | UnaryExpr
  | CallExpr
  | IndexExpr
  | FieldExpr
  | MatchExpr
  | PredictCall
  | UnitLit
  | IntLit
  | FloatLit
  | StringLit
  | BoolLit
  | Identifier;

interface BaseNode {
  id: NodeId;
  span: Span;
}

export interface LetBinding extends BaseNode {
  type: "LetBinding";
  name: string;
  typeAnn?: AstNode;
  value: AstNode;
  mutable: boolean;
}

export interface EquationDef extends BaseNode {
  type: "EquationDef";
  name: string;
  body: AstNode;
}

export interface EntityDef extends BaseNode {
  type: "EntityDef";
  name: string;
  memory?: "persistent" | "transient";
  skills: SkillDef[];
  reactions: ReactBlock[];
}

export interface SensorDef extends BaseNode {
  type: "SensorDef";
  name: string;
  pin: string;
  frequency?: UnitLit;
}

export interface FnDef extends BaseNode {
  type: "FnDef";
  name: string;
  params: { name: string; typeAnn?: AstNode }[];
  returnType?: AstNode;
  body: Block;
}

export interface SkillDef extends BaseNode {
  type: "SkillDef";
  name: string;
  body: Block;
}

export interface ReactBlock extends BaseNode {
  type: "ReactBlock";
  trigger: AstNode;
  body: AstNode;
}

export interface IfExpr extends BaseNode {
  type: "IfExpr";
  condition: AstNode;
  then: AstNode;
  else?: AstNode;
}

export interface ForExpr extends BaseNode {
  type: "ForExpr";
  binding: string;
  iterable: AstNode;
  body: AstNode;
}

export interface ReturnStmt extends BaseNode {
  type: "ReturnStmt";
  value?: AstNode;
}

export interface Block extends BaseNode {
  type: "Block";
  stmts: AstNode[];
}

export interface AssignExpr extends BaseNode {
  type: "AssignExpr";
  target: AstNode;
  value: AstNode;
}

export type BinaryOp = "+" | "-" | "*" | "/" | "%" | "**" | "==" | "!=" | "<" | ">" | "<=" | ">=" | "&&" | "||";

export interface BinaryExpr extends BaseNode {
  type: "BinaryExpr";
  op: BinaryOp;
  left: AstNode;
  right: AstNode;
}

export interface UnaryExpr extends BaseNode {
  type: "UnaryExpr";
  op: "-" | "!";
  operand: AstNode;
}

export interface CallExpr extends BaseNode {
  type: "CallExpr";
  callee: AstNode;
  args: AstNode[];
}

export interface IndexExpr extends BaseNode {
  type: "IndexExpr";
  object: AstNode;
  index: AstNode;
}

export interface FieldExpr extends BaseNode {
  type: "FieldExpr";
  object: AstNode;
  field: string;
}

export interface MatchExpr extends BaseNode {
  type: "MatchExpr";
  scrutinee: AstNode;
  arms: { pattern: AstNode; body: AstNode }[];
}

export interface PredictCall extends BaseNode {
  type: "PredictCall";
  target: string;
}

export interface UnitLit extends BaseNode {
  type: "UnitLit";
  value: number;
  unit: UnitSuffix;
}

export interface IntLit extends BaseNode {
  type: "IntLit";
  value: number;
}

export interface FloatLit extends BaseNode {
  type: "FloatLit";
  value: number;
}

export interface StringLit extends BaseNode {
  type: "StringLit";
  value: string;
}

export interface BoolLit extends BaseNode {
  type: "BoolLit";
  value: boolean;
}

export interface Identifier extends BaseNode {
  type: "Identifier";
  name: string;
}

// ── Program ──
export interface Program {
  decls: AstNode[];
}

// ── Builder helpers ──
export function mkId(): NodeId { return newId(); }
