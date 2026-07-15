// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("fetchModelsServer", () => {
  it("requests and preserves reasoning capabilities from the admin model catalogue", async () => {
    vi.stubEnv("DOUBLEWORD_SYSTEM_API_KEY", "system-test-key");
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({
      data: [{
        alias: "reasoning-model",
        model_name: "Provider/reasoning-model",
        display_name: "Reasoning Model",
        model_type: "CHAT",
        supported_reasoning_efforts: {
          chat_completions: ["none", "high"],
          responses: ["low", "high", "max"],
        },
        tariffs: [],
      }],
    }), { status: 200 })));

    const { fetchModelsServer } = await import("./models");
    const response = await fetchModelsServer();

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("include=pricing,reasoning_capabilities"),
      expect.anything(),
    );
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("group=00000000-0000-0000-0000-000000000000"),
      expect.anything(),
    );
    expect(response.models[0].supportedReasoningEfforts).toEqual({
      chatCompletions: ["none", "high"],
      responses: ["low", "high", "max"],
    });
  });
});
