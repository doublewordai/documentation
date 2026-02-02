import {createClient, type QueryParams} from 'next-sanity'
import {draftMode} from 'next/headers'

import {apiVersion, dataset, projectId} from '../env'

const token = process.env.SANITY_API_READ_TOKEN
const isDev = process.env.NODE_ENV === 'development'

export const client = createClient({
  projectId,
  dataset,
  apiVersion,
  // Set to false for static site generation (SSG) and ISR
  useCdn: false,
  // Enable draft access in development with a token
  ...(isDev && token && {
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
 *
 * When draft mode is enabled (Sanity Presentation preview), fetches use
 * the drafts perspective and skip caching for live updates.
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
  // Check draft mode, but handle build-time calls where there's no request context
  let isDraftMode = false
  try {
    isDraftMode = (await draftMode()).isEnabled
  } catch {
    // draftMode() throws when called outside request scope (e.g., during build)
  }

  // Use drafts perspective when in draft mode (Sanity Presentation preview)
  const fetchClient = isDraftMode && token
    ? client.withConfig({ token, perspective: 'drafts' })
    : client

  return fetchClient.fetch(query, params, {
    cache: isDraftMode ? 'no-store' : 'force-cache',
    next: isDraftMode ? undefined : {
      // For tag-based revalidation, set revalidate to false (cache indefinitely until tag is invalidated)
      revalidate: tags.length ? false : revalidate,
      // Tags for on-demand revalidation via webhook
      tags,
    },
  })
}
