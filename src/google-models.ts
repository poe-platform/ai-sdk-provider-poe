export interface GoogleModelDef {
  route?: "chat";
  tools?: false;
  skip?: string;
  timeout?: number;
  tags?: string[];
}

/** Defaults: route=responses, tools=true. Only specify deviations. */
export const GOOGLE_MODELS: Record<string, GoogleModelDef> = {
  // Nano-Banana — responses API
  "nano-banana":         { tools: false },
  "nano-banana-pro":     { tools: false, skip: "Poe reasoning output missing summary field" },

  // Nano-Banana chat completions variants
  "nano-banana-cc":      { route: "chat", tools: false },
  "nano-banana-pro-cc":  { route: "chat", tools: false },

  // Gemini 3 — responses API (tools broken: Poe omits text field in tool response output)
  "gemini-3.1-pro":      { tools: false, tags: ["timeout:slow"] },
  "gemini-3-flash":      { tools: false },

  // Gemini 2.x — chat completions
  "gemini-2.5-pro":      { route: "chat" },
  "gemini-2.5-flash":    { route: "chat" },
  "gemini-2.5-flash-lite": { route: "chat" },
  "gemini-2.0-flash":    { route: "chat" },
  "gemini-2.0-flash-lite": { route: "chat", tools: false },
  "gemini-deep-research": { route: "chat", tools: false, skip: "requires built-in tools" },

  // Image generation — chat completions
  "imagen-4-ultra":      { route: "chat", tools: false, tags: ["timeout:image"] },
  "imagen-4":            { route: "chat", tools: false, tags: ["timeout:image"] },
  "imagen-4-fast":       { route: "chat", tools: false, tags: ["timeout:image"] },
  "imagen-3":            { route: "chat", tools: false, tags: ["timeout:image"] },
  "imagen-3-fast":       { route: "chat", tools: false, tags: ["timeout:image"] },

  // Video generation — chat completions
  "veo-3.1":             { route: "chat", tools: false, tags: ["timeout:video"] },
  "veo-3.1-fast":        { route: "chat", tools: false, tags: ["timeout:video"] },
  "veo-3":               { route: "chat", tools: false, tags: ["timeout:video"] },
  "veo-3-fast":          { route: "chat", tools: false, tags: ["timeout:video"] },
  "veo-2":               { route: "chat", tools: false, tags: ["timeout:video"] },

  // Audio generation — chat completions
  "lyria":               { route: "chat", tools: false, skip: "audio model incompatible with text prompts" },
};
