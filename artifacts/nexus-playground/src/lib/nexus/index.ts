export * from "./lexer";
export * from "./ast";
export * from "./parser";
export * from "./interpreter";
export { type IrGraph, type IrNode, type IrEdge, type NodeKind, type ValueType, type Dimension as IrDimension, dimensionLabel, dimensionFromUnit, multiplyDimensions, divideDimensions, createGraph, addIrNode, addIrEdge, newNodeId, topoSort, markDirty } from "./ir";
export * from "./typeck";
export * from "./math";

import { lex } from "./lexer";
import { parse } from "./parser";
import { interpret } from "./interpreter";
import { typeCheck } from "./typeck";
import type { LexError } from "./lexer";
import type { ParseError } from "./parser";
import type { InterpreterResult } from "./interpreter";
import type { TypeCheckResult } from "./typeck";

export interface PipelineResult {
  tokens: ReturnType<typeof lex>["tokens"];
  lexErrors: LexError[];
  parseErrors: ParseError[];
  program: ReturnType<typeof parse>["program"];
  typeCheck: TypeCheckResult | null;
  result: InterpreterResult | null;
}

export function runPipeline(source: string): PipelineResult {
  const { tokens, errors: lexErrors } = lex(source);
  const { program, errors: parseErrors } = parse(tokens);

  let tcResult: TypeCheckResult | null = null;
  let result: InterpreterResult | null = null;

  if (lexErrors.length === 0) {
    tcResult = typeCheck(program);
    result = interpret(program);
  }

  return { tokens, lexErrors, parseErrors, program, typeCheck: tcResult, result };
}
