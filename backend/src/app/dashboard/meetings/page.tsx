'use client';
import React, { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useMeetings } from '@/hooks/useMeetings';
import { Card } from '@/components/ui/Card';
import { MousePointerClick } from 'lucide-react';

export default function MeetingsPage() {
  const { user } = useAuth();
  const { data: meetings = [], isLoading, isError, error } = useMeetings(user);
  const [selectedMeetingId, setSelectedMeetingId] = useState<string | null>(null);

  if (!user) return null; // Layout handles auth wall

  const selectedMeeting = meetings.find(m => m.id === selectedMeetingId) || null;

  return (
    <div className="flex flex-col h-full space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#1a1a1a]">Meeting Explorer</h1>
        <p className="text-sm text-[#666] mt-1">Review your past meetings, read transcripts, and listen to recordings.</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 items-start lg:h-[calc(100vh-200px)]">
        {/* Left Column: Meeting List */}
        <Card className="w-full lg:w-1/3 flex flex-col lg:h-full overflow-hidden shrink-0" noPadding>
          <div className="p-4 border-b border-[#e5e3d9] bg-[#fdfcf9]">
            <h3 className="text-sm font-semibold text-[#1a1a1a]">Your Meetings ({meetings.length})</h3>
          </div>
          
          <div className="overflow-y-auto flex-1 p-2 max-h-[40vh] lg:max-h-full">
            {isLoading ? (
              <div className="text-xs text-[#777] text-center py-8">Loading...</div>
            ) : isError ? (
              <div className="text-xs text-red-500 text-center py-8">Error: {error?.message}</div>
            ) : meetings.length === 0 ? (
              <div className="text-xs text-[#777] text-center py-8">No meetings recorded yet.</div>
            ) : (
              <div className="space-y-1">
                {meetings.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setSelectedMeetingId(m.id)}
                    className={`w-full text-left p-3 rounded-md transition-colors ${
                      selectedMeetingId === m.id ? 'bg-[#f0ede4]' : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className="font-medium text-xs text-[#1a1a1a] truncate">
                      {m.title || 'Untitled Meeting'}
                    </div>
                    <div className="text-[10px] text-[#888] mt-1">
                      {new Date(m.startTime).toLocaleString()} • {Math.round(m.durationSeconds || 0)}s
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </Card>

        {/* Right Column: Meeting Details */}
        <Card className="w-full lg:w-2/3 lg:h-full flex flex-col overflow-hidden" noPadding>
          {selectedMeeting ? (
            <div className="flex flex-col h-full">
              {/* Detail Header */}
              <div className="p-6 border-b border-[#e5e3d9] shrink-0 bg-[#fdfcf9]">
                <h2 className="text-lg font-semibold text-[#1a1a1a]">{selectedMeeting.title || 'Untitled Meeting'}</h2>
                <div className="text-xs text-[#666] mt-1">
                  {new Date(selectedMeeting.startTime).toLocaleString()} • {Math.round(selectedMeeting.durationSeconds || 0)} seconds
                </div>
                
                {selectedMeeting.audioUrl && (
                  <div className="mt-4">
                    {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                    <audio controls className="w-full h-10 rounded-md bg-gray-50" src={selectedMeeting.audioUrl} />
                  </div>
                )}
              </div>

              {/* Detail Scrollable Content */}
              <div className="p-6 overflow-y-auto flex-1 space-y-8">
                {selectedMeeting.transcript?.summary && (
                  <div>
                    <h4 className="text-xs font-semibold text-[#888] uppercase tracking-wider mb-2">Summary</h4>
                    <p className="text-sm text-[#2d2d2d] leading-relaxed bg-[#f0ede4]/50 p-4 rounded-lg border border-[#e5e3d9]">
                      {selectedMeeting.transcript.summary}
                    </p>
                  </div>
                )}

                {selectedMeeting.transcript?.actionItems && selectedMeeting.transcript.actionItems.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold text-[#888] uppercase tracking-wider mb-2">Action Items</h4>
                    <ul className="list-disc pl-5 space-y-2">
                      {selectedMeeting.transcript.actionItems.map((item, idx) => (
                        <li key={idx} className="text-sm text-[#2d2d2d] ml-4">{item}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div>
                  <h4 className="text-xs font-semibold text-[#888] uppercase tracking-wider mb-2">Transcript</h4>
                  {selectedMeeting.transcript?.text ? (
                    <div className="text-xs text-[#444] leading-relaxed whitespace-pre-wrap font-mono bg-gray-50 p-4 rounded-lg border border-[#e5e3d9]">
                      {selectedMeeting.transcript.text}
                    </div>
                  ) : (
                    <div className="text-xs text-[#777] italic p-4 rounded-lg bg-gray-50 border border-[#e5e3d9]">
                      No transcript text available.
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-[#777] p-12 text-sm min-h-[300px]">
              <MousePointerClick className="w-10 h-10 mb-3 text-[#ccc]" />
              Select a meeting from the list to view its details.
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
