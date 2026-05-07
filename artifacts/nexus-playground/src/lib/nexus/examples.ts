export interface Example {
  id: string;
  title: string;
  description: string;
  code: string;
  category: "basics" | "engineering" | "ai" | "reactive" | "math";
}

export const EXAMPLES: Example[] = [
  {
    id: "hello",
    title: "Hello NEXUS",
    description: "Basic variable bindings and print",
    category: "basics",
    code: `// Hello NEXUS — your first program
let name = "NEXUS";
let version = 1;

print(name);
print("Version:", version);

// Arithmetic
let x = 10;
let y = 3;
let sum = x + y;
let product = x * y;

print("Sum:", sum);
print("Product:", product);
`,
  },
  {
    id: "control-flow",
    title: "Control Flow",
    description: "Functions, conditionals, and loops",
    category: "basics",
    code: `// NEXUS control flow examples

fn factorial(n) {
    if n <= 1 {
        return 1;
    }
    return n * factorial(n - 1);
}

fn fibonacci(n) {
    if n <= 1 { return n; }
    return fibonacci(n - 1) + fibonacci(n - 2);
}

// Test factorial
print("5! =", factorial(5));
print("10! =", factorial(10));

// Test fibonacci
print("fib(8) =", fibonacci(8));
print("fib(10) =", fibonacci(10));

// Conditional expression
let x = 42;
let result = if x > 100 {
    "large"
} else {
    "small"
};
print("Result:", result);
`,
  },
  {
    id: "ohm-law",
    title: "Ohm's Law",
    description: "Engineering unit literals and dimensional arithmetic",
    category: "engineering",
    code: `// Ohm's Law: V = I × R
// NEXUS tracks physical units — the type checker
// catches V + A as a compile-time error.

let voltage  = 12V;
let current  = 3A;
let resistance = 4ohm;

// Power: V × A = W  (unit identity known to type checker)
let power = voltage * current;
print("Power:", power);

// Verify Ohm's Law numerically
// I × R = V — A × Ω = V (another known identity)
let v_check = current * resistance;
print("V (via I×R):", v_check);

// Grid frequency and time constant
let frequency = 60Hz;
let period    = 100ms;
print("Grid frequency:", frequency);
print("Period:", period);

// Equation declaration (symbolic — for the solver)
equation OhmLaw {
    voltage = current * resistance
}

print("All units consistent ✓");
`,
  },
  {
    id: "equation-solver",
    title: "Equation Solver",
    description: "Symbolic equation solving with dimensional algebra",
    category: "math",
    code: `// NEXUS Equation Solver
// Declare symbolic relationships, then solve for unknowns.

// Declare Ohm's Law symbolically
equation OhmLaw {
    V = I * R
}

// Known values
let V = 12V;
let I = 3A;

// The runtime can solve for R:
//   R = V / I = 12 / 3 = 4 Ω
print("Solving OhmLaw for R given V=12V, I=3A");
print("  R = V / I =", 12 / 3, "ohm");

// Power equation
equation PowerLaw {
    P = V * I
}

let P = V * I;
print("Power P = V × I =", P);

// Rearrangements:
// If we know P and V, solve for I:
//   I = P / V = 36 / 12 = 3A
let P_val = 36;
let V_val = 12;
print("I = P / V =", P_val / V_val, "A");

// Energy from power × time
let t = 3600;   // 1 hour in seconds
print("Energy in 1hr =", P_val * t, "J");
`,
  },
  {
    id: "power-grid",
    title: "Power Grid Model",
    description: "Multi-source reactive power system with dimensional analysis",
    category: "engineering",
    code: `// Power Grid — multi-source energy system model

// Source definitions (kW = kilowatts)
let solar_output = 5kW;
let wind_output  = 3kW;
let grid_draw    = 2kW;

// Total generation — kW + kW = kW (same dimension ✓)
let total_gen = solar_output + wind_output;
print("Total generation:", total_gen);

// Efficiency factor (dimensionless scalar)
let efficiency = 0.92;
let usable_power = total_gen * efficiency;
print("Usable power:", usable_power);

// Load balance equation
equation PowerBalance {
    total_gen = load + grid_draw
}

// Frequency and stability
let grid_hz = 60Hz;
print("Grid frequency:", grid_hz);

// Reactive monitoring entity
entity GridMonitor {
    memory persistent

    skill balance_check {
        print("Checking grid balance...");
        return true;
    }

    react overload {
        predict grid_fault
    }
}

print("Grid model ready");
`,
  },
  {
    id: "battery-ai",
    title: "Battery AI Entity",
    description: "AI entity with persistent memory, skills, and reactive triggers",
    category: "ai",
    code: `// BatteryAI — intelligent energy management entity

entity BatteryAI {
    memory persistent

    skill diagnostics {
        let voltage = 12V;
        let current = 2A;
        let power   = voltage * current;
        print("Battery voltage:", voltage);
        print("Draw current:", current);
        print("Load power:", power);
        return true;
    }

    skill predict_health {
        let soc = 87;
        let cycles = 142;
        print("State of charge:", soc, "%");
        print("Charge cycles:", cycles);
        return true;
    }

    react voltage_drop {
        predict battery_failure
    }

    react overtemp {
        predict thermal_runaway
    }
}

// Sensor measuring voltage
sensor VoltageSensor {
    pin_A0
    frequency 10Hz
}

sensor CurrentSensor {
    pin_A1
    frequency 10Hz
}

print("BatteryAI initialized");
print("Sensors active");
`,
  },
  {
    id: "dimensional-algebra",
    title: "Dimensional Algebra",
    description: "Full engineering dimensional analysis — V, A, Ω, W, Hz",
    category: "math",
    code: `// Dimensional algebra — the type checker verifies every operation

// Base electrical quantities
let V  = 120V;     // voltage
let I  = 5A;       // current
let R  = 24ohm;    // resistance
let f  = 60Hz;     // frequency

// V * A = W  (power)
let P  = V * I;
print("Power P = V × I:", P);

// V / A = Ω  (resistance)
let R_calc = V / I;
print("Resistance V/I:", R_calc, "(expect 24)");

// A * Ω = V  (voltage)
let V_check = I * R;
print("Voltage I×R:", V_check, "(expect 120)");

// W / A = V  (derived voltage)
let V2 = P / I;
print("P/I:", V2, "(expect 120)");

// W / V = A  (derived current)
let I2 = P / V;
print("P/V:", I2, "(expect 5)");

// Power in kW
let P_kW = 5kW;
let P_MW = 1MW;

// kW + kW = kW (consistent ✓)
let total = P_kW + P_kW;
print("Total kW:", total);

equation FullOhm {
    V = I * R
}

print("All dimensional checks passed ✓");
`,
  },
  {
    id: "sensors",
    title: "Sensor Network",
    description: "IoT sensor definitions with units and frequencies",
    category: "reactive",
    code: `// Industrial sensor network in NEXUS

sensor TemperatureSensor {
    pin_B2
    frequency 10Hz
}

sensor PressureSensor {
    pin_B3
    frequency 5Hz
}

sensor CurrentSensor {
    pin_A1
    frequency 60Hz
}

sensor VoltageSensor {
    pin_A0
    frequency 60Hz
}

// Thresholds
let rated_voltage = 480V;
let rated_current = 20A;
let rated_power   = rated_voltage * rated_current;

print("Rated power:", rated_power);

// Monitoring entity
entity SensorMonitor {
    memory persistent

    skill calibrate {
        print("Calibrating all sensors...");
        return true;
    }

    skill health_check {
        print("All sensors nominal");
        return true;
    }

    react current_spike {
        predict motor_overload
    }

    react voltage_sag {
        predict supply_fault
    }
}

print("Sensor network initialized");
print("Monitoring 4 sensors at", 60Hz, "grid frequency");
`,
  },
  {
    id: "unit-error-demo",
    title: "Type Error Demo",
    description: "See the type checker catch unit mismatches at compile time",
    category: "math",
    code: `// Type Error Demo — unit mismatch detection
// The type checker catches these BEFORE runtime.

let voltage = 12V;
let current = 3A;

// ✓ VALID: V * A = W (type checker knows this)
let power = voltage * current;
print("Power:", power);

// ✗ ERROR: V + A is dimensionally invalid
// Uncomment the line below to see the type error:
// let bad = voltage + current;

// ✓ VALID: same dimension addition
let v1 = 5V;
let v2 = 7V;
let total_v = v1 + v2;
print("Total voltage:", total_v);

// ✓ VALID: scalar multiplication (dimensionless factor)
let efficiency = 0.9;
let usable = power * efficiency;
print("Usable power:", usable);

// ✓ VALID: V / A = Ω
let resistance = voltage / current;
print("Resistance:", resistance, "(4 ohm)");

print("Type checker: all checks passed ✓");
`,
  },
];
