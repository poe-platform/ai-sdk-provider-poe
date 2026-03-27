# ai-sdk-provider-poe

[Poe](https://poe.com) provider for the [Vercel AI SDK](https://ai-sdk.dev).

Access Anthropic, OpenAI, Google, xAI, and 50+ other AI models through a single Poe API key.

## Setup

```bash
npm install ai-sdk-provider-poe ai
```

```bash
export POE_API_KEY="your-poe-api-key"
```

Get an API key from [poe.com/api_key](https://poe.com/api/keys).

## Usage

### Basic text generation

```typescript
import { poe } from 'ai-sdk-provider-poe';
import { generateText } from 'ai';

const { text } = await generateText({
  model: poe('anthropic/claude-sonnet-4'),
  prompt: 'Hello!',
});
```

### Reasoning with Anthropic (Claude Opus 4.6)

Anthropic models use `reasoningBudgetTokens` to control the thinking budget.

```typescript
const { text, reasoning } = await generateText({
  model: poe('anthropic/claude-opus-4.6'),
  prompt: 'Solve this step by step: what is 17 * 19?',
  providerOptions: {
    poe: { reasoningBudgetTokens: 5000 },
  },
});
```

### Reasoning with OpenAI (GPT-5.4)

OpenAI models use `reasoningEffort` and `reasoningSummary`.

```typescript
const { text, reasoning } = await generateText({
  model: poe('openai/gpt-5.4'),
  prompt: 'Solve this step by step: what is 17 * 19?',
  providerOptions: {
    poe: { reasoningEffort: 'high', reasoningSummary: 'auto' },
  },
});
```

### Reasoning with Google (Gemini 3.1 Pro)

```typescript
const { text } = await generateText({
  model: poe('google/gemini-3.1-pro'),
  prompt: 'Solve this step by step: what is 17 * 19?',
  providerOptions: {
    poe: { reasoningEffort: 'high' },
  },
});
```

### Reasoning with xAI (Grok 4)

```typescript
const { text } = await generateText({
  model: poe('grok-4-fast-reasoning'),
  prompt: 'Solve this step by step: what is 17 * 19?',
  providerOptions: {
    poe: { reasoningEffort: 'high' },
  },
});
```

### Tool calling

```typescript
import { generateText, tool } from 'ai';
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

## Provider Options

`providerOptions.poe` routes reasoning settings to the correct backend automatically:

| Option | Backend mapping | Use with |
|---|---|---|
| `reasoningBudgetTokens` | `anthropic.thinking.budgetTokens` | Claude models |
| `reasoningEffort` | `openai.reasoningEffort` | OpenAI, Google, xAI |
| `reasoningSummary` | `openai.reasoningSummary` | OpenAI `/v1/responses` models |

## Model Routing

Routing is resolved automatically from each model's `supported_endpoints`. The model catalog is bundled and refreshed at runtime via `/v1/models`.

For the full model list, visit [poe.com/api/models](https://poe.com/api/models).

## Configuration

```typescript
import { createPoe } from 'ai-sdk-provider-poe';

const poe = createPoe({
  apiKey: 'your-poe-api-key',           // default: POE_API_KEY env var
  baseURL: 'https://api.poe.com/v1',    // default
});
```

## License

MIT
