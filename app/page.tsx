import { defineQuery } from "next-sanity";
import { sanityFetch } from "@/sanity/live";
import Link from "next/link";

const PRODUCTS_QUERY = defineQuery(`*[_type == "product"] | order(name asc) {
  _id,
  name,
  slug,
  description
}`);

export default async function HomePage() {
  const products = await sanityFetch<Array<{
    _id: string;
    name: string;
    slug: { current: string };
    description?: string;
  }>>({ query: PRODUCTS_QUERY });

  return (
    <div className="min-h-screen max-w-6xl mx-auto px-8 py-16">
      <header className="mb-12">
        <h1 className="text-5xl font-bold mb-4">Doubleword Documentation</h1>
        <p className="text-xl text-gray-600">
          Explore documentation for our open-source projects and APIs
        </p>
      </header>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
        {products?.map((product) => (
          <Link
            key={product._id}
            href={`/${product.slug.current}`}
            className="p-6 border border-gray-200 rounded-lg hover:border-gray-400 hover:shadow-lg transition-all"
          >
            <h2 className="text-2xl font-semibold mb-2">{product.name}</h2>
            {product.description && (
              <p className="text-gray-600">{product.description}</p>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}
