'use client'

import React, { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import {
  signInWithPopup,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  User
} from 'firebase/auth'
import { getClientAuth } from '@/lib/firebase-client'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card } from '@/components/ui/Card'
import { CheckCircle2, Loader2, AlertCircle } from 'lucide-react'

function DesktopLoginContent() {
  const searchParams = useSearchParams()
  const port = searchParams.get('port')
  const state = searchParams.get('state')

  const { user: existingUser, loading: authLoading } = useAuth()
  
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  
  // Track if auto-login has been attempted to prevent infinite loops without triggering re-renders
  const autoLoginAttempted = React.useRef(false)

  const sendTokenToDesktop = React.useCallback(async (user: User) => {
    if (!port || !state) {
      setError('Missing port or state parameter for desktop connection.')
      return
    }

    setLoading(true)
    setError(null)
    try {
      const idToken = await user.getIdToken()
      const res = await fetch('/api/auth/desktop-token', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${idToken}`
        }
      })

      if (!res.ok) {
        throw new Error('Failed to generate desktop token.')
      }

      const data = await res.json()
      const customToken = data.customToken

      // Send to local desktop loopback server
      await fetch(
        `http://127.0.0.1:${port}/callback?token=${encodeURIComponent(customToken)}&state=${encodeURIComponent(state)}`,
        { mode: 'no-cors' }
      )

      setSuccess(true)
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message === 'Failed to fetch' 
          ? 'Failed to connect to the desktop app. Make sure it is still open and waiting.' 
          : err.message)
      } else {
        setError('Failed to connect to desktop app.')
      }
    } finally {
      setLoading(false)
    }
  }, [port, state])

  // Standard Flow: Auto-login if already authenticated on the web
  useEffect(() => {
    // Only run if we are done loading auth, have a user, have port/state, and haven't tried yet
    if (!authLoading && existingUser && port && state && !autoLoginAttempted.current) {
      autoLoginAttempted.current = true
      sendTokenToDesktop(existingUser)
    }
  }, [authLoading, existingUser, port, state, sendTokenToDesktop])

  const handleGoogleLogin = async () => {
    const auth = getClientAuth()
    if (!auth) {
      setError('Firebase is not initialized.')
      return
    }

    setLoading(true)
    setError(null)
    try {
      const provider = new GoogleAuthProvider()
      provider.setCustomParameters({ prompt: 'select_account' })
      const result = await signInWithPopup(auth, provider)
      await sendTokenToDesktop(result.user)
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message.replace('Firebase: ', ''))
      } else {
        setError('Google sign-in failed.')
      }
      setLoading(false)
    }
  }

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    const auth = getClientAuth()
    if (!auth) {
      setError('Firebase is not initialized.')
      return
    }

    setLoading(true)
    setError(null)
    try {
      const result = await signInWithEmailAndPassword(auth, email.trim(), password)
      await sendTokenToDesktop(result.user)
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message.replace('Firebase: ', ''))
      } else {
        setError('Email sign-in failed.')
      }
      setLoading(false)
    }
  }

  if (authLoading || (existingUser && !success && !error && loading)) {
    return (
      <Card className="max-w-[420px] w-full p-8 text-center bg-white border-[#e2e0d8] shadow-editorial">
        <Loader2 className="animate-spin text-[#2d2d2d] mx-auto mb-3" size={28} />
        <p className="text-xs text-[#737373]">Connecting to Embrace...</p>
      </Card>
    )
  }

  if (success) {
    return (
      <Card className="max-w-[440px] w-full p-8 text-center bg-white border-[#e2e0d8] shadow-editorial">
        <div className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-5 border border-emerald-200">
          <CheckCircle2 className="w-7 h-7" />
        </div>
        <h2 className="text-xl font-semibold text-[#1a1a1a] mb-2">Connected to Desktop!</h2>
        <p className="text-sm text-[#737373] mb-6 leading-relaxed">
          You have successfully logged in. You can now close this tab and return to the Embrace AI desktop application.
        </p>
      </Card>
    )
  }

  return (
    <Card className="max-w-[420px] w-full p-8 bg-white border-[#e2e0d8] shadow-editorial">
      <div className="flex items-center gap-2.5 mb-6">
        <div className="w-8 h-8 rounded-md bg-[#2d2d2d] flex items-center justify-center shadow-sm">
          <span className="text-white text-xs font-semibold">AI</span>
        </div>
        <span className="text-[15px] font-semibold tracking-tight text-[#1a1a1a]">
          Embrace AI
        </span>
      </div>

      <h1 className="text-2xl font-semibold tracking-tight text-[#1a1a1a] mb-1.5">
        Sign in for Desktop App
      </h1>
      <p className="text-xs text-[#737373] mb-6 leading-relaxed">
        Authenticate your session to connect with the Embrace desktop application.
      </p>

      {error && (
        <div className="flex items-start gap-2.5 p-3.5 mb-5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 text-left">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <div className="space-y-4">
        <Button
          type="button"
          variant="outline"
          className="w-full flex items-center justify-center gap-3 font-medium bg-white hover:bg-[#f9f8f6] border-[#e2e0d8] text-[#1a1a1a] shadow-soft"
          onClick={handleGoogleLogin}
          isLoading={loading}
        >
          {!loading && (
            <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24">
              <path
                fill="#EA4335"
                d="M12 5c1.6 0 3 .6 4.1 1.7l3.1-3.1C17.3 1.8 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.4 9 5 12 5z"
              />
              <path
                fill="#4285F4"
                d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z"
              />
              <path
                fill="#FBBC05"
                d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.8 0-1.3.2-2.1.4-2.8L1.9 6.3C.7 8.7 0 10.3 0 12s.7 3.3 1.9 5.7l3.7-2.9z"
              />
              <path
                fill="#34A853"
                d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.4-6.4-5.2L1.9 16c1.8 3.7 5.6 7 10.1 7z"
              />
            </svg>
          )}
          <span>Sign in with Google</span>
        </Button>

        <div className="relative flex items-center justify-center my-4">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-[#e2e0d8]" />
          </div>
          <div className="relative bg-white px-3 text-[10px] font-mono uppercase tracking-wider text-[#999999]">
            Or with email
          </div>
        </div>

        <form onSubmit={handleEmailLogin} className="space-y-4">
          <Input
            type="email"
            placeholder="name@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <Input
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <Button type="submit" variant="primary" className="w-full" isLoading={loading}>
            Sign In
          </Button>
        </form>
      </div>
    </Card>
  )
}

export default function DesktopLoginPage() {
  return (
    <div className="min-h-screen bg-[#faf9f6] flex items-center justify-center p-6">
      <Suspense fallback={<Loader2 className="animate-spin text-[#2d2d2d]" size={32} />}>
        <DesktopLoginContent />
      </Suspense>
    </div>
  )
}

