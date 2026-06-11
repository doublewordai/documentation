import { NextRequest, NextResponse } from "next/server";
import { defineQuery } from "next-sanity";
import { sanityFetch } from "@/sanity/lib/client";
import {
  findExternalDocBySlug,
  rewriteExternalMarkdownLinks,
} from "@/lib/external-docs";
import { fetchModelsServer } from "@/lib/models";
import { templateMarkdown, buildTemplateContext } from "@/lib/handlebars";
import { getModelArtifact, renderModelArtifactMarkdown } from "@/lib/model-artifacts";
import { coerceMarkdownContent } from "@/lib/portable-text";

const MARKDOWN_BY_SLUG_QUERY = defineQuery(`*[
  _type == "docPage" &&
  product->slug.current == $productSlug &&
  slug.current == $docSlug
][0]{
  title,
  body,
  externalSource,
  linkedPost->{body, externalSource},
  images[]{
    filename,
    asset->{_id, url}
  }
}`);

/**
 * Fetch markdown content from an external URL. HTML responses (e.g. an
 * `externalSource` pointing at a GitHub repo page just to power the
 * "View source" link) return null so the caller falls back to the Sanity body.
 */
async function fetchExternalContent(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, { next: { revalidate: 3600 } });
    if (!response.ok) return null;
    const contentType = response.headers.get("content-type") ?? "";
    if (contentType.includes("text/html")) return null;
    return await response.text();
  } catch {
    return null;
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ product: string; slug: string[] }> }
) {
  const { product: productSlug, slug } = await params;

  // Strip .md extension from last segment if present (from rewrite)
  const cleanSlug = slug.map((segment, i) =>
    i === slug.length - 1 ? segment.replace(/\.md$/, "") : segment
  );
  const docSlug = cleanSlug.join("/");

  if (productSlug === "inference-api" && docSlug.startsWith("models/")) {
    const artifact = await getModelArtifact(docSlug.slice("models/".length));
    if (!artifact) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    return new NextResponse(renderModelArtifactMarkdown(artifact), {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
      },
    });
  }

  const doc = (await sanityFetch({
    query: MARKDOWN_BY_SLUG_QUERY,
    params: { productSlug, docSlug },
    tags: ["docPage"],
  })) as {
    title: string;
    body: unknown;
    externalSource?: string;
    linkedPost?: { body: unknown; externalSource?: string };
    images?: { filename: string; asset: { _id: string; url: string } }[];
  } | null;

  if (!doc) {
    const externalDocMatch = await findExternalDocBySlug(productSlug, docSlug);

    if (!externalDocMatch) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    const rewrittenContent = rewriteExternalMarkdownLinks({
      markdown:
        typeof externalDocMatch.doc.body === "string"
          ? externalDocMatch.doc.body
          : "",
      productSlug,
      routePrefix: externalDocMatch.source.routePrefix,
      sourcePath: externalDocMatch.sourcePath,
    });

    return new NextResponse(rewrittenContent, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
      },
    });
  }

  // Get the raw markdown content, resolved in the same order as the HTML
  // page route: externalSource > linkedPost > body
  let externalContent: string | null = null;
  if (doc.externalSource) {
    externalContent = await fetchExternalContent(doc.externalSource);
  } else if (doc.linkedPost?.externalSource) {
    externalContent = await fetchExternalContent(doc.linkedPost.externalSource);
  }

  // Sanity bodies may be Portable Text blocks rather than markdown strings;
  // coerce so the response is always markdown, never a stringified object
  let content =
    externalContent ??
    (coerceMarkdownContent(doc.linkedPost?.body) ||
      coerceMarkdownContent(doc.body));

  // Apply Handlebars templating (same as MarkdownRenderer)
  const modelsResponse = await fetchModelsServer();
  const templateContext = buildTemplateContext(modelsResponse);
  content = templateMarkdown(content, templateContext);

  // Replace image filenames with Sanity CDN URLs
  const images = doc.images;
  if (images && images.length > 0) {
    const imageMap = new Map(
      images.filter((img) => img.filename).map((img) => [img.filename, img])
    );
    imageMap.forEach((imageData, filename) => {
      const regex = new RegExp(`!\\[([^\\]]*)\\]\\(${filename}\\)`, "g");
      content = content.replace(regex, `![$1](${imageData.asset.url})`);
    });
  }

  return new NextResponse(content, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
    },
  });
}
