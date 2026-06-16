import { describe, expect, it } from "vitest";
import { coerceMarkdownContent } from "./portable-text";

describe("coerceMarkdownContent", () => {
  it("returns markdown strings unchanged", () => {
    expect(coerceMarkdownContent("# Title\n\nBody.")).toBe("# Title\n\nBody.");
  });

  it("renders Portable Text blocks as markdown", () => {
    const blocks = [
      {
        _type: "block",
        style: "h2",
        markDefs: [],
        children: [{ _type: "span", text: "Heading", marks: [] }],
      },
      {
        _type: "block",
        style: "normal",
        markDefs: [
          { _key: "l1", _type: "link", href: "https://example.com" },
        ],
        children: [
          { _type: "span", text: "bold", marks: ["strong"] },
          { _type: "span", text: " and ", marks: [] },
          { _type: "span", text: "linked", marks: ["l1"] },
        ],
      },
      {
        _type: "block",
        style: "normal",
        listItem: "bullet",
        level: 1,
        markDefs: [],
        children: [{ _type: "span", text: "item", marks: [] }],
      },
    ];

    expect(coerceMarkdownContent(blocks)).toBe(
      "## Heading\n\n**bold** and [linked](https://example.com)\n\n- item"
    );
  });

  it("never yields a stringified object for non-string bodies", () => {
    for (const value of [undefined, null, {}, [{ _type: "block" }]]) {
      expect(coerceMarkdownContent(value)).not.toContain("[object Object]");
    }
  });

  it("returns an empty string for nullish or unrenderable values", () => {
    expect(coerceMarkdownContent(undefined)).toBe("");
    expect(coerceMarkdownContent(null)).toBe("");
    expect(coerceMarkdownContent({ foo: "bar" })).toBe("");
  });
});
