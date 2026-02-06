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

### Test setup (`tests/setup.ts`)

The global setup file:

1. Loads `.env` via `dotenv/config`
2. Mocks `loadApiKey` from `@ai-sdk/provider-utils` (real key in record mode,
   `"test-api-key"` in playback)
3. Skips tests gated by `stage:alpha` / `stage:beta` when `RELEASE_STAGE` is too low
4. Applies per-test snapshot tag overrides in `beforeEach` / `afterEach`
5. Persists accessed snapshot keys in `afterAll` for stale detection

## Configuration

### Environment variables

| Variable                                 | Values                                   | Default      |
|------------------------------------------|------------------------------------------|--------------|
| `POE_SNAPSHOT_MODE`                      | `record`, `playback`                     | `playback`   |
| `POE_SNAPSHOT_DIR`                       | directory path                           | `.snapshots` |
| `POE_SNAPSHOT_MISS`                      | `error`, `warn`, `passthrough`, `record` | `error`      |
| `POE_DANGEROUSLY_ALLOW_SENSITIVE_HEADERS`| `true`                                   | *(unset)*    |
| `RELEASE_STAGE`                          | `stable`, `beta`, `alpha`                | `alpha` via `npm test` |

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
Neither auto-skips — use a stage tag to gate when the test runs.

#### Stage tags

Gate tests by release stage (`RELEASE_STAGE` env variable):

| Tag            | Runs when                              | Skipped in stable? |
|----------------|----------------------------------------|--------------------|
| `stage:alpha`  | `RELEASE_STAGE=alpha`                  | **Yes**            |
| `stage:beta`   | `RELEASE_STAGE=beta` or `alpha`        | **Yes**            |
| *(no tag)*     | always                                 | No                 |

Stage hierarchy: `stable` < `beta` < `alpha`. A test tagged `stage:beta` runs
in beta and alpha but is skipped in stable.

#### Timeout tags

Extended timeouts for slow operations:

| Tag              | Timeout   | Use case          |
|------------------|-----------|-------------------|
| `timeout:image`  | 5 minutes | Image generation  |
| `timeout:video`  | 10 minutes| Video generation  |

There are two complementary stage gating mechanisms:

- **File-based**: `*.beta.test.ts` and `*.alpha.test.ts` files are excluded by
  `vitest.config.ts` based on `RELEASE_STAGE`. Use this when an entire test
  file is stage-specific.
- **Tag-based**: `stage:alpha` / `stage:beta` tags on individual tests, handled
  in `setup.ts` `beforeEach`. Use this for per-test gating within a shared file.

#### Combining tags

Tags compose naturally. Use stage tags for gating and snapshot tags for mode:

```ts
it("generates image with Nano-Banana", {
  timeout: 300_000,
  tags: ["stage:alpha", "snapshot:record"],
}, async () => {
  // skipped in stable; records when run with RELEASE_STAGE=alpha
});
```

Run only tagged tests from the CLI:

```sh
npx vitest --tag stage:alpha        # run alpha-gated tests
npx vitest --tag snapshot:record    # run record-mode tests
```

When `snapshot:record` is passed via `--tag`, the global test timeout increases
from 5 s to 120 s automatically.

### How tags propagate

Tag resolution happens in `tests/setup.ts` `beforeEach`:

```
vitest runs test
  -> beforeEach reads task.tags
  -> stage:alpha / stage:beta -> skip() if RELEASE_STAGE too low
  -> parseTagOverrides(tags) returns { mode?, onMiss? }
  -> SnapshotFetch.setModeOverride() / .setMissOverride()
  -> loadApiKey mock switches to real key if mode=record
  -> afterEach calls clearAllOverrides()
```

The `SNAPSHOT_TAGS` constant in `snapshot-config.ts` is the single source of
truth for snapshot tag effects. Stage tags are handled directly in `setup.ts`.

## Recording snapshots

Choose **one** method — do not combine env variable with tags.

### Option 1: per-test tags (preferred for individual tests)

Use `snapshot:record` tag to record a single test. Combine with a stage tag to
gate when the test runs:

```ts
it("generates text with Nano-Banana", {
  timeout: 300_000,
  tags: ["stage:alpha", "snapshot:record"],
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
RELEASE_STAGE=alpha npx vitest --tag snapshot:record --run
```

The test is skipped in stable/beta and only runs when the stage allows it.
After recording, remove the `snapshot:record` tag and commit both the test
and snapshot files.

### Option 2: env variable (entire test file)

Use `POE_SNAPSHOT_MODE=record` to record all tests in a file:

```sh
POE_SNAPSHOT_MODE=record npm test -- --run tests/integration/google.test.ts
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
vitest.config.ts                # tag declarations, timeout, stage excludes
tests/
  setup.ts                      # global setup, mock, tag wiring, stage gating
  helpers/
    snapshot-config.ts          # types, env parsing, SNAPSHOT_TAGS constant
    snapshot-fetch.ts           # SnapshotFetch: record/playback/overrides
    snapshot-store.ts           # list/delete/prune utilities
    test-client.ts              # singleton getSnapshotFetch()
    index.ts                    # barrel exports
  integration/
    *.test.ts                   # integration tests
  unit/
    *.test.ts                   # unit tests (mock fetch, no snapshots)
.snapshots/
  *.json                        # recorded HTTP snapshots
  .accessed-keys.json           # keys accessed in last test run
```

### Adding a new tag

1. Add it to `SNAPSHOT_TAGS` in `tests/helpers/snapshot-config.ts`
2. Declare it in `test.tags` in `vitest.config.ts` (required by vitest 4.1+)
3. Handle it in `tests/setup.ts` `beforeEach` if needed
