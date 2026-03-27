# Debugging

## Request logging

Wrap the provider to dump each AI SDK call as a standalone repro script:

```typescript
import fs from "fs";
import type { LanguageModelV3 } from "@ai-sdk/provider";
import { wrapLanguageModel } from "ai";
import { createPoe as _createPoe } from "ai-sdk-provider-poe";

const LOG_DIR = "/tmp/poe-sdk-logs";

function dumpCall(model: LanguageModelV3): LanguageModelV3 {
  fs.mkdirSync(LOG_DIR, { recursive: true });
  return wrapLanguageModel({
    model,
    middleware: {
      specificationVersion: "v3",
      transformParams: async ({ params, type }) => {
        const ts = new Date().toISOString().replace(/[:.]/g, "-");
        const id = Math.random().toString(36).slice(2, 8);
        const fn = type === "stream" ? "streamText" : "generateText";
        const lines = [
          `// Repro: ${new Date().toISOString()}`,
          `import { ${fn} } from "ai";`,
          `import { createPoe } from "ai-sdk-provider-poe";`,
          ``,
          `const poe = createPoe();`,
          `const result = await ${fn}(${JSON.stringify({ model: `poe("${model.modelId}")`, ...params }, null, 2)});`,
        ];
        fs.writeFileSync(`${LOG_DIR}/${ts}_${id}.ts`, lines.join("\n"));
        return params;
      },
    },
  });
}

function wrapProvider(provider) {
  const wrapped = (modelId: string) => dumpCall(provider(modelId));
  wrapped.languageModel = (modelId: string) => dumpCall(provider.languageModel(modelId));
  return wrapped;
}

export const createPoe = (...args) => wrapProvider(_createPoe(...args));
```

Each call writes a `.ts` file to `/tmp/poe-sdk-logs/` that can be run standalone to reproduce the request.
