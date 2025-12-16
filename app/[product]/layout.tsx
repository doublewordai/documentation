import { defineQuery } from "next-sanity";
import { sanityFetch } from "@/sanity/live";
import Link from "next/link";
import { notFound } from "next/navigation";
import SidebarNav from "@/app/components/SidebarNav";
import ThemeToggle from "@/app/components/ThemeToggle";

const PRODUCT_QUERY = defineQuery(`*[
  _type == "product" &&
  slug.current == $productSlug
][0]{
  _id,
  name,
  slug
}`);

const DOCS_QUERY = defineQuery(`*[
  _type == "docPage" &&
  product->slug.current == $productSlug
] {
  _id,
  title,
  "slug": slug.current,
  "category": category->{
    _id,
    name,
    "slug": slug.current,
    order,
    "parent": parent->{_id, name, order}
  },
  order,
  sidebarLabel,
  "product": product->{name, slug}
} | order(category.order asc, order asc)`);

export default async function DocsLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ product: string }>;
}) {
  const { product: productSlug } = await params;

  const [product, docs] = await Promise.all([
    sanityFetch<{ _id: string; name: string; slug: { current: string } }>({
      query: PRODUCT_QUERY,
      params: { productSlug },
    }),
    sanityFetch<
      Array<{
        _id: string;
        title: string;
        slug: string;
        category: {
          _id: string;
          name: string;
          slug: string;
          order: number;
          parent?: { _id: string; name: string; order: number };
        };
        order?: number;
        sidebarLabel?: string;
        product: { name: string; slug: { current: string } };
      }>
    >({
      query: DOCS_QUERY,
      params: { productSlug },
    }),
  ]);

  if (!product) {
    notFound();
  }

  // Group docs by category (already sorted by category.order and doc order from query)
  const groupedDocs: Record<string, { category: typeof docs[0]['category']; docs: typeof docs }> = {};
  docs.forEach((doc) => {
    const categoryId = doc.category._id;
    if (!groupedDocs[categoryId]) {
      groupedDocs[categoryId] = {
        category: doc.category,
        docs: []
      };
    }
    groupedDocs[categoryId].docs.push(doc);
  });

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className="w-64 border-r border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#161b22] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <Link href={`/${productSlug}`}>
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">{product.name}</h2>
            </Link>
            <ThemeToggle />
          </div>

          <SidebarNav productSlug={productSlug} groupedDocs={groupedDocs} />
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
