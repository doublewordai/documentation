'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function AuthCallbackPage() {
  const router = useRouter()
  const [status, setStatus] = useState<'checking' | 'success' | 'error'>('checking')

  useEffect(() => {
    const verifyAuth = async () => {
      try {
        // Check if authentication was successful
        const response = await fetch('https://app.doubleword.ai/admin/api/v1/users/current/api-keys', {
          method: 'GET',
          credentials: 'include',
          headers: {
            'Accept': 'application/json',
          },
        })

        if (response.ok) {
          setStatus('success')
          // Wait a moment to show success, then redirect to home or stored URL
          setTimeout(() => {
            const returnTo = sessionStorage.getItem('auth_return_to') || '/'
            sessionStorage.removeItem('auth_return_to')
            router.push(returnTo)
          }, 1000)
        } else {
          setStatus('error')
        }
      } catch (error) {
        console.error('Auth verification failed:', error)
        setStatus('error')
      }
    }

    verifyAuth()
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--background)' }}>
      <div className="text-center">
        {status === 'checking' && (
          <>
            <div className="w-16 h-16 border-4 border-gray-300 border-t-blue-500 rounded-full animate-spin mx-auto mb-4" />
            <p className="text-lg" style={{ color: 'var(--foreground)' }}>Verifying authentication...</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-lg" style={{ color: 'var(--foreground)' }}>Successfully signed in!</p>
            <p className="text-sm mt-2 opacity-70" style={{ color: 'var(--foreground)' }}>Redirecting...</p>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <p className="text-lg" style={{ color: 'var(--foreground)' }}>Authentication failed</p>
            <p className="text-sm mt-2 opacity-70" style={{ color: 'var(--foreground)' }}>
              Please try signing in again.
            </p>
            <button
              onClick={() => router.push('/')}
              className="mt-4 px-6 py-2 rounded-lg"
              style={{
                backgroundColor: 'var(--button-bg)',
                color: 'var(--button-text)',
              }}
            >
              Go Home
            </button>
          </>
        )}
      </div>
    </div>
  )
}
