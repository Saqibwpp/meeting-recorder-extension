'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  User
} from 'firebase/auth';
import { getClientAuth } from '@/lib/firebase-client';

interface ApiKeyItem {
  apiKey: string;
  name: string;
  createdAt: string;
  revoked: boolean;
}

interface MeetingItem {
  id: string;
  title: string;
  startTime: number;
  durationSeconds: number;
  audioUrl?: string;
  transcript?: {
    summary?: string;
    actionItems?: string[];
  };
}

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [apiKeys, setApiKeys] = useState<ApiKeyItem[]>([]);
  const [meetings, setMeetings] = useState<MeetingItem[]>([]);
  const [activeTab, setActiveTab] = useState<'cursor' | 'claude' | 'antigravity' | 'web'>('cursor');
  const [isGeneratingKey, setIsGeneratingKey] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const backendUrl = typeof window !== 'undefined' ? window.location.origin : 'https://meeting-recorder-extension.vercel.app';
  const mcpEndpointUrl = `${backendUrl}/api/mcp`;

  const loadUserData = useCallback(async (currentUser: User) => {
    try {
      const token = await currentUser.getIdToken();

      // 1. Fetch API Keys
      const keyRes = await fetch('/api/auth/key', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (keyRes.ok) {
        const keyData = await keyRes.json();
        setApiKeys(keyData.keys || []);
      }

      // 2. Fetch Meetings
      const meetRes = await fetch('/api/meetings', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (meetRes.ok) {
        const meetData = await meetRes.json();
        setMeetings(meetData.meetings || []);
      }
    } catch (err) {
      console.error('Failed to load user data:', err);
    }
  }, []);

  useEffect(() => {
    const auth = getClientAuth();
    if (!auth) {
      return;
    }
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setLoading(false);
      if (currentUser) {
        await loadUserData(currentUser);
      }
    });
    return () => unsubscribe();
  }, [loadUserData]);

  const handleGoogleSignIn = async () => {
    try {
      setErrorMsg(null);
      const auth = getClientAuth();
      if (!auth) {
        throw new Error('Firebase Auth is not initialized. Please verify your environment variables.');
      }
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (err) {
      const error = err as Error;
      setErrorMsg(error.message || 'Sign in failed');
    }
  };

  const handleSignOut = async () => {
    const auth = getClientAuth();
    if (auth) {
      await signOut(auth);
    }
    setUser(null);
    setApiKeys([]);
    setMeetings([]);
  };

  const handleGenerateKey = async () => {
    if (!user) return;
    setIsGeneratingKey(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/auth/key', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name: 'Team AI Assistant' })
      });
      if (res.ok) {
        const data = await res.json();
        setApiKeys((prev) => [data.key, ...prev]);
      }
    } catch (err) {
      const error = err as Error;
      setErrorMsg(error.message || 'Failed to generate key');
    } finally {
      setIsGeneratingKey(false);
    }
  };

  const handleRevokeKey = async (apiKey: string) => {
    if (!user) return;
    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/auth/key?apiKey=${encodeURIComponent(apiKey)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setApiKeys((prev) => prev.filter((k) => k.apiKey !== apiKey));
      }
    } catch (err) {
      const error = err as Error;
      setErrorMsg(error.message || 'Failed to revoke key');
    }
  };

  const copyToClipboard = (text: string, identifier: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(identifier);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const activeKey = apiKeys[0]?.apiKey || 'YOUR_EMBRACE_API_KEY';

  const snippets = {
    cursor: JSON.stringify({
      mcpServers: {
        "embrace-meetings": {
          url: mcpEndpointUrl,
          headers: {
            Authorization: `Bearer ${activeKey}`
          }
        }
      }
    }, null, 2),
    claude: JSON.stringify({
      mcpServers: {
        "embrace-meetings": {
          command: "npx",
          args: ["-y", "mcp-remote", mcpEndpointUrl],
          env: {
            AUTH_HEADER: `Bearer ${activeKey}`
          }
        }
      }
    }, null, 2),
    antigravity: JSON.stringify({
      mcpServers: {
        "embrace-meetings": {
          command: "npx",
          args: ["-y", "mcp-remote", mcpEndpointUrl],
          env: {
            AUTH_HEADER: `Bearer ${activeKey}`
          }
        }
      }
    }, null, 2),
    web: `Endpoint URL: ${mcpEndpointUrl}\nAuthorization Header: Bearer ${activeKey}`
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
            ) : (
              <button
                onClick={handleGoogleSignIn}
                className="text-xs font-medium px-4 py-2 rounded bg-[#2d2d2d] hover:bg-[#1a1a1a] text-white transition-colors"
              >
                Sign in with Google
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-6 py-10 space-y-10">
        {errorMsg && (
          <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs">
            {errorMsg}
          </div>
        )}

        {/* Not Logged In Prompt */}
        {!user && !loading && (
          <div className="bg-white border border-[#e5e3d9] rounded-xl p-10 text-center max-w-lg mx-auto shadow-sm my-12">
            <div className="w-12 h-12 rounded-full bg-[#f0ede4] flex items-center justify-center mx-auto mb-4 text-xl">
              🔑
            </div>
            <h2 className="text-xl font-semibold text-[#1a1a1a] mb-2">Connect Your Meeting Database to AI</h2>
            <p className="text-sm text-[#666] mb-6 leading-relaxed">
              Sign in with your team Google account to generate your AI access keys and connect Claude, Cursor, or Antigravity directly to your meeting transcripts.
            </p>
            <button
              onClick={handleGoogleSignIn}
              className="py-2.5 px-6 rounded-md bg-[#2d2d2d] hover:bg-[#1a1a1a] text-white text-sm font-medium transition-colors shadow-sm"
            >
              Sign in with Google
            </button>
          </div>
        )}

        {/* User Logged In Dashboard */}
        {user && (
          <>
            {/* AI Assistant MCP Connection Section */}
            <section className="bg-white border border-[#e5e3d9] rounded-xl p-6 sm:p-8 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#f0ede4]">
                <div>
                  <h2 className="text-lg font-semibold text-[#1a1a1a] flex items-center gap-2">
                    <span>⚡</span> Model Context Protocol (MCP) Integration
                  </h2>
                  <p className="text-xs text-[#666] mt-1">
                    Connect your AI coding assistants and web agents directly to your recorded meetings.
                  </p>
                </div>
                <button
                  onClick={handleGenerateKey}
                  disabled={isGeneratingKey}
                  className="self-start sm:self-auto py-2 px-4 bg-[#2d2d2d] hover:bg-[#1a1a1a] text-white text-xs font-medium rounded-md transition-colors disabled:opacity-50"
                >
                  {isGeneratingKey ? 'Generating...' : '+ Generate New AI Key'}
                </button>
              </div>

              {/* Active API Keys List */}
              <div className="py-6 border-b border-[#f0ede4]">
                <h3 className="text-xs font-semibold text-[#888] uppercase tracking-wider mb-3">Your Active Keys</h3>
                {apiKeys.length === 0 ? (
                  <div className="p-4 rounded-lg bg-[#fdfcf9] border border-dashed border-[#e5e3d9] text-center text-xs text-[#777]">
                    No active API keys yet. Click <span className="font-semibold text-[#2d2d2d]">&quot;Generate New AI Key&quot;</span> above to connect your AI assistants.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {apiKeys.map((keyItem) => (
                      <div
                        key={keyItem.apiKey}
                        className="flex items-center justify-between p-3 rounded-lg bg-[#fdfcf9] border border-[#e5e3d9] text-xs"
                      >
                        <div className="flex items-center gap-3">
                          <span className="font-mono text-[#1a1a1a] font-medium">{keyItem.apiKey}</span>
                          <span className="text-[10px] text-[#999]">({keyItem.name} • {new Date(keyItem.createdAt).toLocaleDateString()})</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => copyToClipboard(keyItem.apiKey, keyItem.apiKey)}
                            className="px-2.5 py-1 rounded border border-[#e5e3d9] bg-white hover:bg-gray-50 text-[11px] text-[#444] transition-colors"
                          >
                            {copiedKey === keyItem.apiKey ? '✓ Copied' : 'Copy Key'}
                          </button>
                          <button
                            onClick={() => handleRevokeKey(keyItem.apiKey)}
                            className="px-2.5 py-1 rounded border border-red-200 text-red-600 hover:bg-red-50 text-[11px] transition-colors"
                          >
                            Revoke
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 1-Click Setup Snippets */}
              <div className="pt-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xs font-semibold text-[#888] uppercase tracking-wider">1-Click Client Configuration</h3>
                  <div className="flex gap-1 p-1 bg-[#f0ede4] rounded-lg text-xs">
                    {(['cursor', 'claude', 'antigravity', 'web'] as const).map((tab) => (
                      <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`px-3 py-1 rounded-md capitalize text-xs transition-all ${activeTab === tab ? 'bg-white text-[#1a1a1a] font-medium shadow-sm' : 'text-[#666] hover:text-[#1a1a1a]'
                          }`}
                      >
                        {tab === 'web' ? 'Claude / Web' : tab}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="relative rounded-lg bg-[#1a1a1a] text-gray-200 p-4 font-mono text-xs overflow-x-auto shadow-inner">
                  <button
                    onClick={() => copyToClipboard(snippets[activeTab], `snippet-${activeTab}`)}
                    className="absolute top-3 right-3 px-3 py-1 rounded bg-[#333] hover:bg-[#444] text-white text-[11px] transition-colors"
                  >
                    {copiedKey === `snippet-${activeTab}` ? '✓ Copied' : 'Copy Config'}
                  </button>
                  <pre className="pr-20 whitespace-pre-wrap">{snippets[activeTab]}</pre>
                </div>

                <p className="text-[11px] text-[#777] mt-3">
                  {activeTab === 'cursor' && 'Paste this snippet into your project\'s .mcp.json or in Cursor Settings > Features > MCP.'}
                  {activeTab === 'claude' && 'Paste this into ~/Library/Application Support/Claude/claude_desktop_config.json.'}
                  {activeTab === 'antigravity' && 'Paste this into your workspace mcp_config.json file.'}
                  {activeTab === 'web' && 'In Claude.ai or Gemini Spark Settings > Connectors, add custom connector with these credentials.'}
                </p>
              </div>
            </section>

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

            {/* Meetings History Preview */}
            <section className="bg-white border border-[#e5e3d9] rounded-xl p-6 shadow-sm">
              <h3 className="text-sm font-semibold text-[#1a1a1a] mb-4">Your Recent Meetings ({meetings.length})</h3>
              {meetings.length === 0 ? (
                <div className="text-xs text-[#777] text-center py-8">
                  No meetings recorded yet. Use the Embrace AI Chrome Extension to record your first meeting!
                </div>
              ) : (
                <div className="divide-y divide-[#f0ede4]">
                  {meetings.slice(0, 5).map((m) => (
                    <div key={m.id} className="py-3 flex items-center justify-between text-xs">
                      <div>
                        <div className="font-medium text-[#1a1a1a]">{m.title || 'Untitled Meeting'}</div>
                        <div className="text-[11px] text-[#888] mt-0.5">
                          {new Date(m.startTime).toLocaleString()} • {Math.round(m.durationSeconds || 0)}s
                        </div>
                      </div>
                      {m.transcript?.summary && (
                        <div className="text-[11px] text-[#555] max-w-xs truncate hidden md:block">
                          {m.transcript.summary}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
}
