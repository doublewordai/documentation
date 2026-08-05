import { describe, expect, it } from "vitest";
import { transformModels } from "./models";

describe("transformModels cache pricing", () => {
  it("preserves cache-read tariff metadata", () => {
    const [model] = transformModels([{
      model_name: "Provider/Model",
      alias: "model",
      model_type: "chat",
      cache_pricing: {
        enabled: true,
        read_multiplier: "0.1",
        write_multiplier_5m: null,
        write_multiplier_1h: null,
        write_multiplier_24h: null,
        min_prefix_tokens: "1024",
        valid_from: "2025-01-01T00:00:00.000Z",
        valid_until: "2027-01-01T00:00:00.000Z",
      },
    }]);

    expect(model.cachePricing).toEqual({
      enabled: true,
      readMultiplier: 0.1,
      writeMultiplier5m: null,
      writeMultiplier1h: null,
      writeMultiplier24h: null,
      minPrefixTokens: 1024,
      validFrom: "2025-01-01T00:00:00.000Z",
      validUntil: "2027-01-01T00:00:00.000Z",
    });
  });
});
