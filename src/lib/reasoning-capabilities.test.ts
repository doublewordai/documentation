// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("reasoning capability data", () => {
  it("provides a parser for the public models response", async () => {
    const reasoningModule = await import("./reasoning-capabilities");

    expect(reasoningModule).toHaveProperty("parseReasoningCapabilities");
    expect(reasoningModule.parseReasoningCapabilities).toBeTypeOf("function");
  });

  it("parses advertised efforts and ignores models without reasoning metadata", async () => {
    const { parseReasoningCapabilities } = await import("./reasoning-capabilities");

    expect(parseReasoningCapabilities({
      object: "list",
      data: [
        {
          id: "reasoning-model",
          supported_reasoning_efforts: {
            chat_completions: ["high", "none", "minimal", "high"],
            responses: ["max", "low", "future"],
          },
        },
        { id: "plain-model" },
        {
          id: "responses-only",
          supported_reasoning_efforts: {
            chat_completions: [],
            responses: ["medium"],
          },
        },
        { id: 123, supported_reasoning_efforts: { responses: ["high"] } },
      ],
    })).toEqual([
      {
        id: "reasoning-model",
        chatCompletions: ["none", "minimal", "high"],
        responses: ["low", "max", "future"],
      },
      {
        id: "responses-only",
        chatCompletions: [],
        responses: ["medium"],
      },
    ]);
  });

  it("returns an empty list for malformed responses", async () => {
    const { parseReasoningCapabilities } = await import("./reasoning-capabilities");

    expect(parseReasoningCapabilities(null)).toEqual([]);
    expect(parseReasoningCapabilities({ data: "not-an-array" })).toEqual([]);
  });

  it("fetches reasoning metadata for the Everyone group with the server credential", async () => {
    const { fetchReasoningCapabilities } = await import("./reasoning-capabilities");
    vi.stubEnv("DOUBLEWORD_SYSTEM_API_KEY", "system-test-key");
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({
      data: [{
        id: "reasoning-model",
        supported_reasoning_efforts: {
          chat_completions: ["high"],
          responses: ["high"],
        },
      }],
    }), { status: 200 })));

    await expect(fetchReasoningCapabilities()).resolves.toEqual([{
      id: "reasoning-model",
      chatCompletions: ["high"],
      responses: ["high"],
    }]);
    expect(fetch).toHaveBeenCalledWith(
      "https://api.doubleword.ai/v1/models?group=00000000-0000-0000-0000-000000000000&include_reasoning_capabilities=true",
      expect.objectContaining({
        headers: {
          Authorization: "Bearer system-test-key",
          Accept: "application/json",
        },
        next: {
          revalidate: 300,
          tags: ["reasoning-capabilities"],
        },
        signal: expect.any(AbortSignal),
      }),
    );
  });

  it("returns no reasoning metadata when the capability endpoint is unavailable", async () => {
    const { fetchReasoningCapabilities } = await import("./reasoning-capabilities");
    vi.stubEnv("DOUBLEWORD_SYSTEM_API_KEY", "system-test-key");
    vi.stubGlobal("fetch", vi.fn(async () => new Response("upstream error", { status: 503 })));
    vi.spyOn(console, "warn").mockImplementation(() => undefined);

    await expect(fetchReasoningCapabilities()).resolves.toEqual([]);
  });
});
