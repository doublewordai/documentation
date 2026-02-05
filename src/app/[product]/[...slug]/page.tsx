import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { sanityFetch } from "@/sanity/lib/client";
import { DOC_PAGE_QUERY, ALL_DOC_PAGE_PATHS_QUERY } from "@/sanity/lib/queries";
import type { DocPage } from "@/sanity/types";
import { MarkdownRenderer } from "@/components/MarkdownRenderer";
import TableOfContents from "@/components/TableOfContents";
import CopyMarkdownButton from "@/components/CopyMarkdownButton";
import ApiKeyBanner from "@/components/ApiKeyBanner";
import ApiKeyIndicator from "@/components/ApiKeyIndicator";
import ModelSelector from "@/components/ModelSelector";

const SITE_URL = "https://docs.doubleword.ai";

/**
 * Convert a raw GitHub URL to a browsable GitHub URL
 * e.g., https://raw.githubusercontent.com/doublewordai/use-cases/refs/heads/main/image-summarization/README.md
 *    -> https://github.com/doublewordai/use-cases/tree/main/image-summarization
 */
function rawGitHubToRepoUrl(rawUrl: string): string | null {
  // Match raw.githubusercontent.com URLs
  const match = rawUrl.match(
    /^https:\/\/raw\.githubusercontent\.com\/([^/]+)\/([^/]+)\/refs\/heads\/([^/]+)\/(.+)$/,
  );
  if (!match) return null;

  const [, owner, repo, branch, filePath] = match;
  // Remove the filename (e.g., README.md) to get the directory
  const dirPath = filePath.replace(/\/[^/]+$/, "");
  // If the file is at the root, just link to the repo
  if (dirPath === filePath || !dirPath) {
    return `https://github.com/${owner}/${repo}/tree/${branch}`;
  }
  return `https://github.com/${owner}/${repo}/tree/${branch}/${dirPath}`;
}

/**
 * Fetch markdown content from an external URL
 * Used when a linked blog post has externalSource set
 */
async function fetchExternalContent(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, { next: { revalidate: 3600 } }); // Cache for 1 hour
    if (!response.ok) return null;
    return await response.text();
  } catch {
    return null;
  }
}

/**
 * Generate static params for all documentation pages
 * This enables full static site generation (SSG)
 */
export async function generateStaticParams() {
  const paths = (await sanityFetch({
    query: ALL_DOC_PAGE_PATHS_QUERY,
    tags: [],
  })) as Array<{ productSlug: string; slug: string }>;

  return paths.map((path) => ({
    product: path.productSlug,
    slug: path.slug.split("/"),
  }));
}

interface Props {
  params: Promise<{ product: string; slug: string[] }>;
}

/**
 * Generate metadata for SEO including canonical URLs and Open Graph tags
 */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { product: productSlug, slug } = await params;
  const docSlug = slug.join("/");

  const doc = (await sanityFetch({
    query: DOC_PAGE_QUERY,
    params: { productSlug, slug: docSlug },
    tags: ["docPage"],
  })) as DocPage;

  if (!doc || !doc.product) {
    return {
      title: "Not Found",
    };
  }

  // Use the linkedPost's canonicalUrl if this is transcluded syndicated content
  const canonicalUrl =
    doc.linkedPost?.canonicalUrl || `${SITE_URL}/${productSlug}/${docSlug}`;
  const title = `${doc.title} | ${doc.product.name} | Doubleword Docs`;
  const description =
    doc.description || `${doc.title} - ${doc.product.name} documentation`;

  return {
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      siteName: "Doubleword Documentation",
      type: "article",
    },
    twitter: {
      card: "summary",
      title,
      description,
    },
  };
}

export default async function DocPage({ params }: Props) {
  const { product: productSlug, slug } = await params;
  const docSlug = slug.join("/");

  // Fetch the documentation page
  const doc = (await sanityFetch({
    query: DOC_PAGE_QUERY,
    params: { productSlug, slug: docSlug },
    tags: ["docPage"],
  })) as DocPage;

  if (!doc || !doc.product) {
    notFound();
  }

  // Determine content source: externalSource > linkedPost > body
  let content: string | undefined;
  if (doc.externalSource) {
    let externalContent = await fetchExternalContent(doc.externalSource);
    // Strip the first h1 heading from external content (we use Sanity's title instead)
    if (externalContent) {
      externalContent = externalContent.replace(/^#\s+[^\n]+\n+/, "");
    }
    content = externalContent || doc.body;
  } else if (doc.linkedPost) {
    if (doc.linkedPost.externalSource) {
      content =
        (await fetchExternalContent(doc.linkedPost.externalSource)) ||
        doc.linkedPost.body;
    } else {
      content = doc.linkedPost.body;
    }
  } else {
    content = doc.body;
  }
  const images = doc.linkedPost?.images || doc.images;
  const videoUrl = doc.linkedPost?.videoUrl;
  const hasApiKeyPlaceholder = content?.includes("{{apiKey}}") ?? false;

  // Generate GitHub repo URL from external source if available
  const githubUrl = doc.externalSource
    ? rawGitHubToRepoUrl(doc.externalSource)
    : null;

  return (
    <div className="relative w-full min-h-screen flex flex-col">
      {/* Subtle grid pattern background */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(to right, var(--sidebar-border) 1px, transparent 1px),
            linear-gradient(to bottom, var(--sidebar-border) 1px, transparent 1px)
          `,
          backgroundSize: "64px 64px",
          opacity: 0.3,
          maskImage:
            "radial-gradient(ellipse at top, black 0%, transparent 50%)",
          WebkitMaskImage:
            "radial-gradient(ellipse at top, black 0%, transparent 50%)",
        }}
      />

      {/* Centered container for large screens */}
      <div className="flex-1 w-full max-w-[1400px] 2xl:max-w-[2048px] relative px-4 sm:px-8 xl:pl-16 xl:pr-8 2xl:pr-4 pt-8 mx-auto">
        <div className="flex items-start gap-16 2xl:gap-20">
          {/* Main content */}
          <div className="w-full max-w-2xl xl:max-w-3xl 2xl:max-w-4xl mx-auto xl:ml-auto xl:mr-0">
            {/* Breadcrumbs */}
            <nav
              className="mb-6 flex items-center gap-2 text-sm"
              style={{ color: "var(--text-muted)" }}
            >
              <Link
                href="/"
                className="hover:text-[var(--foreground)] transition-colors"
              >
                Docs
              </Link>
              <svg
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="w-3 h-3 opacity-50"
              >
                <path d="M6 4l4 4-4 4" />
              </svg>
              <Link
                href={`/${productSlug}`}
                className="hover:text-[var(--foreground)] transition-colors"
              >
                {doc.product.name}
              </Link>
              <svg
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="w-3 h-3 opacity-50"
              >
                <path d="M6 4l4 4-4 4" />
              </svg>
              <span className="truncate" style={{ color: "var(--foreground)" }}>
                {doc.title}
              </span>
            </nav>

            <article>
              {!doc.hideTitle && (
                <header className="mb-6">
                  <h1
                    className="text-3xl sm:text-4xl font-bold tracking-tight"
                    style={{ color: "var(--foreground)" }}
                  >
                    {doc.title}
                  </h1>
                </header>
              )}

              <ApiKeyBanner hasApiKeyPlaceholder={hasApiKeyPlaceholder} />

              {/* Video Embed */}
              {videoUrl && (
                <div className="mb-8 aspect-video">
                  <iframe
                    src={videoUrl}
                    className="w-full h-full rounded-lg"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              )}

              <div
                className="prose max-w-none"
                data-enhance-footnotes
                data-enhance-code-tabs
              >
                {content && (
                  <MarkdownRenderer
                    content={content}
                    images={images}
                    externalSource={doc.externalSource}
                  />
                )}
              </div>

              {/* GitHub source link for pages with external content */}
              {githubUrl && (
                <div
                  className="mt-8 text-base"
                  style={{ color: "var(--text-muted)" }}
                >
                  <a
                    href={githubUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 hover:text-[var(--foreground)] transition-colors"
                  >
                    <svg
                      viewBox="0 0 24 24"
                      fill="currentColor"
                      className="w-5 h-5"
                    >
                      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                    </svg>
                    View source on GitHub
                  </a>
                </div>
              )}
            </article>
          </div>

          {/* Table of Contents - Pushed to right gutter */}
          <aside
            className="hidden xl:block sticky top-8 h-fit pt-8 z-10 toc-aside ml-auto flex-shrink-0 w-[280px] 2xl:w-[360px]"
            style={{ background: "var(--background)" }}
          >
            <TableOfContents />

            <div className="mt-6">
              <p
                className="text-xs font-semibold tracking-widest uppercase mb-3"
                style={{ color: "var(--text-muted)" }}
              >
                Actions
              </p>
              <ul className="space-y-2 text-sm 2xl:text-base">
                <li>
                  <ApiKeyIndicator />
                </li>
                <li>
                  <ModelSelector />
                </li>
                <li>
                  <CopyMarkdownButton />
                </li>
                {githubUrl && (
                  <li>
                    <a
                      href={githubUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 hover:text-[var(--foreground)] transition-colors"
                      style={{ color: "var(--text-muted)" }}
                    >
                      <svg
                        viewBox="0 0 24 24"
                        fill="currentColor"
                        className="w-4 h-4"
                      >
                        <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                      </svg>
                      View on GitHub
                    </a>
                  </li>
                )}
              </ul>
            </div>
          </aside>
        </div>
      </div>

      {/* Footer */}
      <footer
        className="w-full max-w-[1400px] 2xl:max-w-[2048px] mx-auto px-4 sm:px-8 xl:pl-16 xl:pr-8 2xl:pr-4 py-6 mt-8"
        style={{ color: "var(--text-muted)" }}
      >
        <div
          className="pt-6 border-t flex flex-col sm:flex-row items-center justify-between gap-4 text-sm"
          style={{ borderColor: "var(--sidebar-border)" }}
        >
          <p>Doubleword &copy; {new Date().getFullYear()}</p>
          <div className="flex items-center gap-6">
            <a
              href="https://github.com/doublewordai"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-[var(--foreground)] transition-colors flex items-center gap-2"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
              </svg>
              GitHub
            </a>
            <a
              href="https://app.doubleword.ai"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-[var(--foreground)] transition-colors"
            >
              Dashboard
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
