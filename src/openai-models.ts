export interface OpenAIModelDef {
  route?: "chat";
  tools?: false;
  reasoning?: true;
  skip?: string;
  timeout?: number;
  tags?: string[];
}

/** Defaults: route=responses, tools=true. Only specify deviations. */
export const OPENAI_MODELS: Record<string, OpenAIModelDef> = {
  // GPT-5.2
  "gpt-5.2":            {},
  "gpt-5.2-pro":        {},
  "gpt-5.2-instant":    {},
  "gpt-5.2-codex":      {},

  // GPT-5.1
  "gpt-5.1":            {},
  "gpt-5.1-instant":    {},
  "gpt-5.1-codex":      {},
  "gpt-5.1-codex-max":  {},
  "gpt-5.1-codex-mini": {},

  // GPT-5
  "gpt-5":              {},
  "gpt-5-pro":          { timeout: 300_000 },
  "gpt-5-mini":         {},
  "gpt-5-nano":         {},
  "gpt-5-chat":         {},
  "gpt-5-codex":        {},

  // O-series
  "o4-mini":            { reasoning: true },
  "o3":                 { reasoning: true },
  "o3-pro":             { reasoning: true },
  "o3-mini":            { reasoning: true },
  "o3-mini-high":       { reasoning: true },
  "o1":                 { reasoning: true },
  "o1-pro":             { reasoning: true },
  "o4-mini-deep-research": { skip: "takes too long" },
  "o3-deep-research":      { skip: "takes too long" },

  // GPT-4.1
  "gpt-4.1":            {},
  "gpt-4.1-mini":       {},
  "gpt-4.1-nano":       {},

  // GPT-4o
  "gpt-4o":             {},
  "gpt-4o-mini":        {},
  "gpt-4o-aug":         {},
  "chatgpt-4o-latest":  { tools: false },

  // Legacy — chat completions only
  "gpt-4o-search":           { route: "chat", tools: false },
  "gpt-4o-mini-search":      { route: "chat", tools: false },
  "gpt-4-turbo":             { route: "chat" },
  "gpt-4-classic":           { route: "chat" },
  "gpt-4-classic-0314":      { route: "chat", tools: false },
  "gpt-3.5-turbo":           { route: "chat" },
  "gpt-3.5-turbo-raw":       { route: "chat" },
  "gpt-3.5-turbo-instruct":  { route: "chat", tools: false },

  // Multimedia — chat completions only
  "gpt-image-1.5":     { route: "chat", tools: false },
  "gpt-image-1":       { route: "chat", tools: false },
  "gpt-image-1-mini":  { route: "chat", tools: false },
  "dall-e-3":          { route: "chat", tools: false },
  "sora-2":            { route: "chat", tools: false },
  "sora-2-pro":        { route: "chat", tools: false, timeout: 300_000 },
};
