export type { ModelMiddleware, ProviderOptionsRecord } from "./types.js";

import type { LanguageModelV3 } from "@ai-sdk/provider";
import type { ModelMiddleware } from "./types.js";
import { withAnthropicCache } from "./anthropic-cache.js";
import { withPoeProviderOptions } from "./poe-provider-options.js";

const middlewares: ModelMiddleware[] = [
  withAnthropicCache,
  withPoeProviderOptions,
];

/** Apply all middlewares to a language model. */
export function withMiddlewares(model: LanguageModelV3): LanguageModelV3 {
  return middlewares.reduce((m, mw) => mw(m), model);
}

export { patchingFetch } from "./patch-output-text.js";
