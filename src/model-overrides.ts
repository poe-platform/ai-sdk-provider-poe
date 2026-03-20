export interface ModelOverride {
  skip?: string;
  skipTools?: string;
}

export const MODEL_OVERRIDES: Record<string, ModelOverride> = {
  // Poe bug: output_text missing text field on tool call responses
  "gemini-3.1-pro":        { skipTools: "Poe bug: output_text missing text field" },
  "gemini-3-flash":        { skipTools: "Poe bug: output_text missing text field" },
  "gemini-2.5-pro":        { skipTools: "Poe bug: output_text missing text field" },
  "gemini-2.5-flash":      { skipTools: "Poe bug: output_text missing text field" },
  "gemini-2.5-flash-lite": { skipTools: "Poe bug: output_text missing text field" },
  "gemini-2.0-flash":      { skipTools: "Poe bug: output_text missing text field" },
  "gemini-2.0-flash-lite": { skipTools: "Poe bug: output_text missing text field" },
  "gemini-3.1-flash-lite": { skipTools: "Poe bug: output_text missing text field" },

  // API reports tools but models reject them
  "gpt-4o-search":           { skipTools: "model rejects tools param" },
  "gpt-4o-mini-search":      { skipTools: "model rejects tools param" },
  "gpt-4-classic-0314":      { skipTools: "model rejects tools param" },
  "gpt-3.5-turbo-instruct":  { skipTools: "model rejects tools param" },
  "chatgpt-4o-latest":       { skipTools: "model rejects tools param" },

  // Pro models — too slow for CI
  "gpt-5-pro":              { skip: "too slow" },
  "gpt-5.2-pro":            { skip: "too slow" },
  "gpt-5.4-pro":            { skip: "too slow" },
  "o1-pro":                 { skip: "too slow" },
  "o3-pro":                 { skip: "too slow" },

  // Models that take too long or need special capabilities
  "o4-mini-deep-research":  { skip: "takes too long" },
  "o3-deep-research":       { skip: "takes too long" },
  "gemini-deep-research":   { skip: "requires built-in tools" },
  "lyria":                  { skip: "audio model" },
  "nano-banana-pro":        { skip: "Poe reasoning output missing summary field" },
  "nano-banana-2":          { skip: "image gen, too slow" },
};
