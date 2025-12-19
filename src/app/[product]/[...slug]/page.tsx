import Link from 'next/link'
import {notFound} from 'next/navigation'
import {sanityFetch} from '@/sanity/lib/client'
import {DOC_PAGE_QUERY, ALL_DOC_PAGE_PATHS_QUERY} from '@/sanity/lib/queries'
import type {DocPage} from '@/sanity/types'
import {MarkdownRenderer} from '@/components/MarkdownRenderer'
import TableOfContents from '@/components/TableOfContents'
import CopyMarkdownButton from '@/components/CopyMarkdownButton'
import ApiKeyBanner from '@/components/ApiKeyBanner'
import ApiKeyIndicator from '@/components/ApiKeyIndicator'

/**
 * Generate static params for all documentation pages
 * This enables full static site generation (SSG)
 */
export async function generateStaticParams() {
  const paths = await sanityFetch({
    query: ALL_DOC_PAGE_PATHS_QUERY,
    tags: [],
  }) as Array<{productSlug: string; slug: string}>

  return paths.map((path) => ({
    product: path.productSlug,
    slug: [path.slug],
  }))
}

interface Props {
  params: Promise<{product: string; slug: string[]}>
}

export default async function DocPage({params}: Props) {
  const {product: productSlug, slug} = await params
  const docSlug = slug[0]

  // Fetch the documentation page
  const doc = await sanityFetch({
    query: DOC_PAGE_QUERY,
    params: {productSlug, slug: docSlug},
    tags: ['docPage'],
  }) as DocPage

  if (!doc || !doc.product) {
    notFound()
  }

  // Use linked post content if available, otherwise use doc content
  const content = doc.linkedPost?.body || doc.body;
  const images = doc.linkedPost?.images || doc.images;

  return (
    <div className="relative w-full flex justify-center">
      {/* Centered container for large screens */}
      <div className="w-full max-w-[1400px] 2xl:max-w-[2048px] relative px-4 sm:px-8 xl:pl-16 xl:pr-8 2xl:pr-4 pt-8 pb-16">
        <div className="flex items-start gap-16 2xl:gap-20">
          {/* Main content */}
          <div className="w-full max-w-2xl xl:max-w-3xl 2xl:max-w-4xl mx-auto xl:ml-auto xl:mr-0">
            {/* Breadcrumbs */}
            <nav
              className="mb-8 flex items-center gap-2 text-sm xl:text-base"
              style={{color: 'var(--text-muted)'}}
            >
              <Link
                href={`/${productSlug}`}
                className="hover:opacity-70 transition-opacity"
              >
                {doc.product.name}
              </Link>
              <span>/</span>
              <span className="truncate" style={{color: 'var(--foreground)'}}>
                {doc.title}
              </span>
            </nav>

            <article>
              {!doc.hideTitle && (
                <header className="mb-6">
                  <h1
                    className="text-3xl sm:text-4xl font-bold tracking-tight"
                    style={{color: 'var(--foreground)'}}
                  >
                    {doc.title}
                  </h1>
                </header>
              )}

              <ApiKeyBanner />

              <div className="prose max-w-none" data-enhance-footnotes data-enhance-code-tabs>
                {content && <MarkdownRenderer content={content} images={images} />}
              </div>
            </article>
          </div>

          {/* Table of Contents - Pushed to right gutter */}
          <aside className="hidden xl:block sticky top-8 h-fit pt-8 z-10 toc-aside ml-auto flex-shrink-0 w-[280px] 2xl:w-[360px]" style={{ background: 'var(--background)' }}>
            <TableOfContents />

            <div className="mt-4">
              <p
                className="text-xs 2xl:text-sm font-semibold tracking-wide mb-3"
                style={{ color: 'var(--text-muted)' }}
              >
                Actions
              </p>
              <ul className="space-y-2 text-sm 2xl:text-base">
                <li>
                  <ApiKeyIndicator />
                </li>
                <li>
                  <CopyMarkdownButton docId={doc._id} />
                </li>
              </ul>
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}
