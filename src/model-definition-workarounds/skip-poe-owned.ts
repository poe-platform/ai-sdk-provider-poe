import type { ModelDefinitionWorkaround } from "./types.js";

/** Exclude Poe-owned wrapper/assistant models. */
export const skipPoeOwned: ModelDefinitionWorkaround = (m) => {
  return m.owned_by === "Poe" ? null : m;
};
