/**
 * Canonical source of truth for the top-level product sections.
 *
 * Used by the ProductTabs header strip, the `/` → getting-started redirect,
 * and the `/[product]` index redirect. Labels are pinned here (not read from
 * Sanity `product.name`) so the tab strip needs no fetch and the displayed
 * labels are guaranteed stable.
 */

export type ProductTab = {
  slug: string
  label: string
}

// Ordered left-to-right. This array defines both tab order and labels.
export const PRODUCT_TABS: ProductTab[] = [
  {slug: 'inference-api', label: 'Inference API'},
  {slug: 'dw-cli', label: 'CLI'},
]

// Where bare `/` resolves. Change this one constant to move the landing target.
export const DEFAULT_PRODUCT_SLUG = 'inference-api'

/**
 * Preferred entry doc per product, used by `/[product]` to redirect to a
 * specific first page instead of relying on category/order resolution.
 */
export const PRODUCT_ROOT_REDIRECTS: Record<string, string> = {
  'inference-api': 'intro-to-doubleword-inference',
}
