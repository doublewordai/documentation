import path from "node:path";
import type { DocPage, DocPageForNav, DocSearchIndexItem } from "@/sanity/types";

export type ExternalDocsSource = {
  id: string;
  title: string;
  productSlug: string;
  routePrefix: string;
  summaryUrl: string;
  rawBaseUrl: string;
  repoUrl: string;
  productName: string;
};

export type ExternalDocEntry = {
  title: string;
  slug: string;
  sourcePath: string;
  categoryName: string;
  order: number;
};

export type ExternalDocsGroup = {
  id: string;
  title: string;
  categories: Array<{
    category: DocPageForNav["category"];
    docs: DocPageForNav[];
  }>;
};

type ExternalDocMatch = {
  doc: DocPage;
  source: ExternalDocsSource;
  sourcePath: string;
};

const EXTERNAL_DOCS_SOURCES: ExternalDocsSource[] = [
  {
    id: "dw-cli",
    title: "CLI",
    productSlug: "inference-api",
    routePrefix: "cli",
    summaryUrl:
      "https://raw.githubusercontent.com/doublewordai/dw/main/docs/src/SUMMARY.md",
    rawBaseUrl:
      "https://raw.githubusercontent.com/doublewordai/dw/main/docs/src",
    repoUrl: "https://github.com/doublewordai/dw/tree/main/docs",
    productName: "Inference API",
  },
];

function sanitizeCategorySlug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function buildRouteSlug(routePrefix: string, sourcePath: string): string {
  return `${routePrefix}/${sourcePath.replace(/\.md$/, "")}`;
}

export function parseSummary(summary: string, source: ExternalDocsSource): ExternalDocEntry[] {
  const entries: ExternalDocEntry[] = [];
  let categoryName = source.title;
  let order = 0;

  for (const rawLine of summary.split("\n")) {
    const line = rawLine.trim();
    if (!line) continue;

    const headingMatch = line.match(/^#\s+(.+)$/);
    if (headingMatch) {
      const nextCategory = headingMatch[1].trim();
      categoryName = nextCategory === "Summary" ? source.title : nextCategory;
      continue;
    }

    const linkMatch = line.match(/^-?\s*\[([^\]]+)\]\(([^)]+\.md)\)$/);
    if (!linkMatch) continue;

    const [, title, sourcePath] = linkMatch;
    entries.push({
      title: title.trim(),
      slug: buildRouteSlug(source.routePrefix, sourcePath.trim()),
      sourcePath: sourcePath.trim(),
      categoryName,
      order: order++,
    });
  }

  return entries;
}

async function fetchText(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, { next: { revalidate: 3600 } });
    if (!response.ok) return null;
    return await response.text();
  } catch {
    return null;
  }
}

async function loadSummaryEntries(source: ExternalDocsSource): Promise<ExternalDocEntry[]> {
  const summary = await fetchText(source.summaryUrl);
  if (!summary) return [];
  return parseSummary(summary, source);
}

export async function getExternalDocsGroups(
  productSlug: string,
): Promise<ExternalDocsGroup[]> {
  const sources = EXTERNAL_DOCS_SOURCES.filter(
    (source) => source.productSlug === productSlug,
  );

  return Promise.all(
    sources.map(async (source) => {
      const entries = await loadSummaryEntries(source);
      const categories = new Map<
        string,
        {
          category: DocPageForNav["category"];
          docs: DocPageForNav[];
        }
      >();

      for (const entry of entries) {
        const categoryId = `${source.id}-${sanitizeCategorySlug(entry.categoryName)}`;
        if (!categories.has(categoryId)) {
          categories.set(categoryId, {
            category: {
              _id: categoryId,
              name: entry.categoryName,
              slug: { current: sanitizeCategorySlug(entry.categoryName) },
              order: entry.order,
            },
            docs: [],
          });
        }

        categories.get(categoryId)!.docs.push({
          _id: `${source.id}:${entry.slug}`,
          title: entry.title,
          slug: { current: entry.slug },
          order: entry.order,
          sidebarLabel: entry.title,
          externalLinkIcon: false,
          categorySlug: sanitizeCategorySlug(entry.categoryName),
          categoryName: entry.categoryName,
          parentSlug: null,
          category: categories.get(categoryId)!.category,
        });
      }

      return {
        id: source.id,
        title: source.title,
        categories: Array.from(categories.values()),
      };
    }),
  );
}

function extractTitle(markdown: string, fallback: string): string {
  const match = markdown.match(/^#\s+(.+)$/m);
  return match?.[1]?.trim() || fallback;
}

export async function findExternalDocBySlug(
  productSlug: string,
  slug: string,
): Promise<ExternalDocMatch | null> {
  const source = EXTERNAL_DOCS_SOURCES.find(
    (candidate) =>
      candidate.productSlug === productSlug &&
      (slug === candidate.routePrefix || slug.startsWith(`${candidate.routePrefix}/`)),
  );

  if (!source) return null;

  const entries = await loadSummaryEntries(source);
  const entry = entries.find((candidate) => candidate.slug === slug);
  if (!entry) return null;

  const body = await fetchText(`${source.rawBaseUrl}/${entry.sourcePath}`);
  if (!body) return null;

  const title = extractTitle(body, entry.title);

  return {
    source,
    sourcePath: entry.sourcePath,
    doc: {
      _id: `${source.id}:${entry.slug}`,
      title,
      slug: { current: entry.slug },
      body,
      externalSource: `${source.rawBaseUrl}/${entry.sourcePath}`,
      description: `${source.title} documentation from the dw repository`,
      sidebarLabel: entry.title,
      product: {
        _id: source.productSlug,
        name: source.productName,
        slug: { current: source.productSlug },
      },
      category: {
        _id: `${source.id}-${sanitizeCategorySlug(entry.categoryName)}`,
        name: entry.categoryName,
        slug: { current: sanitizeCategorySlug(entry.categoryName) },
      },
    },
  };
}

export async function getExternalDocStaticParams() {
  const params = await Promise.all(
    EXTERNAL_DOCS_SOURCES.map(async (source) => {
      const entries = await loadSummaryEntries(source);
      return entries.map((entry) => ({
        product: source.productSlug,
        slug: entry.slug.split("/"),
      }));
    }),
  );

  return params.flat();
}

export async function getExternalDocsSearchItems(): Promise<DocSearchIndexItem[]> {
  const groups = await Promise.all(
    EXTERNAL_DOCS_SOURCES.map(async (source) => {
      const entries = await loadSummaryEntries(source);
      return Promise.all(
        entries.map(async (entry) => {
          const body = await fetchText(`${source.rawBaseUrl}/${entry.sourcePath}`);
          return {
            _id: `${source.id}:${entry.slug}`,
            title: entry.title,
            body: body || undefined,
            slug: entry.slug,
            productSlug: source.productSlug,
            productName: source.productName,
            categorySlug: sanitizeCategorySlug(entry.categoryName),
            categoryName: `${source.title} / ${entry.categoryName}`,
          } satisfies DocSearchIndexItem;
        }),
      );
    }),
  );

  return groups.flat();
}

export function resolveExternalMarkdownLink({
  href,
  productSlug,
  routePrefix,
  sourcePath,
}: {
  href: string;
  productSlug: string;
  routePrefix: string;
  sourcePath: string;
}): string {
  if (
    !href ||
    href.startsWith("#") ||
    href.startsWith("/") ||
    href.startsWith("http://") ||
    href.startsWith("https://") ||
    href.startsWith("mailto:") ||
    href.startsWith("tel:")
  ) {
    return href;
  }

  const [pathPart, hash = ""] = href.split("#");
  if (!pathPart) {
    return hash ? `#${hash}` : href;
  }

  const baseDir = path.posix.dirname(sourcePath);
  const resolvedPath = path.posix.normalize(path.posix.join(baseDir, pathPart));

  if (!resolvedPath.endsWith(".md")) {
    return href;
  }

  const cleanPath = resolvedPath.replace(/^(\.\/)+/, "").replace(/\.md$/, "");
  const target = `/${productSlug}/${routePrefix}/${cleanPath}`;
  return hash ? `${target}#${hash}` : target;
}
