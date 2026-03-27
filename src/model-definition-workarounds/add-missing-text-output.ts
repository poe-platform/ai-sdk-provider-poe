import type { ModelDefinitionWorkaround } from "./types.js";

/**
 * API reports output_modalities: ["image"] but these models produce text.
 * No-op when "text" is already present — safe to keep after upstream fix.
 */
const MODELS = new Set(["gpt-5.4", "gpt-5.4-mini", "gpt-5.4-nano", "gpt-5.4-pro"]);

export const addMissingTextOutput: ModelDefinitionWorkaround = (m) => {
  if (!MODELS.has(m.id)) return m;
  const arch = m.architecture;
  const om: string[] | undefined = arch?.output_modalities;
  if (om && !om.includes("text")) {
    return { ...m, architecture: { ...arch, output_modalities: ["text", ...om] } };
  }
  return m;
};
