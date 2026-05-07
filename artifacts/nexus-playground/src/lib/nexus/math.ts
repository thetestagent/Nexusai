// ─────────────────────────────────────────────────
// NEXUS Math Engine — Symbolic Equation Solver
// Ported from nexus-math (Rust) to TypeScript
// ─────────────────────────────────────────────────

export interface SolveResult {
  unknown: string;
  value: number;
  unit?: string;
  steps: string[];
}

// ── Equation Solver ──────────────────────────────
// Handles multiplicative equations like: V = I * R
// Given known variables, solves for the unknown.

export class EquationSolver {
  /**
   * Solve a two-sided multiplicative equation for an unknown.
   * e.g. solve("V = I * R", { V: 12, I: 3 }, "R") → 4
   */
  static solveLinear(
    equation: string,
    known: Record<string, number>,
    unknown: string
  ): SolveResult | null {
    const sides = equation.split("=").map(s => s.trim());
    if (sides.length !== 2) return null;

    const [left, right] = sides;
    const steps: string[] = [`Equation: ${equation}`, `Solving for: ${unknown}`];

    // Try simple forms:
    // Form 1: unknown = expr
    if (left === unknown) {
      const val = evalSimpleExpr(right, known);
      if (val !== null) {
        steps.push(`${unknown} = ${right}`);
        steps.push(`${unknown} = ${formatNum(val)}`);
        return { unknown, value: val, steps };
      }
    }

    // Form 2: expr = unknown
    if (right === unknown) {
      const val = evalSimpleExpr(left, known);
      if (val !== null) {
        steps.push(`${unknown} = ${left}`);
        steps.push(`${unknown} = ${formatNum(val)}`);
        return { unknown, value: val, steps };
      }
    }

    // Form 3: left = A * B  (multiplication)
    if (right.includes("*")) {
      const factors = right.split("*").map(s => s.trim());
      if (factors.length === 2) {
        const [a, b] = factors;
        const leftVal = evalSimpleExpr(left, known) ?? known[left];
        if (leftVal !== undefined) {
          if (a === unknown) {
            const bVal = known[b];
            if (bVal !== undefined && bVal !== 0) {
              const val = leftVal / bVal;
              steps.push(`${left} = ${a} × ${b}`);
              steps.push(`${a} = ${left} / ${b} = ${formatNum(leftVal)} / ${formatNum(bVal)}`);
              steps.push(`${a} = ${formatNum(val)}`);
              return { unknown, value: val, steps };
            }
          }
          if (b === unknown) {
            const aVal = known[a];
            if (aVal !== undefined && aVal !== 0) {
              const val = leftVal / aVal;
              steps.push(`${left} = ${a} × ${b}`);
              steps.push(`${b} = ${left} / ${a} = ${formatNum(leftVal)} / ${formatNum(aVal)}`);
              steps.push(`${b} = ${formatNum(val)}`);
              return { unknown, value: val, steps };
            }
          }
          if (left === unknown) {
            const aVal = known[a];
            const bVal = known[b];
            if (aVal !== undefined && bVal !== undefined) {
              const val = aVal * bVal;
              steps.push(`${left} = ${a} × ${b} = ${formatNum(aVal)} × ${formatNum(bVal)}`);
              steps.push(`${left} = ${formatNum(val)}`);
              return { unknown, value: val, steps };
            }
          }
        }
      }
    }

    // Form 4: left = A / B  (division)
    if (right.includes("/")) {
      const factors = right.split("/").map(s => s.trim());
      if (factors.length === 2) {
        const [a, b] = factors;
        const leftVal = evalSimpleExpr(left, known) ?? known[left];
        if (leftVal !== undefined) {
          if (a === unknown) {
            const bVal = known[b];
            if (bVal !== undefined) {
              const val = leftVal * bVal;
              steps.push(`${left} = ${a} / ${b}`);
              steps.push(`${a} = ${left} × ${b} = ${formatNum(leftVal)} × ${formatNum(bVal)}`);
              steps.push(`${a} = ${formatNum(val)}`);
              return { unknown, value: val, steps };
            }
          }
          if (b === unknown) {
            const aVal = known[a];
            if (aVal !== undefined && leftVal !== 0) {
              const val = aVal / leftVal;
              steps.push(`${left} = ${a} / ${b}`);
              steps.push(`${b} = ${a} / ${left} = ${formatNum(aVal)} / ${formatNum(leftVal)}`);
              steps.push(`${b} = ${formatNum(val)}`);
              return { unknown, value: val, steps };
            }
          }
        }
      }
    }

    return null;
  }

  /**
   * Symbolically rearrange an equation to solve for a given variable.
   * e.g. rearrange("V = I * R", "R") → "R = V / I"
   */
  static rearrange(equation: string, solveFor: string): string | null {
    const sides = equation.split("=").map(s => s.trim());
    if (sides.length !== 2) return null;
    const [left, right] = sides;

    if (left === solveFor) return `${solveFor} = ${right}`;

    if (right === solveFor) return `${solveFor} = ${left}`;

    if (right.includes("*")) {
      const factors = right.split("*").map(s => s.trim());
      if (factors.length === 2) {
        const [a, b] = factors;
        if (a === solveFor) return `${solveFor} = ${left} / ${b}`;
        if (b === solveFor) return `${solveFor} = ${left} / ${a}`;
        if (left === solveFor) return `${solveFor} = ${a} * ${b}`;
      }
    }

    if (right.includes("/")) {
      const factors = right.split("/").map(s => s.trim());
      if (factors.length === 2) {
        const [a, b] = factors;
        if (a === solveFor) return `${solveFor} = ${left} * ${b}`;
        if (b === solveFor) return `${solveFor} = ${a} / ${left}`;
      }
    }

    return null;
  }

  /**
   * Solve Ohm's Law specifically.
   * Given any two of V, I, R — solves for the third.
   */
  static solveOhmsLaw(vars: { V?: number; I?: number; R?: number }): {
    V?: number; I?: number; R?: number; steps: string[];
  } {
    const steps: string[] = ["Ohm's Law: V = I × R"];
    if (vars.V !== undefined && vars.I !== undefined && vars.R === undefined) {
      const R = vars.V / vars.I;
      steps.push(`R = V / I = ${vars.V} / ${vars.I} = ${formatNum(R)} Ω`);
      return { ...vars, R, steps };
    }
    if (vars.V !== undefined && vars.R !== undefined && vars.I === undefined) {
      const I = vars.V / vars.R;
      steps.push(`I = V / R = ${vars.V} / ${vars.R} = ${formatNum(I)} A`);
      return { ...vars, I, steps };
    }
    if (vars.I !== undefined && vars.R !== undefined && vars.V === undefined) {
      const V = vars.I * vars.R;
      steps.push(`V = I × R = ${vars.I} × ${vars.R} = ${formatNum(V)} V`);
      return { ...vars, V, steps };
    }
    steps.push("Need exactly 2 known values to solve");
    return { ...vars, steps };
  }

  /**
   * Solve P = V * I (Power equation)
   */
  static solvePowerEq(vars: { P?: number; V?: number; I?: number }): {
    P?: number; V?: number; I?: number; steps: string[];
  } {
    const steps: string[] = ["Power Law: P = V × I"];
    if (vars.V !== undefined && vars.I !== undefined && vars.P === undefined) {
      const P = vars.V * vars.I;
      steps.push(`P = ${vars.V} × ${vars.I} = ${formatNum(P)} W`);
      return { ...vars, P, steps };
    }
    if (vars.P !== undefined && vars.I !== undefined && vars.V === undefined) {
      const V = vars.P / vars.I;
      steps.push(`V = P / I = ${vars.P} / ${vars.I} = ${formatNum(V)} V`);
      return { ...vars, V, steps };
    }
    if (vars.P !== undefined && vars.V !== undefined && vars.I === undefined) {
      const I = vars.P / vars.V;
      steps.push(`I = P / V = ${vars.P} / ${vars.V} = ${formatNum(I)} A`);
      return { ...vars, I, steps };
    }
    return { ...vars, steps };
  }
}

// ── Dimensional Analysis ─────────────────────────

export interface DimVector {
  voltage: number;
  current: number;
  time: number;
  mass: number;
  length: number;
}

export const SI_BASE: Record<string, DimVector> = {
  V: { voltage: 1, current: 0, time: 0, mass: 0, length: 0 },
  A: { voltage: 0, current: 1, time: 0, mass: 0, length: 0 },
  W: { voltage: 1, current: 1, time: 0, mass: 0, length: 0 },
  ohm: { voltage: 1, current: -1, time: 0, mass: 0, length: 0 },
  Hz: { voltage: 0, current: 0, time: -1, mass: 0, length: 0 },
  s: { voltage: 0, current: 0, time: 1, mass: 0, length: 0 },
  ms: { voltage: 0, current: 0, time: 1, mass: 0, length: 0 },
  J: { voltage: 1, current: 1, time: 1, mass: 0, length: 0 },
};

// ── Helpers ──────────────────────────────────────

function evalSimpleExpr(expr: string, known: Record<string, number>): number | null {
  const trimmed = expr.trim();
  // Try to evaluate: A * B or A / B or A + B or just a variable or number
  const mulMatch = trimmed.match(/^(\w+)\s*\*\s*(\w+)$/);
  if (mulMatch) {
    const a = resolve(mulMatch[1], known);
    const b = resolve(mulMatch[2], known);
    if (a !== null && b !== null) return a * b;
  }
  const divMatch = trimmed.match(/^(\w+)\s*\/\s*(\w+)$/);
  if (divMatch) {
    const a = resolve(divMatch[1], known);
    const b = resolve(divMatch[2], known);
    if (a !== null && b !== null && b !== 0) return a / b;
  }
  const addMatch = trimmed.match(/^(\w+)\s*\+\s*(\w+)$/);
  if (addMatch) {
    const a = resolve(addMatch[1], known);
    const b = resolve(addMatch[2], known);
    if (a !== null && b !== null) return a + b;
  }
  const subMatch = trimmed.match(/^(\w+)\s*-\s*(\w+)$/);
  if (subMatch) {
    const a = resolve(subMatch[1], known);
    const b = resolve(subMatch[2], known);
    if (a !== null && b !== null) return a - b;
  }
  const single = resolve(trimmed, known);
  return single;
}

function resolve(token: string, known: Record<string, number>): number | null {
  if (token in known) return known[token];
  const n = Number(token);
  if (!isNaN(n)) return n;
  return null;
}

function formatNum(n: number): string {
  if (Number.isInteger(n)) return String(n);
  return parseFloat(n.toPrecision(6)).toString();
}
