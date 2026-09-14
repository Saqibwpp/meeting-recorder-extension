'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { getClientAuth } from '@/lib/firebase-client';
import { KeyRound } from 'lucide-react';
import { toast } from 'sonner';

import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

const authSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type AuthFormData = z.infer<typeof authSchema>;

export function AuthForm() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [loadingGoogle, setLoadingGoogle] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<AuthFormData>({
    resolver: zodResolver(authSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const handleGoogleLogin = async () => {
    const auth = getClientAuth();
    if (!auth) {
      toast.error('Firebase is not initialized.');
      return;
    }

    setLoadingGoogle(true);
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      await signInWithPopup(auth, provider);
      // On success, the Auth listener will pick up the user state
    } catch (err: unknown) {
      if (err instanceof Error) {
        toast.error(err.message.replace('Firebase: ', ''));
      } else {
        toast.error('Google sign-in failed.');
      }
    } finally {
      setLoadingGoogle(false);
    }
  };

  const onSubmit = async (data: AuthFormData) => {
    const auth = getClientAuth();
    if (!auth) {
      toast.error('Firebase Auth is not initialized.');
      return;
    }

    try {
      if (isSignUp) {
        await createUserWithEmailAndPassword(auth, data.email.trim(), data.password);
      } else {
        await signInWithEmailAndPassword(auth, data.email.trim(), data.password);
      }
    } catch (err) {
      const error = err as Error;
      if (error.message.includes('auth/invalid-credential')) {
        toast.error('Invalid email or password. If you signed up with Google, please use the "Sign in with Google" button above.');
      } else {
        toast.error(error.message.replace('Firebase: ', '') || 'Authentication failed');
      }
    }
  };

  return (
    <Card className="max-w-[400px] w-full mx-auto my-auto mt-[15vh]">
      <div className="p-8">
        <div className="w-12 h-12 rounded-lg bg-section-blush flex items-center justify-center mb-6 shadow-soft border border-border">
          <KeyRound className="w-5 h-5 text-primary" />
        </div>
        <h2 className="text-2xl font-semibold text-foreground mb-1 tracking-tight">
          {isSignUp ? 'Create account' : 'Sign in to Embrace'}
        </h2>
        <p className="text-sm text-muted-foreground mb-8 leading-relaxed">
          Use the same account you use in your Chrome Extension.
        </p>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <Button
            type="button"
            variant="outline"
            className="w-full flex items-center justify-center gap-3 font-medium bg-white hover:bg-[#f9f8f6] border-[#e2e0d8] text-[#1a1a1a] shadow-soft"
            onClick={handleGoogleLogin}
            isLoading={loadingGoogle}
          >
            {!loadingGoogle && (
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

          <div className="space-y-1.5">
            <label className="block font-mono text-[11px] uppercase tracking-wider text-muted-foreground">Email Address</label>
            <Input
              type="email"
              placeholder="name@company.com"
              error={errors.email?.message}
              {...register('email')}
            />
          </div>

          <div className="space-y-1.5">
            <label className="block font-mono text-[11px] uppercase tracking-wider text-muted-foreground">Password</label>
            <Input
              type="password"
              placeholder="••••••••"
              error={errors.password?.message}
              {...register('password')}
            />
          </div>

          <Button
            type="submit"
            className="w-full mt-2"
            isLoading={isSubmitting}
          >
            {isSignUp ? 'Create Account' : 'Sign in with Email'}
          </Button>
        </form>

        <div className="text-center mt-6 text-sm text-muted-foreground">
          {isSignUp ? (
            <>Already have an account? <button type="button" onClick={() => setIsSignUp(false)} className="text-foreground font-medium underline hover:opacity-80 transition-opacity">Sign in</button></>
          ) : (
            <>Don&apos;t have an account? <button type="button" onClick={() => setIsSignUp(true)} className="text-foreground font-medium underline hover:opacity-80 transition-opacity">Sign up</button></>
          )}
        </div>
      </div>
    </Card>
  );
}
