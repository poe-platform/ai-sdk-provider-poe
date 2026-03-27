# Customizations

Two extension points patch Poe API behavior before it reaches user code.

## Model Definition Workarounds

**Location:** `src/model-definition-workarounds/`

Patch raw `/v1/models` API data before normalization. Applied identically to bundled and runtime-fetched models — single source of truth.

Each workaround is a function `(raw) => raw | null` in its own file. Return `null` to exclude a model.

### Adding a new workaround

1. Create `src/model-definition-workarounds/<name>.ts` exporting a `ModelDefinitionWorkaround`
2. Add it to the `workarounds` array in `index.ts`
3. Run `npm run update-routing` to regenerate bundled data

## Middlewares

**Location:** `src/middlewares/`

Wrap `LanguageModelV3` instances at model creation time. Each middleware is a function `(model) => model` in its own file.

### Adding a new middleware

1. Create `src/middlewares/<name>.ts` exporting a `ModelMiddleware`
2. Add it to the `middlewares` array in `index.ts`
3. If it wraps fetch rather than the model, export it separately and apply in `poe-provider.ts`
