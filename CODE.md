# ai-sdk-provider-poe/code

Utilities for model discovery and testing. This subpath is intended for Roo-facing capability checks while keeping the main provider import minimal.

## Model Discovery

Use `getModel()` for a single model or `getModels()` to inspect the full normalized catalog.

```typescript
import { getModel, getModels } from 'ai-sdk-provider-poe/code';

const o3 = getModel('openai/o3');
const models = getModels();

console.log(o3?.supportsReasoningEffort); // true | ["low", "medium", "high"]
console.log(models.length);
```

For Roo-style capability checks, pair `getModel()` with `providerOptions.poe` on the main provider:

```typescript
import { poe } from "ai-sdk-provider-poe";
import { getModel } from "ai-sdk-provider-poe/code";

const model = getModel("anthropic/claude-sonnet-4");

const providerOptions =
  model?.supportsReasoningBudget
    ? { poe: { reasoningBudgetTokens: 5000 } }
    : model?.supportsReasoningEffort
      ? { poe: { reasoningEffort: "high", reasoningSummary: "auto" } }
      : undefined;
```

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

## Dev Tools

### Model Inspector

```sh
npm run dev:models                           # web dashboard
npm run dev:models -- --json                 # all models JSON (agent-readable)
npm run dev:models -- --json <model-id>      # single model JSON
npm run dev:models -- --cli                  # summary table
npm run dev:models -- --cli <model-id>       # single model detail
```

Web mode opens `http://localhost:3456` with:
- HTML dashboard: full pipeline view per model (raw → `/code` → Roo-Code)
- JSON API at `/api/models` for programmatic consumption
- `PORT` env var to change port
