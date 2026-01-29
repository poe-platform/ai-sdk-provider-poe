# ai-sdk-provider-poe

AI SDK provider for Poe that proxies to first-party providers (Anthropic, OpenAI, Google) via Poe's API endpoints.

## Architecture

**Approach:** Proxy to native first-party SDKs with Poe's base URL and API key. This yields better quality than transforming requests ourselves.

**Poe API Endpoints:**
- `api.poe.com/v1/messages` → Anthropic Messages API
- `api.poe.com/v1/responses` → OpenAI Responses API
- `api.poe.com/v1/chat/completions` → OpenAI Chat Completions (default fallback)

**Routing Logic:**

1. `anthropic/*` → Anthropic SDK → `/messages`
2. `openai/*` → OpenAI SDK → `/responses`
3. `*/*` (default) → strip prefix, pass to `/chat/completions`

```text
User -> poe provider -> anthropic/*  -> @ai-sdk/anthropic -> /messages
                     -> openai/*     -> @ai-sdk/openai    -> /responses
                     -> other/*      -> @ai-sdk/openai    -> /chat/completions (default)
```

## Dependencies

```json
{
  "dependencies": {
    "@ai-sdk/provider": "^1.0.0",
    "@ai-sdk/provider-utils": "^2.0.0",
    "@ai-sdk/anthropic": "^1.0.0",
    "@ai-sdk/openai": "^1.0.0"
  }
}
```

Note: No `@ai-sdk/google` needed - Google models route through OpenAI-compatible endpoint.

## Provider Configuration

All first-party SDKs support custom `baseURL` and `apiKey`:

```typescript
import { createAnthropic } from '@ai-sdk/anthropic';
import { createOpenAI } from '@ai-sdk/openai';

// Anthropic models -> /messages endpoint
const anthropic = createAnthropic({
  baseURL: 'https://api.poe.com/v1',
  apiKey: process.env.POE_API_KEY,
});

// OpenAI provider - single instance, two methods:
const openai = createOpenAI({
  baseURL: 'https://api.poe.com/v1',
  apiKey: process.env.POE_API_KEY,
});

// openai.responses('gpt-4o')  -> /responses
// openai('gpt-4o')            -> /chat/completions
```

## Implementation

### src/poe-provider.ts

```typescript
import { ProviderV3, LanguageModelV3 } from '@ai-sdk/provider';
import { loadApiKey, withoutTrailingSlash } from '@ai-sdk/provider-utils';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createOpenAI } from '@ai-sdk/openai';

export interface PoeProviderSettings {
  /**
   * Poe API key. Defaults to POE_API_KEY environment variable.
   */
  apiKey?: string;

  /**
   * Base URL for Poe API (default: https://api.poe.com/v1)
   */
  baseURL?: string;

  /**
   * Custom headers for requests.
   */
  headers?: Record<string, string>;
}

export interface PoeProvider extends ProviderV3 {
  (modelId: string): LanguageModelV3;
  languageModel(modelId: string): LanguageModelV3;
}

export function createPoe(options: PoeProviderSettings = {}): PoeProvider {
  const baseURL = withoutTrailingSlash(options.baseURL) ?? 'https://api.poe.com/v1';

  const getApiKey = () => loadApiKey({
    apiKey: options.apiKey,
    environmentVariableName: 'POE_API_KEY',
    description: 'Poe',
  });

  // Anthropic models -> hits /messages endpoint
  const anthropicProvider = createAnthropic({
    baseURL,
    apiKey: getApiKey(),
    headers: options.headers,
  });

  // OpenAI provider - supports both .responses() and regular chat completions
  const openaiProvider = createOpenAI({
    baseURL,
    apiKey: getApiKey(),
    headers: options.headers,
  });

  const languageModel = (modelId: string): LanguageModelV3 => {
    const [provider, ...modelParts] = modelId.split('/');
    const model = modelParts.join('/');

    switch (provider) {
      case 'anthropic':
        return anthropicProvider(model);
      case 'openai':
        // Use Responses API
        return openaiProvider.responses(model);
      default:
        // Default fallback: strip prefix, route to /chat/completions
        return openaiProvider(model);
    }
  };

  const provider = function (modelId: string) {
    if (new.target) {
      throw new Error('The Poe provider cannot be called with the new keyword.');
    }
    return languageModel(modelId);
  } as PoeProvider;

  provider.languageModel = languageModel;

  return provider;
}

// Default instance
export const poe = createPoe();
```

### Usage Example

```typescript
import { generateText } from 'ai';
import { poe } from 'ai-sdk-provider-poe';

// Anthropic -> /messages
const { text } = await generateText({
  model: poe('anthropic/claude-sonnet-4-20250514'),
  prompt: 'Hello!',
});

// OpenAI -> /responses
const { text } = await generateText({
  model: poe('openai/gpt-4o'),
  prompt: 'Hello!',
});

// Other providers -> /chat/completions (default)
const { text } = await generateText({
  model: poe('google/gemini-pro'),
  prompt: 'Hello!',
});
```

## Open Questions

1. ~~**Poe API Endpoints**~~ ✅ Resolved:
   - `api.poe.com/v1/messages` - Anthropic
   - `api.poe.com/v1/chat/completions` - OpenAI
   - `api.poe.com/v1/responses` - OpenAI Responses API
   - Google uses OpenAI-compatible `/chat/completions`

2. **Authentication** - Single POE_API_KEY for all providers? (assumed yes)

3. **Model ID Mapping** - Do Poe model IDs match the native provider IDs exactly, or is there a mapping needed?

## Project Structure

```text
ai-sdk-provider-poe/
├── src/
│   ├── index.ts           # Re-exports
│   └── poe-provider.ts    # Main provider implementation
├── package.json
├── tsconfig.json
└── README.md
```

### src/index.ts

```typescript
export { createPoe, poe } from './poe-provider';
export type { PoeProvider, PoeProviderSettings } from './poe-provider';
```

## Best Practices Applied

Based on [AI SDK documentation](https://ai-sdk.dev/docs/introduction) and [community providers](https://ai-sdk.dev/providers/community-providers):

1. **`loadApiKey` utility** - Provides clear error messages when API key is missing
2. **`withoutTrailingSlash`** - Normalizes base URL to prevent double slashes
3. **`new.target` check** - Prevents misuse of provider as constructor
4. **Custom headers support** - Enables proxy/gateway scenarios
5. **Router pattern** - Delegates to first-party SDKs (similar to [OpenRouter](https://github.com/OpenRouterTeam/ai-sdk-provider))

## Sources

- [AI SDK Custom Provider Guide](https://ai-sdk.dev/providers/openai-compatible-providers/custom-providers)
- [AI SDK Anthropic Provider](https://ai-sdk.dev/providers/ai-sdk-providers/anthropic)
- [AI SDK OpenAI Provider](https://ai-sdk.dev/providers/ai-sdk-providers/openai)
- [OpenRouter Provider (reference)](https://github.com/OpenRouterTeam/ai-sdk-provider)
- [Replicate Provider (reference)](https://github.com/replicate/vercel-ai-provider)
