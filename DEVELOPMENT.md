# Development

## Prerequisites

- Node.js 22+
- [TruffleHog](https://github.com/trufflesecurity/trufflehog) - `brew install trufflehog`

## Setup

```bash
npm install
```

## Scripts

```bash
npm test           # run tests
npm run build      # build
npm run secrets    # scan for secrets
```

## Testing

### Structure

- `tests/unit/` - Unit tests with mocked env
- `tests/integration/` - Snapshot-based integration tests

### How It Works

Integration tests use a custom `fetch` that records/replays HTTP responses:

```typescript
const poe = createPoe({
  fetch: getSnapshotFetch(),
});
```

### Commands

```bash
npm test                          # Run tests (playback mode)
POE_SNAPSHOT_MODE=record npm test # Record new snapshots
npm run snapshots:list            # List snapshots
npm run snapshots:delete:stale    # Delete unused snapshots
```

See also:
- [Snapshot Testing](docs/SNAPSHOT_TESTING.md) - Recording/playback system details
- [Release Stages](docs/RELEASE_STAGES.md) - Alpha/beta feature gating

## Architecture

### Provider Routing

`poe-provider.ts` routes models to underlying AI SDK providers:

| Model prefix | Routes to | API |
|--------------|-----------|-----|
| `anthropic/` | @ai-sdk/anthropic | Messages |
| `openai/` | @ai-sdk/openai | Responses (default) or Chat |
| `google/` | @ai-sdk/openai | Chat (stable) or Responses (alpha) |
| No prefix | @ai-sdk/openai | Chat |

Providers are lazy-loaded and cached. `new poe()` throws — use `poe()` or `createPoe()`.

### Model Registries

`openai-models.ts` and `google-models.ts` define model metadata that controls routing and tests:

```typescript
export const OPENAI_MODELS = {
  "gpt-5.2": {},                              // defaults: responses API, tools enabled
  "gpt-image-1.5": { route: "chat", tools: false, tags: ["timeout:image"] },
  "o3": { reasoning: true },                  // extended thinking tests
  "o4-mini-deep-research": { skip: "slow" },  // skipped in CI
};
```

Tests auto-generate from these registries — adding a model here creates tests automatically.

### Release Stages

Three stages with compile-time injection:

- **Build**: esbuild replaces `__RELEASE_STAGE__` with `"stable"`, `"beta"`, or `"alpha"`
- **Runtime**: Dead code elimination removes gated features from lower stages
- **Test**: `RELEASE_STAGE` env var controls which tests run

Alpha-only code won't exist in stable builds — it's removed at compile time.

## Key Files

| File | Purpose |
|------|---------|
| `src/poe-provider.ts` | Provider routing logic |
| `src/openai-models.ts` | OpenAI model registry |
| `src/google-models.ts` | Google model registry |
| `src/release-stage.ts` | Stage detection helpers |
| `tests/setup.ts` | Global test setup, API key mocking |
| `tests/helpers/snapshot-fetch.ts` | HTTP record/playback |

## Gotchas

### Snapshots are inseparable from tests

Always commit `.snapshots/*.json` with your test changes. Snapshots are the recorded API responses — without them, tests fail with `SnapshotMissingError`.

### API key mocking in tests

`tests/setup.ts` mocks `loadApiKey`:
- **Playback mode**: Returns `"test-api-key"` (no real key needed)
- **Record mode**: Uses real `POE_API_KEY` from env

If you see auth errors in record mode, check your `.env` file.

### Stage tags must be explicit

Tests tagged `stage:alpha` are silently skipped in stable/beta. If a test disappears, check its tags.

### Snapshot key collisions

Keys are `{path}-{model}-{hash}`. Two tests with identical requests overwrite each other. Vary prompts to avoid this.

### Google routing differs by stage

```typescript
// In stable: uses chat API
// In alpha: uses responses API
if (isAlphaStage()) return getOpenAIProvider().responses(model);
return getOpenAIProvider().chat(model);
```

### Sensitive headers stripped at record time

Snapshots sanitize headers (`set-cookie`, `x-request-id`, etc.). Can't recover them later — re-record with `POE_DANGEROUSLY_ALLOW_SENSITIVE_HEADERS=true` if needed.

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `POE_API_KEY` | — | Required for record mode |
| `POE_SNAPSHOT_MODE` | `playback` | `record` or `playback` |
| `POE_SNAPSHOT_MISS` | `error` | `error`, `warn`, or `passthrough` |
| `RELEASE_STAGE` | `alpha` (tests) | `stable`, `beta`, or `alpha` |
