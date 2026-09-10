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
    <Card className="max-w-md mx-auto my-8">
      {firebaseError && (
        <div className="mb-4 p-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs">
          {firebaseError}
        </div>
      )}
      <div className="w-10 h-10 rounded-full bg-[#f0ede4] flex items-center justify-center mx-auto mb-4">
        <KeyRound className="w-5 h-5 text-[#666]" />
      </div>
      <h2 className="text-xl font-semibold text-[#1a1a1a] text-center mb-1">
        {isSignUp ? 'Create your Embrace AI Account' : 'Sign in to Embrace AI'}
      </h2>
      <p className="text-xs text-[#666] text-center mb-6">
        Use the same account you use in your Chrome Extension.
      </p>

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
          className="w-full py-2.5"
          isLoading={isSubmitting}
        >
          {isSignUp ? 'Create Account' : 'Sign In with Email'}
        </Button>
      </form>

      <div className="text-center mt-4 text-xs text-[#666]">
        {isSignUp ? (
          <>Already have an account? <button type="button" onClick={() => setIsSignUp(false)} className="text-[#1a1a1a] font-medium underline">Sign in</button></>
        ) : (
          <>Don&apos;t have an account? <button type="button" onClick={() => setIsSignUp(true)} className="text-[#1a1a1a] font-medium underline">Sign up</button></>
        )}
      </div>
    </Card>
  );
}
