import { Router, type IRouter } from "express";
import { openai } from "@workspace/integrations-openai-ai-server";

const router: IRouter = Router();

const NEXUS_SYSTEM_PROMPT = `You are an AI assistant embedded in the NEXUS Language Playground.

NEXUS is an AI-native, reactive-graph programming language designed for engineering and IoT systems. It features:
- Engineering unit literals: 12V, 3A, 4ohm, 60Hz, 100ms, 5kW, etc.
- Dimensional type checking: V + A is a compile-time error; V * A = W is valid
- AI entities with persistent memory, skills, and reactive triggers
- Symbolic equation solving: equation OhmLaw { V = I * R }
- Hardware sensor definitions with frequencies
- React blocks for event-driven programming
- Predict calls: predict battery_failure (AI-powered predictions)

NEXUS syntax examples:
\`\`\`
let voltage = 12V;
let current = 3A;
let power = voltage * current;  // = 36W (V * A = W)

equation OhmLaw { V = I * R }

entity BatteryAI {
    memory persistent
    skill diagnose { print("Health:", 95); }
    react voltage_drop { predict battery_failure }
}

sensor TempSensor { pin_B2; frequency 10Hz }
\`\`\`

Be concise, technically precise, and always give working NEXUS code examples when relevant.
When asked to generate code, write idiomatic NEXUS. Keep answers focused and practical.`;

// POST /api/ai/chat — streaming NEXUS assistant
router.post("/chat", async (req, res) => {
  try {
    const { message, code, history } = req.body as {
      message: string;
      code?: string;
      history?: { role: "user" | "assistant"; content: string }[];
    };

    if (!message) {
      res.status(400).json({ error: "message is required" });
      return;
    }

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    const systemMessages: { role: "system"; content: string }[] = [
      { role: "system", content: NEXUS_SYSTEM_PROMPT },
    ];

    if (code?.trim()) {
      systemMessages.push({
        role: "system",
        content: `Current code in editor:\n\`\`\`nexus\n${code}\n\`\`\``,
      });
    }

    const chatHistory = (history ?? []).slice(-10); // last 10 turns for context
    const userMsg = { role: "user" as const, content: message };

    const stream = await openai.chat.completions.create({
      model: "gpt-5-mini",
      messages: [...systemMessages, ...chatHistory, userMsg],
      stream: true,
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        res.write(`data: ${JSON.stringify({ content })}\n\n`);
      }
    }

    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  } catch (err) {
    req.log.error({ err }, "AI chat error");
    res.write(`data: ${JSON.stringify({ error: "AI request failed" })}\n\n`);
    res.end();
  }
});

// POST /api/ai/predict — AI-powered NEXUS predict call resolution
router.post("/predict", async (req, res) => {
  try {
    const { entity, prediction, scope, skills } = req.body as {
      entity: string;
      prediction: string;
      scope?: Record<string, string>;
      skills?: string[];
    };

    if (!prediction) {
      res.status(400).json({ error: "prediction is required" });
      return;
    }

    const scopeText = scope
      ? Object.entries(scope)
          .map(([k, v]) => `  ${k} = ${v}`)
          .join("\n")
      : "  (no variables in scope)";

    const skillsText = skills?.length
      ? `Skills: ${skills.join(", ")}`
      : "No skills defined";

    const prompt = `You are the AI brain of a NEXUS entity named "${entity || "UnknownEntity"}".

The entity has been asked to make a prediction: predict ${prediction}

Current runtime context:
${scopeText}

${skillsText}

Generate a concise, realistic engineering prediction result. Be specific with numbers and units where relevant.
Format: 1-3 sentences maximum. No preamble. Just the prediction result as the entity would report it.`;

    const response = await openai.chat.completions.create({
      model: "gpt-5-mini",
      messages: [
        { role: "system", content: NEXUS_SYSTEM_PROMPT },
        { role: "user", content: prompt },
      ],
    });

    const result = response.choices[0]?.message?.content || "Prediction unavailable.";
    res.json({ prediction, entity, result });
  } catch (err) {
    req.log.error({ err }, "AI predict error");
    res.status(500).json({ error: "Prediction failed" });
  }
});

export default router;
