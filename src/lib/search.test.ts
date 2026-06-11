import {describe, expect, it} from "vitest";
import {stripMarkdown, searchDocs} from "./search";
import type {DocSearchIndexItem} from "@/sanity/types";

describe("stripMarkdown", () => {
  it("strips markdown from strings", () => {
    expect(stripMarkdown("# Title\n`code` **bold**")).toBe("Title code bold");
  });

  it("returns '' for non-string input instead of throwing", () => {
    // Sanity bodies are Portable Text (arrays). Before the guard, this threw
    // `e.replace is not a function` and 500'd the whole /api/search request.
    expect(stripMarkdown([{_type: "block"}] as unknown as string)).toBe("");
    expect(stripMarkdown(undefined as unknown as string)).toBe("");
    expect(stripMarkdown({} as unknown as string)).toBe("");
  });
});

describe("searchDocs", () => {
  it("does not throw when a doc body is Portable Text (non-string)", () => {
    const docs = [
      {
        _id: "1",
        title: "Batch inference",
        // Portable Text array, exactly what Sanity stores — not a string.
        body: [
          {_type: "block", children: [{_type: "span", text: "about batches"}]},
        ],
        slug: "batch-inference",
        productSlug: "inference-api",
        productName: "Inference API",
      },
    ] as unknown as DocSearchIndexItem[];

    expect(() => searchDocs(docs, "batch")).not.toThrow();
    const results = searchDocs(docs, "batch");
    expect(results[0]?._id).toBe("1");
  });
});
