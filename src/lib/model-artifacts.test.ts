import { beforeAll, describe, expect, it } from "vitest";

let renderModelArtifactMarkdown: typeof import("./model-artifacts").renderModelArtifactMarkdown;

beforeAll(async () => {
  process.env.NEXT_PUBLIC_SANITY_PROJECT_ID = "g1zo7y59";
  process.env.NEXT_PUBLIC_SANITY_DATASET = "production";
  ({ renderModelArtifactMarkdown } = await import("./model-artifacts"));
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
          priority: "High (1h)",
          inputTokensPer1M: "$0.05",
          outputTokensPer1M: "$0.08",
        },
      ],
    });

    expect(markdown).toContain("# Qwen Test");
    expect(markdown).not.toContain("[Back to inference docs](/inference-api)");
    expect(markdown).toContain("![Qwen Test icon](https://example.com/icon.png)");
    expect(markdown).toContain("Open this model in the [Playground](https://example.com/playground).");
    expect(markdown).toContain("| High (1h) | $0.05 | $0.08 |");
    expect(markdown).not.toContain("**Model ID:** `Qwen/Test`");
    expect(markdown).toContain("**Type:** chat");
    expect(markdown).toContain("Model body content");
    expect(markdown).toContain("## Playground");
  });
});
