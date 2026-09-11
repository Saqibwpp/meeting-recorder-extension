import React, { useState, useEffect } from 'react';
import { RecordingCard } from './components/RecordingCard';
import { MeetingHistory } from './components/MeetingHistory';
import { SettingsView } from './components/SettingsView';
import { Onboarding } from './components/Onboarding';
import { useRecordingStatusQuery, useMeetingsQuery } from '../hooks/useMeetings';
import { useSettingsQuery } from '../hooks/useSettings';

type Tab = 'record' | 'history' | 'settings';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('record');
  const [isOnboarding, setIsOnboarding] = useState(true);
  
  const { data: status } = useRecordingStatusQuery();
  const { data: meetings = [] } = useMeetingsQuery();
  const { data: settings, isLoading: settingsLoading } = useSettingsQuery();

  const isRecording = status?.isRecording ?? false;

  useEffect(() => {
    if (settingsLoading) return;
    
    const checkMic = async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const hasMic = devices.some(d => d.kind === 'audioinput' && d.label !== '');
        
        if (settings?.geminiApiKey && hasMic) {
          setIsOnboarding(false);
        } else {
          setIsOnboarding(true);
        }
      } catch {
        setIsOnboarding(true);
      }
    };
    checkMic();
  }, [settings, settingsLoading]);

  if (settingsLoading) {
    return <div className="flex min-h-[560px] bg-gray-50 items-center justify-center text-gray-400">Loading...</div>;
  }

  if (isOnboarding) {
    return <Onboarding onComplete={() => setIsOnboarding(false)} />;
  }

  const isFullTab = window.innerWidth > 500 || new URLSearchParams(window.location.search).get('setup') === 'true';
  
  if (isFullTab) {
    return (
      <div className="flex flex-col min-h-screen bg-[#fdfcf9] text-[#2d2d2d] items-center justify-center">
        <div className="w-[420px] px-6 py-10 flex flex-col justify-center text-center">
          <div className="w-16 h-16 bg-[#eefae6] text-[#4d8b31] rounded-full flex items-center justify-center mx-auto mb-6">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-8 h-8">
              <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
            </svg>
          </div>
          <h1 className="text-2xl text-[#1a1a1a] mb-2 font-semibold">Setup Complete!</h1>
          <p className="text-[14px] text-[#555] mb-8 leading-relaxed">
            Your microphone is connected and your API key is saved. 
            You can now close this tab. To start recording a meeting, click the Embrace extension icon in your browser toolbar while on your meeting page.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-[420px] mx-auto min-h-screen sm:min-h-[560px] bg-[#fdfcf9] text-[#2d2d2d] sm:shadow-2xl relative">
      {/* Header */}
      <header className="px-5 py-3.5 border-b border-[#e5e3d9] bg-[#fdfcf9] flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-2.5">
          <div className="text-sm font-semibold text-[#1a1a1a] flex items-center gap-2">
            AI Notetaker
          </div>
        </div>

        {/* Live Indicator */}
        {isRecording && (
          <div className="flex items-center gap-1.5 px-2 py-0.5 border border-[#e5e3d9] bg-white rounded flex-shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-[#d97757]" />
            <span className="text-[10px] text-[#555] uppercase tracking-widest">Recording</span>
          </div>
        )}
      </header>

      {/* Tab Navigation */}
      <nav className="flex p-1 mx-4 mt-4 mb-2 bg-[#f2f0e9] border border-[#e5e3d9] rounded-md gap-0.5">
        <button
          onClick={() => setActiveTab('record')}
          className={`flex-1 py-1.5 px-3 rounded text-[11px] flex items-center justify-center transition-all ${
            activeTab === 'record'
              ? 'bg-white text-[#1a1a1a] shadow-sm font-medium'
              : 'text-[#666] hover:text-[#1a1a1a]'
          }`}
        >
          <span>Record</span>
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`flex-1 py-1.5 px-3 rounded text-[11px] flex items-center justify-center gap-1 transition-all ${
            activeTab === 'history'
              ? 'bg-white text-[#1a1a1a] shadow-sm font-medium'
              : 'text-[#666] hover:text-[#1a1a1a]'
          }`}
        >
          <span>Meetings</span>
          {meetings.length > 0 && (
            <span className="text-[9px] text-[#888]">
              ({meetings.length})
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('settings')}
          className={`flex-1 py-1.5 px-3 rounded text-[11px] flex items-center justify-center transition-all ${
            activeTab === 'settings'
              ? 'bg-white text-[#1a1a1a] shadow-sm font-medium'
              : 'text-[#666] hover:text-[#1a1a1a]'
          }`}
        >
          <span>Settings</span>
        </button>
      </nav>

      {/* Main Tab View */}
      <main className="flex-1 px-4 pb-4">
        {activeTab === 'record' && <RecordingCard onNavigateToHistory={() => setActiveTab('history')} />}
        {activeTab === 'history' && <MeetingHistory />}
        {activeTab === 'settings' && <SettingsView />}
      </main>

      {/* Footer */}
      <footer className="px-5 py-3 text-[10px] text-[#888] flex items-center justify-between mt-auto bg-[#fdfcf9]">
        <span>Powered by Gemini AI</span>
      </footer>
    </div>
  );
};

export default App;
