# Release Stages

Three stages with progressive feature inclusion:

| Stage | npm tag | Includes |
|-------|---------|----------|
| `stable` | `latest` | Production-ready features |
| `beta` | `beta` | stable + beta features |
| `alpha` | `alpha` | stable + beta + alpha features |

## Gating features

Use runtime guards from `release-stage.js`:

```typescript
import { isAlphaStage, isBetaStage } from "./release-stage.js";

if (isAlphaStage()) { /* alpha-only logic */ }
if (isBetaStage()) { /* beta+ logic */ }
```

At build time, `__RELEASE_STAGE__` is injected by esbuild. At test time,
`process.env.RELEASE_STAGE` is read as fallback.

## Testing

### File-based gating

Name your test file to control which stages run it:

- `*.test.ts` — runs in all stages
- `*.beta.test.ts` — runs in beta + alpha
- `*.alpha.test.ts` — runs in alpha only

```bash
npm test                  # all stages (alpha)
npm run test:stable       # stable only
npm run test:beta         # stable + beta
npm run test:alpha        # all stages (same as npm test)
```

### Per-test gating with tags

Use vitest tags to gate individual tests within a shared file:

```typescript
it("does alpha thing", { tags: ["stage:alpha"] }, () => { });
it("does beta thing", { tags: ["stage:beta"] }, () => { });
```

## Promoting a feature

1. Remove the runtime check (`isAlphaStage()` / `isBetaStage()`)
2. Remove the `stage:alpha` / `stage:beta` tag from tests
3. Move tests from `*.beta.test.ts` / `*.alpha.test.ts` to `*.test.ts` if file-based
