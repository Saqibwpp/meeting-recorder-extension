'use client';

import React from 'react';
import { useAuth } from '@/hooks/useAuth';
import { McpSetup } from '@/components/dashboard/McpSetup';
import { List, Mic, Search, CheckSquare } from 'lucide-react';

export default function DeveloperPage() {
  const { user } = useAuth();

  if (!user) return null; // Layout handles auth wall

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-[#1a1a1a]">Developer & MCP</h1>
        <p className="text-sm text-[#666] mt-1">Manage your API keys and AI assistant connections.</p>
      </div>

      <McpSetup user={user} />

      <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="p-5 rounded-xl bg-white border border-[#e5e3d9]">
          <List className="w-5 h-5 text-[#1a1a1a] mb-2" />
          <h4 className="text-sm font-semibold text-[#1a1a1a]">list_meetings</h4>
          <p className="text-xs text-[#666] mt-1">Lists your recent meetings with dates, durations, and summaries.</p>
        </div>
        <div className="p-5 rounded-xl bg-white border border-[#e5e3d9]">
          <Mic className="w-5 h-5 text-[#1a1a1a] mb-2" />
          <h4 className="text-sm font-semibold text-[#1a1a1a]">get_meeting_transcript</h4>
          <p className="text-xs text-[#666] mt-1">Retrieves speaker-diarized transcript, summary, and audio URL.</p>
        </div>
        <div className="p-5 rounded-xl bg-white border border-[#e5e3d9]">
          <Search className="w-5 h-5 text-[#1a1a1a] mb-2" />
          <h4 className="text-sm font-semibold text-[#1a1a1a]">search_meetings</h4>
          <p className="text-xs text-[#666] mt-1">Keyword search across titles, summaries, and dialogue transcripts.</p>
        </div>
        <div className="p-5 rounded-xl bg-white border border-[#e5e3d9]">
          <CheckSquare className="w-5 h-5 text-[#1a1a1a] mb-2" />
          <h4 className="text-sm font-semibold text-[#1a1a1a]">get_action_items</h4>
          <p className="text-xs text-[#666] mt-1">Aggregates all action items and tasks assigned across meetings.</p>
        </div>
      </section>
    </div>
  );
}
