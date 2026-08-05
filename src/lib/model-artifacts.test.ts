import { beforeAll, describe, expect, it } from "vitest";

let renderModelArtifactMarkdown: typeof import("./model-artifacts").renderModelArtifactMarkdown;
let buildModelArtifacts: typeof import("./model-artifacts").buildModelArtifacts;
let renderModelsIndexMarkdown: typeof import("./model-artifacts").renderModelsIndexMarkdown;

beforeAll(async () => {
  process.env.NEXT_PUBLIC_SANITY_PROJECT_ID = "g1zo7y59";
  process.env.NEXT_PUBLIC_SANITY_DATASET = "production";
  ({ buildModelArtifacts, renderModelArtifactMarkdown, renderModelsIndexMarkdown } = await import("./model-artifacts"));
});

describe("model pricing triplets", () => {
  it("calculates cache reads for every available modality", () => {
    const [artifact] = buildModelArtifacts([{
      id: "enabled-model",
      name: "Provider/Enabled",
      displayName: "Enabled Model",
      type: "Generation",
      capabilities: [],
      pricing: {
        realtime: { input: 0.000001, output: 0.000002 },
        async: { input: 0.000002, output: 0.000004 },
        batch24h: { input: 0.000003, output: 0.000006 },
      },
      cachePricing: {
        enabled: true,
        readMultiplier: 0.1,
        writeMultiplier5m: null,
        writeMultiplier1h: null,
        writeMultiplier24h: null,
        minPrefixTokens: null,
        validFrom: null,
        validUntil: null,
      },
    }]);

    expect(artifact.pricing).toEqual([
      { priority: "Realtime", inputTokensPer1M: "\\$1.00", cacheReadTokensPer1M: "\\$0.10", outputTokensPer1M: "\\$2.00" },
      { priority: "Async", inputTokensPer1M: "\\$2.00", cacheReadTokensPer1M: "\\$0.20", outputTokensPer1M: "\\$4.00" },
      { priority: "Batch (24h)", inputTokensPer1M: "\\$3.00", cacheReadTokensPer1M: "\\$0.30", outputTokensPer1M: "\\$6.00" },
    ]);
  });

  it("omits future and expired cache-read tariffs", () => {
    const makeModel = (validFrom: string | null, validUntil: string | null) => ({
      id: `${validFrom}-${validUntil}`,
      name: `Provider/${validFrom}-${validUntil}`,
      displayName: "Model",
      type: "Generation",
      capabilities: [],
      pricing: { realtime: null, async: { input: 0.000002, output: 0.000004 }, batch24h: null },
      cachePricing: {
        enabled: true,
        readMultiplier: 0.1,
        writeMultiplier5m: null,
        writeMultiplier1h: null,
        writeMultiplier24h: null,
        minPrefixTokens: null,
        validFrom,
        validUntil,
      },
    });
    const artifacts = buildModelArtifacts([
      makeModel("2999-01-01T00:00:00.000Z", null),
      makeModel(null, "2000-01-01T00:00:00.000Z"),
    ]);

    expect(artifacts[0].pricing[0].cacheReadTokensPer1M).toBeUndefined();
    expect(artifacts[1].pricing[0].cacheReadTokensPer1M).toBeUndefined();
  });

  it("renders input, cache read, and output in each catalog modality", () => {
    const markdown = renderModelsIndexMarkdown([{
      name: "Enabled Model",
      slug: "enabled-model",
      id: "enabled-model",
      rawName: "Provider/Enabled",
      type: "Generation",
      capabilities: [],
      playgroundUrl: "https://example.com",
      pricing: [
        { priority: "Realtime", inputTokensPer1M: "\\$1.00", cacheReadTokensPer1M: "\\$0.10", outputTokensPer1M: "\\$2.00" },
        { priority: "Async", inputTokensPer1M: "\\$2.00", outputTokensPer1M: "\\$4.00" },
      ],
    }]);

    expect(markdown).toContain("Prices are shown as input / cache read / output");
    expect(markdown).toContain("| \\$1.00 / \\$0.10 / \\$2.00 | \\$2.00 / — / \\$4.00 | — |");
    expect(markdown).not.toContain("| Cache read |");
  });
});

describe("renderModelArtifactMarkdown", () => {
  it("renders pricing and body into a standalone model page", () => {
    const markdown = renderModelArtifactMarkdown({
      name: "Qwen Test",
      slug: "qwen-test",
      id: "Qwen/Test",
      rawName: "Qwen/Test",
      iconUrl: "https://example.com/icon.png",
      type: "chat",
      capabilities: ["reasoning"],
      playgroundUrl: "https://example.com/playground",
      description: "Model body content",
      pricing: [
        {
          priority: "Async",
          inputTokensPer1M: "$0.05",
          cacheReadTokensPer1M: "$0.01",
          outputTokensPer1M: "$0.08",
        },
      ],
    });

    expect(markdown).toContain("# Qwen Test");
    expect(markdown).not.toContain("[Back to inference docs](/inference-api)");
    expect(markdown).toContain("![Qwen Test icon](https://example.com/icon.png)");
    expect(markdown).toContain("Open this model in the [Playground](https://example.com/playground).");
    expect(markdown).toContain("| Priority | Input Tokens (per 1M) | Cache Read Tokens (per 1M) | Output Tokens (per 1M) |");
    expect(markdown).toContain("| Async | $0.05 | $0.01 | $0.08 |");
    expect(markdown).not.toContain("**Model ID:** `Qwen/Test`");
    expect(markdown).toContain("**Type:** chat");
    expect(markdown).toContain("Model body content");
    expect(markdown).toContain("## Playground");
  });
});
