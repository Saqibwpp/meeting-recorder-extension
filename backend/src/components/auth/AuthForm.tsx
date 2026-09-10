'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { getClientAuth } from '@/lib/firebase-client';
import { KeyRound } from 'lucide-react';

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
  const [firebaseError, setFirebaseError] = useState<string | null>(null);

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

  const onSubmit = async (data: AuthFormData) => {
    const auth = getClientAuth();
    if (!auth) {
      setFirebaseError('Firebase Auth is not initialized.');
      return;
    }

    setFirebaseError(null);
    try {
      if (isSignUp) {
        await createUserWithEmailAndPassword(auth, data.email.trim(), data.password);
      } else {
        await signInWithEmailAndPassword(auth, data.email.trim(), data.password);
      }
    } catch (err) {
      const error = err as Error;
      setFirebaseError(error.message || 'Authentication failed');
    }
  };

  return (
    <Card className="max-w-[400px] w-full mx-auto my-auto mt-[15vh]">
      <div className="p-8">
        {firebaseError && (
          <div className="mb-4 p-4 rounded-md bg-red-50 border border-red-200 text-red-700 text-xs shadow-soft">
            {firebaseError}
          </div>
        )}
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
