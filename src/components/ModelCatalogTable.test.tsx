import { fireEvent, render, screen, within } from "@testing-library/react";
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
  it("shows standard pricing by default", () => {
    render(<ModelCatalogTable artifacts={artifacts} />);

    expect(screen.getByRole("button", { name: "Standard" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("button", { name: "Cache read" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
    expect(screen.queryByText("$0.10 in")).not.toBeInTheDocument();
    expect(screen.getAllByText("$1.00 in")).toHaveLength(1);
  });

  it("replaces supported input prices without changing output prices", () => {
    render(<ModelCatalogTable artifacts={artifacts} />);
    fireEvent.click(screen.getByRole("button", { name: "Cache read" }));

    expect(screen.getByRole("button", { name: "Cache read" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    const cachedRow = screen.getByRole("row", { name: /Cached model/ });
    expect(within(cachedRow).getByText("$1.00 in")).toHaveClass("line-through");
    expect(within(cachedRow).getByText("$0.10 in")).toBeInTheDocument();
    expect(within(cachedRow).getByText("$2.00 out")).toBeInTheDocument();
  });

  it("keeps standard input prices for models without cache support", () => {
    render(<ModelCatalogTable artifacts={artifacts} />);
    fireEvent.click(screen.getByRole("button", { name: "Cache read" }));

    const standardRow = screen.getByRole("row", { name: /Standard model/ });
    expect(within(standardRow).getByText("$0.80 in")).not.toHaveClass("line-through");
    expect(within(standardRow).getByText("$1.60 out")).toBeInTheDocument();
  });
});
