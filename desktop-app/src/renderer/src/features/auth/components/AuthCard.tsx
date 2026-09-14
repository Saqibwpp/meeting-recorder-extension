import React, { useState } from 'react'
import { Card } from '../../../components/ui/Card'
import { LoginForm } from './LoginForm'
import { SignupForm } from './SignupForm'

export const AuthCard: React.FC = () => {
  const [isSignUp, setIsSignUp] = useState(false)

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-[#faf9f6] p-6">
      <Card className="max-w-[420px] w-full p-8 border-[#e2e0d8]">
        {/* Brand header */}
        <div className="flex items-center gap-2.5 mb-6">
          <div className="w-8 h-8 rounded-md bg-[#2d2d2d] flex items-center justify-center shadow-sm">
            <span className="text-white text-xs font-semibold">AI</span>
          </div>
          <span className="text-[15px] font-semibold tracking-tight text-[#1a1a1a]">
            Embrace AI
          </span>
        </div>

        <h1 className="text-2xl font-semibold tracking-tight text-[#1a1a1a] mb-1.5">
          {isSignUp ? 'Create your account' : 'Welcome back'}
        </h1>
        <p className="text-xs text-[#737373] mb-6 leading-relaxed">
          {isSignUp
            ? 'Sign up to capture meetings and sync recordings across your devices.'
            : 'Sign in to access your recordings, notes, and meeting summaries.'}
        </p>

        {isSignUp ? (
          <SignupForm onToggleMode={() => setIsSignUp(false)} />
        ) : (
          <LoginForm onToggleMode={() => setIsSignUp(true)} />
        )}
      </Card>
    </div>
  )
}
