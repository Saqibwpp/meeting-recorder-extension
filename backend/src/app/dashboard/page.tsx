'use client';

import Link from 'next/link';
import { signOut } from 'firebase/auth';
import { getClientAuth } from '@/lib/firebase-client';
import { useAuth } from '@/hooks/useAuth';

import { AuthForm } from '@/components/auth/AuthForm';
import { McpSetup } from '@/components/dashboard/McpSetup';
import { MeetingsList } from '@/components/dashboard/MeetingsList';

export default function DashboardPage() {
  const { user, loading, setUser } = useAuth();

  const handleSignOut = async () => {
    const auth = getClientAuth();
    if (auth) {
      await signOut(auth);
    }
    setUser(null);
  };

  return (
    <div className="min-h-screen bg-[#fdfcf9] text-[#2d2d2d] font-sans selection:bg-[#e5e3d9]">
      {/* Header */}
      <header className="border-b border-[#e5e3d9] bg-white/70 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#2d2d2d] flex items-center justify-center">
              <span className="text-white text-sm font-semibold">AI</span>
            </div>
            <Link href="/" className="text-lg font-medium tracking-tight text-[#1a1a1a] hover:opacity-80 transition-opacity">
              Embrace AI <span className="text-xs font-normal px-2 py-0.5 ml-1.5 rounded-full bg-[#f0ede4] text-[#666]">Dashboard</span>
            </Link>
          </div>

          <div className="flex items-center gap-4">
            {user ? (
              <div className="flex items-center gap-3">
                <span className="text-xs text-[#666] hidden sm:inline">{user.email}</span>
                <button
                  onClick={handleSignOut}
                  className="text-xs px-3 py-1.5 rounded border border-[#e5e3d9] hover:bg-gray-50 text-[#555] transition-colors"
                >
                  Sign Out
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-6 py-10 space-y-10">
        {loading ? (
          <div className="text-center py-20 text-[#666]">Loading...</div>
        ) : !user ? (
          <AuthForm />
        ) : (
          <>
            <McpSetup user={user} />

            {/* MCP Tools Available */}
            <section className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 rounded-xl bg-white border border-[#e5e3d9]">
                <div className="text-lg mb-1">📋</div>
                <h4 className="text-xs font-semibold text-[#1a1a1a]">list_meetings</h4>
                <p className="text-[11px] text-[#666] mt-1">Lists your recent meetings with dates, durations, and summaries.</p>
              </div>
              <div className="p-4 rounded-xl bg-white border border-[#e5e3d9]">
                <div className="text-lg mb-1">🎙️</div>
                <h4 className="text-xs font-semibold text-[#1a1a1a]">get_meeting_transcript</h4>
                <p className="text-[11px] text-[#666] mt-1">Retrieves speaker-diarized transcript, summary, and audio URL.</p>
              </div>
              <div className="p-4 rounded-xl bg-white border border-[#e5e3d9]">
                <div className="text-lg mb-1">🔍</div>
                <h4 className="text-xs font-semibold text-[#1a1a1a]">search_meetings</h4>
                <p className="text-[11px] text-[#666] mt-1">Keyword search across titles, summaries, and dialogue transcripts.</p>
              </div>
              <div className="p-4 rounded-xl bg-white border border-[#e5e3d9]">
                <div className="text-lg mb-1">✅</div>
                <h4 className="text-xs font-semibold text-[#1a1a1a]">get_action_items</h4>
                <p className="text-[11px] text-[#666] mt-1">Aggregates all action items and tasks assigned across meetings.</p>
              </div>
            </section>

            <MeetingsList user={user} />
          </>
        )}
      </main>
    </div>
  );
}
