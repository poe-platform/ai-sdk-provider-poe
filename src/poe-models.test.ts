import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { fetchPoeModels, POE_DEFAULT_BASE_URL, getStoredModel, _resetModelCache } from "./poe-models.js";

describe("POE_DEFAULT_BASE_URL", () => {
  it("is the expected value", () => {
    expect(POE_DEFAULT_BASE_URL).toBe("https://api.poe.com/v1");
  });
});

describe("fetchPoeModels", () => {
  beforeEach(() => {
    vi.stubEnv("POE_API_KEY", "test-key");
    _resetModelCache(true);
  });

  afterEach(() => {
    _resetModelCache();
  });

  const mockFetch = (data: unknown[]) =>
    vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data }),
    }) as unknown as typeof globalThis.fetch;

  it("calls /models with bearer token", async () => {
    const fetch = mockFetch([]);
    await fetchPoeModels({ fetch });
    expect(fetch).toHaveBeenCalledWith(
      "https://api.poe.com/v1/models",
      { headers: { Authorization: "Bearer test-key" } },
    );
  });

  it("uses custom baseURL", async () => {
    const fetch = mockFetch([]);
    await fetchPoeModels({ baseURL: "https://custom.api.com/v1", fetch });
    expect(fetch).toHaveBeenCalledWith(
      "https://custom.api.com/v1/models",
      expect.any(Object),
    );
  });

  it("passes apiKey from loadApiKey to Authorization header", async () => {
    const fetch = mockFetch([]);
    await fetchPoeModels({ apiKey: "explicit-key", fetch });
    expect(fetch).toHaveBeenCalledWith(
      expect.any(String),
      { headers: { Authorization: "Bearer explicit-key" } },
    );
  });

  it("throws on non-ok response", async () => {
    const fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      statusText: "Unauthorized",
    }) as unknown as typeof globalThis.fetch;

    await expect(fetchPoeModels({ fetch })).rejects.toThrow(
      "Poe API error: 401 Unauthorized",
    );
  });

  it("returns raw API models", async () => {
    const fetch = mockFetch([
      {
        id: "claude-4-sonnet",
        object: "model",
        created: 1700000000,
        owned_by: "Anthropic",
        display_name: "Claude 4 Sonnet",
        context_window: 200000,
        max_output_tokens: 8192,
        supports_images: true,
        supports_prompt_cache: true,
        supports_reasoning_budget: true,
        pricing: {
          input_per_million: 3,
          output_per_million: 15,
          cache_read_per_million: 0.3,
          cache_write_per_million: 3.75,
        },
      },
    ]);

    const models = await fetchPoeModels({ fetch });
    expect(models).toHaveLength(1);
    expect(models[0]).toMatchObject({
      id: "claude-4-sonnet",
      owned_by: "Anthropic",
      display_name: "Claude 4 Sonnet",
      context_window: 200000,
      max_output_tokens: 8192,
    });
  });

  it("stores fetched models for lookup", async () => {
    const fetch = mockFetch([
      { id: "gpt-5.2", object: "model", created: 1, owned_by: "OpenAI", supported_endpoints: ["/v1/responses"] },
      { id: "gpt-4o", object: "model", created: 1, owned_by: "OpenAI", supported_endpoints: ["/v1/chat/completions"] },
    ]);

    await fetchPoeModels({ fetch });
    expect(getStoredModel("gpt-5.2")?.supported_endpoints).toEqual(["/v1/responses"]);
    expect(getStoredModel("gpt-4o")?.supported_endpoints).toEqual(["/v1/chat/completions"]);
  });

  it("maps supported_endpoints when present", async () => {
    const fetch = mockFetch([
      {
        id: "gpt-5.2",
        object: "model",
        created: 1,
        owned_by: "OpenAI",
        supported_endpoints: ["/v1/responses", "/v1/chat/completions"],
      },
    ]);

    const models = await fetchPoeModels({ fetch });
    expect(models[0].supported_endpoints).toEqual(["/v1/responses", "/v1/chat/completions"]);
  });

  it("maps reasoning effort as string array", async () => {
    const fetch = mockFetch([
      {
        id: "o3",
        object: "model",
        created: 1,
        owned_by: "OpenAI",
        reasoning: { supports_reasoning_effort: ["low", "medium", "high"] },
      },
    ]);

    const models = await fetchPoeModels({ fetch });
    expect(models[0].reasoning?.supports_reasoning_effort).toEqual(["low", "medium", "high"]);
  });
});
