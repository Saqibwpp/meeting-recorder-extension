import React, { useState } from 'react';
import { Mic, History, Settings, Sparkles } from 'lucide-react';
import { RecordingCard } from './components/RecordingCard';
import { MeetingHistory } from './components/MeetingHistory';
import { SettingsView } from './components/SettingsView';
import { useRecordingStatusQuery, useMeetingsQuery } from '../hooks/useMeetings';

type Tab = 'record' | 'history' | 'settings';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('record');
  const { data: status } = useRecordingStatusQuery();
  const { data: meetings = [] } = useMeetingsQuery();

  const isRecording = status?.isRecording ?? false;

  return (
    <div className="flex flex-col min-h-[560px] bg-slate-950 text-slate-100">
      {/* Header */}
      <header className="px-5 py-4 border-b border-slate-800/80 bg-slate-900/50 backdrop-blur-md flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-950/50">
            <Mic className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="text-sm font-bold tracking-tight text-white flex items-center gap-1.5">
              <span>AI Notetaker</span>
              <span className="text-[10px] px-1.5 py-0.2 font-mono font-medium text-emerald-400 bg-emerald-950/60 border border-emerald-800/50 rounded">v1.0</span>
            </div>
            <div className="text-[11px] text-slate-400 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-emerald-400" />
              <span>Gemini Dual-Stream</span>
            </div>
          </div>
        </div>

        {/* Live Indicator */}
        {isRecording && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-red-950/50 border border-red-800/60 rounded-full animate-pulse">
            <span className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_8px_#ef4444]" />
            <span className="text-[10px] font-semibold text-red-400">REC</span>
          </div>
        )}
      </header>

      {/* Tab Navigation */}
      <nav className="flex p-1.5 m-3 bg-slate-900/80 border border-slate-800/80 rounded-xl gap-1">
        <button
          onClick={() => setActiveTab('record')}
          className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
            activeTab === 'record'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          <Mic className="w-3.5 h-3.5" />
          <span>Record</span>
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
            activeTab === 'history'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          <History className="w-3.5 h-3.5" />
          <span>Meetings</span>
          {meetings.length > 0 && (
            <span className={`text-[10px] px-1.5 rounded-full ${
              activeTab === 'history' ? 'bg-emerald-800 text-emerald-100' : 'bg-slate-800 text-slate-400'
            }`}>
              {meetings.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('settings')}
          className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
            activeTab === 'settings'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          <Settings className="w-3.5 h-3.5" />
          <span>Settings</span>
        </button>
      </nav>

      {/* Main Tab View */}
      <main className="flex-1 px-4 pb-4">
        {activeTab === 'record' && <RecordingCard />}
        {activeTab === 'history' && <MeetingHistory />}
        {activeTab === 'settings' && <SettingsView />}
      </main>

      {/* Footer */}
      <footer className="px-4 py-2.5 border-t border-slate-900 bg-slate-950/80 text-[10px] text-slate-600 flex items-center justify-between">
        <span>Dual-Stream Tab & Mic Audio Engine</span>
        <span>Synced with local repo</span>
      </footer>
    </div>
  );
};

export default App;
