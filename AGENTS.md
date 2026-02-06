# Instructions

- TDD, KISS, YAGNI
- Short, minimal, elegant code

## Testing

Unit tests must mock requests
Integration test must use snapshot testing

### Adding a new integration test

- Add test to tests/integration
- Use poe("provider/model-name") or poe("model-name") for chat/completions with getSnapshotFetch()
- Record - choose either, you don't need both
  - Individual tests via vitest `tags: ["snapshot:record"]`
  - Full test file: `POE_SNAPSHOT_MISS=record npm test -- --run tests/integration/other.test.ts`
- Snapshots saved to .snapshots/ check contents
- Playback happens automatically on normal npm test.

## Commits

Use semantic release
No co-creator
Commit snapshots

## Github / NPM Release

The workflow uses OIDC provenance (id-token: write + provenance: true in .releaserc.json), no NODE_AUTH_TOKEN
