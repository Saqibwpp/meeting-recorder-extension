import React, { useState, useEffect } from 'react';
import { useRecordingStatusQuery, useStartRecordingMutation, useStopRecordingMutation } from '../../hooks/useMeetings';
import { useSettingsQuery } from '../../hooks/useSettings';

interface RecordingCardProps {
  onNavigateToHistory?: () => void;
}

export const RecordingCard: React.FC<RecordingCardProps> = ({ onNavigateToHistory }) => {
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

  const [countdown, setCountdown] = useState<number | null>(null);

  useEffect(() => {
    if (countdown === null) return;
    
    if (countdown === 0) {
      startMutation.mutate(undefined, {
        onError: (err) => {
          setCountdown(null);
          alert(`Failed to start recording:\n\n${err.message}\n\nTroubleshooting:\n1. Refresh the meeting tab to clear any stuck capture state.`);
        }
      });
      return;
    }

    const timer = setTimeout(() => {
      setCountdown(countdown - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [countdown, startMutation]);

  const handleToggleRecord = () => {
    if (isRecording) {
      stopMutation.mutate(undefined, {
        onSuccess: () => {
          onNavigateToHistory?.();
        },
        onError: (err) => alert(`Failed to stop: ${err.message}`)
      });
    } else {
      setCountdown(3);
    }
  };

  const isPending = startMutation.isPending || stopMutation.isPending;

  return (
    <div className="flex flex-col gap-5 bg-white border border-[#e5e3d9] rounded-lg p-5">
      {/* Warning banner if API key is missing */}
      {!settings?.geminiApiKey && (
        <div className="flex items-center gap-2 px-3 py-2 text-[11px] text-[#da7756] bg-[#fcf5f3] border border-[#f5dfd7] rounded">
          <span>No Gemini API key set. Go to Settings to enable AI transcription.</span>
        </div>
      )}

      {/* Status & Platform Header */}
      <div className="flex items-center justify-between pb-2 border-b border-[#e5e3d9]">
        <div className="flex items-center gap-2">
          {isRecording ? (
            <span className="flex items-center gap-1.5 px-2 py-0.5 text-[10px] text-[#d97757] uppercase tracking-widest bg-[#fcf5f3] border border-[#f5dfd7] rounded">
              <span className="w-1.5 h-1.5 rounded-full bg-[#d97757] animate-pulse" />
              Recording Active
            </span>
          ) : (
            <span className="flex items-center gap-1.5 px-2 py-0.5 text-[10px] text-[#5b695e] uppercase tracking-widest bg-[#f4f7f5] border border-[#e2eae4] rounded">
              <span className="w-1.5 h-1.5 rounded-full bg-[#5b695e]" />
              Ready
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5 text-[10px] text-[#888] uppercase tracking-wider">
          <span>Mic + Tab</span>
        </div>
      </div>

      {/* Target Tab Info */}
      <div className="flex flex-col">
        <div className="text-[10px] text-[#888] uppercase tracking-widest mb-1">Target Tab</div>
        <div className="text-sm text-[#1a1a1a] truncate" title={activeTabTitle}>
          {currentMeeting?.title || activeTabTitle}
        </div>
      </div>

      {/* Timer & Waveform */}
      <div className="flex flex-col items-center justify-center py-6">
        <div className="text-4xl text-[#1a1a1a] tracking-tight" style={{ fontVariantNumeric: 'tabular-nums' }}>
          {formatTime(duration)}
        </div>
        
        {/* Animated Waveform Visualizer */}
        <div className="flex items-center gap-1 h-6 mt-6">
          {[40, 75, 55, 90, 60, 85, 45, 95, 70, 50, 80, 65].map((h, i) => (
            <span
              key={i}
              className={`w-[3px] rounded-sm transition-all duration-300 ${
                isRecording
                  ? 'bg-[#da7756] opacity-80'
                  : 'bg-[#e5e3d9]'
              }`}
              style={{
                height: isRecording ? `${Math.max(15, (h * (0.5 + Math.random() * 0.5)))}%` : '15%',
                animationDelay: `${i * 100}ms`
              }}
            />
          ))}
        </div>
      </div>

      {/* Action Button */}
      <button
        onClick={handleToggleRecord}
        disabled={isPending || countdown !== null}
        className={`w-full py-2.5 px-4 rounded text-[13px] flex items-center justify-center transition-all border ${
          isRecording
            ? 'bg-white border-[#e5e3d9] hover:bg-[#fcf5f3] text-[#da7756]'
            : 'bg-[#2d2d2d] border-[#2d2d2d] hover:bg-[#1a1a1a] text-white'
        } disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer`}
      >
        {countdown !== null ? (
          <span>Starting in {countdown}...</span>
        ) : isPending ? (
          <span>Processing...</span>
        ) : isRecording ? (
          <span>Stop & Transcribe</span>
        ) : (
          <span>Start Recording</span>
        )}
      </button>

      {/* Model indicator footer */}
      <div className="flex items-center justify-center text-[9px] text-[#888] uppercase tracking-widest mt-1">
        <span>Model: {settings?.primaryModel || 'gemini-3.1-flash-lite'}</span>
      </div>
    </div>
  );
};
