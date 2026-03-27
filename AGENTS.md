# Instructions

- TDD, KISS, YAGNI
- Short, minimal, elegant code

## Testing

Unit tests must mock requests
Integration test must use snapshot testing

### Adding a new integration test

- Add the test next to the source it exercises under `src/` using `*.integration.test.ts`
- Use poe("provider/model-name") or poe("model-name") for chat/completions with getSnapshotFetch()
- Record - choose either, you don't need both
  - Individual tests via vitest `tags: ["snapshot:record"]`
  - Full test file: `POE_SNAPSHOT_MODE=record npm test -- --run src/poe-provider.other.integration.test.ts`
- Snapshots saved to .snapshots/ check contents
- Playback happens automatically on normal npm test.
- Delete stale snapshots: `npx tsx scripts/snapshots.ts delete:stale` (run tests first to populate accessed keys)
- List stale snapshots: `npx tsx scripts/snapshots.ts list:stale`

## Routing

All Poe models (text, image, audio, video) work on `/v1/chat/completions`. Models with empty `supported_endpoints` default to chat completions at runtime. The bundled routing filter requires text output + tools support (for code use) and excludes Poe-owned wrapper models.

## Commits

Use semantic release
No co-creator
Commit snapshots

## Github / NPM Release

The workflow uses OIDC provenance (id-token: write + provenance: true in .releaserc.json), no NODE_AUTH_TOKEN

## Models Changelog

Check whether model wasn't deprecated or added here <https://models.poecdn.net/changelog.html>
