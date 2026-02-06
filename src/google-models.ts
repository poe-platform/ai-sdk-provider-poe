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
  "nano-banana":         { tools: false, tags: ["stage:alpha"] },
  "nano-banana-pro":     { tools: false, tags: ["stage:alpha"], skip: "Poe reasoning output missing summary field" },

  // Nano-Banana chat completions variants
  "nano-banana-cc":      { route: "chat", tools: false, tags: ["stage:alpha"] },
  "nano-banana-pro-cc":  { route: "chat", tools: false, tags: ["stage:alpha"] },

  // Gemini text models — chat completions
  "gemini-3-pro":        { route: "chat", tags: ["timeout:slow"] },
  "gemini-3-flash":      { route: "chat" },
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
