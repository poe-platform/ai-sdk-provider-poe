# Testing Plan

## Overview

Snapshot testing for AI SDK providers by intercepting HTTP requests at the fetch level.

## Request Flow Analysis

```
User → poe('anthropic/claude-sonnet') → Poe Provider Router
                                              ↓
                              ┌───────────────┴───────────────┐
                              ↓                               ↓
                    @ai-sdk/anthropic              @ai-sdk/openai
                    (baseURL: poe.com)             (baseURL: poe.com)
                              ↓                               ↓
                         fetch()                          fetch()
                              ↓                               ↓
                    POST /v1/messages            POST /v1/chat/completions
```

**Key insight:** All requests flow through native `fetch()`. The first-party SDKs accept a custom `fetch` option.

## Implementation

### Files

```
tests/
├── helpers/
│   ├── index.ts              # Exports all helpers
│   ├── snapshot-config.ts    # Environment config parsing
│   ├── snapshot-fetch.ts     # Custom fetch with record/playback
│   ├── snapshot-store.ts     # Snapshot management operations
│   └── test-client.ts        # Shared fetch instance
├── setup.ts                  # Vitest setup (persists accessed keys)
scripts/
└── snapshots.ts              # CLI for snapshot management
```

### Provider Settings Extension

```typescript
// src/poe-provider.ts
export interface PoeProviderSettings {
  apiKey?: string;
  baseURL?: string;
  headers?: Record<string, string>;
  fetch?: typeof fetch;  // ← Pass snapshot fetch here
}
```

### Usage in Tests

```typescript
import { describe, it, expect } from 'vitest';
import { generateText } from 'ai';
import { createPoe } from '../src';
import { getSnapshotFetch } from './helpers';

describe('anthropic models', () => {
  it('generates text with claude-sonnet', async () => {
    const poe = createPoe({
      apiKey: 'test-key',
      fetch: getSnapshotFetch(),
    });

    const result = await generateText({
      model: poe('anthropic/claude-sonnet-4-20250514'),
      prompt: 'Say hello',
    });

    expect(result.text).toContain('hello');
  });
});
```

## Environment Variables

| Variable | Values | Default | Description |
|----------|--------|---------|-------------|
| `POE_SNAPSHOT_MODE` | `record`, `playback` | `playback` | Record new or replay existing |
| `POE_SNAPSHOT_DIR` | path | `__snapshots__` | Snapshot storage directory |
| `POE_SNAPSHOT_MISS` | `error`, `warn`, `passthrough` | `error` | Behavior when snapshot missing |

## Commands

| Task | Command |
|------|---------|
| Run tests (playback) | `npm test` |
| Record snapshots | `POE_SNAPSHOT_MODE=record npm test` |
| List snapshots | `npm run snapshots:list` |
| List stale | `npm run snapshots:list:stale` |
| Delete all | `npm run snapshots:delete` |
| Delete stale | `npm run snapshots:delete:stale` |

## Package.json Scripts

```json
{
  "scripts": {
    "test": "vitest",
    "test:record": "POE_SNAPSHOT_MODE=record vitest",
    "snapshots:list": "tsx scripts/snapshots.ts list",
    "snapshots:list:stale": "tsx scripts/snapshots.ts list:stale",
    "snapshots:delete": "tsx scripts/snapshots.ts delete",
    "snapshots:delete:stale": "tsx scripts/snapshots.ts delete:stale"
  }
}
```

## Vitest Config

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    setupFiles: ['./tests/setup.ts'],
  },
});
```

## Snapshot Format

```json
{
  "key": "v1-messages-a1b2c3d4e5f6",
  "request": {
    "url": "https://api.poe.com/v1/messages",
    "method": "POST",
    "headers": { "content-type": "application/json" },
    "body": { "model": "claude-sonnet", "messages": [...] }
  },
  "response": {
    "status": 200,
    "headers": { "content-type": "application/json" },
    "body": { "content": [...], "usage": {...} },
    "chunks": ["data: {...}\n\n", "data: {...}\n\n"]
  },
  "metadata": {
    "recordedAt": "2025-01-29T12:00:00.000Z"
  }
}
```

For streaming responses, `chunks` contains the SSE data; `body` is null.

## Stale Snapshot Detection

1. Tests run in playback mode
2. `setup.ts` persists accessed keys to `.accessed-keys.json`
3. CLI compares accessed keys against existing snapshots
4. Unaccessed snapshots are stale

## Test Matrix

| Provider | Endpoint | Method | Test Cases |
|----------|----------|--------|------------|
| `anthropic/*` | `/v1/messages` | doGenerate | basic, tools, multi-turn |
| `anthropic/*` | `/v1/messages` | doStream | basic, tools, abort |
| `openai/*` | `/v1/responses` | doGenerate | basic, tools |
| `openai/*` | `/v1/responses` | doStream | basic, tools |
| `google/*` | `/v1/chat/completions` | doGenerate | basic |
| `google/*` | `/v1/chat/completions` | doStream | basic |
