import { describe, expect, it } from "vitest";
import {
  parseSummary,
  resolveExternalMarkdownLink,
  type ExternalDocsSource,
} from "./external-docs";

const source: ExternalDocsSource = {
  id: "dw-cli",
  title: "CLI",
  productSlug: "inference-api",
  routePrefix: "cli",
  summaryUrl: "https://example.com/SUMMARY.md",
  rawBaseUrl: "https://example.com",
  repoUrl: "https://example.com/repo",
  productName: "Inference API",
};

describe("parseSummary", () => {
  it("maps mdBook summary headings and files into route entries", () => {
    const summary = `# Summary

[Introduction](introduction.md)

# Getting Started

- [Installation](installation.md)
- [Authentication](authentication.md)
`;

    expect(parseSummary(summary, source)).toEqual([
      {
        title: "Introduction",
        slug: "cli/introduction",
        sourcePath: "introduction.md",
        categoryName: "CLI",
        order: 0,
      },
      {
        title: "Installation",
        slug: "cli/installation",
        sourcePath: "installation.md",
        categoryName: "Getting Started",
        order: 1,
      },
      {
        title: "Authentication",
        slug: "cli/authentication",
        sourcePath: "authentication.md",
        categoryName: "Getting Started",
        order: 2,
      },
    ]);
  });
});

describe("resolveExternalMarkdownLink", () => {
  it("rewrites flat md links into internal docs routes", () => {
    expect(
      resolveExternalMarkdownLink({
        href: "authentication.md",
        productSlug: "inference-api",
        routePrefix: "cli",
        sourcePath: "installation.md",
      }),
    ).toBe("/inference-api/cli/authentication");
  });

  it("preserves anchors when rewriting markdown links", () => {
    expect(
      resolveExternalMarkdownLink({
        href: "commands.md#dw-project-create",
        productSlug: "inference-api",
        routePrefix: "cli",
        sourcePath: "quickstart.md",
      }),
    ).toBe("/inference-api/cli/commands#dw-project-create");
  });

  it("leaves non-markdown links unchanged", () => {
    expect(
      resolveExternalMarkdownLink({
        href: "https://doubleword.ai",
        productSlug: "inference-api",
        routePrefix: "cli",
        sourcePath: "quickstart.md",
      }),
    ).toBe("https://doubleword.ai");
  });
});
