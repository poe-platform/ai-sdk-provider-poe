export type { RawModel, ModelDefinitionWorkaround } from "./types.js";

import type { RawModel, ModelDefinitionWorkaround } from "./types.js";
import { addMissingTextOutput } from "./add-missing-text-output.js";
import { geminiPreferChatCompletions } from "./gemini-prefer-chat-completions.js";

const workarounds: ModelDefinitionWorkaround[] = [
  addMissingTextOutput,
  geminiPreferChatCompletions,
];

/** Apply all model definition workarounds to raw API data. Returns null if model should be excluded. */
export function applyWorkarounds(model: RawModel): RawModel | null {
  for (const fn of workarounds) {
    const result = fn(model);
    if (result === null) return null;
    model = result;
  }
  return model;
}
