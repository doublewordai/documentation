import Link from 'next/link'
import Image from 'next/image'
import {sanityFetch} from '@/sanity/lib/live'
import {PRODUCTS_QUERY, HOMEPAGE_QUERY} from '@/sanity/lib/queries'
import type {Product} from '@/sanity/types'
import ThemeToggle from '@/components/ThemeToggle'

type FeaturedGuide = {
  _id: string
  title: string
  slug: string
  productSlug: string
  productName: string
}

type Homepage = {
  heroTitle: string
  heroTitleMuted: string
  heroDescription: string
  featuredGuides: FeaturedGuide[]
}

// Render markdown links in text
function renderWithLinks(text: string) {
  const parts = text.split(/(\[[^\]]+\]\([^)]+\))/g)
  return parts.map((part, i) => {
    const match = part.match(/\[([^\]]+)\]\(([^)]+)\)/)
    if (match) {
      return (
        <a
          key={i}
          href={match[2]}
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: 'var(--link-color)', position: 'relative', zIndex: 20, pointerEvents: 'auto' }}
          className="hover:underline"
        >
          {match[1]}
        </a>
      )
    }
    return part
  })
}

// Product icons mapped by slug
const productIcons: Record<string, React.ReactNode> = {
  'batches': (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  ),
  'control-layer': (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v4" />
      <path d="M12 18v4" />
      <path d="M4.93 4.93l2.83 2.83" />
      <path d="M16.24 16.24l2.83 2.83" />
      <path d="M2 12h4" />
      <path d="M18 12h4" />
      <path d="M4.93 19.07l2.83-2.83" />
      <path d="M16.24 7.76l2.83-2.83" />
    </svg>
  ),
  'inference-stack': (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
      <path d="M12 2L2 7l10 5 10-5-10-5z" />
      <path d="M2 17l10 5 10-5" />
      <path d="M2 12l10 5 10-5" />
    </svg>
  ),
}

// Quick links for each product
const quickLinks: Record<string, { label: string; href: string }> = {
  'batches': { label: 'Submit your first batch', href: '/batches/getting-started-with-batched-api' },
  'control-layer': { label: 'Getting started', href: '/control-layer/getting-started' },
  'inference-stack': { label: 'Your first deployment', href: '/inference-stack/deployment/first-deployment' },
}

export default async function HomePage() {
  const [{ data: products }, { data: homepage }] = await Promise.all([
    sanityFetch({
      query: PRODUCTS_QUERY,
    }) as Promise<{ data: Product[] }>,
    sanityFetch({
      query: HOMEPAGE_QUERY,
    }) as Promise<{ data: Homepage }>,
  ])

  return (
    <div
      className="min-h-screen relative overflow-hidden"
      style={{ background: 'var(--background)' }}
    >
      {/* Subtle grid pattern background */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(to right, var(--sidebar-border) 1px, transparent 1px),
            linear-gradient(to bottom, var(--sidebar-border) 1px, transparent 1px)
          `,
          backgroundSize: '64px 64px',
          opacity: 0.4,
          maskImage: 'radial-gradient(ellipse at center, black 0%, transparent 70%)',
          WebkitMaskImage: 'radial-gradient(ellipse at center, black 0%, transparent 70%)',
        }}
      />

      <div className="relative max-w-5xl mx-auto px-6 sm:px-8 py-12 sm:py-16">
        {/* Hero Section */}
        <header className="mb-12 sm:mb-16">
          <div className="flex items-center justify-between mb-8">
            <div>
              <Image
                src="/logo-full-black.png"
                alt="Doubleword"
                width={200}
                height={44}
                priority
                className="logo-light"
                style={{ height: 'auto' }}
              />
              <Image
                src="/logo-full-white.png"
                alt="Doubleword"
                width={200}
                height={44}
                priority
                className="logo-dark"
                style={{ height: 'auto' }}
              />
            </div>
            <ThemeToggle />
          </div>

          <h1
            className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-4"
            style={{
              color: 'var(--foreground)',
              lineHeight: 1.1,
            }}
          >
            {homepage?.heroTitle || 'Build AI infrastructure'}
            {homepage?.heroTitleMuted && (
              <>
                <br />
                <span style={{ color: 'var(--text-muted)' }}>{homepage.heroTitleMuted}</span>
              </>
            )}
          </h1>

          <p
            className="text-lg sm:text-xl max-w-2xl"
            style={{
              color: 'var(--text-muted)',
              lineHeight: 1.6,
            }}
          >
            {homepage?.heroDescription || "Explore guides and references for Doubleword's open-source tools."}
          </p>
        </header>

        {/* Products Grid */}
        <section className="mb-12 sm:mb-14">
          <h2
            className="text-xs font-semibold tracking-widest uppercase mb-6"
            style={{ color: 'var(--text-muted)' }}
          >
            Products
          </h2>

          <div className="grid gap-4 sm:gap-6 md:grid-cols-3">
            {products?.map((product, index) => {
              const slug = product.slug.current
              const icon = productIcons[slug]
              const quick = quickLinks[slug]

              return (
                <div
                  key={product._id}
                  className="group relative p-6 sm:p-8 rounded-2xl transition-all duration-300"
                  style={{
                    background: 'var(--sidebar-bg)',
                    border: '1px solid var(--sidebar-border)',
                    animationDelay: `${index * 100}ms`,
                  }}
                >
                  {/* Stretched link for card click */}
                  <Link
                    href={`/${slug}`}
                    className="absolute inset-0 rounded-2xl z-0"
                    aria-label={`Go to ${product.name} documentation`}
                  />

                  {/* Hover gradient overlay */}
                  <div
                    className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                    style={{
                      background: 'linear-gradient(135deg, rgba(0, 112, 243, 0.03) 0%, transparent 50%)',
                    }}
                  />

                  {/* Icon */}
                  <div
                    className="relative z-10 w-12 h-12 rounded-xl flex items-center justify-center mb-5 transition-transform duration-300 group-hover:scale-110 pointer-events-none"
                    style={{
                      background: 'var(--hover-bg)',
                      border: '1px solid var(--sidebar-border)',
                      color: 'var(--link-color)',
                    }}
                  >
                    {icon}
                  </div>

                  {/* Content */}
                  <h3
                    className="relative z-10 text-xl font-semibold mb-2 tracking-tight pointer-events-none"
                    style={{ color: 'var(--foreground)' }}
                  >
                    {product.name}
                  </h3>

                  {product.description && (
                    <p
                      className="relative z-10 text-sm leading-relaxed mb-4"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      {renderWithLinks(product.description)}
                    </p>
                  )}

                  {/* Quick link */}
                  {quick && (
                    <div
                      className="relative z-10 flex items-center gap-2 text-sm font-medium transition-colors pointer-events-none"
                      style={{ color: 'var(--link-color)' }}
                    >
                      <span>{quick.label}</span>
                      <svg
                        viewBox="0 0 16 16"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1"
                      >
                        <path d="M3 8h10M9 4l4 4-4 4" />
                      </svg>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </section>

        {/* Quick Links Section */}
        {homepage?.featuredGuides && homepage.featuredGuides.length > 0 && (
          <section>
            <h2
              className="text-xs font-semibold tracking-widest uppercase mb-6"
              style={{ color: 'var(--text-muted)' }}
            >
              Popular Guides
            </h2>

            <div
              className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
            >
              {homepage.featuredGuides.map((guide) => (
                <Link
                  key={guide._id}
                  href={`/${guide.productSlug}/${guide.slug}`}
                  className="group flex items-center justify-between gap-4 px-4 py-3 rounded-xl transition-all duration-200"
                  style={{
                    background: 'var(--sidebar-bg)',
                    border: '1px solid var(--sidebar-border)',
                  }}
                >
                  <div className="flex flex-col min-w-0">
                    <span
                      className="font-medium truncate transition-colors group-hover:text-[var(--link-color)]"
                      style={{ color: 'var(--foreground)' }}
                    >
                      {guide.title}
                    </span>
                    <span
                      className="text-xs truncate"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      {guide.productName}
                    </span>
                  </div>
                  <svg
                    viewBox="0 0 16 16"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="w-4 h-4 flex-shrink-0 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    <path d="M3 8h10M9 4l4 4-4 4" />
                  </svg>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Footer */}
        <footer
          className="mt-12 sm:mt-16 pt-6 border-t flex flex-col sm:flex-row items-center justify-between gap-4 text-sm"
          style={{
            borderColor: 'var(--sidebar-border)',
            color: 'var(--text-muted)',
          }}
        >
          <p>Doubleword &copy; {new Date().getFullYear()}</p>
          <div className="flex items-center gap-6">
            <a
              href="https://github.com/doublewordai"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:opacity-70 transition-opacity flex items-center gap-2"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
              </svg>
              GitHub
            </a>
            <a
              href="https://app.doubleword.ai"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:opacity-70 transition-opacity"
            >
              Dashboard
            </a>
          </div>
        </footer>
      </div>
    </div>
  )
}
