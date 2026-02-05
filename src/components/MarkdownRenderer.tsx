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

/**
 * Convert relative links to absolute GitHub URLs
 * e.g., ./async-agents/ -> https://github.com/doublewordai/use-cases/tree/main/async-agents
 */
function convertRelativeLinksToGitHub(
  markdown: string,
  baseUrl: string,
): string {
  // Match markdown links with relative paths: [text](./path) or [text](path/)
  return markdown.replace(
    /\[([^\]]+)\]\((\.[^)]+)\)/g,
    (match, text, relativePath) => {
      // Remove leading ./ if present
      const cleanPath = relativePath.replace(/^\.\//, "").replace(/\/$/, "");
      return `[${text}](${baseUrl}/${cleanPath})`;
    },
  );
}

export async function MarkdownRenderer({
  content,
  images,
  externalSource,
}: {
  content: string;
  images?: ImageData[];
  externalSource?: string;
}) {
  // Fetch models data for templating
  const modelsResponse = await fetchModelsServer();
  const templateContext = buildTemplateContext(modelsResponse);

  // Template the content with Handlebars (server-side)
  // Client-side placeholders like {{apiKey}} and {{selectedModel.*}} are preserved
  let processedContent = templateMarkdown(content, templateContext);

  // Convert sidenote syntax [>id] to footnote syntax [^id] before parsing
  processedContent = convertSidenotesToFootnotes(processedContent);

  // Convert relative links to absolute GitHub URLs if we have an external source
  if (externalSource) {
    const gitHubBaseUrl = getGitHubBaseUrl(externalSource);
    if (gitHubBaseUrl) {
      processedContent = convertRelativeLinksToGitHub(
        processedContent,
        gitHubBaseUrl,
      );
    }
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
      rehypePlugins={[
        rehypeSlug,
        [
          rehypeAutolinkHeadings,
          {
            behavior: "wrap",
            properties: { className: ["anchor"] },
          },
        ],
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
      ]}
      components={{
        img: ImageComponent,
        pre: PreComponent,
        a: AnchorComponent,
        section: SectionComponent,
        li: ListItemComponent,
      }}
    >
      {processedContent}
    </MarkdownAsync>
  );
}
