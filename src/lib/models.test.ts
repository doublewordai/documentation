// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.resetModules();
});

const baseModel = {
  model_name: "Provider/Test-Model",
  alias: "provider/test-model",
  model_type: "generation",
  tariffs: [],
};

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

describe("transformModels cache pricing", () => {
  it("normalizes enabled cache pricing without inventing defaults", async () => {
    const { transformModels } = await import("./models");
    const [model] = transformModels([{
      ...baseModel,
      cache_pricing: {
        enabled: true,
        read_multiplier: "0.1000",
        write_multiplier_5m: "1.2500",
        write_multiplier_1h: "2.0000",
        write_multiplier_24h: "3.0000",
        min_prefix_tokens: 1024,
        valid_from: "2026-07-01T00:00:00Z",
        valid_until: null,
      },
    }]);

    expect(model.cachePricing).toEqual({
      enabled: true,
      readMultiplier: 0.1,
      writeMultiplier5m: 1.25,
      writeMultiplier1h: 2,
      writeMultiplier24h: 3,
      minPrefixTokens: 1024,
      validFrom: "2026-07-01T00:00:00Z",
      validUntil: null,
    });
  });

  it("retains disabled metadata and represents absent metadata as null", async () => {
    const { transformModels } = await import("./models");
    const [disabled, absent] = transformModels([
      {
        ...baseModel,
        alias: "provider/disabled",
        cache_pricing: {
          enabled: false,
          read_multiplier: null,
          write_multiplier_5m: null,
          write_multiplier_1h: null,
          write_multiplier_24h: null,
          min_prefix_tokens: null,
          valid_from: null,
          valid_until: null,
        },
      },
      { ...baseModel, alias: "provider/absent" },
    ]);

    expect(disabled.cachePricing).toEqual({
      enabled: false,
      readMultiplier: null,
      writeMultiplier5m: null,
      writeMultiplier1h: null,
      writeMultiplier24h: null,
      minPrefixTokens: null,
      validFrom: null,
      validUntil: null,
    });
    expect(absent.cachePricing).toBeNull();
  });
});
