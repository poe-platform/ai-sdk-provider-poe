# Snapshot Testing

Integration tests use HTTP snapshot recording/playback instead of live API calls.
On `npm test`, pre-recorded snapshots are replayed. To record new snapshots, run
tests against the live Poe API.

## How it works

```
test code
  -> createPoe({ fetch: getSnapshotFetch() })
     -> SnapshotFetch intercepts every HTTP call
        record mode  -> real fetch, save JSON to .snapshots/
        playback mode -> load JSON, return synthetic Response
```

### Key generation

Each snapshot is identified by a deterministic key:

```
{url-path}-{model}-{sha256-of-request-body (12 chars)}.json
```

For example: `v1-chat-completions-Kimi-K2.5-a1b2c3d4e5f6.json`

### Snapshot file format

```json
{
  "key": "v1-chat-completions-Kimi-K2.5-a1b2c3d4e5f6",
  "request": {
    "body": { "model": "Kimi-K2.5", "messages": [...] }
  },
  "response": {
    "status": 200,
    "headers": { "content-type": "application/json" },
    "body": { ... },
    "chunks": ["chunk1", "chunk2"]
  }
}
```

- `request.body` contains the parsed request body for debugging
- `response.body` is set for non-streaming responses
- `response.chunks` is set for streaming (`stream: true`) responses
- `body` and `chunks` are mutually exclusive

### Header sanitization

Security-sensitive response headers (cookies, request IDs, etc.) are stripped
from snapshots by default. To include all headers for debugging:

```sh
POE_DANGEROUSLY_ALLOW_SENSITIVE_HEADERS=true POE_SNAPSHOT_MODE=record npm test
```

### Test setup (`src/test/setup.ts`)

The global setup file:

1. Loads `.env` via `dotenv/config`
2. Mocks `loadApiKey` from `@ai-sdk/provider-utils` (real key in record mode,
   `"test-api-key"` in playback)
3. Applies per-test snapshot tag overrides in `beforeEach` / `afterEach`
5. Persists accessed snapshot keys in `afterAll` for stale detection

## Configuration

### Environment variables

| Variable                                 | Values                                   | Default      |
|------------------------------------------|------------------------------------------|--------------|
| `POE_SNAPSHOT_MODE`                      | `record`, `playback`                     | `playback`   |
| `POE_SNAPSHOT_DIR`                       | directory path                           | `.snapshots` |
| `POE_SNAPSHOT_MISS`                      | `error`, `warn`, `passthrough`, `record` | `error`      |
| `POE_DANGEROUSLY_ALLOW_SENSITIVE_HEADERS`| `true`                                   | *(unset)*    |

### Vitest tags

> Requires **vitest ≥ 4.1.0-beta.3** (native tag support). All tags must be
> declared in `vitest.config.ts` under `test.tags`.

#### Snapshot tags

Control snapshot recording/miss behavior per-test:

| Tag                         | Equivalent env variable            |
|-----------------------------|------------------------------------|
| `snapshot:record`           | `POE_SNAPSHOT_MODE=record`         |
| `snapshot:miss-warn`        | `POE_SNAPSHOT_MISS=warn`           |
| `snapshot:miss-passthrough` | `POE_SNAPSHOT_MISS=passthrough`    |
| `snapshot:miss-record`      | `POE_SNAPSHOT_MISS=record`         |

`snapshot:record` sets record mode for the test (real API key, save response).
`snapshot:miss-record` plays back existing snapshots but records missing ones.

#### Timeout tags

Extended timeouts for slow operations:

| Tag              | Timeout   | Use case          |
|------------------|-----------|-------------------|
| `timeout:image`  | 5 minutes | Image generation  |
| `timeout:video`  | 10 minutes| Video generation  |

#### Combining tags

Tags compose naturally:

```ts
it("generates image with Nano-Banana", {
  timeout: 300_000,
  tags: ["snapshot:record"],
}, async () => {
  // records snapshot against live API
});
```

Run only tagged tests from the CLI:

```sh
npx vitest --tag snapshot:record    # run record-mode tests
```

When `snapshot:record` is passed via `--tag`, the global test timeout increases
from 5 s to 120 s automatically.

### How tags propagate

Tag resolution happens in `src/test/setup.ts` `beforeEach`:

```
vitest runs test
  -> beforeEach reads task.tags
  -> parseTagOverrides(tags) returns { mode?, onMiss? }
  -> SnapshotFetch.setModeOverride() / .setMissOverride()
  -> loadApiKey mock switches to real key if mode=record
  -> afterEach calls clearAllOverrides()
```

The `SNAPSHOT_TAGS` constant in `snapshot-config.ts` is the single source of
truth for snapshot tag effects.

## Recording snapshots

Choose **one** method — do not combine env variable with tags.

### Option 1: per-test tags (preferred for individual tests)

Use `snapshot:record` tag to record a single test:

```ts
it("generates text with Nano-Banana", {
  timeout: 300_000,
  tags: ["snapshot:record"],
}, async () => {
  const { text } = await generateText({
    model: poe("google/Nano-Banana"),
    prompt: "Say hello in exactly 3 words",
  });
  expect(text).toBeTruthy();
});
```

Record:

```sh
npx vitest --tag snapshot:record --run
```

After recording, remove the `snapshot:record` tag and commit both the test
and snapshot files.

### Option 2: env variable (entire test file)

Use `POE_SNAPSHOT_MODE=record` to record all tests in a file:

```sh
POE_SNAPSHOT_MODE=record npm test -- --run src/poe-provider.google.integration.test.ts
```

This records every test in the file. Use this when adding multiple tests at
once or re-recording an entire suite.

Snapshots are saved to `.snapshots/`. Both the test file and its snapshots
must be committed together.

## Missing snapshot behavior

When a test runs in playback mode and the snapshot file doesn't exist:

| `POE_SNAPSHOT_MISS` | Behavior                                           |
|---------------------|----------------------------------------------------|
| `error` (default)   | Throws `SnapshotMissingError` with recording hints |
| `warn`              | Logs a warning, falls back to live API call        |
| `passthrough`       | Silently falls back to live API call               |
| `record`            | Records only missing snapshots, plays back existing|

## Snapshot management scripts

```sh
npm run snapshots:list              # list all snapshots
npm run snapshots:list:stale        # list snapshots not accessed by any test
npm run snapshots:delete            # delete snapshots (interactive)
npm run snapshots:delete:stale      # delete stale snapshots
```

Stale detection works by tracking accessed keys in `.accessed-keys.json`
during each test run.

## Architecture

```
vitest.config.ts                # tag declarations, timeout
src/
  *.test.ts                     # unit tests beside source
  *.integration.test.ts         # integration tests beside source
  code/
    *.integration.test.ts       # nested integration tests beside source
  test/
    setup.ts                    # global setup, mock, tag wiring
    snapshot-config.ts          # types, env parsing, SNAPSHOT_TAGS constant
    snapshot-fetch.ts           # SnapshotFetch: record/playback/overrides
    snapshot-store.ts           # list/delete/prune utilities
    test-client.ts              # singleton getSnapshotFetch()
    index.ts                    # barrel exports
.snapshots/
  *.json                        # recorded HTTP snapshots
  .accessed-keys.json           # keys accessed in last test run
```

### Adding a new tag

1. Add it to `SNAPSHOT_TAGS` in `src/test/snapshot-config.ts`
2. Declare it in `test.tags` in `vitest.config.ts` (required by vitest 4.1+)
3. Handle it in `src/test/setup.ts` `beforeEach` if needed
