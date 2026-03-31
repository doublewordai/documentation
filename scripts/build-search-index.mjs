/**
 * Build-time script that creates a static search index with all content resolved.
 *
 * Pages with `externalSource` or `linkedPost` have their body fetched from URLs
 * at render time, so the Sanity `body` field is empty. This script resolves that
 * content at build time and writes a JSON index that the search API reads from
 * instead of querying Sanity at runtime.
 *
 * Run: node scripts/build-search-index.mjs
 */

import { createClient } from "@sanity/client";
import { writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = join(__dirname, "..", "public");
const OUTPUT_PATH = join(OUTPUT_DIR, "search-index.json");

const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || "g1zo7y59",
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || "production",
  apiVersion: "2024-07-11",
  useCdn: false,
});

const QUERY = `*[
  _type == "docPage" &&
  defined(slug.current) &&
  defined(product->slug.current)
]{
  _id,
  title,
  sidebarLabel,
  description,
  body,
  externalSource,
  "slug": slug.current,
  "productSlug": product->slug.current,
  "productName": product->name,
  "categorySlug": category->slug.current,
  "categoryName": category->name,
  "linkedPost": linkedPost-> {
    body,
    externalSource
  }
}`;

const EXTERNAL_DOCS_SOURCES = [
  {
    id: "dw-cli",
    title: "Doubleword CLI",
    productSlug: "dw-cli",
    summaryUrl:
      "https://raw.githubusercontent.com/doublewordai/dw/main/docs/src/SUMMARY.md",
    rawBaseUrl:
      "https://raw.githubusercontent.com/doublewordai/dw/main/docs/src",
    productName: "Doubleword CLI",
  },
];

async function fetchExternalContent(url) {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    return await response.text();
  } catch {
    return null;
  }
}

async function resolveBody(doc) {
  if (doc.externalSource) {
    const content = await fetchExternalContent(doc.externalSource);
    if (content) {
      // Strip the first h1 heading (same as page.tsx)
      return content.replace(/^#\s+[^\n]+\n+/, "");
    }
    return doc.body || null;
  }

  if (doc.linkedPost) {
    if (doc.linkedPost.externalSource) {
      return (
        (await fetchExternalContent(doc.linkedPost.externalSource)) ||
        doc.linkedPost.body ||
        null
      );
    }
    return doc.linkedPost.body || null;
  }

  return doc.body || null;
}

function sanitizeCategorySlug(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function parseSummary(summary, source) {
  const entries = [];
  let categoryName = source.title;

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
      sourcePath: sourcePath.trim(),
      slug: source.routePrefix
        ? `${source.routePrefix}/${sourcePath.trim().replace(/\.md$/, "")}`
        : sourcePath.trim().replace(/\.md$/, ""),
      categoryName,
    });
  }

  return entries;
}

async function getExternalDocsSearchItems() {
  const groups = await Promise.all(
    EXTERNAL_DOCS_SOURCES.map(async (source) => {
      const summary = await fetchExternalContent(source.summaryUrl);
      if (!summary) return [];

      const entries = parseSummary(summary, source);
      return Promise.all(
        entries.map(async (entry) => ({
          _id: `${source.id}:${entry.slug}`,
          title: entry.title,
          body: (await fetchExternalContent(`${source.rawBaseUrl}/${entry.sourcePath}`)) || undefined,
          slug: entry.slug,
          productSlug: source.productSlug,
          productName: source.productName,
          categorySlug: sanitizeCategorySlug(entry.categoryName),
          categoryName: source.routePrefix
            ? `${source.title} / ${entry.categoryName}`
            : entry.categoryName,
          sourceType: "external",
        })),
      );
    }),
  );

  return groups.flat();
}

async function main() {
  console.log("Building search index...");

  const docs = await client.fetch(QUERY);
  console.log(`Fetched ${docs.length} doc pages from Sanity`);
  const externalDocs = await getExternalDocsSearchItems();
  console.log(`Fetched ${externalDocs.length} external docs`);

  let externalFetches = 0;
  let failures = 0;

  const index = await Promise.all(
    docs.map(async (doc) => {
      const needsFetch = Boolean(
        doc.externalSource || doc.linkedPost?.externalSource,
      );
      if (needsFetch) externalFetches++;

      const body = await resolveBody(doc);
      if (needsFetch && !body) failures++;

      return {
        _id: doc._id,
        title: doc.title,
        sidebarLabel: doc.sidebarLabel || undefined,
        description: doc.description || undefined,
        body: body || undefined,
        slug: doc.slug,
        productSlug: doc.productSlug,
        productName: doc.productName,
        categorySlug: doc.categorySlug || undefined,
        categoryName: doc.categoryName || undefined,
      };
    }),
  );

  mkdirSync(OUTPUT_DIR, { recursive: true });
  writeFileSync(OUTPUT_PATH, JSON.stringify([...index, ...externalDocs]));

  console.log(
    `Wrote ${index.length + externalDocs.length} docs to ${OUTPUT_PATH} (${externalFetches} external fetches, ${failures} failures)`,
  );
}

main().catch((err) => {
  console.error("Failed to build search index:", err);
  process.exit(1);
});
