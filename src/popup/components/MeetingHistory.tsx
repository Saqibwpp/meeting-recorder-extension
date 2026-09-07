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
      <div className="flex flex-col items-center justify-center p-8 text-slate-500 text-center gap-2 border border-dashed border-slate-800 rounded-2xl">
        <FileText className="w-8 h-8 text-slate-600" />
        <p className="text-xs">No meetings recorded yet.</p>
        <p className="text-[11px] text-slate-600">Start a recording from the Record tab or join Google Meet / Teams.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2.5">
      {meetings.map((m) => (
        <div
          key={m.id}
          onClick={() => setSelectedMeeting(m)}
          className="p-3.5 bg-slate-900/60 hover:bg-slate-900 border border-slate-800/80 hover:border-slate-700 rounded-xl transition-all cursor-pointer flex items-center justify-between group"
        >
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="p-2 bg-slate-800/60 group-hover:bg-slate-800 rounded-lg text-slate-300">
              <FileText className="w-4 h-4" />
            </div>
            <div className="flex flex-col truncate">
              <div className="text-xs font-semibold text-slate-200 truncate">{m.title}</div>
              <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                <span>{new Date(m.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                <span>•</span>
                <span>{formatDuration(m.durationSeconds)}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {m.status === 'processing' && (
              <span className="flex items-center gap-1 text-[10px] text-amber-400 bg-amber-950/40 px-2 py-0.5 rounded-full border border-amber-800/50">
                <Clock className="w-3 h-3 animate-spin" />
                Transcribing...
              </span>
            )}
            {m.status === 'completed' && (
              <span className="flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-800/40">
                <CheckCircle2 className="w-3 h-3" />
                Ready
              </span>
            )}
            {m.status === 'error' && (
              <span className="flex items-center gap-1 text-[10px] text-rose-400 bg-rose-950/40 px-2 py-0.5 rounded-full border border-rose-800/50">
                <AlertTriangle className="w-3 h-3" />
                Error
              </span>
            )}
            <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-slate-300 transition-colors" />
          </div>
        </div>
      ))}

      {/* Transcript Detail Modal */}
      {selectedMeeting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-800">
              <div>
                <h3 className="text-sm font-semibold text-white truncate max-w-[260px]">{selectedMeeting.title}</h3>
                <p className="text-[11px] text-slate-400">
                  {new Date(selectedMeeting.startTime).toLocaleString()} • {formatDuration(selectedMeeting.durationSeconds)}
                </p>
              </div>
              <div className="flex items-center gap-1">
                {selectedMeeting.transcript && (
                  <button
                    onClick={() => handleDownloadTranscript(selectedMeeting.transcript!, selectedMeeting.title)}
                    className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-colors"
                    title="Download JSON Transcript"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={() => setSelectedMeeting(null)}
                  className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
              {/* Summary */}
              {selectedMeeting.transcript?.summary && (
                <div className="p-3 bg-emerald-950/20 border border-emerald-800/30 rounded-xl">
                  <div className="flex items-center gap-1.5 text-emerald-400 font-semibold mb-1">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Executive Summary</span>
                  </div>
                  <p className="text-slate-300 leading-relaxed">{selectedMeeting.transcript.summary}</p>
                </div>
              )}

              {/* Action Items */}
              {selectedMeeting.transcript?.actionItems && selectedMeeting.transcript.actionItems.length > 0 && (
                <div className="p-3 bg-slate-950/60 border border-slate-800/80 rounded-xl">
                  <div className="text-slate-200 font-semibold mb-1.5">Action Items</div>
                  <ul className="list-disc list-inside space-y-1 text-slate-300">
                    {selectedMeeting.transcript.actionItems.map((item, i) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Dialogue Breakdown */}
              {selectedMeeting.transcript?.segments && selectedMeeting.transcript.segments.length > 0 ? (
                <div className="space-y-2.5">
                  <div className="text-slate-400 font-semibold text-[11px] uppercase tracking-wider">Timestamped Dialogue</div>
                  {selectedMeeting.transcript.segments.map((seg) => (
                    <div
                      key={seg.id}
                      className={`p-2.5 rounded-xl border ${
                        seg.channel === 'left'
                          ? 'bg-slate-950/80 border-indigo-900/40'
                          : 'bg-slate-900/80 border-teal-900/40'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1 text-[10px]">
                        <span className={`font-semibold flex items-center gap-1 ${
                          seg.channel === 'left' ? 'text-indigo-400' : 'text-teal-400'
                        }`}>
                          {seg.channel === 'left' ? <User className="w-3 h-3" /> : <Users className="w-3 h-3" />}
                          {seg.speaker}
                        </span>
                        <span className="text-slate-500 font-mono">{seg.startTime} - {seg.endTime}</span>
                      </div>
                      <p className="text-slate-200 leading-normal">{seg.text}</p>
                    </div>
                  ))}
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
