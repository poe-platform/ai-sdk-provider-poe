import { describe, it, expect } from "vitest";
import { patchingFetch } from "./patch-output-text.js";

function jsonResponse(body: unknown, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    headers: { "content-type": "application/json", ...headers },
  });
}

function sseResponse(events: string[]): Response {
  const body = events.map(e => `data: ${e}\n`).join("\n") + "\ndata: [DONE]\n";
  return new Response(body, {
    headers: { "content-type": "text/event-stream" },
  });
}

async function readSSE(res: Response): Promise<any[]> {
  const text = await res.text();
  return text.split("\n")
    .filter(l => l.startsWith("data: "))
    .map(l => l.slice(6).trim())
    .filter(l => l && l !== "[DONE]")
    .map(l => JSON.parse(l));
}

describe("patchingFetch", () => {
  it("injects text field into output_text content parts (JSON)", async () => {
    const base = async () => jsonResponse({
      output: [{
        type: "message",
        content: [{ type: "output_text", annotations: [] }],
      }],
    });
    const fetch = patchingFetch(base as any);
    const res = await fetch("https://api.poe.com/v1/responses", {});
    const json = await res.json();

    expect(json.output[0].content[0].text).toBe("");
  });

  it("leaves existing text field untouched (JSON)", async () => {
    const base = async () => jsonResponse({
      output: [{
        type: "message",
        content: [{ type: "output_text", text: "hello", annotations: [] }],
      }],
    });
    const fetch = patchingFetch(base as any);
    const res = await fetch("https://api.poe.com/v1/responses", {});
    const json = await res.json();

    expect(json.output[0].content[0].text).toBe("hello");
  });

  it("patches output_text in SSE events", async () => {
    const event = {
      type: "response.completed",
      response: {
        output: [{
          type: "message",
          content: [{ type: "output_text", annotations: [] }],
        }],
      },
    };
    const base = async () => sseResponse([JSON.stringify(event)]);
    const fetch = patchingFetch(base as any);
    const res = await fetch("https://api.poe.com/v1/responses", {});
    const events = await readSSE(res);

    expect(events[0].response.output[0].content[0].text).toBe("");
  });

  it("does not touch non-responses URLs", async () => {
    const body = { output: [{ type: "message", content: [{ type: "output_text" }] }] };
    const base = async () => jsonResponse(body);
    const fetch = patchingFetch(base as any);
    const res = await fetch("https://api.poe.com/v1/chat/completions", {});
    const json = await res.json();

    expect(json.output[0].content[0].text).toBeUndefined();
  });
});
