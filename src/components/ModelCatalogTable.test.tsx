import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import ModelCatalogTable from "./ModelCatalogTable";
import type { ModelArtifact } from "@/lib/model-artifacts";
import type { ModelDeprecation } from "@/lib/model-deprecations";

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

const deprecations: ModelDeprecation[] = [
  {
    id: "standard-model",
    name: "Standard model",
    replacement: [{ id: "cached-model", name: "Cached model" }, " if you need caching"],
  },
  {
    id: "retired-model",
    name: "Retired model",
    replacement: [{ id: "unlisted-model", name: "Unlisted model" }],
  },
];

function renderWithDeprecations() {
  render(
    <ModelCatalogTable
      artifacts={artifacts}
      deprecations={deprecations}
    />,
  );
}

afterEach(() => {
  window.history.replaceState(null, "", "/");
});

describe("ModelCatalogTable", () => {
  it("shows input, cache-read, and output prices for every modality", () => {
    render(<ModelCatalogTable artifacts={artifacts} deprecations={[]} />);

    expect(screen.queryByRole("button", { name: "Standard" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Cache read" })).not.toBeInTheDocument();
    expect(screen.getByText("Input / cache read / output per 1M tokens")).toBeInTheDocument();

    const cachedRow = screen.getByRole("row", { name: /Cached model/ });
    expect(within(cachedRow).getByText("$1.00 / $0.10 / $2.00")).toBeInTheDocument();
    expect(within(cachedRow).getByText("$0.50 / $0.05 / $1.00")).toBeInTheDocument();
  });

  it("repeats the input price when cache reads are unsupported", () => {
    render(<ModelCatalogTable artifacts={artifacts} deprecations={[]} />);

    const standardRow = screen.getByRole("row", { name: /Standard model/ });
    expect(within(standardRow).getByText("$0.80 / $0.80 / $1.60")).toBeInTheDocument();
  });

  it("shows no tabs when no models are scheduled for shutdown", () => {
    render(<ModelCatalogTable artifacts={artifacts} deprecations={[]} />);

    expect(screen.queryByRole("tablist")).not.toBeInTheDocument();
    expect(screen.getByRole("row", { name: /Standard model/ })).toBeInTheDocument();
  });

  it("keeps scheduled models out of the default Active Models tab", () => {
    renderWithDeprecations();

    expect(screen.getByRole("tab", { name: "Active Models" })).toHaveAttribute("aria-selected", "true");
    const active = screen.getByRole("tabpanel", { name: "Active Models" });
    expect(within(active).getByRole("row", { name: /Cached model/ })).toBeInTheDocument();
    expect(within(active).queryByRole("row", { name: /Standard model/ })).not.toBeInTheDocument();
  });

  it("lists replacements in the Scheduled for Shutdown tab", () => {
    renderWithDeprecations();

    fireEvent.click(screen.getByRole("tab", { name: "Scheduled for Shutdown" }));

    expect(window.location.hash).toBe("#scheduled-for-deprecation");
    const scheduled = screen.getByRole("tabpanel", { name: "Scheduled for Shutdown" });
    expect(within(scheduled).getAllByRole("columnheader").map((header) => header.textContent)).toEqual(["Model", "Recommended Replacement"]);
    const standardRow = within(scheduled).getByRole("row", { name: /Standard model/ });
    expect(within(standardRow).queryByRole("link", { name: "Standard model" })).not.toBeInTheDocument();
    expect(within(standardRow).getByRole("link", { name: "Cached model" })).toHaveAttribute("href", "/inference-api/models/cached-model");
    expect(standardRow).toHaveTextContent("Cached model if you need caching");
    const retiredRow = within(scheduled).getByRole("row", { name: /Retired model/ });
    expect(within(retiredRow).queryByRole("link")).not.toBeInTheDocument();
    expect(retiredRow).toHaveTextContent("Unlisted model");
  });

  it("opens the Scheduled for Shutdown tab from its anchor", () => {
    window.history.replaceState(null, "", "/#scheduled-for-deprecation");

    renderWithDeprecations();

    expect(screen.getByRole("tab", { name: "Scheduled for Shutdown" })).toHaveAttribute("aria-selected", "true");
  });
});
