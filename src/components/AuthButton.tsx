'use client'

import { useAuth } from './AuthProvider'
import { useState, useEffect } from 'react'

export default function AuthButton() {
  const { user, apiKey, isLoading, signIn, signOut, generateApiKey } = useAuth()
  const [showMenu, setShowMenu] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [enableAuth, setEnableAuth] = useState(false)

  useEffect(() => {
    // Check for ?auth=true query parameter
    const params = new URLSearchParams(window.location.search)
    setEnableAuth(params.get('auth') === 'true')
  }, [])

  // Don't render anything if auth is not enabled via query param
  if (!enableAuth) {
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
      alert('API key copied to clipboard!')
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-2">
        <div className="w-5 h-5 border-2 border-gray-300 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!user) {
    return (
      <button
        onClick={signIn}
        className="w-full px-4 py-2 text-sm font-medium rounded-lg transition-colors"
        style={{
          backgroundColor: 'var(--button-bg)',
          color: 'var(--button-text)',
        }}
      >
        Sign In
      </button>
    )
  }

  return (
    <div className="relative">
      <button
        onClick={() => setShowMenu(!showMenu)}
        className="w-full px-4 py-2 text-sm font-medium rounded-lg transition-colors text-left flex items-center justify-between"
        style={{
          backgroundColor: 'var(--button-bg)',
          color: 'var(--button-text)',
        }}
      >
        <span>{apiKey ? 'API Key Active' : 'Signed In'}</span>
        <svg
          className="w-4 h-4 ml-2"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {showMenu && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setShowMenu(false)}
          />
          <div
            className="absolute left-0 right-0 mt-2 rounded-lg shadow-lg z-20 overflow-hidden"
            style={{
              backgroundColor: 'var(--sidebar-bg)',
              border: '1px solid var(--sidebar-border)',
            }}
          >
            {!apiKey ? (
              <button
                onClick={handleGenerateKey}
                disabled={isGenerating}
                className="w-full px-4 py-2 text-sm text-left hover:opacity-80 transition-opacity disabled:opacity-50"
              >
                {isGenerating ? 'Generating...' : 'Generate API Key'}
              </button>
            ) : (
              <>
                <button
                  onClick={handleCopyKey}
                  className="w-full px-4 py-2 text-sm text-left hover:opacity-80 transition-opacity border-b"
                  style={{ borderColor: 'var(--sidebar-border)' }}
                >
                  Copy API Key
                </button>
                <div className="px-4 py-2 text-xs font-mono truncate border-b" style={{ borderColor: 'var(--sidebar-border)' }}>
                  {apiKey}
                </div>
              </>
            )}
            <button
              onClick={signOut}
              className="w-full px-4 py-2 text-sm text-left hover:opacity-80 transition-opacity text-red-500"
            >
              Sign Out
            </button>
          </div>
        </>
      )}
    </div>
  )
}
