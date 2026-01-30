import { defineQuery } from "next-sanity";

/**
 * Query all products for the homepage
 */
export const PRODUCTS_QUERY =
  defineQuery(`*[_type == "product"] | order(name asc) {
  _id,
  name,
  slug,
  description,
  githubUrl,
  icon
}`);

/**
 * Query a single product by slug
 */
export const PRODUCT_QUERY =
  defineQuery(`*[_type == "product" && slug.current == $slug][0] {
  _id,
  name,
  slug,
  description,
  githubUrl,
  icon
}`);

/**
 * Query all product slugs for static generation
 */
export const PRODUCT_SLUGS_QUERY =
  defineQuery(`*[_type == "product" && defined(slug.current)] {
  "slug": slug.current
}`);

/**
 * Query categories for a specific product
 */
export const CATEGORIES_BY_PRODUCT_QUERY =
  defineQuery(`*[_type == "category" && product._ref == $productId] | order(order asc) {
  _id,
  name,
  slug,
  order,
  description,
  "parent": parent->slug.current
}`);

/**
 * Query documentation pages for a specific product
 * Includes category information for building the sidebar navigation
 */
export const DOCS_BY_PRODUCT_QUERY =
  defineQuery(`*[_type == "docPage" && product._ref == $productId] | order(order asc) {
  _id,
  title,
  slug,
  order,
  sidebarLabel,
  externalLinkIcon,
  "categorySlug": category->slug.current,
  "categoryName": category->name,
  "parentSlug": parent->slug.current,
  "category": category->{
    _id,
    name,
    slug,
    order
  }
}`);

/**
 * Query a single documentation page by product and slug
 */
export const DOC_PAGE_QUERY =
  defineQuery(`*[_type == "docPage" && product->slug.current == $productSlug && slug.current == $slug][0] {
  _id,
  title,
  slug,
  body,
  externalSource,
  description,
  hideTitle,
  sidebarLabel,
  images[] {
    _key,
    asset-> {
      _id,
      url
    },
    filename,
    alt,
    caption
  },
  "product": product-> {
    _id,
    name,
    slug
  },
  "category": category-> {
    _id,
    name,
    slug
  },
  "parent": parent-> {
    title,
    slug
  },
  "linkedPost": linkedPost-> {
    _id,
    title,
    slug,
    body,
    externalSource,
    canonicalUrl,
    videoUrl,
    images[] {
      _key,
      asset-> {
        _id,
        url
      },
      filename,
      alt,
      caption
    }
  }
}`);

/**
 * Query all documentation page paths for a product (for static generation)
 */
export const DOC_PAGE_PATHS_QUERY =
  defineQuery(`*[_type == "docPage" && product->slug.current == $productSlug && defined(slug.current)] {
  "slug": slug.current
}`);

/**
 * Query all documentation page paths across all products (for static generation)
 */
export const ALL_DOC_PAGE_PATHS_QUERY =
  defineQuery(`*[_type == "docPage" && defined(slug.current) && defined(product->slug.current)] {
  "productSlug": product->slug.current,
  "slug": slug.current
}`);

/**
 * Query the first documentation page for a product (for redirect)
 */
export const FIRST_DOC_QUERY = defineQuery(`*[
  _type == "docPage" &&
  product->slug.current == $productSlug
] | order(category->order asc, order asc)[0]{
  "slug": slug.current
}`);

/**
 * Query the homepage singleton document
 */
export const HOMEPAGE_QUERY = defineQuery(`*[_type == "homepage"][0]{
  heroTitle,
  heroTitleMuted,
  heroDescription,
  "featuredGuides": featuredGuides[]->{
    _id,
    title,
    "slug": slug.current,
    "productSlug": product->slug.current,
    "productName": product->name
  }
}`);

/**
 * Query a Claude skill by slug
 */
export const CLAUDE_SKILL_QUERY = defineQuery(`*[
  _type == "claudeSkill" && slug.current == $slug
][0]{
  title,
  slug,
  description,
  githubUrl,
  version
}`);
