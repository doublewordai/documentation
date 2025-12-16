import { defineQuery } from "next-sanity";
import { sanityFetch } from "@/sanity/live";
import { redirect, notFound } from "next/navigation";

const FIRST_DOC_QUERY = defineQuery(`*[
  _type == "docPage" &&
  product->slug.current == $productSlug
] | order(category.order asc, order asc)[0]{
  "slug": slug.current
}`);

export default async function ProductPage({
  params,
}: {
  params: Promise<{ product: string }>;
}) {
  const { product: productSlug } = await params;

  const firstDoc = await sanityFetch<{ slug: string }>({
    query: FIRST_DOC_QUERY,
    params: { productSlug },
  });

  if (firstDoc) {
    redirect(`/${productSlug}/${firstDoc.slug}`);
  }

  notFound();
}
