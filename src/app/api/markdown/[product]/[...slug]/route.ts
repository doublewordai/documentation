import { NextRequest, NextResponse } from "next/server";
import { defineQuery } from "next-sanity";
import { sanityFetch } from "@/sanity/lib/client";
import { fetchModelsServer } from "@/lib/models";
import { templateMarkdown, buildTemplateContext } from "@/lib/handlebars";

const MARKDOWN_BY_SLUG_QUERY = defineQuery(`*[
  _type == "docPage" &&
  product->slug.current == $productSlug &&
  slug.current == $docSlug
][0]{
  title,
  body,
  linkedPost->{body, externalSource},
  images[]{
    filename,
    asset->{_id, url}
  }
}`);

/**
 * Fetch markdown content from an external URL
 */
async function fetchExternalContent(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, { next: { revalidate: 3600 } });
    if (!response.ok) return null;
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

  const doc = (await sanityFetch({
    query: MARKDOWN_BY_SLUG_QUERY,
    params: { productSlug, docSlug },
    tags: ["docPage"],
  })) as {
    title: string;
    body: string;
    linkedPost?: { body: string; externalSource?: string };
    images?: { filename: string; asset: { _id: string; url: string } }[];
  } | null;

  if (!doc) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

  // Get the raw markdown content
  let content: string;
  if (doc.linkedPost?.externalSource) {
    const externalContent = await fetchExternalContent(
      doc.linkedPost.externalSource
    );
    content = externalContent || doc.linkedPost.body || doc.body;
  } else {
    content = doc.linkedPost?.body || doc.body;
  }

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
