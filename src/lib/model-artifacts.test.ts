import { beforeAll, describe, expect, it } from "vitest";

let renderModelArtifactMarkdown: typeof import("./model-artifacts").renderModelArtifactMarkdown;
let renderReasoningCapabilitiesMatrix: typeof import("./model-artifacts").renderReasoningCapabilitiesMatrix;
let buildModelArtifacts: typeof import("./model-artifacts").buildModelArtifacts;

beforeAll(async () => {
  process.env.NEXT_PUBLIC_SANITY_PROJECT_ID = "g1zo7y59";
  process.env.NEXT_PUBLIC_SANITY_DATASET = "production";
  ({ buildModelArtifacts, renderModelArtifactMarkdown, renderReasoningCapabilitiesMatrix } = await import("./model-artifacts"));
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
      playgroundUrl: "https://example.com/playground",
      description: "Model body content",
      pricing: [
        {
          priority: "Async",
          inputTokensPer1M: "$0.05",
          outputTokensPer1M: "$0.08",
        },
      ],
    });

    expect(markdown).toContain("# Qwen Test");
    expect(markdown).not.toContain("[Back to inference docs](/inference-api)");
    expect(markdown).toContain("![Qwen Test icon](https://example.com/icon.png)");
    expect(markdown).toContain("Open this model in the [Playground](https://example.com/playground).");
    expect(markdown).toContain("| Async | $0.05 | $0.08 |");
    expect(markdown).not.toContain("**Model ID:** `Qwen/Test`");
    expect(markdown).toContain("**Type:** chat");
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
  });
});
