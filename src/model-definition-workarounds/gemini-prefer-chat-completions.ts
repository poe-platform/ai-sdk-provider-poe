import type { ModelDefinitionWorkaround } from "./types.js";

/**
 * Google models must use chat completions — the openai-compatible provider
 * flushes unfinished tool calls on stream end, unlike @ai-sdk/openai responses.
 *
 * Moves /v1/chat/completions to the front of supported_endpoints for Google models.
 */
export const geminiPreferChatCompletions: ModelDefinitionWorkaround = (m) => {
  if (m.owned_by !== "Google") return m;
  const eps: string[] | undefined = m.supported_endpoints;
  if (!eps?.includes("/v1/chat/completions")) return m;
  return {
    ...m,
    supported_endpoints: ["/v1/chat/completions", ...eps.filter((e: string) => e !== "/v1/chat/completions")],
  };
};
