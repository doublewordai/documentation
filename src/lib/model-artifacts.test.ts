import { beforeAll, describe, expect, it } from "vitest";

let renderModelArtifactMarkdown: typeof import("./model-artifacts").renderModelArtifactMarkdown;
let renderReasoningCapabilitiesMatrix: typeof import("./model-artifacts").renderReasoningCapabilitiesMatrix;
let buildModelArtifacts: typeof import("./model-artifacts").buildModelArtifacts;
let renderModelsIndexMarkdown: typeof import("./model-artifacts").renderModelsIndexMarkdown;
let renderModelsIndexIntroMarkdown: typeof import("./model-artifacts").renderModelsIndexIntroMarkdown;

beforeAll(async () => {
  process.env.NEXT_PUBLIC_SANITY_PROJECT_ID = "g1zo7y59";
  process.env.NEXT_PUBLIC_SANITY_DATASET = "production";
  ({ buildModelArtifacts, renderModelArtifactMarkdown, renderModelsIndexIntroMarkdown, renderModelsIndexMarkdown, renderReasoningCapabilitiesMatrix } = await import("./model-artifacts"));
});

describe("renderReasoningCapabilitiesMatrix", () => {
  it("flattens endpoint capabilities into checkbox columns", () => {
    const markdown = renderReasoningCapabilitiesMatrix(
      [
        {
          id: "qwen-3",
          name: "Qwen/Qwen3",
          displayName: "Qwen 3",
          type: "Generation",
          capabilities: ["reasoning"],
          supportedReasoningEfforts: {
            chatCompletions: ["none", "medium", "high"],
            responses: ["low", "high", "max"],
          },
          pricing: { async: null, batch24h: null, realtime: null },
        },
        {
          id: "qwen-3-vl-instruct",
          name: "Qwen/Qwen3-VL-Instruct",
          displayName: "Qwen 3 VL Instruct",
          type: "Generation",
          capabilities: ["vision"],
          supportedReasoningEfforts: {
            chatCompletions: ["none"],
            responses: ["none"],
          },
          pricing: { async: null, batch24h: null, realtime: null },
        },
        {
          id: "qwen-3-14b",
          name: "Qwen/Qwen3-14B-FP8",
          displayName: "Qwen 3 14B",
          type: "Generation",
          capabilities: [],
          supportedReasoningEfforts: {
            chatCompletions: ["minimal", "medium", "high"],
            responses: ["minimal", "medium", "high"],
          },
          pricing: { async: null, batch24h: null, realtime: null },
        },
        {
          id: "glm-5-1",
          name: "zai-org/GLM-5.1-FP8",
          displayName: "GLM 5.1",
          type: "Generation",
          capabilities: ["reasoning"],
          pricing: { async: null, batch24h: null, realtime: null },
        },
      ],
    );

    expect(markdown).toContain(
      "| Model | `none` | `minimal` | `low` | `medium` | `high` | `xhigh` | `max` |",
    );
    expect(markdown).toContain(
      "| [Qwen 3](/inference-api/models/qwen-qwen3) | ✅ |  | ✅ | ✅ | ✅ |  | ✅ |",
    );
    expect(markdown).not.toContain("Chat Completions");
    expect(markdown).not.toContain("Responses");
    expect(markdown).not.toContain("Qwen 3 14B");
    expect(markdown).not.toContain("GLM 5.1");
    expect(markdown).not.toContain("Qwen 3 VL Instruct");
    expect(markdown).toContain(
      "Models not listed do not currently advertise reasoning effort controls.",
    );
  });

  it("renders a useful fallback when no capability data is available", () => {
    expect(renderReasoningCapabilitiesMatrix([])).toContain(
      "Reasoning capability data is not currently available.",
    );
  });
});

describe("buildModelArtifacts", () => {
  it("carries reasoning efforts into generated model pages", () => {
    const artifacts = buildModelArtifacts([
      {
        id: "qwen-3",
        name: "Qwen/Qwen3",
        displayName: "Qwen 3",
        type: "Generation",
        capabilities: ["reasoning"],
        supportedReasoningEfforts: {
          chatCompletions: ["none", "high"],
          responses: ["high"],
        },
        pricing: { async: null, batch24h: null, realtime: null },
      },
      {
        id: "plain-model",
        name: "Plain/Model",
        displayName: "Plain Model",
        type: "Generation",
        capabilities: [],
        supportedReasoningEfforts: {
          chatCompletions: ["none"],
          responses: ["none"],
        },
        pricing: { async: null, batch24h: null, realtime: null },
      },
    ]);

    expect(artifacts[0].reasoningEfforts).toEqual({
      chatCompletions: ["none", "high"],
      responses: ["high"],
    });
    expect(artifacts[1].reasoningEfforts).toBeUndefined();
  });

  it("calculates cache-read pricing only when caching and realtime pricing are available", () => {
    const [enabled, disabled, incomplete] = buildModelArtifacts([
      {
        id: "enabled", name: "Provider/Enabled", displayName: "Enabled",
        type: "Generation", capabilities: [],
        pricing: {
          realtime: { input: 0.000001, output: 0.000002 },
          async: { input: 0.0000005, output: 0.000001 },
          batch24h: { input: 0.0000003, output: 0.0000006 },
        },
        cachePricing: { enabled: true, readMultiplier: 0.1, writeMultiplier5m: 1.25, writeMultiplier1h: 2, writeMultiplier24h: 3, minPrefixTokens: 1024, validFrom: null, validUntil: null },
      },
      {
        id: "disabled", name: "Provider/Disabled", displayName: "Disabled",
        type: "Generation", capabilities: [],
        pricing: { async: null, batch24h: null, realtime: { input: 0.000001, output: 0.000002 } },
        cachePricing: { enabled: false, readMultiplier: 0.1, writeMultiplier5m: 1.25, writeMultiplier1h: 2, writeMultiplier24h: 3, minPrefixTokens: 1024, validFrom: null, validUntil: null },
      },
      {
        id: "incomplete", name: "Provider/Incomplete", displayName: "Incomplete",
        type: "Generation", capabilities: [],
        pricing: { async: null, batch24h: null, realtime: null },
        cachePricing: { enabled: true, readMultiplier: 0.1, writeMultiplier5m: 1.25, writeMultiplier1h: 2, writeMultiplier24h: 3, minPrefixTokens: 1024, validFrom: null, validUntil: null },
      },
    ]);

    expect(enabled).toMatchObject({ cacheReadPricePer1M: "\\$0.10", cacheReadMultiplier: 0.1 });
    expect(enabled.pricing).toEqual([
      { priority: "Realtime", inputTokensPer1M: "\\$1.00", outputTokensPer1M: "\\$2.00", cacheReadPricePer1M: "\\$0.10" },
      { priority: "Async", inputTokensPer1M: "\\$0.50", outputTokensPer1M: "\\$1.00", cacheReadPricePer1M: "\\$0.05" },
      { priority: "Batch (24h)", inputTokensPer1M: "\\$0.30", outputTokensPer1M: "\\$0.60", cacheReadPricePer1M: "\\$0.03" },
    ]);
    expect(disabled.cacheReadPricePer1M).toBeUndefined();
    expect(incomplete.cacheReadPricePer1M).toBeUndefined();
  });
});

describe("renderModelsIndexMarkdown", () => {
  it("shows model-specific cache-read multipliers and unsupported fallbacks", () => {
    const markdown = renderModelsIndexMarkdown([
      {
        name: "Enabled", slug: "enabled", id: "enabled", rawName: "Enabled", type: "Generation", capabilities: [], playgroundUrl: "https://example.com/enabled", cacheReadPricePer1M: "\\$0.10", cacheReadMultiplier: 0.1,
        pricing: [
          { priority: "Realtime", inputTokensPer1M: "\\$1.00", outputTokensPer1M: "\\$2.00", cacheReadPricePer1M: "\\$0.10" },
          { priority: "Async", inputTokensPer1M: "\\$0.50", outputTokensPer1M: "\\$1.00", cacheReadPricePer1M: "\\$0.05" },
        ],
      },
      { name: "Unsupported", slug: "unsupported", id: "unsupported", rawName: "Unsupported", type: "Generation", capabilities: [], playgroundUrl: "https://example.com/unsupported", pricing: [] },
    ]);

    expect(markdown).toContain("| Model | Realtime | Async | Batch (24h) |");
    expect(markdown).not.toContain("| Provider |");
    expect(markdown).not.toContain("Cache&nbsp;read");
    expect(markdown).toContain("| [Enabled](/inference-api/models/enabled) | \\$1.00 in → \\$0.10 cached / \\$2.00 out | \\$0.50 in → \\$0.05 cached / \\$1.00 out | — |");
    expect(markdown).toContain("| [Unsupported](/inference-api/models/unsupported) | — | — | — |");
    expect(markdown).not.toContain("❌ Prompt caching is not supported for this model.");
    expect(markdown).not.toContain("90% discount");
  });

  it("renders the web intro without a duplicate static catalog", () => {
    const markdown = renderModelsIndexIntroMarkdown();

    expect(markdown).toContain("Prompt-caching availability and rates are model-specific");
    expect(markdown).not.toContain("| Model |");
    expect(markdown).not.toContain("## Model Catalog");
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
      reasoningEfforts: {
        chatCompletions: ["none", "medium", "high"],
        responses: ["low", "high"],
      },
      cacheReadPricePer1M: "\\$0.10",
      cacheReadMultiplier: 0.1,
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
    expect(markdown).toContain("**Cache read:** \\$0.10 per 1M input tokens (0.1× standard input price)");
    expect(markdown).toContain("Model body content");
    expect(markdown).toContain("## Reasoning efforts");
    expect(markdown).toContain("**Supported:** `none`, `low`, `medium`, `high`");
    expect(markdown).not.toContain("Chat Completions");
    expect(markdown).not.toContain("Responses");
    expect(markdown).toContain("[reasoning effort guide](/inference-api/reasoning-controls)");
    expect(markdown).toContain("## Playground");
  });

  it("omits reasoning efforts when the model does not advertise them", () => {
    const markdown = renderModelArtifactMarkdown({
      name: "Plain Model",
      slug: "plain-model",
      id: "plain-model",
      rawName: "plain-model",
      type: "Generation",
      capabilities: [],
      playgroundUrl: "https://example.com/playground",
      pricing: [],
    });

    expect(markdown).not.toContain("## Reasoning efforts");
    expect(markdown).not.toContain("**Cache read:**");
  });
});
