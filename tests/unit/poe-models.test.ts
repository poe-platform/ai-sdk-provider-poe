import { describe, it, expect, vi, beforeEach } from "vitest";
import { fetchPoeModels, POE_DEFAULT_BASE_URL } from "../../src/poe-models.js";

describe("POE_DEFAULT_BASE_URL", () => {
  it("is the expected value", () => {
    expect(POE_DEFAULT_BASE_URL).toBe("https://api.poe.com/v1");
  });
});

describe("fetchPoeModels", () => {
  beforeEach(() => {
    vi.stubEnv("POE_API_KEY", "test-key");
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

  it("maps API response to PoeModelInfo with owner prefix", async () => {
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
    expect(models[0]).toEqual({
      id: "anthropic/claude-4-sonnet",
      rawId: "claude-4-sonnet",
      ownedBy: "Anthropic",
      displayName: "Claude 4 Sonnet",
      created: 1700000000,
      contextWindow: 200000,
      maxOutputTokens: 8192,
      supportsImages: true,
      supportsPromptCache: true,
      supportsReasoningBudget: true,
      pricing: {
        inputPerMillion: 3,
        outputPerMillion: 15,
        cacheReadPerMillion: 0.3,
        cacheWritePerMillion: 3.75,
      },
    });
  });

  it("prefixes openai and google models", async () => {
    const fetch = mockFetch([
      { id: "gpt-4o", object: "model", created: 1, owned_by: "OpenAI" },
      { id: "gemini-pro", object: "model", created: 2, owned_by: "Google" },
    ]);

    const models = await fetchPoeModels({ fetch });
    expect(models[0].id).toBe("openai/gpt-4o");
    expect(models[1].id).toBe("google/gemini-pro");
  });

  it("uses rawId when owner is unknown", async () => {
    const fetch = mockFetch([
      { id: "custom-model", object: "model", created: 1, owned_by: "SomeOrg" },
    ]);

    const models = await fetchPoeModels({ fetch });
    expect(models[0].id).toBe("custom-model");
    expect(models[0].rawId).toBe("custom-model");
  });

  it("defaults optional fields", async () => {
    const fetch = mockFetch([
      { id: "bare-model", object: "model", created: 1 },
    ]);

    const models = await fetchPoeModels({ fetch });
    expect(models[0]).toMatchObject({
      contextWindow: 0,
      maxOutputTokens: 0,
      supportsImages: false,
      supportsPromptCache: false,
    });
    expect(models[0].supportsReasoningBudget).toBeUndefined();
    expect(models[0].supportsReasoningEffort).toBeUndefined();
    expect(models[0].pricing).toBeUndefined();
  });

  it("maps reasoning effort as string array", async () => {
    const fetch = mockFetch([
      {
        id: "o3",
        object: "model",
        created: 1,
        owned_by: "OpenAI",
        supports_reasoning_effort: ["low", "medium", "high"],
      },
    ]);

    const models = await fetchPoeModels({ fetch });
    expect(models[0].supportsReasoningEffort).toEqual(["low", "medium", "high"]);
  });
});
