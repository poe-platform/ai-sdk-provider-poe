import { describe, it, expect } from "vitest";
import { generateText } from "ai";
import { createPoe } from "../poe-provider.js";
import { MODEL_OVERRIDES } from "../model-overrides.js";
import { getModels } from "./models.js";
import { getSnapshotFetch } from "../test/index.js";

const poe = createPoe({
  fetch: getSnapshotFetch(),
});

const models = getModels();

describe("reasoning: budget (anthropic thinking)", () => {
  for (const m of models.filter(m => m.supportsReasoningBudget)) {
    const run = MODEL_OVERRIDES[m.rawId]?.skip ? it.skip : it;

    run(`${m.rawId} produces reasoning with budget`, { tags: ["timeout:reasoning"] }, async () => {
      const { text, reasoning } = await generateText({
        model: poe(m.id),
        prompt: "What is 7 * 8?",
        providerOptions: {
          anthropic: {
            thinking: { type: "enabled", budgetTokens: 5000 },
          },
        },
      });

      expect(text).toBeTruthy();
      expect(text).toContain("56");
      expect(reasoning).toBeTruthy();
    });
  }
});

describe("reasoning: effort (openai responses)", () => {
  for (const m of models.filter(m => m.supportsReasoningEffort)) {
    const run = MODEL_OVERRIDES[m.rawId]?.skip ? it.skip : it;

    run(`${m.rawId} produces reasoning with effort`, { tags: ["timeout:reasoning"] }, async () => {
      const { text, reasoning } = await generateText({
        model: poe(m.id),
        prompt: "What is 7 * 8?",
      });

      expect(text).toBeTruthy();
      expect(text).toContain("56");
      expect(reasoning).toBeTruthy();
    });
  }
});
