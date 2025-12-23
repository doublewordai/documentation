import {redirect, notFound} from 'next/navigation'
import {sanityFetch} from '@/sanity/lib/live'
import {client} from '@/sanity/lib/client'
import {PRODUCT_SLUGS_QUERY, FIRST_DOC_QUERY} from '@/sanity/lib/queries'

/**
 * Generate static params for all products
 * This enables full static site generation (SSG)
 */
export async function generateStaticParams() {
  // Use client directly for static generation (no stega, no live)
  const products = await client.fetch<Array<{slug: string}>>(PRODUCT_SLUGS_QUERY)

  return products.map((product) => ({
    product: product.slug,
  }))
}

interface Props {
  params: Promise<{product: string}>
}

export default async function ProductPage({params}: Props) {
  const {product: productSlug} = await params

  const { data: firstDoc } = await sanityFetch({
    query: FIRST_DOC_QUERY,
    params: {productSlug},
  })

  if (firstDoc) {
    redirect(`/${productSlug}/${firstDoc.slug}`)
  }

  notFound()
}
