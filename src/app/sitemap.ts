import type {MetadataRoute} from 'next'
import {client} from '@/sanity/lib/client'

const SITE_URL = 'https://docs.doubleword.ai'

// Query all doc pages with their product slugs
const ALL_DOCS_QUERY = `*[_type == "docPage" && defined(slug.current) && defined(product->slug.current)] {
  "productSlug": product->slug.current,
  "slug": slug.current,
  _updatedAt
}`

// Query all products
const ALL_PRODUCTS_QUERY = `*[_type == "product" && defined(slug.current)] {
  "slug": slug.current,
  _updatedAt
}`

type DocPageResult = {
  productSlug: string
  slug: string
  _updatedAt: string
}

type ProductResult = {
  slug: string
  _updatedAt: string
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Fetch all docs and products from Sanity (no live needed for sitemap)
  const [docs, products] = await Promise.all([
    client.fetch<DocPageResult[]>(ALL_DOCS_QUERY),
    client.fetch<ProductResult[]>(ALL_PRODUCTS_QUERY),
  ])

  // Homepage
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: SITE_URL,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1,
    },
  ]

  // Product index pages
  const productRoutes: MetadataRoute.Sitemap = products.map((product) => ({
    url: `${SITE_URL}/${product.slug}`,
    lastModified: new Date(product._updatedAt),
    changeFrequency: 'weekly' as const,
    priority: 0.9,
  }))

  // Documentation pages
  const docRoutes: MetadataRoute.Sitemap = docs.map((doc) => ({
    url: `${SITE_URL}/${doc.productSlug}/${doc.slug}`,
    lastModified: new Date(doc._updatedAt),
    changeFrequency: 'monthly' as const,
    priority: 0.8,
  }))

  return [...staticRoutes, ...productRoutes, ...docRoutes]
}
