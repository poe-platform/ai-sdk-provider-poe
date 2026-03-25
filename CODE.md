# ai-sdk-provider-poe/code

Utilities for model discovery and testing. Import from `ai-sdk-provider-poe/code` to keep the main provider import lean.

## Model Discovery

`fetchPoeModels()` calls the Poe `/v1/models` endpoint and returns model metadata including capabilities, pricing, and supported endpoints.

```typescript
import { fetchPoeModels } from 'ai-sdk-provider-poe/code';

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
