# Instructions

- TDD, KISS, YAGNI
- Short, minimal, elegant code

## Testing

Unit tests must mock requests
Integration test must use snapshot testing

### Adding a new integration test

- Add test to tests/integration/other.test.ts (or create new file depending on provider)
- Use poe("provider/model-name") or poe("model-name") for chat/completions with getSnapshotFetch()
- Record
  - Preferred: Individual tests via vitest `tags: ["snapshot:record"]`
  - Full test file: `POE_SNAPSHOT_MODE=record npm test -- --run tests/integration/other.test.ts`
- Snapshots saved to __snapshots__/ check contents
- Playback happens automatically on normal npm test.
- You must commit both test and snapshots when done, snapshots are inseparable
- Use `tags: ["stage:alpha"]` or `tags: ["stage:beta"]` to gate tests by release stage
- See docs/SNAPSHOT_TESTING.md for full snapshot system docs (tags, env vars, architecture)

## Commits

Use semantic release
No co-creator

## Github / NPM Release

The workflow uses OIDC provenance (id-token: write + provenance: true in .releaserc.json), no NODE_AUTH_TOKEN
