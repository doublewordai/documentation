import {redirect, notFound} from 'next/navigation'
import {sanityFetch} from '@/sanity/lib/client'
import {PRODUCT_SLUGS_QUERY, FIRST_DOC_QUERY} from '@/sanity/lib/queries'
import {getExternalDocStaticParams, getFirstExternalDocSlug} from '@/lib/external-docs'

/**
 * Generate static params for all products
 * This enables full static site generation (SSG)
 */
export async function generateStaticParams() {
  const products = await sanityFetch({
    query: PRODUCT_SLUGS_QUERY,
    tags: [],
  }) as Array<{slug: string}>

  const externalParams = await getExternalDocStaticParams()
  const externalProducts = Array.from(
    new Set(externalParams.map((entry) => entry.product)),
  ).map((product) => ({product}))

  return [
    ...products.map((product) => ({
      product: product.slug,
    })),
    ...externalProducts,
  ]
}

interface Props {
  params: Promise<{product: string}>
}

export default async function ProductPage({params}: Props) {
  const {product: productSlug} = await params

  const firstDoc = await sanityFetch({
    query: FIRST_DOC_QUERY,
    params: {productSlug},
    tags: ['docPage'],
  }) as {slug: string} | null

  if (firstDoc) {
    redirect(`/${productSlug}/${firstDoc.slug}`)
  }

  const firstExternalDoc = await getFirstExternalDocSlug(productSlug)

  if (firstExternalDoc) {
    redirect(`/${productSlug}/${firstExternalDoc}`)
  }

  notFound()
}
