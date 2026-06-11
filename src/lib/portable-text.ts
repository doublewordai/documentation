/**
 * Coercion of Sanity doc bodies into markdown text.
 *
 * Doc bodies are usually markdown strings, but Portable Text (an array of
 * block objects) also appears — e.g. the placeholder bodies of pages whose
 * real content comes from `externalSource`. Anything that serves a body as
 * text must coerce it first; passing blocks straight into a Response
 * stringifies them to "[object Object]".
 */

type PortableTextSpan = {
  _type?: string;
  text?: string;
  marks?: string[];
};

type PortableTextMarkDef = {
  _key?: string;
  _type?: string;
  href?: string;
};

type PortableTextBlock = {
  _type?: string;
  style?: string;
  children?: PortableTextSpan[];
  markDefs?: PortableTextMarkDef[];
  listItem?: string;
  level?: number;
};

function renderPortableTextSpan(
  span: PortableTextSpan,
  markDefs: PortableTextMarkDef[] = [],
): string {
  const text = span?.text || "";
  const marks = span?.marks || [];

  return marks.reduce((result, mark) => {
    if (mark === "strong") return `**${result}**`;
    if (mark === "code") return `\`${result}\``;

    const markDef = markDefs.find((def) => def._key === mark);
    if (markDef?._type === "link" && markDef.href) {
      return `[${result}](${markDef.href})`;
    }

    return result;
  }, text);
}

export function coerceMarkdownContent(content: unknown): string {
  if (typeof content === "string") {
    return content;
  }

  if (Array.isArray(content)) {
    return content
      .map((block) => {
        if (!block || typeof block !== "object") return "";

        const portableBlock = block as PortableTextBlock;
        const text = portableBlock.children
          ?.map((child) => renderPortableTextSpan(child, portableBlock.markDefs))
          .join("")
          .trim();

        if (!text) return "";

        const listPrefix =
          portableBlock.listItem === "bullet"
            ? `${"  ".repeat(Math.max((portableBlock.level || 1) - 1, 0))}- `
            : "";

        switch (portableBlock.style) {
          case "h1":
            return `# ${text}`;
          case "h2":
            return `## ${text}`;
          case "h3":
            return `### ${text}`;
          default:
            return `${listPrefix}${text}`;
        }
      })
      .filter(Boolean)
      .join("\n\n");
  }

  return "";
}
