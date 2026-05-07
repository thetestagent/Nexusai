export interface Example {
  id: string;
  title: string;
  description: string;
  code: string;
  category: "basics" | "engineering" | "ai" | "reactive";
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
    id: "ohm-law",
    title: "Ohm's Law",
    description: "Engineering unit literals and dimensional arithmetic",
    category: "engineering",
    code: `// Ohm's Law: V = I * R
// NEXUS tracks physical units automatically

let voltage = 12V;
let current = 3A;
let resistance = 4ohm;

// Power calculation: P = V * I (V * A = W is a known identity)
let power = voltage * current;
print("Power:", power);

// Verify: P = I² * R
let power2 = current * current * resistance;
print("Power (alt):", power2);

// Frequency of a circuit
let frequency = 60Hz;
print("Grid frequency:", frequency);

// Time constants
let period = 100ms;
print("Period:", period);

equation OhmLaw {
    voltage = current * resistance
}
`,
  },
  {
    id: "battery-ai",
    title: "Battery AI Entity",
    description: "AI entities with persistent memory and reactive triggers",
    category: "ai",
    code: `// BatteryAI — an intelligent energy management entity
// Entities can have persistent memory across restarts

entity BatteryAI {
    memory persistent

    skill diagnostics {
        let voltage = 12V;
        let health = 95;
        print("Voltage:", voltage);
        print("Health:", health);
        return true;
    }

    react voltage_drop {
        predict battery_failure
    }
}

// Sensor reading simulation
sensor VoltageSensor {
    pin_A0
}

// Run diagnostics
print("BatteryAI initialized");
`,
  },
  {
    id: "power-grid",
    title: "Power Grid Model",
    description: "Multi-entity reactive power system simulation",
    category: "engineering",
    code: `// Power Grid — multi-source energy system model

// Source definitions
let solar_output = 5kW;
let wind_output = 3kW;
let grid_draw = 2kW;

// Total generation
let total_gen = solar_output + wind_output;
print("Total generation:", total_gen);

// Load balance equation
equation PowerBalance {
    total_gen = load + grid_draw
}

// Efficiency factor
let efficiency = 0.92;
let usable_power = total_gen * efficiency;
print("Usable power:", usable_power);

// Reactive entity monitors the grid
entity GridMonitor {
    memory persistent

    skill balance_check {
        print("Checking grid balance...");
        return true;
    }
}

print("Grid model ready");
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

fn is_prime(n) {
    if n < 2 { return false; }
    let i = 2;
    for i in n {
        if i * i > n { return true; }
        if n % i == 0 { return false; }
    }
    return true;
}

// Test factorial
print("5! =", factorial(5));
print("10! =", factorial(10));

// Test with boolean logic
let x = 42;
let result = if x > 100 {
    "large"
} else {
    "small"
};
print("Result:", result);

// Arithmetic
let voltage = 12V;
let doubled = voltage * 2;
print("Doubled voltage:", doubled);
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

// Thresholds
let max_temp = 85;
let min_pressure = 100;
let rated_current = 20A;

// Monitoring entity
entity SensorMonitor {
    memory persistent

    skill calibrate {
        print("Calibrating all sensors...");
        return true;
    }

    react current_spike {
        predict motor_overload
    }
}

print("Sensor network initialized");
print("Monitoring", 3, "sensors");
`,
  },
];
