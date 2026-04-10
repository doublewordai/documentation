import { NextResponse } from "next/server";
import { defineQuery } from "next-sanity";
import { sanityFetch } from "@/sanity/lib/client";
import { getExternalDocsIndex, getExternalProducts } from "@/lib/external-docs";
import { getModelArtifacts } from "@/lib/model-artifacts";

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
  "docs": *[_type == "docPage" && !(_id in path("drafts.**"))] | order(product->name asc, category->order asc, order asc) {
    _id,
    title,
    "slug": slug.current,
    description,
    order,
    "productSlug": product->slug.current,
    "productId": product._ref,
    "categoryName": category->name,
    "categoryOrder": category->order
  }
}`);

type Product = {
  _id: string;
  name: string;
  slug: string;
  description?: string;
};

type Doc = {
  _id: string;
  title: string;
  slug: string;
  description?: string;
  order: number;
  productSlug: string;
  productId: string;
  categoryName: string;
  categoryOrder: number;
};

export async function GET() {
  const data = (await sanityFetch({
    query: ALL_DOCS_QUERY,
    params: {},
    tags: ["docPage", "product", "category", "homepage"],
  })) as {
    homepage: { heroDescription?: string } | null;
    products: Product[];
    docs: Doc[];
  };

  const { homepage, products, docs } = data;
  const modelArtifacts = await getModelArtifacts();
  const externalProducts = getExternalProducts().map((product) => ({
    ...product,
    slug: product.slug.current,
  }));
  const allProducts = [...products, ...externalProducts].sort((a, b) =>
    a.name.localeCompare(b.name),
  );

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

  // Group docs by product, then by category (docs are pre-sorted by query)
  for (const product of allProducts) {
    const productDocs = docs.filter((d) => d.productId === product._id);
    const externalIndex = productDocs.length === 0
      ? await getExternalDocsIndex(product.slug)
      : null;

    if (productDocs.length === 0 && !externalIndex) continue;

    lines.push(`## ${product.name}`);
    lines.push("");
    lines.push(`Full documentation: [${product.name}](/${product.slug}.md)`);
    lines.push("");

    if (product.description) {
      lines.push(product.description);
      lines.push("");
    }

    if (productDocs.length > 0) {
      let currentCategory: string | null = null;

      for (const doc of productDocs) {
        if (doc.categoryName && doc.categoryName !== currentCategory) {
          if (currentCategory !== null) {
            lines.push("");
          }
          lines.push(`### ${doc.categoryName}`);
          lines.push("");
          currentCategory = doc.categoryName;
        }

        const url = `/${product.slug}/${doc.slug}.md`;
        const description = doc.description ? `: ${doc.description}` : "";
        lines.push(`- [${doc.title}](${url})${description}`);
      }
    } else if (externalIndex) {
      let currentCategory: string | null = null;

      for (const doc of externalIndex.docs) {
        if (doc.categoryName !== currentCategory) {
          if (currentCategory !== null) {
            lines.push("");
          }
          lines.push(`### ${doc.categoryName}`);
          lines.push("");
          currentCategory = doc.categoryName;
        }

        lines.push(`- [${doc.title}](/${product.slug}/${doc.slug}.md)`);
      }
    }

    if (product.slug === "inference-api" && modelArtifacts.length > 0) {
      lines.push("");
      lines.push("### Models");
      lines.push("");
      for (const artifact of modelArtifacts) {
        lines.push(`- [${artifact.name}](/inference-api/models/${artifact.slug}.md)`);
      }
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
