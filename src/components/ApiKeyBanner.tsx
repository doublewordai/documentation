'use client'

import { useAuth } from './AuthProvider'
import { useState, useEffect } from 'react'
import posthog from 'posthog-js'

export default function ApiKeyBanner() {
  const { user, apiKey, isLoading, isGeneratingKey, signIn } = useAuth()
  const [isDismissed, setIsDismissed] = useState(true)
  const [hasPlaceholders, setHasPlaceholders] = useState(false)
  const [isCheckingBanner, setIsCheckingBanner] = useState(true)

  useEffect(() => {
    // Check if page has API key placeholders in code blocks
    const codeBlocks = document.querySelectorAll('pre code, pre')
    const placeholder = 'YOUR_API_KEY'

    let foundPlaceholder = false
    codeBlocks.forEach((block) => {
      const content = block.textContent || ''
      if (content.includes(placeholder)) {
        foundPlaceholder = true
      }
    })

    setHasPlaceholders(foundPlaceholder)

    // Check if banner was dismissed
    const dismissed = localStorage.getItem('apikey_banner_dismissed')
    setIsDismissed(dismissed === 'true')

    setIsCheckingBanner(false)
  }, [])

  const handleDismiss = () => {
    setIsDismissed(true)
    localStorage.setItem('apikey_banner_dismissed', 'true')

    // Capture banner dismissed event with PostHog
    posthog.capture('api_key_banner_dismissed', {
      page_path: window.location.pathname,
    })
  }

  const handleConnect = () => {
    // Capture banner connect clicked event with PostHog
    posthog.capture('api_key_banner_connect_clicked', {
      page_path: window.location.pathname,
    })
    signIn()
  }

  // Don't show if:
  // - Banner is checking its state
  // - Auth is still loading
  // - API key is being auto-generated
  // - Already connected (has API key)
  // - User dismissed it
  // - No placeholders on page
  if (isCheckingBanner || isLoading || isGeneratingKey || apiKey || isDismissed || !hasPlaceholders) {
    return null
  }

  return (
    <div
      className="mb-4 px-3 py-2.5 rounded-md flex items-center gap-3 text-sm"
      style={{
        backgroundColor: 'var(--code-bg)',
        border: '1px solid var(--pre-border)',
      }}
    >
      <div className="flex-1 min-w-0">
        <span style={{ color: 'var(--text-muted)' }}>
          Connect your API key to autofill code examples
        </span>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        <button
          onClick={handleConnect}
          className="text-sm font-medium transition-opacity hover:opacity-70"
          style={{
            color: 'var(--link-color)',
          }}
        >
          Connect
        </button>
        <button
          onClick={handleDismiss}
          className="p-0.5 transition-opacity hover:opacity-70"
          style={{ color: 'var(--text-muted)' }}
          aria-label="Dismiss"
        >
          <svg
            className="w-3.5 h-3.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>
    </div>
  )
}
