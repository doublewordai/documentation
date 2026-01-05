import {notFound} from 'next/navigation'
import {sanityFetch} from '@/sanity/lib/client'
import {PRODUCT_QUERY, DOCS_BY_PRODUCT_QUERY} from '@/sanity/lib/queries'
import type {Product, DocPageForNav} from '@/sanity/types'
import MobileSidebar from '@/components/MobileSidebar'

// Products that should show an API Reference link
const PRODUCTS_WITH_API_REFERENCE = ['batches']

export default async function ProductLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{product: string}>
}) {
  const {product: productSlug} = await params

  // Fetch product details
  const product = await sanityFetch({
    query: PRODUCT_QUERY,
    params: {slug: productSlug},
    tags: ['product'],
  }) as Product

  if (!product) {
    notFound()
  }

  // Fetch all docs for sidebar
  const docs = await sanityFetch({
    query: DOCS_BY_PRODUCT_QUERY,
    params: {productId: product._id},
    tags: ['docPage', 'category'],
  }) as DocPageForNav[]

  // Group docs by category
  const groupedDocs: Record<
    string,
    {category: DocPageForNav['category']; docs: DocPageForNav[]}
  > = {}

  docs.forEach((doc) => {
    if (!doc.category) return
    const categoryId = doc.category._id
    if (!groupedDocs[categoryId]) {
      groupedDocs[categoryId] = {
        category: doc.category,
        docs: [],
      }
    }
    groupedDocs[categoryId].docs.push(doc)
  })

  const showApiReference = PRODUCTS_WITH_API_REFERENCE.includes(productSlug)

  return (
    <div className="min-h-screen" style={{background: 'var(--background)'}}>
      <MobileSidebar
        productName={product.name}
        productSlug={productSlug}
        groupedDocs={groupedDocs}
        apiReferenceHref={showApiReference ? `/${productSlug}/api-reference` : undefined}
      />
      <main className="pt-14 lg:pt-0 lg:ml-64">{children}</main>
    </div>
  )
}
