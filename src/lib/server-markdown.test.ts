// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import { renderServerMarkdownTemplates } from "./server-markdown";

afterEach(() => {
  vi.clearAllMocks();
});

describe("renderServerMarkdownTemplates", () => {
  it("provides a shared server-side template renderer", async () => {
    expect(renderServerMarkdownTemplates).toBeTypeOf("function");
  });

  it("expands the reasoning matrix from live capability data", async () => {
    const output = await renderServerMarkdownTemplates(
      "## Supported models\n\n{{#if reasoningCapabilitiesMatrix}}\n{{reasoningCapabilitiesMatrix}}\n{{else}}\nReasoning capability data is not currently available.\n{{/if}}",
      {
        fetchedAt: "2026-01-01T00:00:00.000Z",
        models: [{
          id: "qwen-3",
          name: "Qwen/Qwen3",
          displayName: "Qwen 3",
          type: "Generation",
          capabilities: ["reasoning"],
          supportedReasoningEfforts: {
            chatCompletions: ["none", "high"],
            responses: ["high", "max"],
          },
          pricing: { async: null, batch24h: null, realtime: null },
        }],
      },
    );

    expect(output).toContain(
      "| Model | `none` | `minimal` | `low` | `medium` | `high` | `xhigh` | `max` |",
    );
    expect(output).toContain(
      "| [Qwen 3](/inference-api/models/qwen-qwen3) | ✅ |  |  |  | ✅ |  | ✅ |",
    );
    expect(output).not.toContain("Reasoning capability data is not currently available.");
  });

  it("does not fetch capability data for pages without the matrix placeholder", async () => {
    const output = await renderServerMarkdownTemplates(
      "{{#each models}}{{id}}{{/each}}",
      {
        fetchedAt: "2026-01-01T00:00:00.000Z",
        models: [{
          id: "plain-model",
          name: "Plain/Model",
          displayName: "Plain Model",
          type: "Generation",
          capabilities: [],
          pricing: { async: null, batch24h: null, realtime: null },
        }],
      },
    );

    expect(output).toBe("plain-model");
  });
});
