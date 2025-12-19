'use client'

import { useAuth } from './AuthProvider'
import { useEffect, useRef } from 'react'

export default function ApiKeyInjector() {
  const { apiKey } = useAuth()
  const originalContent = useRef<Map<Element, string>>(new Map())
  const placeholder = 'YOUR_API_KEY'

  useEffect(() => {
    const codeBlocks = document.querySelectorAll('pre code, pre')

    codeBlocks.forEach((block) => {
      // Store original content on first visit
      if (!originalContent.current.has(block)) {
        originalContent.current.set(block, block.innerHTML)
      }

      const original = originalContent.current.get(block)
      if (!original) return

      if (apiKey) {
        // Replace placeholder with API key
        const newHtml = original.replace(new RegExp(placeholder, 'g'), apiKey)
        block.innerHTML = newHtml
      } else {
        // Restore original content when disconnected
        block.innerHTML = original
      }
    })
  }, [apiKey])

  return null
}
