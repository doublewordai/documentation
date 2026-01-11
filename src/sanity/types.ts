/**
 * Manually typed Sanity schema types
 * These can be auto-generated later when TypeGen is fully configured
 */

export interface Product {
  _id: string
  name: string
  slug: {current: string}
  description?: string
  githubUrl?: string
  icon?: {
    asset: {
      _ref: string
      _type: 'reference'
    }
  }
}

export interface Category {
  _id: string
  name: string
  slug: {current: string}
  order: number
  description?: string
  parent?: {
    slug: {current: string}
  }
}

export interface DocPage {
  _id: string
  title: string
  slug: {current: string}
  body?: string
  description?: string
  hideTitle?: boolean
  sidebarLabel?: string
  order?: number
  images?: Array<{
    _key: string
    asset: {
      _id: string
      url: string
    }
    filename: string
    alt?: string
    caption?: string
  }>
  product?: {
    _id: string
    name: string
    slug: {current: string}
  }
  category?: {
    _id: string
    name: string
    slug: {current: string}
  }
  parent?: {
    title: string
    slug: {current: string}
  }
  linkedPost?: {
    _id: string
    title: string
    slug: {current: string}
    body?: string
    externalSource?: string
    images?: Array<{
      _key: string
      asset: {
        _id: string
        url: string
      }
      filename: string
      alt?: string
      caption?: string
    }>
  }
}

export interface DocPageForNav {
  _id: string
  title: string
  slug: {current: string}
  order?: number
  sidebarLabel?: string
  categorySlug: string
  categoryName: string
  parentSlug?: string
  category: {
    _id: string
    name: string
    slug: {current: string}
    order: number
  }
}
