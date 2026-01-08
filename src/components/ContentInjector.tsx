'use client'

import { useAuth } from './AuthProvider'
import { useConfig } from './ConfigProvider'
import { useEffect, useRef } from 'react'

/**
 * ContentInjector replaces client-side placeholders in code blocks
 *
 * Supported placeholders:
 * - {{apiKey}} - User's API key
 * - {{selectedModel.id}} - Selected model ID
 * - {{selectedModel.name}} - Selected model name
 * - {{selectedModel.pricing.batch.input}} - Model batch input price per token
 * - {{selectedModel.pricing.batch.output}} - Model batch output price per token
 * - {{selectedModel.pricing.realtime.input}} - Model realtime input price per token
 * - {{selectedModel.pricing.realtime.output}} - Model realtime output price per token
 */
export default function ContentInjector() {
  const { apiKey } = useAuth()
  const { selectedModel } = useConfig()
  const observerRef = useRef<MutationObserver | null>(null)

  useEffect(() => {
    // Process a single code block element
    const processCodeBlock = (element: HTMLElement) => {
      // Store original content in data attribute on first visit
      if (!element.dataset.originalContent) {
        element.dataset.originalContent = element.innerHTML
      }

      const original = element.dataset.originalContent
      if (!original) return

      let newHtml = original

      // Replace API key placeholders
      // Handle both plain text and syntax-highlighted versions where {{apiKey}} is split across spans
      if (apiKey) {
        // Plain text replacement
        newHtml = newHtml.replace(/\{\{apiKey\}\}/g, apiKey)
        // Syntax-highlighted replacement: <span>{{</span><span>apiKey</span><span>}}</span>
        // The quotes are in separate spans, so we just replace the {{apiKey}} part
        newHtml = newHtml.replace(
          /<span[^>]*>\{\{<\/span>\s*<span[^>]*>apiKey<\/span>\s*<span[^>]*>\}\}<\/span>/g,
          `<span style="color:#98C379">${apiKey}</span>`
        )
      }

      // Replace selected model placeholders
      if (selectedModel) {
        // Plain text replacements
        newHtml = newHtml.replace(/\{\{selectedModel\.id\}\}/g, selectedModel.id)
        newHtml = newHtml.replace(/\{\{selectedModel\.name\}\}/g, selectedModel.name || selectedModel.id)

        // Syntax-highlighted replacements for model placeholders
        // Pattern: <span>{{</span><span>selectedModel</span><span>.</span><span>id</span><span>}}</span>
        // or variations where dots and parts may be in different spans
        newHtml = newHtml.replace(
          /<span[^>]*>\{\{<\/span>(?:<span[^>]*>)?selectedModel(?:<\/span>)?(?:<span[^>]*>)?\.(?:<\/span>)?(?:<span[^>]*>)?id(?:<\/span>)?(?:<span[^>]*>)?\}\}(?:<\/span>)?/g,
          `<span style="color:#98C379">${selectedModel.id}</span>`
        )
        newHtml = newHtml.replace(
          /<span[^>]*>\{\{<\/span>(?:<span[^>]*>)?selectedModel(?:<\/span>)?(?:<span[^>]*>)?\.(?:<\/span>)?(?:<span[^>]*>)?name(?:<\/span>)?(?:<span[^>]*>)?\}\}(?:<\/span>)?/g,
          `<span style="color:#98C379">${selectedModel.name || selectedModel.id}</span>`
        )

        // Handle pricing placeholders (batch pricing)
        const batchPricing = selectedModel.pricing?.batch
        if (batchPricing) {
          newHtml = newHtml.replace(
            /\{\{selectedModel\.pricing\.batch\.input\}\}/g,
            String(batchPricing.input)
          )
          newHtml = newHtml.replace(
            /\{\{selectedModel\.pricing\.batch\.output\}\}/g,
            String(batchPricing.output)
          )
        }

        // Handle realtime pricing placeholders
        const realtimePricing = selectedModel.pricing?.realtime
        if (realtimePricing) {
          newHtml = newHtml.replace(
            /\{\{selectedModel\.pricing\.realtime\.input\}\}/g,
            String(realtimePricing.input)
          )
          newHtml = newHtml.replace(
            /\{\{selectedModel\.pricing\.realtime\.output\}\}/g,
            String(realtimePricing.output)
          )
        }
      }

      // Only update if content changed
      if (newHtml !== element.innerHTML) {
        element.innerHTML = newHtml
      }
    }

    // Process all code blocks in the document
    const processAllCodeBlocks = () => {
      const codeElements = document.querySelectorAll('pre code')
      const preWithoutCode = document.querySelectorAll('pre:not(:has(code))')
      const codeBlocks = [...codeElements, ...preWithoutCode]

      codeBlocks.forEach((block) => {
        processCodeBlock(block as HTMLElement)
      })
    }

    // Process existing code blocks
    processAllCodeBlocks()

    // Clean up old observer
    if (observerRef.current) {
      observerRef.current.disconnect()
    }

    // Set up MutationObserver to watch for new code blocks
    observerRef.current = new MutationObserver((mutations) => {
      let shouldProcess = false

      for (const mutation of mutations) {
        if (mutation.type === 'childList') {
          // Check if any added nodes contain code blocks
          for (const node of mutation.addedNodes) {
            if (node instanceof HTMLElement) {
              if (node.matches('pre, pre code') || node.querySelector('pre, pre code')) {
                shouldProcess = true
                break
              }
            }
          }
        }
        if (shouldProcess) break
      }

      if (shouldProcess) {
        // Small delay to let the DOM settle (e.g., after syntax highlighting)
        requestAnimationFrame(() => {
          processAllCodeBlocks()
        })
      }
    })

    observerRef.current.observe(document.body, {
      childList: true,
      subtree: true,
    })

    return () => {
      observerRef.current?.disconnect()
    }
  }, [apiKey, selectedModel])

  return null
}
