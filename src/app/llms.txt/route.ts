import { NextResponse } from "next/server";
import { defineQuery } from "next-sanity";
import { sanityFetch } from "@/sanity/lib/client";

const ALL_DOCS_QUERY = defineQuery(`{
  "homepage": *[_type == "homepage"][0]{
    heroDescription
  },
  "products": *[_type == "product"] | order(name asc) {
    _id,
    name,
    "slug": slug.current,
    description
  },
  "categories": *[_type == "category"] | order(order asc) {
    _id,
    name,
    "slug": slug.current,
    order,
    "productId": product._ref
  },
  "docs": *[_type == "docPage"] | order(order asc) {
    _id,
    title,
    "slug": slug.current,
    description,
    order,
    "productSlug": product->slug.current,
    "productId": product._ref,
    "categorySlug": category->slug.current,
    "categoryId": category._ref
  }
}`);

type Product = {
  _id: string;
  name: string;
  slug: string;
  description?: string;
};

type Category = {
  _id: string;
  name: string;
  slug: string;
  order: number;
  productId: string;
};

type Doc = {
  _id: string;
  title: string;
  slug: string;
  description?: string;
  order: number;
  productSlug: string;
  productId: string;
  categorySlug: string;
  categoryId: string;
};

export async function GET() {
  const data = (await sanityFetch({
    query: ALL_DOCS_QUERY,
    params: {},
    tags: ["docPage", "product", "category", "homepage"],
  })) as {
    homepage: { heroDescription?: string } | null;
    products: Product[];
    categories: Category[];
    docs: Doc[];
  };

  const { homepage, products, categories, docs } = data;

  // Build the llms.txt content
  const lines: string[] = [];

  // Header
  lines.push("# Doubleword Documentation");
  lines.push("");

  // Summary from homepage
  if (homepage?.heroDescription) {
    lines.push(`> ${homepage.heroDescription}`);
    lines.push("");
  }

  lines.push("All documentation pages are available as markdown by appending `.md` to any URL.");
  lines.push("");

  // Group docs by product, then by category
  for (const product of products) {
    const productDocs = docs.filter((d) => d.productId === product._id);
    if (productDocs.length === 0) continue;

    const productCategories = categories
      .filter((c) => c.productId === product._id)
      .sort((a, b) => a.order - b.order);

    lines.push(`## ${product.name}`);
    lines.push("");
    lines.push(`Full documentation: [${product.name}](/${product.slug}.md)`);
    lines.push("");

    if (product.description) {
      lines.push(product.description);
      lines.push("");
    }

    // Group by category
    for (const category of productCategories) {
      const categoryDocs = productDocs
        .filter((d) => d.categoryId === category._id)
        .sort((a, b) => a.order - b.order);

      if (categoryDocs.length === 0) continue;

      lines.push(`### ${category.name}`);
      lines.push("");

      for (const doc of categoryDocs) {
        const url = `/${product.slug}/${doc.slug}.md`;
        const description = doc.description ? `: ${doc.description}` : "";
        lines.push(`- [${doc.title}](${url})${description}`);
      }
      lines.push("");
    }

    // Docs without a category
    const uncategorizedDocs = productDocs
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
  }

  const content = lines.join("\n");

  return new NextResponse(content, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
    },
  });
}
