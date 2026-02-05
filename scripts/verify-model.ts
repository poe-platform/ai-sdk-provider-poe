import "dotenv/config";
import { generateText, tool } from "ai";
import { z } from "zod";
import { createPoe } from "../src/poe-provider.js";

const model = process.argv[2];
if (!model) {
  console.error("Usage: npm run verify-model -- <model>");
  process.exit(1);
}

const poe = createPoe();
const log = (icon: string, label: string, detail: string) =>
  console.log(`  ${icon} ${label.padEnd(14)} ${detail}`);

const errors: { name: string; error: Error }[] = [];

const check = async (name: string, fn: () => Promise<void>) => {
  try {
    await fn();
  } catch (e: any) {
    errors.push({ name, error: e });
    log("✗", name, e.message.slice(0, 120));
  }
};

console.log(`\n  ${model}\n`);

// --- text ---
await check("text", async () => {
  const { text, usage, finishReason } = await generateText({
    model: poe(model),
    prompt: "Say hello in exactly 3 words",
  });
  log("✓", "text", text.slice(0, 80));
  log(" ", "  finish", finishReason);
  log(" ", "  usage", `${usage.promptTokens} in / ${usage.completionTokens} out`);
});

// --- media ---
await check("media", async () => {
  const { text } = await generateText({
    model: poe(model),
    prompt: "Generate a picture of a golden retriever puppy playing in the snow",
  });
  const urls = text.match(/https?:\/\/\S+/g) ?? [];
  if (urls.length) {
    log("✓", "media", `url (${urls.length})`);
    for (const u of urls.slice(0, 3)) log(" ", "  url", u.slice(0, 100));
  } else {
    log("–", "media", `none — ${text.slice(0, 60)}`);
  }
});

// --- reasoning ---
await check("reasoning", async () => {
  const { reasoning } = await generateText({
    model: poe(model),
    prompt: "What is 7 * 8? Think step by step.",
  });
  const has = Array.isArray(reasoning) && reasoning.length > 0;
  if (has) {
    const chars = reasoning.reduce((n, r) => n + (r.text?.length ?? 0), 0);
    log("✓", "reasoning", `${reasoning.length} part(s), ${chars} chars`);
  } else {
    log("–", "reasoning", "none");
  }
});

// --- tools ---
await check("tools", async () => {
  const { toolCalls } = await generateText({
    model: poe(model),
    prompt: "What is the weather in San Francisco? Use the getWeather tool.",
    tools: {
      getWeather: tool({
        description: "Get the current weather for a location",
        inputSchema: z.object({
          location: z.string().describe("The city to get weather for"),
        }),
      }),
    },
  });
  if (toolCalls.length > 0) {
    log("✓", "tools", `${toolCalls.length} call(s)`);
    for (const tc of toolCalls) log(" ", "  call", `${tc.toolName}(${JSON.stringify("args" in tc ? tc.args : {})})`);
  } else {
    log("–", "tools", "0 calls returned");
  }
});

// --- error details ---
if (errors.length) {
  console.log("\n  --- errors ---\n");
  for (const { name, error } of errors) {
    console.log(`  [${name}] ${error.message}\n`);
    if (error.cause) console.log(`  cause: ${error.cause}\n`);
    if (error.stack) {
      const frames = error.stack.split("\n").slice(1, 4).map((l: string) => `    ${l.trim()}`).join("\n");
      console.log(`${frames}\n`);
    }
  }
}

console.log();
