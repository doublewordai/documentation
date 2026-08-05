import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import ModelCatalogTable from "./ModelCatalogTable";
import type { ModelArtifact } from "@/lib/model-artifacts";

const artifacts: ModelArtifact[] = [
  {
    name: "Cached model",
    slug: "cached-model",
    id: "cached-model",
    rawName: "Cached model",
    type: "Generation",
    capabilities: [],
    cacheReadMultiplier: 0.1,
    playgroundUrl: "https://example.com/cached-model",
    pricing: [
      {
        priority: "Realtime",
        inputTokensPer1M: "\\$1.00",
        outputTokensPer1M: "\\$2.00",
        cacheReadPricePer1M: "\\$0.10",
      },
      {
        priority: "Async",
        inputTokensPer1M: "\\$0.50",
        outputTokensPer1M: "\\$1.00",
        cacheReadPricePer1M: "\\$0.05",
      },
    ],
  },
  {
    name: "Standard model",
    slug: "standard-model",
    id: "standard-model",
    rawName: "Standard model",
    type: "Generation",
    capabilities: [],
    playgroundUrl: "https://example.com/standard-model",
    pricing: [
      {
        priority: "Realtime",
        inputTokensPer1M: "\\$0.80",
        outputTokensPer1M: "\\$1.60",
      },
    ],
  },
];

describe("ModelCatalogTable", () => {
  it("shows input, cache-read, and output prices for every modality", () => {
    render(<ModelCatalogTable artifacts={artifacts} />);

    expect(screen.queryByRole("button", { name: "Standard" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Cache read" })).not.toBeInTheDocument();
    expect(screen.getByText("Input / cache read / output per 1M tokens")).toBeInTheDocument();

    const cachedRow = screen.getByRole("row", { name: /Cached model/ });
    expect(within(cachedRow).getByText("$1.00 / $0.10 / $2.00")).toBeInTheDocument();
    expect(within(cachedRow).getByText("$0.50 / $0.05 / $1.00")).toBeInTheDocument();
  });

  it("uses a dash for unsupported cache-read prices", () => {
    render(<ModelCatalogTable artifacts={artifacts} />);

    const standardRow = screen.getByRole("row", { name: /Standard model/ });
    expect(within(standardRow).getByText("$0.80 / — / $1.60")).toBeInTheDocument();
  });
});
