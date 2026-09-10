'use client';

import React from 'react';
import Link from 'next/link';
import { signOut } from 'firebase/auth';
import { getClientAuth } from '@/lib/firebase-client';
import { useAuth } from '@/hooks/useAuth';
import { AuthForm } from '@/components/auth/AuthForm';
import { Sidebar } from '@/components/dashboard/Sidebar';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, setUser } = useAuth();

  const handleSignOut = async () => {
    const auth = getClientAuth();
    if (auth) {
      await signOut(auth);
    }
    setUser(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#fdfcf9] flex items-center justify-center">
        <div className="text-[#666] text-sm">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#fdfcf9] flex items-center justify-center p-6">
        <AuthForm />
      </div>
    );
  }

  return (
    <div className="h-screen overflow-hidden bg-background text-foreground font-sans flex flex-col">
      {/* Global Header */}
      <header className="border-b border-border bg-surface shrink-0 h-[60px] flex items-center shadow-soft relative z-10">
        <div className="w-full px-4 sm:px-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center shadow-sm">
              <span className="text-primary-foreground text-xs font-semibold">AI</span>
            </div>
            <Link href="/" className="text-[15px] font-semibold tracking-tight text-foreground hover:opacity-80 transition-opacity flex items-center gap-2">
              Embrace AI <span className="font-mono text-[10px] uppercase tracking-widest px-2 py-0.5 rounded bg-muted text-muted-foreground border border-border">Dashboard</span>
            </Link>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-4">
              <span className="font-mono text-[11px] text-muted-foreground hidden sm:inline">{user.email}</span>
              <button
                onClick={handleSignOut}
                className="text-xs px-3 py-1.5 rounded-md border border-border bg-surface hover:bg-muted text-foreground transition-colors shadow-soft"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area with Sidebar */}
      <div className="flex flex-1 w-full overflow-hidden bg-background/50">
        <Sidebar />
        <main className="flex-1 p-6 sm:p-10 overflow-y-auto relative">
          {children}
        </main>
      </div>
    </div>
  );
}
