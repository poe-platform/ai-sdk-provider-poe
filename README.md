# ai-sdk-provider-poe

[Poe](https://poe.com) provider for the [Vercel AI SDK](https://ai-sdk.dev).

Access Anthropic, OpenAI, Google, and 50+ other AI models through a single Poe API key. This provider routes requests to the appropriate backend using the official first-party AI SDK providers under the hood.

## Setup

```bash
npm install ai-sdk-provider-poe ai
```

Set your Poe API key:

```bash
export POE_API_KEY="your-poe-api-key"
```

Get an API key from [poe.com/api_key](https://poe.com/api_key).

## Quick Start

```typescript
import { poe } from 'ai-sdk-provider-poe';
import { generateText } from 'ai';

const { text } = await generateText({
  model: poe('anthropic/claude-sonnet-4'),
  prompt: 'Hello!',
});
```

## Model Routing

Models are specified as `provider/model-id`. Routing is driven by the Poe `/v1/models` API — each model declares its `supported_endpoints`, and the provider picks the right backend automatically.

| Prefix | Route | Examples |
|---|---|---|
| `anthropic/` | Anthropic Messages API | `claude-sonnet-4`, `claude-opus-4.5` |
| `openai/`, `google/`, or no prefix | OpenAI Responses or Chat API | `gpt-5.2`, `o3`, `gemini-3-flash`, `grok-3-mini` |

For non-Anthropic models, the first entry in `supported_endpoints` determines the API:

- `/v1/responses` → OpenAI Responses API (reasoning-capable models)
- `/v1/chat/completions` → OpenAI Chat Completions API

This is resolved at runtime from a bundled model catalog that ships with the package. On provider creation, a background fetch to `/v1/models` refreshes the cache so newly added models are picked up without a package update.

```typescript
// Anthropic — Messages API with thinking support
poe('anthropic/claude-sonnet-4')

// OpenAI — Responses API (reasoning models)
poe('openai/gpt-5.2')
poe('openai/o3')

// OpenAI — Chat Completions
poe('openai/gpt-4o')

// Google — routed via supported_endpoints
poe('google/gemini-3-flash')

// Other providers (routed via supported_endpoints, fallback: chat completions)
poe('grok-3-mini')
poe('glm-5')
```

For the full list of models, visit [poe.com/api/models](https://poe.com/api/models) or call `fetchPoeModels()`.

## Features

### Extended Thinking (Anthropic)

```typescript
const { text, reasoning } = await generateText({
  model: poe('anthropic/claude-sonnet-4'),
  prompt: 'Solve this step by step: what is 123 * 456?',
  providerOptions: {
    anthropic: {
      thinking: { type: 'enabled', budgetTokens: 5000 },
    },
  },
});

console.log(reasoning); // model's chain of thought
console.log(text);      // final answer
```

### Tool Calling

```typescript
import { generateText, tool } from 'ai';
import { poe } from 'ai-sdk-provider-poe';
import { z } from 'zod';

const { text } = await generateText({
  model: poe('openai/gpt-5.2'),
  prompt: "What's the weather in San Francisco?",
  tools: {
    getWeather: tool({
      description: 'Get the weather for a location',
      parameters: z.object({ location: z.string() }),
      execute: async ({ location }) => `72°F and sunny in ${location}`,
    }),
  },
});
```

### Structured Output

```typescript
import { generateObject } from 'ai';
import { poe } from 'ai-sdk-provider-poe';
import { z } from 'zod';

const { object } = await generateObject({
  model: poe('openai/gpt-5.2'),
  prompt: 'Generate a recipe for chocolate cake',
  schema: z.object({
    name: z.string(),
    ingredients: z.array(z.string()),
    steps: z.array(z.string()),
  }),
});
```

## Model Discovery

`fetchPoeModels()` calls the Poe `/v1/models` endpoint and returns model metadata including capabilities, pricing, and supported endpoints. This is the same API used internally for routing.

```typescript
import { fetchPoeModels } from 'ai-sdk-provider-poe';

const models = await fetchPoeModels();

for (const model of models) {
  console.log(model.id);                    // "anthropic/claude-sonnet-4"
  console.log(model.supportedEndpoints);    // ["/v1/responses", "/v1/chat/completions"]
  console.log(model.contextWindow);         // 200000
  console.log(model.supportsReasoningBudget); // true
  console.log(model.pricing);               // { inputPerMillion: 3, ... }
}
```

Each model includes:

| Field | Type | Description |
|---|---|---|
| `id` | `string` | Prefixed model ID (e.g. `"anthropic/claude-sonnet-4"`) |
| `rawId` | `string` | Original API model ID (e.g. `"claude-sonnet-4"`) |
| `ownedBy` | `string?` | Provider name (e.g. `"Anthropic"`, `"OpenAI"`) |
| `contextWindow` | `number` | Max input tokens |
| `maxOutputTokens` | `number` | Max output tokens |
| `supportsImages` | `boolean` | Vision support |
| `supportsPromptCache` | `boolean` | Prompt caching support |
| `supportsReasoningBudget` | `boolean?` | Thinking budget support (Anthropic) |
| `supportsReasoningEffort` | `boolean \| string[]?` | Reasoning effort support (OpenAI) |
| `supportedEndpoints` | `string[]?` | API endpoints this model supports |
| `pricing` | `object?` | Per-million token pricing |

Pass options to customize the request:

```typescript
const models = await fetchPoeModels({
  apiKey: 'your-key',          // default: POE_API_KEY env var
  baseURL: 'https://custom.api.com/v1',
});
```

## Configuration

```typescript
import { createPoe } from 'ai-sdk-provider-poe';

const poe = createPoe({
  apiKey: 'your-poe-api-key',           // default: POE_API_KEY env var
  baseURL: 'https://api.poe.com/v1',    // default
  headers: { 'X-Custom': 'value' },
});
```

## License

MIT
