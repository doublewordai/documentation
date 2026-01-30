import { NextRequest, NextResponse } from "next/server";
import { defineQuery } from "next-sanity";
import { sanityFetch } from "@/sanity/lib/client";

const PRODUCT_DOCS_QUERY = defineQuery(`{
  "product": *[_type == "product" && slug.current == $productSlug][0]{
    name,
    "slug": slug.current,
    description
  },
  "docs": *[_type == "docPage" && product->slug.current == $productSlug && !(_id in path("drafts.**"))] | order(category->order asc, order asc) {
    _id,
    title,
    "slug": slug.current,
    description,
    order,
    "categoryId": category._ref,
    "categoryName": category->name,
    "categoryOrder": category->order
  }
}`);

type Doc = {
  _id: string;
  title: string;
  slug: string;
  description?: string;
  order: number;
  categoryId: string;
  categoryName: string;
  categoryOrder: number;
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ product: string }> }
) {
  let { product: productSlug } = await params;

  // Strip .md extension if present (from rewrite)
  productSlug = productSlug.replace(/\.md$/, "");

  const data = (await sanityFetch({
    query: PRODUCT_DOCS_QUERY,
    params: { productSlug },
    tags: ["docPage", "product", "category"],
  })) as {
    product: { name: string; slug: string; description?: string } | null;
    docs: Doc[];
  };

  if (!data.product) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }

  const { product, docs } = data;

  // Build index markdown
  const lines: string[] = [];

  // Product header
  lines.push(`# ${product.name}`);
  lines.push("");

  if (product.description) {
    lines.push(product.description);
    lines.push("");
  }

  // Group docs by category while maintaining query order
  let currentCategory: string | null = null;

  for (const doc of docs) {
    // Start new category section if needed
    if (doc.categoryName && doc.categoryName !== currentCategory) {
      if (currentCategory !== null) {
        lines.push("");
      }
      lines.push(`## ${doc.categoryName}`);
      lines.push("");
      currentCategory = doc.categoryName;
    }

    const url = `/${product.slug}/${doc.slug}.md`;
    const description = doc.description ? `: ${doc.description}` : "";
    lines.push(`- [${doc.title}](${url})${description}`);
  }

  lines.push("");

  const content = lines.join("\n");

  return new NextResponse(content, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
    },
  });
}
