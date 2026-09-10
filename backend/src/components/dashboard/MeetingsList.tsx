'use client';

import React from 'react';
import { useMeetings } from '@/hooks/useMeetings';
import { User } from 'firebase/auth';

interface MeetingsListProps {
  user: User;
}

export function MeetingsList({ user }: MeetingsListProps) {
  const { data: meetings = [], isLoading, isError, error } = useMeetings(user);

  return (
    <section className="bg-white border border-[#e5e3d9] rounded-xl p-6 shadow-sm">
      <h3 className="text-sm font-semibold text-[#1a1a1a] mb-4">Your Recent Meetings ({meetings.length})</h3>
      
      {isLoading ? (
        <div className="text-xs text-[#777] text-center py-8">Loading meetings...</div>
      ) : isError ? (
        <div className="text-xs text-red-500 text-center py-8">
          Failed to load meetings. {error?.message}
        </div>
      ) : meetings.length === 0 ? (
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
  );
}
