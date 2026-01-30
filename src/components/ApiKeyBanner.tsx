'use client'

import { useAuth } from './AuthProvider'
import { useState, useEffect } from 'react'
import posthog from 'posthog-js'

interface ApiKeyBannerProps {
  hasApiKeyPlaceholder?: boolean
}

export default function ApiKeyBanner({ hasApiKeyPlaceholder = false }: ApiKeyBannerProps) {
  const { user, apiKey, isLoading, isGeneratingKey, signIn, generateApiKey } = useAuth()
  const [isDismissed, setIsDismissed] = useState(false)
  const [hasPlaceholders, setHasPlaceholders] = useState(hasApiKeyPlaceholder)
  const [isCheckingBanner, setIsCheckingBanner] = useState(!hasApiKeyPlaceholder)
  const [isSigningIn, setIsSigningIn] = useState(false)

  useEffect(() => {
    // Check if page has API key placeholders in code blocks
    const checkForPlaceholders = () => {
      const codeBlocks = document.querySelectorAll('pre code, pre')

      let foundPlaceholder = false
      codeBlocks.forEach((block) => {
        // Check both textContent and data-original-content (preserved by ContentInjector)
        const content = block.textContent || ''
        const originalContent = (block as HTMLElement).dataset?.originalContent || ''
        if (content.includes('{{apiKey}}') || originalContent.includes('{{apiKey}}')) {
          foundPlaceholder = true
        }
      })

      if (foundPlaceholder && !hasPlaceholders) {
        setHasPlaceholders(true)
      }

      // Only set checking to false after first check
      if (isCheckingBanner) {
        setIsCheckingBanner(false)
      }
    }

    // Check immediately
    checkForPlaceholders()

    // Also observe for dynamically added code blocks (client-side navigation)
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === 'childList') {
          for (const node of mutation.addedNodes) {
            if (node instanceof HTMLElement) {
              if (node.matches('pre, pre code') || node.querySelector('pre, pre code')) {
                checkForPlaceholders()
                return
              }
            }
          }
        }
      }
    })

    observer.observe(document.body, { childList: true, subtree: true })

    return () => observer.disconnect()
  }, [hasPlaceholders, isCheckingBanner])

  // Reset signing in state when user changes
  useEffect(() => {
    if (user) {
      setIsSigningIn(false)
    }
  }, [user])

  const handleDismiss = () => {
    setIsDismissed(true)
    // Set cookie for server-side detection (expires in 1 year)
    document.cookie = 'apikey_banner_dismissed=true; path=/; max-age=31536000; SameSite=Lax'

    posthog.capture('api_key_banner_dismissed', {
      page_path: window.location.pathname,
    })
  }

  const handleSignIn = () => {
    setIsSigningIn(true)
    posthog.capture('api_key_banner_sign_in_clicked', {
      page_path: window.location.pathname,
    })
    signIn()
  }

  const handleGenerateKey = async () => {
    posthog.capture('api_key_banner_generate_clicked', {
      page_path: window.location.pathname,
    })
    try {
      await generateApiKey()
    } catch (error) {
      console.error('Failed to generate API key:', error)
    }
  }

  // Don't show if no placeholders or already has API key
  if (!hasPlaceholders || apiKey) {
    return null
  }

  // Don't show if user dismissed during this session
  if (isDismissed) {
    return null
  }

  // Still checking DOM for placeholders - don't render anything yet
  if (isCheckingBanner) {
    return null
  }

  // Reserve space while loading auth state
  // This prevents layout shift on pages with API key placeholders
  if (isLoading) {
    return (
      <div
        className="mb-4 px-3 py-2.5 rounded-md flex items-center gap-3 text-sm opacity-0"
        style={{
          backgroundColor: 'var(--code-bg)',
          border: '1px solid var(--pre-border)',
        }}
        aria-hidden="true"
      >
        <span>Loading...</span>
      </div>
    )
  }

  const isSignedIn = !!user
  const isWorking = isSigningIn || isGeneratingKey

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
          {isSignedIn
            ? 'Generate an API key to populate code examples'
            : 'Connect your account to populate code examples'}
        </span>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        <button
          onClick={isSignedIn ? handleGenerateKey : handleSignIn}
          disabled={isWorking}
          className="text-sm font-medium transition-opacity hover:opacity-70 disabled:opacity-50 flex items-center gap-1.5"
          style={{
            color: 'var(--link-color)',
          }}
        >
          {isWorking && (
            <svg
              className="w-3.5 h-3.5 animate-spin"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          )}
          {isSignedIn ? 'Generate' : 'Sign in'}
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
