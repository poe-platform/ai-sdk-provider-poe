Here's the key logic in @ai-sdk/openai-compatible's doStream():

Tool call assembly (lines 715-817): It accumulates delta.tool_calls chunks itself. For each tool call:

First chunk with id + function.name → emits tool-input-start, stores in toolCalls[] array
Subsequent chunks with function.arguments → appends to accumulated args, emits tool-input-delta
After each append, checks isParsableJson(arguments) → if valid JSON, emits tool-input-end + tool-call and marks hasFinished = true
Critical safety net — flush() (lines 820-848): When the stream closes, it iterates over any toolCalls that have !hasFinished and force-emits tool-input-end + tool-call for them — even if the arguments never became valid JSON.

So the @ai-sdk/openai-compatible package does its own tool call assembly inside doStream() and emits tool-call events directly. The Vercel AI SDK's run-tools-transformation.ts doesn't need to assemble anything — it just passes them through.

For ai-sdk-provider-poe: Your SDK needs to do the same thing — accumulate delta.tool_calls, emit tool-input-start/tool-input-delta, check isParsableJson, and emit tool-call. And critically, the flush() handler must catch any unfinished tool calls and force-emit them. If your doStream() doesn't have this pattern, that's the bug.

---

Summary
Problem
@ai-sdk/openai's doStream() has a critical gap in its flush() handler - it does NOT emit tool-call events for unfinished tool calls when the stream ends. If isParsableJson() fails to detect complete JSON during streaming (due to timing, chunking, or malformed responses), the tool call is silently dropped.

Root Cause Analysis
Tracing the Grok completion_tokens: 0 response through the code:

The tool call arguments stream correctly through tool-input-delta chunks
isParsableJson() checks happen after each delta merge
If the last delta doesn't result in parsable JSON (race condition, truncation, etc.), @ai-sdk/openai's flush() just emits finish - no safety net
Fix
Replaced @ai-sdk/openai chat completions with @ai-sdk/openai-compatible for the /v1/chat/completions path. Key differences in @ai-sdk/openai-compatible:

flush() safety net (lines 661-685): Iterates unfinished tool calls and emits tool-input-end + tool-call for each
Lenient index field: z.number().nullish() vs strict z.number() - handles providers like Google that omit it
Dual reasoning field support: Handles both reasoning_content and reasoning
transformRequestBody hook: Available for future Poe-specific request transformations
Architecture is now:

/v1/messages → @ai-sdk/anthropic (unchanged)
/v1/chat/completions → @ai-sdk/openai-compatible (new, with flush safety net)
/v1/responses → @ai-sdk/openai (unchanged, still needed for responses API)
All 373 tests pass. The only failure (dev-models-server.test.ts) is pre-existing and unrelated.

Regarding fixing the Roo Code side (adding tool_call_start/tool_call_delta/tool_call_end handling to Task.ts) - yes, you should do that in parallel. Even with this provider-side fix, Task.ts should handle those chunk types for incremental tool call streaming in the UI, rather than waiting for the complete tool_call event.

---

Consider

import { createOpenResponses } from '@ai-sdk/open-responses';
