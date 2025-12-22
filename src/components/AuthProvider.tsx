'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import posthog from 'posthog-js'

interface User {
  id: string
  email: string
}

interface AuthContextType {
  user: User | null
  apiKey: string | null
  isLoading: boolean
  isGeneratingKey: boolean
  signIn: () => void
  signOut: () => void
  generateApiKey: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const API_BASE_URL = 'https://app.doubleword.ai'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [apiKey, setApiKey] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isGeneratingKey, setIsGeneratingKey] = useState(false)

  // Load API key from localStorage on mount
  useEffect(() => {
    const storedApiKey = localStorage.getItem('doubleword_api_key')
    if (storedApiKey) {
      setApiKey(storedApiKey)
    }
    checkAuth()
  }, [])


  // Check if user is authenticated
  const checkAuth = async () => {
    try {
      // Dev mode: check for dev auth flag
      if (process.env.NODE_ENV === 'development') {
        if (sessionStorage.getItem('dev_auth') === 'true') {
          setUser({ id: 'dev-user-123', email: 'dev@doubleword.ai' })
        } else {
          setUser(null)
        }
        setIsLoading(false)
        return
      }

      const response = await fetch(`${API_BASE_URL}/admin/api/v1/users/current/api-keys`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
        },
      })

      if (response.ok) {
        // User is authenticated - we can extract user info if needed
        // For now, we'll just mark them as logged in
        setUser({ id: 'current', email: '' })
      } else {
        setUser(null)
      }
    } catch (error) {
      console.error('Auth check failed:', error)
      setUser(null)
    } finally {
      setIsLoading(false)
    }
  }

  const signIn = async () => {
    // Store where we want to return to after auth
    sessionStorage.setItem('auth_return_to', window.location.pathname)

    // Dev mode: redirect directly to callback
    if (process.env.NODE_ENV === 'development') {
      window.location.href = '/auth/callback'
      return
    }

    // Only allow sign-in on doubleword.ai domains for security
    if (!window.location.hostname.endsWith('doubleword.ai')) {
      alert('Authentication is only available on doubleword.ai domains')
      return
    }

    // First, check if user is already authenticated (has SSO cookie)
    try {
      const response = await fetch(`${API_BASE_URL}/admin/api/v1/users/current/api-keys`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
        },
      })

      if (response.ok) {
        // Already authenticated! Just update state and generate key
        setUser({ id: 'current', email: '' })

        // Identify user and capture sign-in event with PostHog
        posthog.identify('current', {
          auth_method: 'sso_cookie',
        })
        posthog.capture('user_signed_in', {
          auth_method: 'sso_cookie',
          source: 'docs',
        })
        return
      }
    } catch (error) {
      // Network error or auth check failed, proceed with redirect
    }

    // Not authenticated, redirect to OAuth2 proxy sign-in
    const returnUrl = encodeURIComponent(`${window.location.origin}/auth/callback`)
    window.location.href = `${API_BASE_URL}/authentication/sign_in?rd=${returnUrl}`
  }

  const signOut = () => {
    // Capture sign-out event with PostHog before clearing state
    posthog.capture('user_signed_out', {
      source: 'docs',
    })
    posthog.reset()

    // Clear local state and storage
    setUser(null)
    setApiKey(null)
    localStorage.removeItem('doubleword_api_key')

    // Dev mode: clear dev auth flag
    if (process.env.NODE_ENV === 'development') {
      sessionStorage.removeItem('dev_auth')
    }

    // No redirect - just clear local state
  }

  const generateApiKey = async () => {
    try {
      // Dev mode: return mock API key
      if (process.env.NODE_ENV === 'development' && sessionStorage.getItem('dev_auth') === 'true') {
        await new Promise(resolve => setTimeout(resolve, 500)) // Simulate network delay
        const mockApiKey = 'sk-dev-mock-' + Math.random().toString(36).substring(7)
        setApiKey(mockApiKey)
        localStorage.setItem('doubleword_api_key', mockApiKey)

        // Capture API key generated event with PostHog
        posthog.capture('api_key_generated', {
          source: 'docs',
          environment: 'development',
        })
        return
      }

      const response = await fetch(`${API_BASE_URL}/admin/api/v1/users/current/api-keys`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          name: 'Docs API Key',
          description: 'Generated from documentation site',
          purpose: 'realtime',
        }),
      })

      if (!response.ok) {
        const error = await response.text()
        throw new Error(`Failed to generate API key: ${error}`)
      }

      const data = await response.json()
      const newApiKey = data.key

      // Store API key
      setApiKey(newApiKey)
      localStorage.setItem('doubleword_api_key', newApiKey)

      // Capture API key generated event with PostHog
      posthog.capture('api_key_generated', {
        source: 'docs',
        environment: 'production',
      })
    } catch (error) {
      console.error('Failed to generate API key:', error)
      posthog.captureException(error)
      throw error
    }
  }

  return (
    <AuthContext.Provider value={{ user, apiKey, isLoading, isGeneratingKey, signIn, signOut, generateApiKey }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
