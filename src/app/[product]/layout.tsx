import {notFound} from 'next/navigation'
import {sanityFetch} from '@/sanity/lib/client'
import {PRODUCT_QUERY, DOCS_BY_PRODUCT_QUERY} from '@/sanity/lib/queries'
import type {Product, DocPageForNav} from '@/sanity/types'
import MobileSidebar from '@/components/MobileSidebar'
import {getExternalDocsGroups, getExternalProduct} from '@/lib/external-docs'


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

  if (productSlug === 'inference-api') {
    const referenceEntry = Object.values(groupedDocs).find(
      ({category}) => category.slug.current === 'reference',
    )

    if (referenceEntry) {
      referenceEntry.docs.push({
        _id: 'external:dw-cli',
        title: 'Doubleword CLI',
        slug: {current: 'dw-cli'},
        href: '/dw-cli',
        order: 10_000,
        sidebarLabel: 'Doubleword CLI',
        externalLinkIcon: true,
        categorySlug: 'reference',
        categoryName: 'Reference',
        parentSlug: null,
        category: referenceEntry.category,
      })
    }
  }

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
