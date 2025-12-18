'use client'

import { useAuth } from './AuthProvider'
import { useEffect, useRef } from 'react'

export default function ApiKeyInjector() {
  const { apiKey } = useAuth()
  const hasInjected = useRef(false)

  useEffect(() => {
    if (!apiKey || hasInjected.current) return

    // Find all code blocks and replace placeholder with actual API key
    const codeBlocks = document.querySelectorAll('pre code, pre')

    codeBlocks.forEach((block) => {
      const content = block.textContent || ''

      // Common API key placeholders to replace
      const placeholders = [
        'YOUR_API_KEY',
        'your-api-key',
        'YOUR-API-KEY',
        '<your-api-key>',
        '{YOUR_API_KEY}',
        '${YOUR_API_KEY}',
      ]

      let newContent = content
      let hasReplacement = false

      placeholders.forEach((placeholder) => {
        if (content.includes(placeholder)) {
          newContent = newContent.replace(new RegExp(placeholder, 'g'), apiKey)
          hasReplacement = true
        }
      })

      if (hasReplacement && block.innerHTML) {
        // Replace in HTML to preserve syntax highlighting
        let newHtml = block.innerHTML
        placeholders.forEach((placeholder) => {
          newHtml = newHtml.replace(new RegExp(placeholder, 'g'), apiKey)
        })
        block.innerHTML = newHtml
      }
    })

    hasInjected.current = true
  }, [apiKey])

  return null
}
