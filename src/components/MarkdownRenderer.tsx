import { MarkdownAsync } from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import remarkDirective from "remark-directive";
import remarkUnwrapImages from "remark-unwrap-images";
import rehypeShiki from "@shikijs/rehype";
import rehypeKatex from "rehype-katex";
import rehypeRaw from "rehype-raw";
import rehypeSlug from "rehype-slug";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import remarkAdmonitions from "@/app/lib/remark-admonitions";
import remarkCodeTabs from "@/app/lib/remark-code-tabs";
import CopyButton from "./CopyButton";
import { fetchModelsServer } from "@/lib/models";
import { templateMarkdown, buildTemplateContext } from "@/lib/handlebars";
import { StatusWidget } from './StatusWidget';
import { rewriteExternalMarkdownLinks } from "@/lib/external-docs";


/**
 * Convert sidenote syntax to footnote syntax in raw markdown
 * This must happen before parsing since remark-gfm parses footnotes during initial parse
 *
 * Converts:
 *   [>id] -> [^id]
 *   [>id]: content -> [^id]: content
 *   [>_id] -> [^id] (unnumbered become regular footnotes)
 */
function convertSidenotesToFootnotes(markdown: string): string {
  // Convert references: [>id] or [>_id] -> [^id]
  let result = markdown.replace(/\[>_?([^\]]+)\]/g, "[^$1]");

  // Convert definitions: [>id]: or [>_id]: -> [^id]:
  result = result.replace(/\[\^_?([^\]]+)\]:/g, "[^$1]:");

  return result;
}

type ImageData = {
  filename: string;
  asset: {
    _id: string;
    url: string;
  };
  alt?: string;
  caption?: string;
};

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

function coerceMarkdownContent(content: unknown): string {
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

/**
 * Convert a raw GitHub URL to a base URL for resolving relative links
 * e.g., https://raw.githubusercontent.com/doublewordai/use-cases/refs/heads/main/README.md
 *    -> https://github.com/doublewordai/use-cases/tree/main
 */
function getGitHubBaseUrl(rawUrl: string): string | null {
  const match = rawUrl.match(
    /^https:\/\/raw\.githubusercontent\.com\/([^/]+)\/([^/]+)\/refs\/heads\/([^/]+)\/(.+)$/,
  );
  if (!match) return null;

  const [, owner, repo, branch, filePath] = match;
  // Get the directory containing the file
  const dirPath = filePath.includes("/")
    ? filePath.replace(/\/[^/]+$/, "")
    : "";

  if (dirPath) {
    return `https://github.com/${owner}/${repo}/tree/${branch}/${dirPath}`;
  }
  return `https://github.com/${owner}/${repo}/tree/${branch}`;
}

export async function MarkdownRenderer({
  content,
  images,
  externalSource,
  productSlug,
  externalDocRoutePrefix,
  externalDocSourcePath,
  disableHeadingLinks = false,
}: {
  content: unknown;
  images?: ImageData[];
  externalSource?: string;
  productSlug?: string;
  externalDocRoutePrefix?: string;
  externalDocSourcePath?: string;
  disableHeadingLinks?: boolean;
}) {
  const markdownContent = coerceMarkdownContent(content);

  // Fetch models data for templating
  const modelsResponse = await fetchModelsServer();
  const templateContext = buildTemplateContext(modelsResponse);

  // Template the content with Handlebars (server-side)
  // Client-side placeholders like {{apiKey}} and {{selectedModel.*}} are preserved
  let processedContent = templateMarkdown(markdownContent, templateContext);

  // Convert sidenote syntax [>id] to footnote syntax [^id] before parsing
  processedContent = convertSidenotesToFootnotes(processedContent);

  // Convert <StatusWidget /> to <status-widget> for rehype-raw compatibility
  processedContent = processedContent.replace(
    /<StatusWidget\s*\/?\s*>/gi,
    "<status-widget>",
  );
  processedContent = processedContent.replace(
    /<\/StatusWidget>/gi,
    "</status-widget>",
  );

  // Convert relative directory links to docs page links if we have a product slug
  if (externalSource && productSlug) {
    processedContent = rewriteExternalMarkdownLinks({
      markdown: processedContent,
      productSlug,
      routePrefix: externalDocRoutePrefix,
      sourcePath: externalDocSourcePath,
    });
  }

  // Replace image filenames with Sanity CDN URLs
  if (images && images.length > 0) {
    const imageMap = new Map(
      images.filter((img) => img.filename).map((img) => [img.filename, img]),
    );

    imageMap.forEach((imageData, filename) => {
      // Match markdown image syntax: ![alt](filename)
      const regex = new RegExp(`!\\[([^\\]]*)\\]\\(${filename}\\)`, "g");
      processedContent = processedContent.replace(
        regex,
        `![$1](${imageData.asset.url})`,
      );
    });
  }

  // Custom image component that uses Sanity metadata
  const ImageComponent = ({
    src,
    alt,
    ...props
  }: React.ImgHTMLAttributes<HTMLImageElement>) => {
    // Find the matching image data from Sanity
    const srcString = typeof src === "string" ? src : undefined;
    const imageData = images?.find(
      (img) =>
        srcString?.includes(img.asset._id) || srcString === img.asset.url,
    );

    // Use Sanity's alt text if available, otherwise fall back to markdown alt
    const altText = imageData?.alt || alt || "";
    const caption = imageData?.caption;

    if (caption) {
      return (
        <figure className="my-6">
          <img
            src={srcString}
            alt={altText}
            className="rounded-lg w-full"
            {...props}
          />
          <figcaption className="mt-2 text-sm text-gray-600 dark:text-gray-400 text-center italic">
            {caption}
          </figcaption>
        </figure>
      );
    }

    return (
      <img
        src={srcString}
        alt={altText}
        className="rounded-lg w-full my-6"
        {...props}
      />
    );
  };

  // Helper function to extract text from React children recursively
  const extractText = (node: any): string => {
    if (typeof node === "string") {
      return node;
    }
    if (Array.isArray(node)) {
      return node.map(extractText).join("");
    }
    if (node && typeof node === "object") {
      if (node.props && node.props.children) {
        return extractText(node.props.children);
      }
    }
    return "";
  };

  // Custom pre component that adds a copy button
  const PreComponent = ({
    children,
    ...props
  }: React.HTMLAttributes<HTMLPreElement>) => {
    const codeString = extractText(children);

    return (
      <div className="code-block-wrapper">
        <pre {...props}>{children}</pre>
        {codeString && <CopyButton />}
      </div>
    );
  };

  // Custom anchor component to add class to footnote references and open external links in new tab
  const AnchorComponent = ({
    children,
    href,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => {
    // Check if this is a footnote reference
    if (href?.startsWith("#user-content-fn-")) {
      return (
        <a href={href} {...props} className="footnote-ref">
          {children}
        </a>
      );
    }

    // Check if this is an external link (starts with http:// or https://)
    const isExternal =
      href?.startsWith("http://") || href?.startsWith("https://");

    if (isExternal) {
      return (
        <a href={href} {...props} target="_blank" rel="noopener noreferrer">
          {children}
        </a>
      );
    }

    // Regular internal link
    return (
      <a href={href} {...props}>
        {children}
      </a>
    );
  };

  // Custom section component to detect footnotes section
  const SectionComponent = ({
    children,
    ...props
  }: React.HTMLAttributes<HTMLElement>) => {
    const className =
      typeof props.className === "string" ? props.className : "";

    // Hide the default footnotes section on large screens (we show them as sidenotes)
    if (className.includes("footnotes")) {
      return (
        <section {...props} className={`${className} footnotes-section`}>
          {children}
        </section>
      );
    }

    return <section {...props}>{children}</section>;
  };

  // Custom list item for footnote definitions
  const ListItemComponent = ({
    children,
    ...props
  }: React.LiHTMLAttributes<HTMLLIElement>) => {
    const id = props.id || "";

    // Check if this is a footnote definition
    if (id.startsWith("user-content-fn-")) {
      const noteId = id.replace("user-content-fn-", "");

      return (
        <li
          {...props}
          className="footnote-definition"
          data-footnote-id={noteId}
        >
          {children}
        </li>
      );
    }

    return <li {...props}>{children}</li>;
  };

  const rehypePlugins = [
    rehypeSlug,
    ...(disableHeadingLinks
      ? []
      : [
          [
            rehypeAutolinkHeadings,
            {
              behavior: "wrap",
              properties: { className: ["anchor"] },
            },
          ],
        ]),
    rehypeKatex,
    [
      rehypeShiki,
      {
        theme: "one-dark-pro",
        langs: [
          "javascript",
          "typescript",
          "python",
          "bash",
          "json",
          "jsx",
          "tsx",
          "yaml",
          "shell",
          "go",
          "rust",
          "sql",
          "html",
          "css",
          "markdown",
          "toml",
          "dockerfile",
          "text",
          "plaintext",
        ],
        defaultLanguage: "text",
      },
    ],
    rehypeRaw,
  ];

  return (
    <MarkdownAsync
      remarkPlugins={[
        remarkGfm,
        remarkMath,
        remarkDirective,
        remarkUnwrapImages,
        remarkAdmonitions,
        remarkCodeTabs,
      ]}
      rehypePlugins={rehypePlugins as any}
      components={{
        img: ImageComponent,
        pre: PreComponent,
        a: AnchorComponent,
        section: SectionComponent,
        li: ListItemComponent,
        "status-widget": StatusWidget,
      } as React.ComponentProps<typeof MarkdownAsync>["components"]}
    >
      {processedContent}
    </MarkdownAsync>
  );
}
