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
