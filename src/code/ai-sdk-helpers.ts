export type AiSdkToolChoice =
  | "auto"
  | "none"
  | "required"
  | { type: "tool"; toolName: string }
  | undefined;

interface OpenAIToolChoiceLike {
  type?: string;
  function?: { name?: string };
}

export function mapToolChoice(
  toolChoice: string | OpenAIToolChoiceLike | null | undefined,
): AiSdkToolChoice {
  if (!toolChoice) return undefined;

  if (typeof toolChoice === "string") {
    switch (toolChoice) {
      case "auto":
        return "auto";
      case "none":
        return "none";
      case "required":
        return "required";
      default:
        return "auto";
    }
  }

  if (toolChoice.type === "function" && toolChoice.function?.name) {
    return { type: "tool", toolName: toolChoice.function.name };
  }

  return undefined;
}

export interface UsageMetrics {
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens?: number;
  cacheWriteTokens?: number;
  reasoningTokens?: number;
}

/** Structural subset of AI SDK's LanguageModelUsage accepted by extractUsageMetrics. */
export interface LanguageModelUsageLike {
  inputTokens: number;
  outputTokens: number;
  cachedInputTokens?: number;
  reasoningTokens?: number;
  inputTokenDetails?: {
    cacheReadTokens?: number;
    cacheWriteTokens?: number;
  };
  outputTokenDetails?: {
    reasoningTokens?: number;
  };
  raw?: unknown;
}

function findNumber(sources: unknown[], paths: string[][]): number | undefined {
  const records: Record<string, unknown>[] = [];

  const visit = (value: unknown) => {
    if (!value || typeof value !== "object" || Array.isArray(value)) return;
    const record = value as Record<string, unknown>;
    records.push(record);
    for (const nested of Object.values(record)) visit(nested);
  };

  for (const source of sources) visit(source);

  for (const record of records) {
    for (const path of paths) {
      let value: unknown = record;
      for (const key of path) {
        value = (value as Record<string, unknown> | undefined)?.[key];
      }
      if (typeof value === "number") return value;
    }
  }

  return undefined;
}

export function extractUsageMetrics(
  usage: LanguageModelUsageLike,
  providerMetadata?: Record<string, unknown>,
): UsageMetrics {
  const inputTokenDetails = usage.inputTokenDetails ?? {};
  const outputTokenDetails = usage.outputTokenDetails ?? {};

  const cacheReadTokens =
    inputTokenDetails.cacheReadTokens ??
    usage.cachedInputTokens ??
    findNumber([providerMetadata, usage.raw], [
      ["cacheReadTokens"],
      ["cache_read_input_tokens"],
      ["cached_tokens"],
      ["prompt_tokens_details", "cached_tokens"],
      ["input_tokens_details", "cached_tokens"],
      ["inputTokenDetails", "cacheReadTokens"],
    ]);

  const cacheWriteTokens =
    inputTokenDetails.cacheWriteTokens ??
    findNumber([providerMetadata, usage.raw], [
      ["cacheWriteTokens"],
      ["cache_creation_input_tokens"],
      ["cache_write_tokens"],
      ["inputTokenDetails", "cacheWriteTokens"],
    ]);

  const reasoningTokens =
    outputTokenDetails.reasoningTokens ??
    usage.reasoningTokens ??
    findNumber([providerMetadata, usage.raw], [
      ["reasoningTokens"],
      ["reasoning_tokens"],
      ["completion_tokens_details", "reasoning_tokens"],
      ["output_tokens_details", "reasoning_tokens"],
      ["outputTokenDetails", "reasoningTokens"],
    ]);

  return {
    inputTokens: usage.inputTokens || 0,
    outputTokens: usage.outputTokens || 0,
    ...(typeof cacheReadTokens === "number" ? { cacheReadTokens } : {}),
    ...(typeof cacheWriteTokens === "number" ? { cacheWriteTokens } : {}),
    ...(typeof reasoningTokens === "number" ? { reasoningTokens } : {}),
  };
}
