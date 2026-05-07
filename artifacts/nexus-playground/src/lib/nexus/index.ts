export * from "./lexer";
export * from "./ast";
export * from "./parser";
export * from "./interpreter";

import { lex } from "./lexer";
import { parse } from "./parser";
import { interpret } from "./interpreter";
import type { LexError } from "./lexer";
import type { ParseError } from "./parser";
import type { InterpreterResult } from "./interpreter";

export interface PipelineResult {
  tokens: ReturnType<typeof lex>["tokens"];
  lexErrors: LexError[];
  parseErrors: ParseError[];
  program: ReturnType<typeof parse>["program"];
  result: InterpreterResult | null;
}

export function runPipeline(source: string): PipelineResult {
  const { tokens, errors: lexErrors } = lex(source);
  const { program, errors: parseErrors } = parse(tokens);
  const result = lexErrors.length === 0 ? interpret(program) : null;
  return { tokens, lexErrors, parseErrors, program, result };
}
