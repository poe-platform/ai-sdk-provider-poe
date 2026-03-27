/**
 * Workaround for https://github.com/poe-platform/ai-sdk-provider-poe/issues/3
 *
 * Poe's /v1/responses proxy returns `output_text` without a `text` field
 * on Gemini tool-call responses. @ai-sdk/openai validates with Zod and
 * requires `text: string`, so the call fails.
 *
 * Fix: wrap fetch to inject `"text": ""` into any output_text content
 * part that is missing it — both in JSON responses and SSE event payloads.
 */

function patchOutputText(obj: any): any {
  if (Array.isArray(obj)) return obj.map(patchOutputText);
  if (obj && typeof obj === "object") {
    if (obj.type === "output_text" && !("text" in obj)) {
      obj.text = "";
    }
    for (const k of Object.keys(obj)) patchOutputText(obj[k]);
  }
  return obj;
}

function patchSSEStream(body: ReadableStream<Uint8Array>): ReadableStream<Uint8Array> {
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  let buffer = "";

  return body.pipeThrough(new TransformStream<Uint8Array, Uint8Array>({
    transform(value, controller) {
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop()!;

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const raw = line.slice(6).trim();
          if (raw && raw !== "[DONE]") {
            try {
              const event = JSON.parse(raw);
              patchOutputText(event);
              controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n`));
              continue;
            } catch { /* pass through unparseable */ }
          }
        }
        controller.enqueue(encoder.encode(line + "\n"));
      }
    },
    flush(controller) {
      if (buffer) controller.enqueue(encoder.encode(buffer));
    },
  }));
}

/**
 * Returns a fetch wrapper that patches output_text responses
 * from Poe's /v1/responses endpoint.
 */
export function patchingFetch(baseFetch: typeof globalThis.fetch): typeof globalThis.fetch {
  return async (input, init) => {
    const res = await baseFetch(input, init);
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    if (!url.includes("/responses")) return res;

    const ct = res.headers.get("content-type") ?? "";

    if (ct.includes("text/event-stream") && res.body) {
      return new Response(patchSSEStream(res.body), {
        status: res.status,
        statusText: res.statusText,
        headers: res.headers,
      });
    }

    if (ct.includes("application/json")) {
      const json = await res.json();
      patchOutputText(json);
      return new Response(JSON.stringify(json), {
        status: res.status,
        statusText: res.statusText,
        headers: res.headers,
      });
    }

    return res;
  };
}
