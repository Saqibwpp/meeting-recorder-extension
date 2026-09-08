import React, { useState } from 'react';
import { FileText, Download, CheckCircle2, Clock, AlertTriangle, ChevronRight, X, Sparkles, User, Users } from 'lucide-react';
import { useMeetingsQuery } from '../../hooks/useMeetings';
import { Meeting, TranscriptData } from '../../types';

export const MeetingHistory: React.FC = () => {
  const { data: meetings = [], isLoading } = useMeetingsQuery();
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);

  const formatDuration = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}m ${s}s`;
  };

  const handleDownloadTranscript = (transcript: TranscriptData, title: string) => {
    const blob = new Blob([JSON.stringify(transcript, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title.replace(/[^a-zA-Z0-9_-]/g, '_')}_transcript.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-slate-500 gap-2">
        <div className="w-5 h-5 border-2 border-slate-600 border-t-emerald-500 rounded-full animate-spin" />
        <span className="text-xs">Loading meetings...</span>
      </div>
    );
  }

  if (meetings.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
        <div className="text-[13px] text-[#555] font-medium mb-1">No meetings recorded yet</div>
        <div className="text-[11px] text-[#888]">Start a recording from the Record tab or join Google Meet / Teams.</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2.5">
      {meetings.map((m) => (
        <div
          key={m.id}
          onClick={() => setSelectedMeeting(m)}
          className="px-4 py-3 bg-white hover:bg-[#fcfcfb] border border-[#e5e3d9] rounded cursor-pointer flex items-center justify-between group transition-colors"
        >
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="flex flex-col truncate">
              <div className="text-[13px] text-[#1a1a1a] truncate">{m.title}</div>
              <div className="flex items-center gap-2 text-[11px] text-[#888] mt-0.5">
                <span>{new Date(m.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                <span>•</span>
                <span>{formatDuration(m.durationSeconds)}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 text-[#888]">
            {m.status === 'processing' && (
              <span className="text-[10px] uppercase tracking-widest text-[#d97757]">
                Transcribing
              </span>
            )}
            {m.status === 'completed' && (
              <span className="text-[10px] uppercase tracking-widest text-[#5b695e]">
                Ready
              </span>
            )}
            {m.status === 'error' && (
              <span className="text-[10px] uppercase tracking-widest text-[#d97757]">
                Error
              </span>
            )}
            <ChevronRight className="w-4 h-4 opacity-50 group-hover:opacity-100 transition-opacity" />
          </div>
        </div>
      ))}

      {/* Transcript Detail Modal */}
      {selectedMeeting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/20 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#fdfcf9] border border-[#e5e3d9] rounded-lg w-full max-h-[90vh] flex flex-col shadow-xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-[#e5e3d9] bg-white">
              <div>
                <h3 className="text-sm text-[#1a1a1a] truncate max-w-[260px]">{selectedMeeting.title}</h3>
                <p className="text-[11px] text-[#888] mt-0.5">
                  {new Date(selectedMeeting.startTime).toLocaleString()} • {formatDuration(selectedMeeting.durationSeconds)}
                </p>
              </div>
              <div className="flex items-center gap-1 text-[#555]">
                {selectedMeeting.transcript && (
                  <button
                    onClick={() => handleDownloadTranscript(selectedMeeting.transcript!, selectedMeeting.title)}
                    className="p-1.5 hover:bg-[#f2f0e9] rounded transition-colors"
                    title="Download JSON Transcript"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={() => setSelectedMeeting(null)}
                  className="p-1.5 hover:bg-[#f2f0e9] rounded transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-5 space-y-6 text-[13px] leading-relaxed">
              {/* Summary */}
              {selectedMeeting.transcript?.summary && (
                <div>
                  <div className="text-[10px] text-[#888] uppercase tracking-widest mb-2 border-b border-[#e5e3d9] pb-1">Executive Summary</div>
                  <p className="text-[#333]">{selectedMeeting.transcript.summary}</p>
                </div>
              )}

              {/* Action Items */}
              {selectedMeeting.transcript?.actionItems && selectedMeeting.transcript.actionItems.length > 0 && (
                <div>
                  <div className="text-[10px] text-[#888] uppercase tracking-widest mb-2 border-b border-[#e5e3d9] pb-1">Action Items</div>
                  <ul className="list-none space-y-1.5 text-[#333]">
                    {selectedMeeting.transcript.actionItems.map((item, i) => (
                      <li key={i} className="flex gap-2">
                        <span className="text-[#d97757]">•</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Dialogue Breakdown */}
              {selectedMeeting.transcript?.segments && selectedMeeting.transcript.segments.length > 0 ? (
                <div>
                  <div className="text-[10px] text-[#888] uppercase tracking-widest mb-3 border-b border-[#e5e3d9] pb-1">Transcript</div>
                  <div className="space-y-4">
                    {selectedMeeting.transcript.segments.map((seg) => (
                      <div key={seg.id} className="group">
                        <div className="flex items-baseline gap-2 mb-0.5">
                          <span className="text-[11px] font-semibold text-[#1a1a1a]">
                            {seg.speaker}
                          </span>
                          <span className="text-[9px] text-[#999] opacity-0 group-hover:opacity-100 transition-opacity">
                            {seg.startTime}
                          </span>
                        </div>
                        <p className="text-[#333]">{seg.text}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : selectedMeeting.status === 'processing' ? (
                <div className="py-8 text-center text-slate-400">
                  <Clock className="w-6 h-6 animate-spin mx-auto mb-2 text-emerald-400" />
                  <span>Gemini is processing and diarizing this meeting...</span>
                </div>
              ) : (
                <div className="py-8 text-center text-slate-500">
                  {selectedMeeting.error || 'No transcript available for this recording.'}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
