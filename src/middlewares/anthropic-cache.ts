import type { LanguageModelV3, LanguageModelV3Message } from "@ai-sdk/provider";
import { wrapLanguageModel } from "ai";
import type { ProviderOptionsRecord } from "./types.js";

const EPHEMERAL = { cacheControl: { type: "ephemeral" } };

function withCacheControl(msg: LanguageModelV3Message): LanguageModelV3Message {
  const existing = msg.providerOptions?.anthropic as Record<string, unknown> | undefined;
  if (existing?.cacheControl) return msg;
  return {
    ...msg,
    providerOptions: {
      ...msg.providerOptions,
      anthropic: { ...existing, ...EPHEMERAL },
    },
  };
}

function withLastTextPartCacheControl(msg: LanguageModelV3Message): LanguageModelV3Message {
  if (msg.role !== "user") return msg;
  const parts = [...msg.content];
  for (let i = parts.length - 1; i >= 0; i--) {
    const part = parts[i];
    if (part.type === "text") {
      const existing = part.providerOptions?.anthropic as Record<string, unknown> | undefined;
      if (existing?.cacheControl) break;
      parts[i] = {
        ...part,
        providerOptions: {
          ...part.providerOptions,
          anthropic: { ...existing, ...EPHEMERAL },
        },
      };
      break;
    }
  }
  return { ...msg, content: parts } as LanguageModelV3Message;
}

export function withAnthropicCache(model: LanguageModelV3): LanguageModelV3 {
  if (model.provider !== "anthropic.messages") return model;

  return wrapLanguageModel({
    model,
    middleware: {
      specificationVersion: "v3",
      transformParams: async ({ params }) => {
        const poe = (params.providerOptions as ProviderOptionsRecord)?.poe as Record<string, unknown> | undefined;
        if (poe?.cache === false) return params;

        const prompt = params.prompt.map((msg) => {
          if (msg.role === "system") return withCacheControl(msg);
          return msg;
        });

        // Mark last 2 user messages
        let userCount = 0;
        for (let i = prompt.length - 1; i >= 0 && userCount < 2; i--) {
          if (prompt[i].role === "user") {
            prompt[i] = withLastTextPartCacheControl(prompt[i]);
            userCount++;
          }
        }

        return { ...params, prompt };
      },
    },
  });
}
