import { visit } from "unist-util-visit";
import type { Root, ContainerDirective } from "mdast-util-directive";
import { h } from "hastscript";

const admonitionTypes = {
  note: { emoji: "ℹ️", className: "admonition-note" },
  tip: { emoji: "💡", className: "admonition-tip" },
  warning: { emoji: "⚠️", className: "admonition-warning" },
  danger: { emoji: "🚨", className: "admonition-danger" },
  info: { emoji: "📘", className: "admonition-info" },
  caution: { emoji: "⚡", className: "admonition-caution" },
};

export default function remarkAdmonitions() {
  return (tree: Root) => {
    visit(tree, (node: any) => {
      if (
        node.type === "containerDirective" ||
        node.type === "leafDirective" ||
        node.type === "textDirective"
      ) {
        if (node.type !== "containerDirective") return;

        const directive = node as ContainerDirective;
        const type = directive.name as keyof typeof admonitionTypes;

        if (!admonitionTypes[type]) return;

        const config = admonitionTypes[type];
        const data = directive.data || (directive.data = {});
        const title =
          directive.attributes?.title ||
          type.charAt(0).toUpperCase() + type.slice(1);

        const tagName = "div";
        data.hName = tagName;
        data.hProperties = h(tagName, {
          class: `admonition ${config.className}`,
        }).properties;

        // Add title node
        directive.children.unshift({
          type: "paragraph",
          data: {
            hName: "div",
            hProperties: { class: "admonition-title" },
          },
          children: [
            { type: "text", value: `${config.emoji} ${title}` },
          ],
        } as any);
      }
    });
  };
}
