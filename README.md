# ai-sdk-provider-poe

[Poe](https://poe.com) provider for the [Vercel AI SDK](https://ai-sdk.dev). Access Anthropic, OpenAI, Google, and other models through Poe's unified API.

## Installation

```bash
npm install ai-sdk-provider-poe
```

## Usage

```typescript
import { poe } from 'ai-sdk-provider-poe';
import { generateText } from 'ai';

const { text } = await generateText({
  model: poe('anthropic/claude-sonnet-4-20250514'),
  prompt: 'Hello!',
});
```

## Supported Models

Models are specified as `provider/model-id`:

| Prefix | Provider | Endpoint |
|--------|----------|----------|
| `anthropic/*` | Anthropic | `/messages` |
| `openai/*` | OpenAI | `/responses` |
| `*/*` | Default | `/chat/completions` |

### Examples

```typescript
// Anthropic
poe('anthropic/claude-sonnet-4-20250514')

// OpenAI
poe('openai/gpt-4o')

// Google (via OpenAI-compatible endpoint)
poe('google/gemini-2.0-flash')
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
