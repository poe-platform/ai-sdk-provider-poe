# Instructions

- TDD, KISS, YAGNI
- Short, minimal, elegant code

## Testing

Unit tests must mock requests
Integration test must use snapshot testing

### Adding a new integration test

- Add test to tests/integration/other.test.ts (or create new file depending on provider)
- Use poe("provider/model-name") or poe("model-name") for chat/completions with getSnapshotFetch()
- Record: `POE_SNAPSHOT_MODE=record npm test -- --run tests/integration/other.test.ts`
- Snapshots saved to __snapshots__/ check contents
- Playback happens automatically on normal npm test.
- You must commit both test and snapshots when done, snapshots are inseparable

## Commits

Use semantic release
No co-creator
