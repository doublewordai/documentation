'use client'

import { useAuth } from './AuthProvider'
import { useState, useEffect } from 'react'
import posthog from 'posthog-js'

export default function ApiKeyIndicator() {
  const { user, apiKey, isLoading, isGeneratingKey, signIn, signOut, generateApiKey } = useAuth()
  const [showMenu, setShowMenu] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [copied, setCopied] = useState(false)
  const [hasPlaceholders, setHasPlaceholders] = useState(false)

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
  }, [])

  // Don't show if no placeholders on page
  if (!hasPlaceholders) {
    return null
  }

  const handleGenerateKey = async () => {
    setIsGenerating(true)
    try {
      await generateApiKey()
    } catch (error) {
      alert('Failed to generate API key. Please try again.')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleCopyKey = () => {
    if (apiKey) {
      navigator.clipboard.writeText(apiKey)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)

      // Capture API key copied event with PostHog
      posthog.capture('api_key_copied', {
        source: 'api_key_indicator',
        page_path: window.location.pathname,
      })
    }
  }

  const handleConnectClick = () => {
    // Capture connect API key click event with PostHog
    posthog.capture('connect_api_key_clicked', {
      source: 'api_key_indicator',
      page_path: window.location.pathname,
    })
    signIn()
  }

  // If not connected, clicking triggers sign-in directly
  if (!user) {
    return (
      <button
        onClick={handleConnectClick}
        disabled={isLoading}
        className="flex items-center gap-2 py-1 transition-all duration-200 hover:translate-x-0.5 text-sm 2xl:text-base disabled:opacity-50 w-full"
        style={{
          color: 'var(--text-muted)',
        }}
      >
        {/* Key icon */}
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
          />
        </svg>
        <span>
          Connect API Key
        </span>
      </button>
    )
  }

  // If connected, show dropdown with key management
  return (
    <div className="relative">
      <button
        onClick={() => setShowMenu(!showMenu)}
        className="flex items-center gap-2 py-1 transition-all duration-200 hover:translate-x-0.5 text-sm 2xl:text-base w-full"
        style={{
          color: 'var(--link-color)',
        }}
      >
        {/* Key icon */}
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
          />
        </svg>
        <span>
          API Key Connected
        </span>
        <span
          className="w-1.5 h-1.5 rounded-full"
          style={{ backgroundColor: '#16a34a' }}
        />
      </button>

      {showMenu && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowMenu(false)}
          />
          <div
            className="absolute right-0 mt-2 w-64 rounded-lg shadow-lg z-50 overflow-hidden"
            style={{
              backgroundColor: 'var(--sidebar-bg)',
              border: '1px solid var(--sidebar-border)',
            }}
          >
            <div className="px-4 py-3 text-xs" style={{ color: 'var(--text-muted)' }}>
              <div className="mb-1 font-medium">Connected</div>
              <div className="font-mono truncate" style={{ color: 'var(--foreground)' }}>
                {apiKey || (isGeneratingKey ? 'Generating...' : 'Loading...')}
              </div>
            </div>
            <button
              onClick={handleCopyKey}
              disabled={!apiKey}
              className="w-full px-4 py-2.5 text-sm text-left transition-opacity hover:opacity-70 border-t flex items-center gap-2 disabled:opacity-50"
              style={{
                borderColor: 'var(--sidebar-border)',
                color: 'var(--foreground)'
              }}
            >
              {copied ? (
                <>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="w-4 h-4"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <span>Copied</span>
                </>
              ) : (
                <>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="w-4 h-4"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                  </svg>
                  <span>Copy key</span>
                </>
              )}
            </button>
            <button
              onClick={signOut}
              className="w-full px-4 py-2.5 text-sm text-left transition-opacity hover:opacity-70 border-t"
              style={{
                borderColor: 'var(--sidebar-border)',
                color: '#dc2626'
              }}
            >
              Disconnect
            </button>
          </div>
        </>
      )}
    </div>
  )
}
