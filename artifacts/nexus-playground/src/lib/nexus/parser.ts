import type { Token, TokenKind, Span } from "./lexer";
import type {
  AstNode, Program, LetBinding, EquationDef, EntityDef, SensorDef,
  FnDef, SkillDef, ReactBlock, IfExpr, ForExpr, ReturnStmt, Block,
  BinaryExpr, BinaryOp, UnaryExpr, CallExpr, FieldExpr, IndexExpr,
  MatchExpr, PredictCall, UnitLit, IntLit, FloatLit, StringLit,
  BoolLit, Identifier, AssignExpr
} from "./ast";
import { mkId } from "./ast";

export interface ParseError {
  message: string;
  span: Span;
}

export interface ParseResult {
  program: Program;
  errors: ParseError[];
}

class Parser {
  private pos = 0;
  private errors: ParseError[] = [];

  constructor(private tokens: Token[]) {}

  // ── Token navigation ──
  private peek(offset = 0): Token {
    const idx = this.pos + offset;
    return this.tokens[idx] ?? this.tokens[this.tokens.length - 1];
  }

  private advance(): Token {
    const t = this.peek();
    if (t.kind !== "EOF") this.pos++;
    return t;
  }

  private check(kind: TokenKind): boolean {
    return this.peek().kind === kind;
  }

  private match(...kinds: TokenKind[]): boolean {
    for (const k of kinds) {
      if (this.check(k)) { this.advance(); return true; }
    }
    return false;
  }

  private expect(kind: TokenKind): Token {
    if (this.check(kind)) return this.advance();
    const tok = this.peek();
    this.error(`Expected '${kind}', found '${tok.lexeme || tok.kind}'`, tok.span);
    return tok;
  }

  private expectIdent(): Token {
    if (this.check("Identifier")) return this.advance();
    const tok = this.peek();
    this.error(`Expected identifier, found '${tok.lexeme || tok.kind}'`, tok.span);
    return tok;
  }

  private error(msg: string, span: Span) {
    this.errors.push({ message: msg, span });
  }

  private spanFrom(start: Span): Span {
    const end = this.tokens[Math.max(0, this.pos - 1)]?.span ?? start;
    return { start: start.start, end: end.end };
  }

  // ── Program ──
  parse(): ParseResult {
    const decls: AstNode[] = [];
    while (!this.check("EOF")) {
      try {
        decls.push(this.parseDecl());
      } catch (e) {
        // Error recovery: skip to next statement
        this.error(String(e), this.peek().span);
        while (!this.check("EOF") && !this.check(";") &&
               !this.check("let") && !this.check("entity") &&
               !this.check("equation") && !this.check("sensor") && !this.check("fn")) {
          this.advance();
        }
        this.match(";");
      }
    }
    return { program: { decls }, errors: this.errors };
  }

  // ── Declarations ──
  private parseDecl(): AstNode {
    const tok = this.peek();
    switch (tok.kind) {
      case "let": return this.parseLet();
      case "equation": return this.parseEquation();
      case "entity": return this.parseEntity();
      case "sensor": return this.parseSensor();
      case "fn": return this.parseFn();
      case "return": return this.parseReturn();
      default: return this.parseExprStmt();
    }
  }

  private parseLet(): LetBinding {
    const start = this.peek().span;
    this.expect("let");
    const name = this.expectIdent().lexeme;
    let typeAnn: AstNode | undefined;
    if (this.match(":")) typeAnn = this.parsePrimary();
    this.expect("=");
    const value = this.parseExpr();
    this.match(";");
    return { type: "LetBinding", id: mkId(), span: this.spanFrom(start), name, typeAnn, value, mutable: false };
  }

  private parseEquation(): EquationDef {
    const start = this.peek().span;
    this.expect("equation");
    const name = this.expectIdent().lexeme;
    this.expect("{");
    const body = this.parseExpr();
    this.expect("}");
    return { type: "EquationDef", id: mkId(), span: this.spanFrom(start), name, body };
  }

  private parseEntity(): EntityDef {
    const start = this.peek().span;
    this.expect("entity");
    const name = this.expectIdent().lexeme;
    this.expect("{");
    let memory: EntityDef["memory"];
    const skills: SkillDef[] = [];
    const reactions: ReactBlock[] = [];
    while (!this.check("}") && !this.check("EOF")) {
      if (this.check("memory")) {
        this.advance();
        if (this.match("persistent")) memory = "persistent";
        else memory = "transient";
      } else if (this.check("skill")) {
        skills.push(this.parseSkill());
      } else if (this.check("react")) {
        reactions.push(this.parseReact());
      } else {
        this.error(`Unexpected token '${this.peek().lexeme}' in entity body`, this.peek().span);
        this.advance();
      }
    }
    this.expect("}");
    return { type: "EntityDef", id: mkId(), span: this.spanFrom(start), name, memory, skills, reactions };
  }

  private parseSensor(): SensorDef {
    const start = this.peek().span;
    this.expect("sensor");
    const name = this.expectIdent().lexeme;
    this.expect("{");
    const pin = this.peek().kind !== "}" ? this.expectIdent().lexeme : "default";
    let frequency: UnitLit | undefined;
    while (!this.check("}") && !this.check("EOF")) {
      if (this.peek().lexeme === "frequency") {
        this.advance();
        const t = this.peek();
        if (t.kind === "UnitLiteral" && t.unitSuffix) {
          this.advance();
          frequency = { type: "UnitLit", id: mkId(), span: t.span, value: t.unitValue!, unit: t.unitSuffix as any };
        }
      } else { this.advance(); }
    }
    this.expect("}");
    return { type: "SensorDef", id: mkId(), span: this.spanFrom(start), name, pin, frequency };
  }

  private parseFn(): FnDef {
    const start = this.peek().span;
    this.expect("fn");
    const name = this.expectIdent().lexeme;
    this.expect("(");
    const params: FnDef["params"] = [];
    while (!this.check(")") && !this.check("EOF")) {
      const pName = this.expectIdent().lexeme;
      let typeAnn: AstNode | undefined;
      if (this.match(":")) typeAnn = this.parsePrimary();
      params.push({ name: pName, typeAnn });
      this.match(",");
    }
    this.expect(")");
    let returnType: AstNode | undefined;
    if (this.match("->")) returnType = this.parsePrimary();
    const body = this.parseBlock();
    return { type: "FnDef", id: mkId(), span: this.spanFrom(start), name, params, returnType, body };
  }

  private parseSkill(): SkillDef {
    const start = this.peek().span;
    this.expect("skill");
    const name = this.expectIdent().lexeme;
    const body = this.parseBlock();
    return { type: "SkillDef", id: mkId(), span: this.spanFrom(start), name, body };
  }

  private parseReact(): ReactBlock {
    const start = this.peek().span;
    this.expect("react");
    const trigger = this.parseExpr();
    const body = this.parseBlock();
    return { type: "ReactBlock", id: mkId(), span: this.spanFrom(start), trigger, body };
  }

  private parseReturn(): ReturnStmt {
    const start = this.peek().span;
    this.expect("return");
    let value: AstNode | undefined;
    if (!this.check(";") && !this.check("}")) value = this.parseExpr();
    this.match(";");
    return { type: "ReturnStmt", id: mkId(), span: this.spanFrom(start), value };
  }

  private parseExprStmt(): AstNode {
    const expr = this.parseExpr();
    this.match(";");
    return expr;
  }

  // ── Expressions (Pratt) ──
  private parseExpr(): AstNode {
    return this.parseAssign();
  }

  private parseAssign(): AstNode {
    const left = this.parseOr();
    if (this.match("=")) {
      const value = this.parseAssign();
      const span = { start: left.span.start, end: value.span.end };
      return { type: "AssignExpr", id: mkId(), span, target: left, value } as AssignExpr;
    }
    return left;
  }

  private parseOr(): AstNode { return this.parseBinary(["&&", "||"], () => this.parseComparison()); }
  private parseComparison(): AstNode { return this.parseBinary(["==", "!=", "<", ">", "<=", ">="], () => this.parseAddSub()); }
  private parseAddSub(): AstNode { return this.parseBinary(["+", "-"], () => this.parseMulDiv()); }
  private parseMulDiv(): AstNode { return this.parseBinary(["*", "/", "%"], () => this.parsePow()); }
  private parsePow(): AstNode { return this.parseBinary(["**"], () => this.parseUnary()); }

  private parseBinary(ops: string[], next: () => AstNode): AstNode {
    let left = next();
    while (ops.includes(this.peek().kind)) {
      const op = this.advance().kind as BinaryOp;
      const right = next();
      const span = { start: left.span.start, end: right.span.end };
      left = { type: "BinaryExpr", id: mkId(), span, op, left, right } as BinaryExpr;
    }
    return left;
  }

  private parseUnary(): AstNode {
    if (this.check("-") || this.check("!")) {
      const t = this.advance();
      const operand = this.parseUnary();
      return { type: "UnaryExpr", id: mkId(), span: { start: t.span.start, end: operand.span.end }, op: t.kind as "-" | "!", operand } as UnaryExpr;
    }
    return this.parseCall();
  }

  private parseCall(): AstNode {
    let expr = this.parsePrimary();
    while (true) {
      if (this.match("(")) {
        const args: AstNode[] = [];
        while (!this.check(")") && !this.check("EOF")) {
          args.push(this.parseExpr());
          this.match(",");
        }
        this.expect(")");
        expr = { type: "CallExpr", id: mkId(), span: this.spanFrom(expr.span), callee: expr, args } as CallExpr;
      } else if (this.match(".")) {
        const field = this.expectIdent().lexeme;
        expr = { type: "FieldExpr", id: mkId(), span: this.spanFrom(expr.span), object: expr, field } as FieldExpr;
      } else if (this.match("[")) {
        const index = this.parseExpr();
        this.expect("]");
        expr = { type: "IndexExpr", id: mkId(), span: this.spanFrom(expr.span), object: expr, index } as IndexExpr;
      } else break;
    }
    return expr;
  }

  private parsePrimary(): AstNode {
    const t = this.peek();

    if (t.kind === "UnitLiteral" && t.unitSuffix !== undefined) {
      this.advance();
      return { type: "UnitLit", id: mkId(), span: t.span, value: t.unitValue!, unit: t.unitSuffix as any } as UnitLit;
    }
    if (t.kind === "IntLiteral") {
      this.advance();
      return { type: "IntLit", id: mkId(), span: t.span, value: parseInt(t.lexeme, 10) } as IntLit;
    }
    if (t.kind === "FloatLiteral") {
      this.advance();
      return { type: "FloatLit", id: mkId(), span: t.span, value: parseFloat(t.lexeme) } as FloatLit;
    }
    if (t.kind === "StringLiteral") {
      this.advance();
      const raw = t.lexeme.slice(1, -1);
      return { type: "StringLit", id: mkId(), span: t.span, value: raw } as StringLit;
    }
    if (t.kind === "true") {
      this.advance();
      return { type: "BoolLit", id: mkId(), span: t.span, value: true } as BoolLit;
    }
    if (t.kind === "false") {
      this.advance();
      return { type: "BoolLit", id: mkId(), span: t.span, value: false } as BoolLit;
    }
    if (t.kind === "predict") {
      this.advance();
      const name = this.expectIdent().lexeme;
      return { type: "PredictCall", id: mkId(), span: this.spanFrom(t.span), target: name } as PredictCall;
    }
    if (t.kind === "if") return this.parseIf();
    if (t.kind === "for") return this.parseFor();
    if (t.kind === "match") return this.parseMatch();
    if (t.kind === "{") return this.parseBlock();
    if (t.kind === "(") {
      this.advance();
      const expr = this.parseExpr();
      this.expect(")");
      return expr;
    }
    if (t.kind === "Identifier") {
      this.advance();
      return { type: "Identifier", id: mkId(), span: t.span, name: t.lexeme } as Identifier;
    }

    this.advance();
    this.error(`Unexpected token '${t.lexeme || t.kind}'`, t.span);
    return { type: "Identifier", id: mkId(), span: t.span, name: "<error>" } as Identifier;
  }

  private parseIf(): IfExpr {
    const start = this.peek().span;
    this.expect("if");
    const condition = this.parseExpr();
    const then = this.parseBlock();
    let elseB: AstNode | undefined;
    if (this.match("else")) {
      if (this.check("if")) elseB = this.parseIf();
      else elseB = this.parseBlock();
    }
    return { type: "IfExpr", id: mkId(), span: this.spanFrom(start), condition, then, else: elseB };
  }

  private parseFor(): ForExpr {
    const start = this.peek().span;
    this.expect("for");
    const binding = this.expectIdent().lexeme;
    this.expect("in");
    const iterable = this.parseExpr();
    const body = this.parseBlock();
    return { type: "ForExpr", id: mkId(), span: this.spanFrom(start), binding, iterable, body };
  }

  private parseMatch(): MatchExpr {
    const start = this.peek().span;
    this.expect("match");
    const scrutinee = this.parseExpr();
    this.expect("{");
    const arms: MatchExpr["arms"] = [];
    while (!this.check("}") && !this.check("EOF")) {
      const pattern = this.parsePrimary();
      this.expect("=>");
      const body = this.check("{") ? this.parseBlock() : this.parseExpr();
      this.match(",");
      arms.push({ pattern, body });
    }
    this.expect("}");
    return { type: "MatchExpr", id: mkId(), span: this.spanFrom(start), scrutinee, arms };
  }

  private parseBlock(): Block {
    const start = this.peek().span;
    this.expect("{");
    const stmts: AstNode[] = [];
    while (!this.check("}") && !this.check("EOF")) {
      stmts.push(this.parseDecl());
    }
    this.expect("}");
    return { type: "Block", id: mkId(), span: this.spanFrom(start), stmts };
  }
}

export function parse(tokens: Token[]): ParseResult {
  return new Parser(tokens).parse();
}
