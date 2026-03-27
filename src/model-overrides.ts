export interface ModelOverride {
  skip?: string;
  skipTools?: string;
}

export const MODEL_OVERRIDES: Record<string, ModelOverride> = {
  // API reports tools but models reject them
  "gpt-4o-search":           { skipTools: "model rejects tools param" },
  "gpt-4o-mini-search":      { skipTools: "model rejects tools param" },
  "gpt-3.5-turbo-instruct":  { skipTools: "model rejects tools param" },
  "chatgpt-4o-latest":       { skipTools: "model rejects tools param" },

  // Pro models — too slow for CI
  "gpt-5-pro":              { skip: "too slow" },
  "gpt-5.2-pro":            { skip: "too slow" },
  "gpt-5.4-pro":            { skip: "too slow" },
  "o1-pro":                 { skip: "too slow" },
  "o3-pro":                 { skip: "too slow" },

  // Unreliable tool calling
  "gemini-2.0-flash-lite":    { skipTools: "tool calling unreliable" },

  // Unreliable in CI
  "sora-2":                   { skip: "transient server errors" },

  // Models that take too long or need special capabilities
  "o4-mini-deep-research":  { skip: "takes too long" },
  "o3-deep-research":       { skip: "takes too long" },
  "gemini-deep-research":   { skip: "requires built-in tools" },
  "lyria":                  { skip: "audio model" },
  "nano-banana-pro":        { skip: "Poe reasoning output missing summary field" },
  "nano-banana-2":          { skip: "image gen, too slow" },
  "gpt-4-classic-0314":     { skip: "deprecated" },
};
