import type { LanguageModelV3 } from "@ai-sdk/provider";

type ModelTransform = (model: LanguageModelV3) => LanguageModelV3;

const workarounds: ModelTransform[] = [];

export function withWorkarounds(model: LanguageModelV3): LanguageModelV3 {
  return workarounds.reduce((m, w) => w(m), model);
}
