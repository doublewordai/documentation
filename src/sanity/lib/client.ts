import {createClient, type QueryParams} from 'next-sanity'

import {apiVersion, dataset, projectId} from '../env'

const token = process.env.SANITY_API_READ_TOKEN

export const client = createClient({
  projectId,
  dataset,
  apiVersion,
  // Set to false for static site generation (SSG) and ISR
  useCdn: false,
  // Enable draft access in development with a token
  ...(token && {
    token,
    perspective: 'drafts',
  }),
})

/**
 * Fetch data from Sanity with Next.js caching and revalidation support.
 *
 * For webhook-based revalidation:
 * - Pass tags array to enable tag-based cache invalidation
 * - revalidate will be set to false when tags are provided
 * - Use revalidateTag() in webhook API route to bust cache on-demand
 */
export async function sanityFetch<const QueryString extends string>({
  query,
  params = {},
  revalidate = 60, // Default revalidation time in seconds (fallback for pages without tags)
  tags = [],
}: {
  query: QueryString
  params?: QueryParams
  revalidate?: number | false
  tags?: string[]
}) {
  return client.fetch(query, params, {
    // On Next.js 15+ cache: 'force-cache' is required
    cache: 'force-cache',
    next: {
      // For tag-based revalidation, set revalidate to false (cache indefinitely until tag is invalidated)
      revalidate: tags.length ? false : revalidate,
      // Tags for on-demand revalidation via webhook
      tags,
    },
  })
}
