import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAuth } from '../hooks/useAuth'
import { Input } from '../../../components/ui/Input'
import { Button } from '../../../components/ui/Button'
import { GoogleButton } from './GoogleButton'
import { Alert } from '../../../components/ui/Alert'

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters')
})

type LoginFormData = z.infer<typeof loginSchema>

interface LoginFormProps {
  onToggleMode: () => void
}

export const LoginForm: React.FC<LoginFormProps> = ({ onToggleMode }) => {
  const { login, loginWithGoogle } = useAuth()
  const [error, setError] = useState<string | null>(null)
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: ''
    }
  })

  const onSubmit = async (data: LoginFormData): Promise<void> => {
    setError(null)
    try {
      await login(data.email, data.password)
    } catch (err: unknown) {
      if (err instanceof Error) {
        if (err.message.includes('auth/invalid-credential')) {
          setError('Invalid email or password. If you signed up with Google, please use the "Sign in with Google" button above.')
        } else {
          setError(err.message.replace('Firebase: ', ''))
        }
      } else {
        setError('Failed to sign in. Please check your credentials.')
      }
    }
  }

  const handleGoogleLogin = async (): Promise<void> => {
    setError(null)
    setIsGoogleLoading(true)
    try {
      await loginWithGoogle()
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message.replace('Firebase: ', ''))
      } else {
        setError('Google sign-in failed.')
      }
    } finally {
      setIsGoogleLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {error && (
        <Alert type="error" title="Sign In Error">
          {error}
        </Alert>
      )}

      <GoogleButton
        onClick={handleGoogleLogin}
        isLoading={isGoogleLoading}
        disabled={isSubmitting}
        label="Sign in with Google"
      />

      <div className="relative flex items-center justify-center">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-[#e2e0d8]" />
        </div>
        <div className="relative bg-white px-3 text-[11px] font-mono uppercase tracking-wider text-[#999999]">
          Or with email
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input
          label="Email Address"
          type="email"
          placeholder="name@company.com"
          error={errors.email?.message}
          {...register('email')}
        />

        <Input
          label="Password"
          type="password"
          placeholder="••••••••"
          error={errors.password?.message}
          {...register('password')}
        />

        <Button
          type="submit"
          variant="primary"
          size="md"
          className="w-full mt-2"
          isLoading={isSubmitting}
          disabled={isGoogleLoading}
        >
          Sign In
        </Button>
      </form>

      <div className="text-center pt-2 text-xs text-[#737373]">
        Don&apos;t have an account?{' '}
        <button
          type="button"
          onClick={onToggleMode}
          className="text-[#1a1a1a] font-medium underline hover:opacity-80 transition-opacity cursor-pointer"
        >
          Create account
        </button>
      </div>
    </div>
  )
}
