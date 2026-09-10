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
    <div className="h-screen overflow-hidden bg-[#fdfcf9] text-[#2d2d2d] font-sans selection:bg-[#e5e3d9] flex flex-col">
      {/* Global Header */}
      <header className="border-b border-[#e5e3d9] bg-white/70 backdrop-blur-md shrink-0 h-[73px] flex items-center">
        <div className="w-full px-4 sm:px-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#2d2d2d] flex items-center justify-center">
              <span className="text-white text-sm font-semibold">AI</span>
            </div>
            <Link href="/" className="text-lg font-medium tracking-tight text-[#1a1a1a] hover:opacity-80 transition-opacity">
              Embrace AI <span className="text-xs font-normal px-2 py-0.5 ml-1.5 rounded-full bg-[#f0ede4] text-[#666]">Dashboard</span>
            </Link>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <span className="text-xs text-[#666] hidden sm:inline">{user.email}</span>
              <button
                onClick={handleSignOut}
                className="text-xs px-3 py-1.5 rounded border border-[#e5e3d9] hover:bg-gray-50 text-[#555] transition-colors"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area with Sidebar */}
      <div className="flex flex-1 w-full overflow-hidden">
        <Sidebar />
        <main className="flex-1 p-6 sm:p-10 overflow-y-auto relative">
          {children}
        </main>
      </div>
    </div>
  );
}
