import React, { useState, useEffect } from 'react';
import { Mic, Square, Radio, AlertCircle, Sparkles, Volume2 } from 'lucide-react';
import { useRecordingStatusQuery, useStartRecordingMutation, useStopRecordingMutation } from '../../hooks/useMeetings';
import { useSettingsQuery } from '../../hooks/useSettings';

export const RecordingCard: React.FC = () => {
  const { data: status } = useRecordingStatusQuery();
  const { data: settings } = useSettingsQuery();
  const startMutation = useStartRecordingMutation();
  const stopMutation = useStopRecordingMutation();

  const isRecording = status?.isRecording ?? false;
  const currentMeeting = status?.currentMeeting;
  const duration = currentMeeting?.durationSeconds ?? 0;

  const [activeTabTitle, setActiveTabTitle] = useState<string>('Detecting call...');

  useEffect(() => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.title) {
        setActiveTabTitle(tabs[0].title);
      }
    });
  }, []);

  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const handleToggleRecord = () => {
    if (isRecording) {
      stopMutation.mutate(undefined, {
        onError: (err) => alert(`Failed to stop: ${err.message}`)
      });
    } else {
      const requestMic = navigator.mediaDevices.getUserMedia({ audio: true })
        .then((stream) => stream.getTracks().forEach(t => t.stop()))
        .catch((err) => {
          console.warn("Mic permission denied:", err);
          alert("Microphone permission is required to record your voice!\n\nChrome does not allow permission prompts inside small popups. We are opening the extension in a full tab so you can click 'Allow'.");
          chrome.tabs.create({ url: chrome.runtime.getURL('src/popup/index.html') });
          throw new Error("Microphone permission required.");
        });
        
      requestMic.then(() => {
        startMutation.mutate(undefined, {
          onError: (err) => alert(`Failed to start recording:\n\n${err.message}\n\nTroubleshooting:\n1. Refresh the meeting tab to clear any stuck capture state.`)
        });
      }).catch(() => {
        // Error already handled and alerted above
      });
    }
  };

  const isPending = startMutation.isPending || stopMutation.isPending;

  return (
    <div className="flex flex-col gap-5 p-5 bg-gradient-to-b from-slate-900/90 to-slate-950/90 border border-slate-800/80 rounded-2xl shadow-xl backdrop-blur-xl">
      {/* Warning banner if API key is missing */}
      {!settings?.geminiApiKey && (
        <div className="flex items-center gap-2.5 px-3.5 py-2.5 text-xs text-amber-300 bg-amber-950/40 border border-amber-800/50 rounded-xl">
          <AlertCircle className="w-4 h-4 shrink-0 text-amber-400" />
          <span>No Gemini API key set. Go to Settings to enable AI transcription.</span>
        </div>
      )}

      {/* Status & Platform Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isRecording ? (
            <span className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-red-400 bg-red-950/60 border border-red-800/50 rounded-full animate-pulse">
              <span className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_8px_#ef4444]" />
              RECORDING DUAL-STREAM
            </span>
          ) : (
            <span className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-emerald-400 bg-emerald-950/50 border border-emerald-800/40 rounded-full">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              READY TO CAPTURE
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 text-xs text-slate-400">
          <Volume2 className="w-3.5 h-3.5 text-slate-500" />
          <span>Ch 1: Mic • Ch 2: Tab</span>
        </div>
      </div>

      {/* Target Tab Info */}
      <div className="p-3 bg-slate-900/60 border border-slate-800/60 rounded-xl">
        <div className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase">Target Audio Source</div>
        <div className="text-sm font-medium text-slate-200 truncate mt-0.5" title={activeTabTitle}>
          {currentMeeting?.title || activeTabTitle}
        </div>
      </div>

      {/* Timer & Waveform */}
      <div className="flex flex-col items-center justify-center py-2">
        <div className="font-mono text-4xl font-bold tracking-tight text-white drop-shadow-md">
          {formatTime(duration)}
        </div>
        
        {/* Animated Waveform Visualizer */}
        <div className="flex items-center gap-1.5 h-8 mt-3">
          {[40, 75, 55, 90, 60, 85, 45, 95, 70, 50, 80, 65].map((h, i) => (
            <span
              key={i}
              className={`w-1 rounded-full transition-all duration-300 ${
                isRecording
                  ? 'bg-gradient-to-t from-emerald-500 to-teal-300 animate-pulse'
                  : 'bg-slate-800'
              }`}
              style={{
                height: isRecording ? `${Math.max(15, (h * (0.5 + Math.random() * 0.5)))}%` : '15%',
                animationDelay: `${i * 75}ms`
              }}
            />
          ))}
        </div>
      </div>

      {/* Action Button */}
      <button
        onClick={handleToggleRecord}
        disabled={isPending}
        className={`w-full py-3.5 px-4 rounded-xl font-semibold text-sm flex items-center justify-center gap-2.5 transition-all duration-200 shadow-lg ${
          isRecording
            ? 'bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 text-white shadow-red-900/30'
            : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-emerald-900/30'
        } disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer`}
      >
        {isPending ? (
          <Radio className="w-5 h-5 animate-spin" />
        ) : isRecording ? (
          <>
            <Square className="w-4 h-4 fill-current" />
            <span>Stop & Transcribe with Gemini</span>
          </>
        ) : (
          <>
            <Mic className="w-5 h-5" />
            <span>Start Dual-Stream Recording</span>
          </>
        )}
      </button>

      {/* Model indicator footer */}
      <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-500">
        <Sparkles className="w-3 h-3 text-emerald-400" />
        <span>Model: {settings?.primaryModel || 'gemini-3.1-flash-lite'} (auto-fallback enabled)</span>
      </div>
    </div>
  );
};
