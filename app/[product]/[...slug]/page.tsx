import { defineQuery } from "next-sanity";
import { sanityFetch } from "@/sanity/live";
import Link from "next/link";
import { notFound } from "next/navigation";
import MarkdownRenderer from "@/app/components/MarkdownRenderer";

const DOC_QUERY = defineQuery(`*[
  _type == "docPage" &&
  slug.current == $slug &&
  product->slug.current == $productSlug
][0]{
  _id,
  title,
  body,
  "product": product->{name, slug}
}`);

export default async function DocPage({
  params,
}: {
  params: Promise<{ product: string; slug: string[] }>;
}) {
  const { product: productSlug, slug: slugArray } = await params;
  // Join the slug array directly - no product prefix needed
  const slug = slugArray.join("/");

  const doc = await sanityFetch<{
    _id: string;
    title: string;
    body: string;
    product: {
      name: string;
      slug: { current: string };
    };
  }>({
    query: DOC_QUERY,
    params: { productSlug, slug },
  });

  if (!doc) {
    notFound();
  }

  return (
    <div className="max-w-4xl mx-auto px-8 py-16">
      <article>
        <header className="mb-8">
          <h1 className="text-5xl font-extrabold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-4">
            {doc.title}
          </h1>
        </header>

        <div className="prose prose-lg max-w-none"
        >
          {typeof doc.body === "string" && <MarkdownRenderer content={doc.body} />}
        </div>
      </article>
    </div>
  );
}
