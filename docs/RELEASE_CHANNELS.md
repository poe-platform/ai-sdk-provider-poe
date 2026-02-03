# Release Channels

This repo uses **release channels** to publish different “tracks” of the same package.
Channel differences are primarily enforced by **server-side / internal feature flags** (so non-employees may see broken/unsupported behavior on non-stable channels).

## Overview

| Channel | npm dist-tag | Source of truth | Intended audience |
|--------|--------------|-----------------|------------------|
| stable | `latest` | `main` branch | everyone |
| beta | `beta` | `beta` branch | early adopters (may be broken without internal flags) |
| alpha (optional) | `alpha` | `alpha` branch (not currently configured) | internal only |

Install:

```bash
npm install ai-sdk-provider-poe       # stable (latest)
npm install ai-sdk-provider-poe@beta  # beta (dist-tag)
```

Notes:
- npm dist-tags point to a **published version**; they don’t “switch exports” by themselves.
- “Employee only” is not a security boundary: it just means the package is expected to be unusable without internal flags.

## How Releases Work Today

Releases are branch-based via semantic-release:
- Push/merge to `main` publishes stable to dist-tag `latest`.
- Push/merge to `beta` publishes beta to dist-tag `beta` as a prerelease series (typically `x.y.z-beta.1`, `x.y.z-beta.2`, …).

See:
- `.releaserc.json` (semantic-release branches)
- `.github/workflows/release.yml` (CI release jobs)

## Testing

This repo uses Vitest.

Baseline:

```bash
npm test
```

Integration snapshot recording (network is snapshot-recorded, not live in normal runs):

```bash
POE_SNAPSHOT_MODE=record npm test -- --run tests/integration/other.test.ts
```

## Adding “Alpha” (Optional)

If we decide we want an explicit alpha track, the minimal conceptual change is:
- Add an `alpha` branch to `.releaserc.json` with `"prerelease": true`.
- Add `alpha` to the GitHub Actions trigger in `.github/workflows/release.yml`.
- Publish to dist-tag `alpha`.

This is still “best effort internal-only” unless the underlying feature flags are public.

## Why we are *not* doing compile-time stripping here

An earlier idea was “compile-time strip alpha/beta code out of stable builds” (via preprocessor directives and separate `dist/stable`, `dist/beta`, ... outputs).

That approach has a common trap:
- JS can be stripped per channel, **but** TypeScript declaration files (`.d.ts`) will still include the exported symbols unless you also generate **per-channel types**.
- Result: stable users can see types for APIs that don’t exist at runtime (type/runtime mismatch).

If we ever revisit compile-time stripping, we should pick one:
- Generate per-channel `.d.ts` and point `exports.types` at the matching channel output.
- Or avoid compile-time stripping of exported surface area and keep runtime “feature-flag guards” instead.
