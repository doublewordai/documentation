import { describe, expect, it } from "vitest";
import {
  parseSummary,
  rewriteExternalMarkdownLinks,
  resolveExternalMarkdownLink,
  type ExternalDocsSource,
} from "./external-docs";

const source: ExternalDocsSource = {
  id: "dw-cli",
  title: "Doubleword CLI",
  productSlug: "dw-cli",
  summaryUrl: "https://example.com/SUMMARY.md",
  rawBaseUrl: "https://example.com",
  repoUrl: "https://example.com/repo",
  productName: "Doubleword CLI",
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
        slug: "introduction",
        sourcePath: "introduction.md",
        categoryName: "Doubleword CLI",
        order: 0,
        parentSlug: null,
      },
      {
        title: "Installation",
        slug: "installation",
        sourcePath: "installation.md",
        categoryName: "Getting Started",
        order: 1,
        parentSlug: null,
      },
      {
        title: "Authentication",
        slug: "authentication",
        sourcePath: "authentication.md",
        categoryName: "Getting Started",
        order: 2,
        parentSlug: null,
      },
    ]);
  });

  it("captures nested mdBook chapters as parent-child relationships", () => {
    const summary = `# Summary

- [Reference](reference.md)
  - [Commands](commands.md)
  - [Flags](flags.md)
`;

    expect(parseSummary(summary, source)).toEqual([
      {
        title: "Reference",
        slug: "reference",
        sourcePath: "reference.md",
        categoryName: "Doubleword CLI",
        order: 0,
        parentSlug: null,
      },
      {
        title: "Commands",
        slug: "commands",
        sourcePath: "commands.md",
        categoryName: "Doubleword CLI",
        order: 1,
        parentSlug: "reference",
      },
      {
        title: "Flags",
        slug: "flags",
        sourcePath: "flags.md",
        categoryName: "Doubleword CLI",
        order: 2,
        parentSlug: "reference",
      },
    ]);
  });
});

describe("resolveExternalMarkdownLink", () => {
  it("rewrites flat md links into internal docs routes", () => {
    expect(
      resolveExternalMarkdownLink({
        href: "authentication.md",
        productSlug: "dw-cli",
        routePrefix: "",
        sourcePath: "installation.md",
      }),
    ).toBe("/dw-cli/authentication");
  });

  it("preserves anchors when rewriting markdown links", () => {
    expect(
      resolveExternalMarkdownLink({
        href: "commands.md#dw-project-create",
        productSlug: "dw-cli",
        routePrefix: "",
        sourcePath: "quickstart.md",
      }),
    ).toBe("/dw-cli/commands#dw-project-create");
  });

  it("leaves non-markdown links unchanged", () => {
    expect(
      resolveExternalMarkdownLink({
        href: "https://doubleword.ai",
        productSlug: "dw-cli",
        routePrefix: "",
        sourcePath: "quickstart.md",
      }),
    ).toBe("https://doubleword.ai");
  });
});

describe("rewriteExternalMarkdownLinks", () => {
  it("rewrites sibling markdown links for agent-facing markdown pages", () => {
    expect(
      rewriteExternalMarkdownLinks({
        markdown: "[Auth](authentication.md)",
        productSlug: "dw-cli",
        routePrefix: "",
        sourcePath: "installation.md",
      }),
    ).toBe("[Auth](/dw-cli/authentication)");
  });

  it("rewrites relative directory links for non-md external content", () => {
    expect(
      rewriteExternalMarkdownLinks({
        markdown: "[Async agents](./async-agents/)",
        productSlug: "inference-api",
      }),
    ).toBe("[Async agents](/inference-api/async-agents)");
  });
});
