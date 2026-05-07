export type TokenKind =
  // Keywords
  | "let" | "entity" | "equation" | "sensor" | "react" | "predict"
  | "memory" | "persistent" | "skill" | "if" | "else" | "for" | "in"
  | "fn" | "return" | "struct" | "impl" | "match" | "enum"
  | "true" | "false"
  // Symbols
  | "=" | "+" | "-" | "*" | "/" | "%" | "**"
  | "==" | "!=" | "<" | ">" | "<=" | ">="
  | "&&" | "||" | "!"
  | "(" | ")" | "{" | "}" | "[" | "]"
  | "." | "," | ";" | ":" | "::" | "->" | "=>"
  // Literals
  | "UnitLiteral" | "FloatLiteral" | "IntLiteral" | "StringLiteral"
  // Identifiers
  | "Identifier"
  // Special
  | "EOF" | "Error";

export const KEYWORDS: Set<string> = new Set([
  "let", "entity", "equation", "sensor", "react", "predict",
  "memory", "persistent", "skill", "if", "else", "for", "in",
  "fn", "return", "struct", "impl", "match", "enum", "true", "false"
]);

export const UNITS = ["kW", "MW", "ms", "Hz", "ohm", "V", "A", "W", "s"];

export interface Span {
  start: number;
  end: number;
}

export interface Token {
  kind: TokenKind;
  lexeme: string;
  span: Span;
  unitValue?: number;
  unitSuffix?: string;
}

export interface LexError {
  message: string;
  span: Span;
}

export interface LexResult {
  tokens: Token[];
  errors: LexError[];
}

export function lex(source: string): LexResult {
  const tokens: Token[] = [];
  const errors: LexError[] = [];
  let pos = 0;

  function peek(offset = 0): string {
    return source[pos + offset] ?? "";
  }

  function advance(): string {
    return source[pos++] ?? "";
  }

  function makeToken(kind: TokenKind, start: number, lexeme?: string): Token {
    return { kind, lexeme: lexeme ?? source.slice(start, pos), span: { start, end: pos } };
  }

  function skipWhitespaceAndComments() {
    while (pos < source.length) {
      const ch = peek();
      if (ch === " " || ch === "\t" || ch === "\r" || ch === "\n") {
        advance();
      } else if (ch === "/" && peek(1) === "/") {
        while (pos < source.length && peek() !== "\n") advance();
      } else if (ch === "/" && peek(1) === "*") {
        advance(); advance();
        while (pos < source.length && !(peek() === "*" && peek(1) === "/")) advance();
        if (pos < source.length) { advance(); advance(); }
      } else {
        break;
      }
    }
  }

  function readString(start: number): Token {
    advance(); // consume opening "
    let value = "";
    while (pos < source.length && peek() !== '"') {
      if (peek() === "\\") {
        advance();
        const esc = advance();
        if (esc === "n") value += "\n";
        else if (esc === "t") value += "\t";
        else if (esc === "r") value += "\r";
        else value += esc;
      } else {
        value += advance();
      }
    }
    if (peek() === '"') advance();
    else errors.push({ message: "Unterminated string literal", span: { start, end: pos } });
    return { kind: "StringLiteral", lexeme: source.slice(start, pos), span: { start, end: pos } };
  }

  function readNumber(start: number): Token {
    while (/\d/.test(peek())) advance();
    let isFloat = false;
    if (peek() === "." && /\d/.test(peek(1))) {
      isFloat = true;
      advance();
      while (/\d/.test(peek())) advance();
    }
    // Check for engineering unit suffix
    const unitStart = pos;
    for (const unit of UNITS) {
      if (source.slice(pos, pos + unit.length) === unit) {
        const nextChar = source[pos + unit.length];
        if (!nextChar || !/[a-zA-Z_]/.test(nextChar)) {
          pos += unit.length;
          const lexeme = source.slice(start, pos);
          const numStr = source.slice(start, unitStart);
          return {
            kind: "UnitLiteral",
            lexeme,
            span: { start, end: pos },
            unitValue: parseFloat(numStr),
            unitSuffix: unit,
          };
        }
      }
    }
    return makeToken(isFloat ? "FloatLiteral" : "IntLiteral", start);
  }

  function readIdentifierOrKeyword(start: number): Token {
    while (/[a-zA-Z0-9_]/.test(peek())) advance();
    const lexeme = source.slice(start, pos);
    const kind: TokenKind = KEYWORDS.has(lexeme) ? (lexeme as TokenKind) : "Identifier";
    return { kind, lexeme, span: { start, end: pos } };
  }

  while (pos < source.length) {
    skipWhitespaceAndComments();
    if (pos >= source.length) break;
    const start = pos;
    const ch = peek();

    if (ch === '"') {
      tokens.push(readString(start));
      continue;
    }
    if (/\d/.test(ch)) {
      tokens.push(readNumber(start));
      continue;
    }
    if (/[a-zA-Z_]/.test(ch)) {
      tokens.push(readIdentifierOrKeyword(start));
      continue;
    }

    advance();
    const next = peek();

    switch (ch) {
      case "=":
        if (next === "=") { advance(); tokens.push(makeToken("==", start)); }
        else if (next === ">") { advance(); tokens.push(makeToken("=>", start)); }
        else tokens.push(makeToken("=", start));
        break;
      case "!":
        if (next === "=") { advance(); tokens.push(makeToken("!=", start)); }
        else tokens.push(makeToken("!", start));
        break;
      case "<":
        if (next === "=") { advance(); tokens.push(makeToken("<=", start)); }
        else tokens.push(makeToken("<", start));
        break;
      case ">":
        if (next === "=") { advance(); tokens.push(makeToken(">=", start)); }
        else tokens.push(makeToken(">", start));
        break;
      case "&":
        if (next === "&") { advance(); tokens.push(makeToken("&&", start)); }
        else errors.push({ message: `Unexpected character '${ch}'`, span: { start, end: pos } });
        break;
      case "|":
        if (next === "|") { advance(); tokens.push(makeToken("||", start)); }
        else errors.push({ message: `Unexpected character '${ch}'`, span: { start, end: pos } });
        break;
      case "-":
        if (next === ">") { advance(); tokens.push(makeToken("->", start)); }
        else tokens.push(makeToken("-", start));
        break;
      case "*":
        if (next === "*") { advance(); tokens.push(makeToken("**", start)); }
        else tokens.push(makeToken("*", start));
        break;
      case ":":
        if (next === ":") { advance(); tokens.push(makeToken("::", start)); }
        else tokens.push(makeToken(":", start));
        break;
      case "+": tokens.push(makeToken("+", start)); break;
      case "/": tokens.push(makeToken("/", start)); break;
      case "%": tokens.push(makeToken("%", start)); break;
      case "(": tokens.push(makeToken("(", start)); break;
      case ")": tokens.push(makeToken(")", start)); break;
      case "{": tokens.push(makeToken("{", start)); break;
      case "}": tokens.push(makeToken("}", start)); break;
      case "[": tokens.push(makeToken("[", start)); break;
      case "]": tokens.push(makeToken("]", start)); break;
      case ".": tokens.push(makeToken(".", start)); break;
      case ",": tokens.push(makeToken(",", start)); break;
      case ";": tokens.push(makeToken(";", start)); break;
      default:
        errors.push({ message: `Unexpected character '${ch}'`, span: { start, end: pos } });
    }
  }

  tokens.push({ kind: "EOF", lexeme: "", span: { start: pos, end: pos } });
  return { tokens, errors };
}

export function getTokenColor(kind: TokenKind): string {
  if (KEYWORDS.has(kind)) return "keyword";
  if (kind === "UnitLiteral") return "unit";
  if (kind === "FloatLiteral" || kind === "IntLiteral") return "number";
  if (kind === "StringLiteral") return "string";
  if (kind === "Identifier") return "identifier";
  if (kind === "EOF" || kind === "Error") return "error";
  return "operator";
}
