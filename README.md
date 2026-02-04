# ai-sdk-provider-poe

[Poe](https://poe.com) provider for the [Vercel AI SDK](https://ai-sdk.dev).

Access Anthropic, OpenAI, Google, and other AI models through a single Poe API key. This provider routes requests to the appropriate backend based on model prefix, using the official first-party AI SDK providers under the hood.

## Setup

```bash
npm install ai-sdk-provider-poe ai
```

Set your Poe API key as an environment variable:

```bash
export POE_API_KEY="your-poe-api-key"
```

You can get an API key from [poe.com/api_key](https://poe.com/api_key).

## Usage

```typescript
import { poe } from 'ai-sdk-provider-poe';
import { generateText } from 'ai';

const { text } = await generateText({
  model: poe('anthropic/claude-sonnet-4-20250514'),
  prompt: 'Hello!',
});
```

## Model Routing

For a full list of available models, visit [poe.com/api/models](https://poe.com/api/models) or see the [API endpoint](https://api.poe.com/v1/models).

Models are specified as `provider/model-id`. The provider prefix determines which API endpoint handles the request:

| Prefix | Route | API Endpoint |
|---|---|---|
| `anthropic/` | Anthropic Messages API | `/v1/messages` |
| `openai/` | OpenAI Responses API | `/v1/responses` |
| Any other prefix or no prefix | OpenAI Chat Completions API | `/v1/chat/completions` |

```typescript
// Anthropic
poe('anthropic/claude-sonnet-4-20250514')

// OpenAI
poe('openai/gpt-4o')

// Google (via OpenAI-compatible chat completions)
poe('google/gemini-2.0-flash')

// Poe model names (no prefix, routes to chat completions)
poe('Claude-Sonnet-4.5')
poe('GPT-4o')
poe('Gemini-2.5-Pro')
```

## Features

### Tool Calling

```typescript
import { generateText, tool } from 'ai';
import { poe } from 'ai-sdk-provider-poe';
import { z } from 'zod';

const { text, toolResults } = await generateText({
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

## Configuration

```typescript
import { createPoe } from 'ai-sdk-provider-poe';

const poe = createPoe({
  apiKey: 'your-poe-api-key',    // default: POE_API_KEY env var
  baseURL: 'https://api.poe.com/v1',
  headers: { 'X-Custom': 'value' },
});
```

## License

MIT
