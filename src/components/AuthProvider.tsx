'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

interface User {
  id: string
  email: string
}

interface AuthContextType {
  user: User | null
  apiKey: string | null
  isLoading: boolean
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

  // Load API key from localStorage on mount
  useEffect(() => {
    // Only check auth if ?auth=true is present
    const params = new URLSearchParams(window.location.search)
    if (params.get('auth') !== 'true') {
      setIsLoading(false)
      return
    }

    const storedApiKey = localStorage.getItem('doubleword_api_key')
    if (storedApiKey) {
      setApiKey(storedApiKey)
    }
    checkAuth()
  }, [])

  // Check if user is authenticated
  const checkAuth = async () => {
    try {
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

  const signIn = () => {
    // Only allow sign-in on doubleword.ai domains for security
    if (!window.location.hostname.endsWith('doubleword.ai') && !window.location.hostname.includes('localhost')) {
      alert('Authentication is only available on doubleword.ai domains')
      return
    }

    // Store where we want to return to after auth (sessionStorage persists on same domain)
    sessionStorage.setItem('auth_return_to', window.location.pathname)

    // Redirect to OAuth2 proxy sign-in with return URL
    const returnUrl = encodeURIComponent(`${window.location.origin}/auth/callback`)
    window.location.href = `${API_BASE_URL}/authentication/sign_in?rd=${returnUrl}`
  }

  const signOut = () => {
    // Clear local state and storage
    setUser(null)
    setApiKey(null)
    localStorage.removeItem('doubleword_api_key')

    // Redirect to OAuth2 proxy sign-out
    const returnUrl = encodeURIComponent(window.location.origin)
    window.location.href = `${API_BASE_URL}/authentication/logout?rd=${returnUrl}`
  }

  const generateApiKey = async () => {
    try {
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
    } catch (error) {
      console.error('Failed to generate API key:', error)
      throw error
    }
  }

  return (
    <AuthContext.Provider value={{ user, apiKey, isLoading, signIn, signOut, generateApiKey }}>
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
