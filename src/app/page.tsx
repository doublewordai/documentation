import {redirect} from 'next/navigation'
import {DEFAULT_PRODUCT_SLUG} from '@/lib/product-nav'

// Bare `/` resolves to the default section's getting-started page.
// Redirecting to `/${slug}` (not a specific doc) reuses the `/[product]`
// redirect chain, so the entry doc lives in one place. Runtime redirect (not a
// permanent next.config 308) keeps the target a single easily-changed constant.
export default function HomePage() {
  redirect(`/${DEFAULT_PRODUCT_SLUG}`)
}
