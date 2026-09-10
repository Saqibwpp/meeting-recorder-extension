'use client';
import React, { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useMeetings, TranscriptSegment } from '@/hooks/useMeetings';
import { MousePointerClick, Calendar, Clock, FileText, CheckCircle2 } from 'lucide-react';

export default function MeetingsPage() {
  const { user } = useAuth();
  const { data: meetings = [], isLoading, isError, error } = useMeetings(user);
  const [selectedMeetingId, setSelectedMeetingId] = useState<string | null>(null);

  if (!user) return null; // Layout handles auth wall

  const selectedMeeting = meetings.find(m => m.id === selectedMeetingId) || null;

  return (
    <div className="flex flex-col h-full space-y-6 max-w-[1400px] mx-auto w-full">
      <div>
        <p className="font-mono text-[11px] uppercase tracking-wider text-primary mb-2">Workspace / Meetings</p>
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground">Explorer</h1>
        <p className="text-sm text-muted-foreground mt-1">Review your past meetings, read transcripts, and listen to recordings.</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 items-start lg:h-[calc(100vh-240px)]">
        {/* Left Column: Meeting List */}
        <aside className="w-full lg:w-80 flex-shrink-0 flex flex-col rounded-lg border border-border bg-surface shadow-soft lg:h-full overflow-hidden">
          <div className="p-4 border-b border-border bg-background/50">
            <h3 className="text-sm font-semibold text-foreground flex items-center justify-between">
              History
              <span className="font-mono text-[10px] bg-muted px-2 py-0.5 rounded-full">{meetings.length}</span>
            </h3>
          </div>
          
          <div className="overflow-y-auto flex-1 p-3 space-y-2 max-h-[40vh] lg:max-h-full bg-background/30">
            {isLoading ? (
              <div className="text-xs text-muted-foreground text-center py-8">Loading...</div>
            ) : isError ? (
              <div className="text-xs text-red-500 text-center py-8">Error: {error?.message}</div>
            ) : meetings.length === 0 ? (
              <div className="text-xs text-muted-foreground text-center py-8">No meetings recorded yet.</div>
            ) : (
              meetings.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setSelectedMeetingId(m.id)}
                  className={`w-full text-left p-4 rounded-md transition-all border ${
                    selectedMeetingId === m.id 
                      ? 'bg-surface border-border shadow-soft' 
                      : 'border-transparent hover:bg-surface hover:border-border/50'
                  }`}
                >
                  <div className="font-medium text-sm text-foreground truncate mb-2">
                    {m.title || 'Untitled Meeting'}
                  </div>
                  <div className="flex items-center gap-4 text-[11px] text-muted-foreground font-mono">
                    <span className="flex items-center gap-1.5"><Calendar size={12} /> {new Date(m.startTime).toLocaleDateString()}</span>
                    <span className="flex items-center gap-1.5"><Clock size={12} /> {Math.round(m.durationSeconds || 0)}s</span>
                  </div>
                </button>
              ))
            )}
          </div>
        </aside>

        {/* Right Column: Meeting Details */}
        <main className="flex-1 w-full lg:h-full overflow-hidden rounded-lg border border-border bg-surface shadow-editorial flex flex-col relative">
          {selectedMeeting ? (
            <>
              {/* Detail Header */}
              <div className="p-6 md:p-8 border-b border-border shrink-0 bg-background/50">
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                  <div>
                    <h2 className="text-xl md:text-2xl font-semibold tracking-tight text-foreground">{selectedMeeting.title || 'Untitled Meeting'}</h2>
                    <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground font-mono">
                      <span className="flex items-center gap-1.5"><Calendar size={13} /> {new Date(selectedMeeting.startTime).toLocaleDateString()}</span>
                      <span className="flex items-center gap-1.5"><Clock size={13} /> {Math.round(selectedMeeting.durationSeconds || 0)}s duration</span>
                    </div>
                  </div>
                  
                  {selectedMeeting.audioUrl && (
                    <div className="flex items-center shrink-0 min-w-[250px] md:min-w-[320px]">
                      <audio controls className="w-full h-10 outline-none" src={selectedMeeting.audioUrl} />
                    </div>
                  )}
                </div>
              </div>

              {/* Detail Scrollable Content */}
              <div className="p-6 md:p-8 overflow-y-auto flex-1 space-y-10 bg-surface">
                {selectedMeeting.transcript?.summary && (
                  <section>
                    <div className="flex items-center gap-2 mb-4">
                      <FileText size={16} className="text-muted-foreground" />
                      <h4 className="font-mono text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Executive Summary</h4>
                    </div>
                    <p className="text-sm md:text-[15px] text-foreground leading-relaxed">
                      {selectedMeeting.transcript.summary}
                    </p>
                  </section>
                )}

                {selectedMeeting.transcript?.actionItems && selectedMeeting.transcript.actionItems.length > 0 && (
                  <section>
                    <div className="flex items-center gap-2 mb-4">
                      <CheckCircle2 size={16} className="text-muted-foreground" />
                      <h4 className="font-mono text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Action Items</h4>
                    </div>
                    <ul className="grid gap-3">
                      {selectedMeeting.transcript.actionItems.map((item: string, idx: number) => (
                        <li key={idx} className="flex items-start gap-3 p-3 rounded-md border border-border bg-background/50">
                          <div className="mt-0.5 h-4 w-4 rounded border border-muted-foreground/30 flex-shrink-0" />
                          <span className="text-sm text-foreground leading-snug">{item}</span>
                        </li>
                      ))}
                    </ul>
                  </section>
                )}

                <section>
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-2">
                      <FileText size={16} className="text-muted-foreground" />
                      <h4 className="font-mono text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Full Transcript</h4>
                    </div>
                  </div>
                  
                  {selectedMeeting.transcript?.segments && selectedMeeting.transcript.segments.length > 0 ? (
                    <div className="space-y-6">
                      {selectedMeeting.transcript.segments.map((segment: TranscriptSegment, idx: number) => (
                        <div key={idx} className="flex gap-4">
                          <div className="w-24 shrink-0 font-mono text-[11px] text-muted-foreground pt-1 text-right">
                            {segment.speaker || segment.startTime?.substring(0, 5) || "00:00"}
                          </div>
                          <div className="flex-1 text-sm text-foreground leading-relaxed">
                            {segment.text}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-xs text-muted-foreground leading-relaxed italic">
                      No transcript segments available.
                    </div>
                  )}
                </section>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-12 text-sm min-h-[400px]">
              <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center mb-6">
                <MousePointerClick className="w-6 h-6 text-muted-foreground" />
              </div>
              <p className="font-medium text-foreground mb-1">No meeting selected</p>
              <p>Select a meeting from the history sidebar to view details.</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
