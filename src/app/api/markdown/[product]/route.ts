import { NextRequest, NextResponse } from "next/server";
import { defineQuery } from "next-sanity";
import { sanityFetch } from "@/sanity/lib/client";

const PRODUCT_DOCS_QUERY = defineQuery(`{
  "product": *[_type == "product" && slug.current == $productSlug][0]{
    name,
    "slug": slug.current,
    description
  },
  "categories": *[_type == "category" && product->slug.current == $productSlug] | order(order asc) {
    _id,
    name,
    "slug": slug.current,
    order
  },
  "docs": *[_type == "docPage" && product->slug.current == $productSlug] | order(order asc) {
    _id,
    title,
    "slug": slug.current,
    description,
    order,
    "categoryId": category._ref
  }
}`);

type Category = {
  _id: string;
  name: string;
  slug: string;
  order: number;
};

type Doc = {
  _id: string;
  title: string;
  slug: string;
  description?: string;
  order: number;
  categoryId: string;
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
    categories: Category[];
    docs: Doc[];
  };

  if (!data.product) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }

  const { product, categories, docs } = data;

  // Build index markdown
  const lines: string[] = [];

  // Product header
  lines.push(`# ${product.name}`);
  lines.push("");

  if (product.description) {
    lines.push(product.description);
    lines.push("");
  }

  // Group docs by category
  const sortedCategories = [...categories].sort((a, b) => a.order - b.order);

  for (const category of sortedCategories) {
    const categoryDocs = docs
      .filter((d) => d.categoryId === category._id)
      .sort((a, b) => a.order - b.order);

    if (categoryDocs.length === 0) continue;

    lines.push(`## ${category.name}`);
    lines.push("");

    for (const doc of categoryDocs) {
      const url = `/${product.slug}/${doc.slug}.md`;
      const description = doc.description ? `: ${doc.description}` : "";
      lines.push(`- [${doc.title}](${url})${description}`);
    }
    lines.push("");
  }

  // Uncategorized docs
  const uncategorizedDocs = docs
    .filter((d) => !d.categoryId)
    .sort((a, b) => a.order - b.order);

  if (uncategorizedDocs.length > 0) {
    for (const doc of uncategorizedDocs) {
      const url = `/${product.slug}/${doc.slug}.md`;
      const description = doc.description ? `: ${doc.description}` : "";
      lines.push(`- [${doc.title}](${url})${description}`);
    }
    lines.push("");
  }

  const content = lines.join("\n");

  return new NextResponse(content, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
    },
  });
}
