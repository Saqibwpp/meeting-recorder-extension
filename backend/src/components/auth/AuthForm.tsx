'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { getClientAuth } from '@/lib/firebase-client';

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
    <div className="bg-white border border-[#e5e3d9] rounded-xl p-8 sm:p-10 max-w-md mx-auto shadow-sm my-8">
      {firebaseError && (
        <div className="mb-4 p-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs">
          {firebaseError}
        </div>
      )}
      <div className="w-10 h-10 rounded-full bg-[#f0ede4] flex items-center justify-center mx-auto mb-4 text-lg">
        🔑
      </div>
      <h2 className="text-xl font-semibold text-[#1a1a1a] text-center mb-1">
        {isSignUp ? 'Create your Embrace AI Account' : 'Sign in to Embrace AI'}
      </h2>
      <p className="text-xs text-[#666] text-center mb-6">
        Use the same account you use in your Chrome Extension.
      </p>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-[#555] mb-1">Email Address</label>
          <input
            type="email"
            placeholder="name@company.com"
            {...register('email')}
            className={`w-full px-3 py-2 text-xs rounded-md border focus:outline-none focus:border-[#2d2d2d] bg-[#fdfcf9] ${
              errors.email ? 'border-red-300' : 'border-[#e5e3d9]'
            }`}
          />
          {errors.email && (
            <p className="mt-1 text-[11px] text-red-500">{errors.email.message}</p>
          )}
        </div>

        <div>
          <label className="block text-xs font-medium text-[#555] mb-1">Password</label>
          <input
            type="password"
            placeholder="••••••••"
            {...register('password')}
            className={`w-full px-3 py-2 text-xs rounded-md border focus:outline-none focus:border-[#2d2d2d] bg-[#fdfcf9] ${
              errors.password ? 'border-red-300' : 'border-[#e5e3d9]'
            }`}
          />
          {errors.password && (
            <p className="mt-1 text-[11px] text-red-500">{errors.password.message}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full py-2.5 px-4 rounded-md bg-[#2d2d2d] hover:bg-[#1a1a1a] text-white text-xs font-medium transition-colors disabled:opacity-50"
        >
          {isSubmitting ? 'Authenticating...' : isSignUp ? 'Create Account' : 'Sign In with Email'}
        </button>
      </form>

      <div className="text-center mt-4 text-xs text-[#666]">
        {isSignUp ? (
          <>Already have an account? <button type="button" onClick={() => setIsSignUp(false)} className="text-[#1a1a1a] font-medium underline">Sign in</button></>
        ) : (
          <>Don&apos;t have an account? <button type="button" onClick={() => setIsSignUp(true)} className="text-[#1a1a1a] font-medium underline">Sign up</button></>
        )}
      </div>
    </div>
  );
}
