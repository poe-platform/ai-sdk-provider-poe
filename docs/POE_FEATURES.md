# Poe API Features with AI SDK

## Passing Extra Body Parameters

The Poe API supports additional parameters like `enable_thinking`, `thinking_level`, and `web_search` via the request body. In the AI SDK, these are passed using `experimental_providerMetadata`:

```typescript
import { generateText } from "ai";
import { poe } from "ai-sdk-provider-poe";

const { text } = await generateText({
  model: poe("gemini-3-pro"),
  prompt: "Your prompt here",
  experimental_providerMetadata: {
    openai: {
      thinking_level: "high",
      web_search: true,
    },
  },
});
```

### Supported Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `enable_thinking` | boolean | Enable thinking mode (Kimi models) |
| `thinking_level` | string | Thinking intensity: "low", "medium", "high" (Gemini models) |
| `web_search` | boolean | Enable web search capability |

### Why `experimental_providerMetadata`?

The AI SDK's `generateText` function has a fixed API. The `experimental_providerMetadata` option is the standard way to pass provider-specific parameters. The `openai` key is used because our provider uses the OpenAI-compatible chat completions endpoint.

### Future Improvement

A cleaner API could be supported at model creation time:

```typescript
// Potential future API (not yet implemented)
poe("gemini-3-pro", { thinking_level: "high", web_search: true })
```

This would require extending the provider to accept model-level options.

---

## Reasoning / Thinking Output

### What Poe Returns

When `thinking_level` is enabled, the Poe API returns reasoning in the response:

```json
{
  "choices": [{
    "message": {
      "role": "assistant",
      "content": "Final answer here...",
      "reasoning": "Step-by-step thinking process...",
      "reasoning_content": "Step-by-step thinking process..."
    }
  }],
  "usage": {
    "completion_tokens": 1442,
    "completion_tokens_details": {
      "reasoning_tokens": 142
    }
  }
}
```

### What AI SDK Exposes

The AI SDK's OpenAI provider **does not** parse the `reasoning` or `reasoning_content` fields from the response. It only exposes:

```typescript
const { text, providerMetadata } = await generateText({...});

// providerMetadata contains:
{
  openai: {
    reasoningTokens: 142  // Token count only, not the actual reasoning text
  }
}
```

### Accessing Reasoning Text

Currently, the reasoning text is **not accessible** through the AI SDK. Options to access it:

1. **Use raw fetch**: Bypass AI SDK and call Poe API directly
2. **Extend the provider**: Fork `@ai-sdk/openai` to parse reasoning fields
3. **Wait for AI SDK update**: The AI SDK may add reasoning support in future versions

### Workaround: Direct API Call

```typescript
const response = await fetch("https://api.poe.com/v1/chat/completions", {
  method: "POST",
  headers: {
    "Authorization": `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    model: "gemini-3-pro",
    messages: [{ role: "user", content: "Your prompt" }],
    thinking_level: "high",
  }),
});

const data = await response.json();
const reasoning = data.choices[0].message.reasoning;
const content = data.choices[0].message.content;
```

---

## Models Without Prefix

Models can be specified with or without a provider prefix:

```typescript
// With prefix - routes based on prefix
poe("anthropic/claude-sonnet-4")  // -> Anthropic messages API
poe("openai/gpt-4o")              // -> OpenAI responses API
poe("google/gemini-2.0-flash")    // -> OpenAI chat completions

// Without prefix - direct to chat completions
poe("Kimi-K2.5")                  // -> OpenAI chat completions
poe("gemini-3-pro")               // -> OpenAI chat completions
```

Models without `/` are sent directly to the chat completions endpoint with the full model name preserved.
