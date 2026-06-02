import { NextResponse } from "next/server";
import { defineQuery } from "next-sanity";
import { sanityFetch } from "@/sanity/lib/client";
import {
  findExternalDocBySlug,
  getExternalDocsIndex,
  getExternalProducts,
} from "@/lib/external-docs";
import {
  getModelArtifacts,
  renderModelArtifactMarkdown,
} from "@/lib/model-artifacts";
import { fetchModelsServer } from "@/lib/models";
import { buildTemplateContext } from "@/lib/handlebars";
import { renderDocBodyMarkdown, type DocImage } from "@/lib/doc-content";

// Full-text dump of every page, concatenated into a single file per the
// llms.txt convention (https://llmstxt.org). The navigation index lives at
// /llms.txt; this is the "give me everything" variant for tight-context tools.
const ALL_DOCS_FULL_QUERY = defineQuery(`{
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
    "productId": product._ref,
    "productSlug": product->slug.current,
    body,
    linkedPost->{body, externalSource},
    images[]{
      filename,
      asset->{_id, url}
    }
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
  productId: string;
  productSlug: string;
  body: string;
  linkedPost?: { body: string; externalSource?: string };
  images?: DocImage[];
};

async function fetchExternalContent(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, { next: { revalidate: 3600 } });
    if (!response.ok) return null;
    return await response.text();
  } catch {
    return null;
  }
}

export async function GET() {
  const data = (await sanityFetch({
    query: ALL_DOCS_FULL_QUERY,
    params: {},
    tags: ["docPage", "product", "category", "homepage"],
  })) as {
    homepage: { heroDescription?: string } | null;
    products: Product[];
    docs: Doc[];
  };

  const { homepage, products, docs } = data;

  // Build the templating context once and reuse it for every page.
  const modelsResponse = await fetchModelsServer();
  const templateContext = buildTemplateContext(modelsResponse);

  const modelArtifacts = await getModelArtifacts();
  const externalProducts = getExternalProducts().map((product) => ({
    ...product,
    slug: product.slug.current,
  }));
  const allProducts = [...products, ...externalProducts].sort((a, b) =>
    a.name.localeCompare(b.name),
  );

  const sections: string[] = [];

  sections.push("# Doubleword Documentation");
  if (homepage?.heroDescription) {
    sections.push(`> ${homepage.heroDescription}`);
  }
  sections.push(
    "This file contains the full text of the Doubleword documentation, concatenated for LLM consumption. The navigation index is at /llms.txt; every page is also available individually by appending `.md` to its URL.",
  );

  for (const product of allProducts) {
    const productDocs = docs.filter((d) => d.productId === product._id);
    const externalIndex =
      productDocs.length === 0
        ? await getExternalDocsIndex(product.slug)
        : null;

    if (productDocs.length === 0 && !externalIndex) continue;

    sections.push(`# ${product.name}`);
    if (product.description) {
      sections.push(product.description);
    }

    if (productDocs.length > 0) {
      for (const doc of productDocs) {
        const rawBody = doc.linkedPost?.externalSource
          ? (await fetchExternalContent(doc.linkedPost.externalSource)) ??
            doc.linkedPost.body ??
            doc.body
          : doc.linkedPost?.body || doc.body;

        if (!rawBody) continue;

        const rendered = renderDocBodyMarkdown(
          rawBody,
          doc.images,
          templateContext,
        );
        sections.push(
          `<!-- Source: /${product.slug}/${doc.slug}.md -->\n\n${rendered}`,
        );
      }
    } else if (externalIndex) {
      for (const entry of externalIndex.docs) {
        const match = await findExternalDocBySlug(product.slug, entry.slug);
        const body =
          typeof match?.doc.body === "string" ? match.doc.body : null;
        if (!body) continue;
        sections.push(
          `<!-- Source: /${product.slug}/${entry.slug}.md -->\n\n${body}`,
        );
      }
    }

    if (product.slug === "inference-api" && modelArtifacts.length > 0) {
      sections.push("# Models");
      for (const artifact of modelArtifacts) {
        sections.push(
          `<!-- Source: /inference-api/models/${artifact.slug}.md -->\n\n${renderModelArtifactMarkdown(artifact)}`,
        );
      }
    }
  }

  // Join with blank lines only — never a `---` rule, since doc bodies contain
  // their own horizontal rules and a shared separator would split mid-page.
  // The `<!-- Source: … -->` markers and per-page H1s delimit pages.
  const content = sections.join("\n\n") + "\n";

  return new NextResponse(content, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
    },
  });
}
