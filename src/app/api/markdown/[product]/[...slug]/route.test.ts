// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/sanity/lib/client", () => ({
  sanityFetch: vi.fn(),
}));

vi.mock("@/lib/models", () => ({
  fetchModelsServer: vi.fn(async () => ({
    models: [],
    fetchedAt: "2026-01-01T00:00:00.000Z",
  })),
  fetchModelsFromApiRoute: vi.fn(async () => ({
    models: [],
    fetchedAt: "2026-01-01T00:00:00.000Z",
  })),
}));

vi.mock("@/lib/model-artifacts", () => ({
  getModelArtifact: vi.fn(async () => null),
  renderModelArtifactMarkdown: vi.fn(() => ""),
}));

vi.mock("@/lib/server-markdown", () => ({
  renderServerMarkdownTemplates: vi.fn(async (content: string) =>
    content.replace(
      "{{reasoningCapabilitiesMatrix}}",
      "| Model | Chat Completions | Responses |\n|---|---|---|",
    )),
}));

import { GET } from "./route";
import { sanityFetch } from "@/sanity/lib/client";
import { renderServerMarkdownTemplates } from "@/lib/server-markdown";

const sanityFetchMock = vi.mocked(sanityFetch);

function getMarkdown(productSlug: string, slugSegments: string[]) {
  const path = `/api/markdown/${productSlug}/${slugSegments.join("/")}`;
  return GET(new NextRequest(`http://localhost:3000${path}`), {
    params: Promise.resolve({ product: productSlug, slug: slugSegments }),
  });
}

const EXTERNAL_URL =
  "https://raw.githubusercontent.com/doublewordai/use-cases/refs/heads/main/async-agents/README.md";

const EXTERNAL_README = "# Async Agents\n\nBatch inference for agent trees.\n";

// The placeholder body Sanity holds for pages whose content lives in
// externalSource — a Portable Text block array, not a markdown string.
const PORTABLE_TEXT_BODY = [
  {
    _type: "block",
    style: "normal",
    markDefs: [],
    children: [
      { _type: "span", text: "This page is sourced from GitHub.", marks: [] },
    ],
  },
];

describe("GET /api/markdown/[product]/[...slug]", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("serves the fetched markdown for a docPage backed by externalSource", async () => {
    sanityFetchMock.mockResolvedValueOnce({
      title: "Async Agents",
      body: PORTABLE_TEXT_BODY,
      externalSource: EXTERNAL_URL,
    });
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(EXTERNAL_README, {
        status: 200,
        headers: { "content-type": "text/plain; charset=utf-8" },
      })
    );

    const response = await getMarkdown("inference-api", ["async-agents.md"]);

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/plain");
    expect(await response.text()).toBe(EXTERNAL_README);
    expect(fetch).toHaveBeenCalledWith(EXTERNAL_URL, expect.anything());
    // The .md suffix from the rewrite is stripped before querying Sanity
    expect(sanityFetchMock).toHaveBeenCalledWith(
      expect.objectContaining({
        params: { productSlug: "inference-api", docSlug: "async-agents" },
      })
    );
  });

  it("falls back to the coerced Portable Text body when the external fetch fails", async () => {
    sanityFetchMock.mockResolvedValueOnce({
      title: "Async Agents",
      body: PORTABLE_TEXT_BODY,
      externalSource: EXTERNAL_URL,
    });
    vi.mocked(fetch).mockResolvedValueOnce(new Response("", { status: 404 }));

    const response = await getMarkdown("inference-api", ["async-agents.md"]);

    expect(response.status).toBe(200);
    const text = await response.text();
    expect(text).toBe("This page is sourced from GitHub.");
    expect(text).not.toContain("[object Object]");
  });

  it("falls back to the body when externalSource serves HTML (repo-link pages)", async () => {
    sanityFetchMock.mockResolvedValueOnce({
      title: "Some Guide",
      body: "Body authored in Sanity.",
      externalSource: "https://github.com/doublewordai/use-cases",
    });
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response("<!doctype html><html></html>", {
        status: 200,
        headers: { "content-type": "text/html; charset=utf-8" },
      })
    );

    const response = await getMarkdown("inference-api", ["some-guide.md"]);

    expect(await response.text()).toBe("Body authored in Sanity.");
  });

  it("serves a plain markdown string body and rewrites image filenames", async () => {
    sanityFetchMock.mockResolvedValueOnce({
      title: "Quickstart",
      body: "## Quickstart\n\n![diagram](flow.png)\n",
      images: [
        {
          filename: "flow.png",
          asset: { _id: "image-1", url: "https://cdn.sanity.io/images/flow.png" },
        },
      ],
    });

    const response = await getMarkdown("inference-api", ["quickstart.md"]);

    expect(response.status).toBe(200);
    expect(await response.text()).toBe(
      "## Quickstart\n\n![diagram](https://cdn.sanity.io/images/flow.png)\n"
    );
    // No externalSource and no template placeholders: nothing fetched
    expect(fetch).not.toHaveBeenCalled();
  });

  it("expands the live reasoning capability matrix in raw markdown", async () => {
    sanityFetchMock.mockResolvedValueOnce({
      title: "Reasoning effort",
      body: "## Model support\n\n{{reasoningCapabilitiesMatrix}}",
    });

    const response = await getMarkdown("inference-api", ["reasoning-controls.md"]);
    const text = await response.text();

    expect(text).toContain("| Model | Chat Completions | Responses |");
    expect(text).not.toContain("{{reasoningCapabilitiesMatrix}}");
    expect(renderServerMarkdownTemplates).toHaveBeenCalledOnce();
  });

  it("still serves content fetched from a linkedPost externalSource", async () => {
    sanityFetchMock.mockResolvedValueOnce({
      title: "Syndicated Post",
      body: PORTABLE_TEXT_BODY,
      linkedPost: {
        body: "Linked post fallback.",
        externalSource: "https://raw.githubusercontent.com/doublewordai/blog/main/post.md",
      },
    });
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response("# Syndicated\n\nFrom the blog repo.\n", {
        status: 200,
        headers: { "content-type": "text/plain; charset=utf-8" },
      })
    );

    const response = await getMarkdown("inference-api", ["syndicated-post.md"]);

    expect(await response.text()).toBe("# Syndicated\n\nFrom the blog repo.\n");
  });

  it("returns 404 for unknown documents", async () => {
    sanityFetchMock.mockResolvedValueOnce(null);

    const response = await getMarkdown("inference-api", ["does-not-exist.md"]);

    expect(response.status).toBe(404);
  });
});
