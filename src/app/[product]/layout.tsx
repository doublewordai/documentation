import {notFound} from 'next/navigation'
import {sanityFetch} from '@/sanity/lib/client'
import {PRODUCT_QUERY, DOCS_BY_PRODUCT_QUERY} from '@/sanity/lib/queries'
import type {Product, DocPageForNav} from '@/sanity/types'
import MobileSidebar from '@/components/MobileSidebar'
import {getExternalDocsGroups, getExternalProduct} from '@/lib/external-docs'
import {organizeInferenceApiSidebar} from '@/lib/inference-api-sidebar'


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
  }) as Product | null

  const resolvedProduct = product || getExternalProduct(productSlug)

  if (!resolvedProduct) {
    notFound()
  }

  // Fetch all docs for sidebar
  const docs = product
    ? await sanityFetch({
      query: DOCS_BY_PRODUCT_QUERY,
      params: {productId: product._id},
      tags: ['docPage', 'category'],
    }) as DocPageForNav[]
    : []

  const externalDocGroups = await getExternalDocsGroups(productSlug)

  const groupedDocs: Record<
    string,
    {category: DocPageForNav['category']; docs: DocPageForNav[]}
  > = productSlug === 'inference-api'
    ? organizeInferenceApiSidebar(docs)
    : docs.reduce((acc, doc) => {
      if (!doc.category) return acc
      const categoryId = doc.category._id
      if (!acc[categoryId]) {
        acc[categoryId] = {
          category: doc.category,
          docs: [],
        }
      }
      acc[categoryId].docs.push(doc)
      return acc
    }, {} as Record<string, {category: DocPageForNav['category']; docs: DocPageForNav[]}>)

  return (
    <div className="min-h-screen" style={{background: 'var(--background)'}}>
      <MobileSidebar
        productName={resolvedProduct.name}
        productSlug={productSlug}
        groupedDocs={groupedDocs}
        externalDocGroups={externalDocGroups}
      />
      <main className="pt-14 xl:pt-0 xl:ml-64">{children}</main>
    </div>
  )
}
