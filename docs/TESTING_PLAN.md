# Testing

## Structure

- `tests/unit/` - Unit tests with mocked env
- `tests/integration/` - Snapshot-based integration tests

## How It Works

Integration tests use a custom `fetch` that records/replays HTTP responses:

```typescript
const poe = createPoe({
  fetch: getSnapshotFetch(),
});
```

## Commands

```bash
npm test                          # Run tests (playback mode)
POE_SNAPSHOT_MODE=record npm test # Record new snapshots
npm run snapshots:list            # List snapshots
npm run snapshots:delete:stale    # Delete unused snapshots
```
