/**
 * Handlebars templating utility for dynamic content injection
 */

import Handlebars from 'handlebars'
import type { Model, ModelsResponse } from './models'

export interface TemplateContext {
  models: Model[]
  selectedModel?: Model | null
  apiKey?: string
  // Add more context fields as needed
}

// Register custom helpers
Handlebars.registerHelper('formatPrice', function(price: number) {
  if (typeof price !== 'number') return 'N/A'
  return `$${price.toFixed(2)}`
})

Handlebars.registerHelper('formatPricePer1M', function(price: number) {
  if (typeof price !== 'number') return 'N/A'
  // Price is per token, multiply by 1M for display
  return `$${(price * 1_000_000).toFixed(2)}`
})

Handlebars.registerHelper('eq', function(a: any, b: any) {
  return a === b
})

Handlebars.registerHelper('json', function(context: any) {
  return JSON.stringify(context, null, 2)
})

// Helper to check if model has capability
Handlebars.registerHelper('hasCapability', function(model: Model, capability: string) {
  return model.capabilities?.includes(capability)
})

// URL encode helper for building URLs with model IDs
Handlebars.registerHelper('urlEncode', function(str: string) {
  if (typeof str !== 'string') return ''
  return encodeURIComponent(str)
})

/**
 * Template markdown content with Handlebars
 *
 * Server-side: Templates with models data (for {{#each models}} etc.)
 * Client-side placeholders like {{apiKey}} and {{selectedModel.*}} are preserved
 * and replaced client-side by ContentInjector
 */
export function templateMarkdown(
  content: string,
  context: Partial<TemplateContext>
): string {
  // Skip if no content or no template syntax
  if (!content || !content.includes('{{')) {
    return content
  }

  try {
    // Preserve client-side placeholders by escaping them
    // These will be processed client-side by ContentInjector
    const clientPlaceholders = ['apiKey', 'selectedModel']
    let processedContent = content

    // Temporarily replace client-side placeholders so Handlebars doesn't process them
    const placeholderMap = new Map<string, string>()
    clientPlaceholders.forEach(placeholder => {
      // Match {{apiKey}}, {{selectedModel}}, {{selectedModel.id}}, etc.
      const regex = new RegExp(`\\{\\{${placeholder}(\\.\\w+)*\\}\\}`, 'g')
      processedContent = processedContent.replace(regex, (match) => {
        const key = `__PLACEHOLDER_${placeholderMap.size}__`
        placeholderMap.set(key, match)
        return key
      })
    })

    // Compile and execute Handlebars template
    const template = Handlebars.compile(processedContent, {
      noEscape: true, // Don't escape HTML in output
    })

    let result = template({
      models: context.models || [],
      ...context,
    })

    // Restore client-side placeholders
    placeholderMap.forEach((original, key) => {
      result = result.replace(new RegExp(key, 'g'), original)
    })

    return result
  } catch (error) {
    console.error('Handlebars templating error:', error)
    // Return original content on error
    return content
  }
}

/**
 * Build template context from models response
 */
export function buildTemplateContext(modelsResponse: ModelsResponse): TemplateContext {
  return {
    models: modelsResponse.models,
    selectedModel: null, // Set client-side
    apiKey: undefined,   // Set client-side
  }
}
