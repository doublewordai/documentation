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
      index: 0,
      name: "Qwen/Test",
      slug: "qwen-test",
      playgroundUrl: "https://example.com/playground",
      body: "Model body content",
      pricing: [
        {
          priority: "High (1h)",
          inputTokensPer1M: "$0.05",
          outputTokensPer1M: "$0.08",
        },
      ],
    });

    expect(markdown).toContain("# Qwen/Test");
    expect(markdown).toContain("[Back to model pricing](/models)");
    expect(markdown).toContain("Open in the [Playground](https://example.com/playground).");
    expect(markdown).toContain("| High (1h) | $0.05 | $0.08 |");
    expect(markdown).toContain("Model body content");
  });
});
