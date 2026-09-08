import React, { useState, useEffect } from 'react';
import { Key, Mic, CheckCircle2, ChevronRight, AlertCircle } from 'lucide-react';
import { useSettingsQuery, useUpdateSettingsMutation } from '../../hooks/useSettings';

interface OnboardingProps {
  onComplete: () => void;
}

export const Onboarding: React.FC<OnboardingProps> = ({ onComplete }) => {
  const { data: settings, isLoading } = useSettingsQuery();
  const updateMutation = useUpdateSettingsMutation();
  
  const [step, setStep] = useState<1 | 2>(1);
  const [apiKey, setApiKey] = useState('');
  const [hasMic, setHasMic] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (settings?.geminiApiKey) {
      setApiKey(settings.geminiApiKey);
      setStep(2);
    }
    
    navigator.mediaDevices.enumerateDevices().then(devices => {
        const hasMicAccess = devices.some(d => d.kind === 'audioinput' && d.label !== '');
        if (hasMicAccess) setHasMic(true);
    });
  }, [settings]);

  useEffect(() => {
    if (settings?.geminiApiKey && hasMic) {
      onComplete();
    }
  }, [settings?.geminiApiKey, hasMic, onComplete]);

  const handleSaveKey = () => {
    if (!apiKey.trim()) {
      setError('Please enter a valid API key.');
      return;
    }
    
    updateMutation.mutate(
      { geminiApiKey: apiKey.trim() },
      {
        onSuccess: () => {
          setError('');
          setStep(2);
        },
        onError: () => setError('Failed to save API key.')
      }
    );
  };

  const handleRequestMic = async () => {
    try {
      setError('');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(t => t.stop());
      setHasMic(true);
      onComplete();
    } catch (err) {
      console.error(err);
      setError('Microphone permission is required to record meetings. Please click Allow.');
      if (err instanceof Error && err.name === 'NotAllowedError') {
        chrome.tabs.create({ url: chrome.runtime.getURL('src/popup/index.html') });
      }
    }
  };

  if (isLoading) return null;

  return (
    <div className="flex flex-col h-full bg-[#fdfcf9] text-[#2d2d2d] justify-center px-6 py-10 min-h-[560px]">
      
      {/* Progress Header */}
      <div className="flex items-center justify-between mb-10">
        <div className="flex items-center gap-2">
          <div className={`text-[13px] transition-all ${
            step >= 1 ? 'text-[#1a1a1a] font-semibold' : 'text-[#aaa]'
          }`}>
            Step 1
          </div>
          <div className="text-[#e5e3d9] mx-2">/</div>
          <div className={`text-[13px] transition-all ${
            step >= 2 ? 'text-[#1a1a1a] font-semibold' : 'text-[#aaa]'
          }`}>
            Step 2
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col justify-center">
        {step === 1 && (
          <div className="animate-in fade-in duration-300">
            <h1 className="text-2xl text-[#1a1a1a] mb-2">Connect Gemini</h1>
            <p className="text-[13px] text-[#555] mb-8 leading-relaxed">
              We use Google's Gemini AI to transcribe your meetings. You can get a free API key from Google AI Studio.
            </p>
            
            <div className="space-y-4">
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Enter Gemini API Key..."
                className="w-full bg-white border border-[#e5e3d9] rounded px-3 py-2.5 text-[13px] text-[#1a1a1a] placeholder-[#aaa] focus:outline-none focus:border-[#2d2d2d] transition-colors font-mono"
              />
              {error && (
                <div className="flex items-center gap-1.5 text-[#da7756] text-[11px] bg-[#fcf5f3] p-2 rounded border border-[#f5dfd7]">
                  {error}
                </div>
              )}
              <button
                onClick={handleSaveKey}
                disabled={updateMutation.isPending || !apiKey.trim()}
                className="w-full py-2.5 px-4 bg-[#2d2d2d] hover:bg-[#1a1a1a] text-white rounded text-[13px] transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span>Continue</span>
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="animate-in fade-in duration-300">
            <h1 className="text-2xl text-[#1a1a1a] mb-2">Allow Microphone</h1>
            <p className="text-[13px] text-[#555] mb-8 leading-relaxed">
              We need access to your microphone to transcribe your voice. We only listen when you press record.
            </p>

            <div className="space-y-4">
               {error && (
                <div className="flex items-center gap-1.5 text-[#da7756] text-[11px] bg-[#fcf5f3] p-2 rounded border border-[#f5dfd7]">
                  <p className="leading-relaxed">{error}</p>
                </div>
              )}
              <button
                onClick={handleRequestMic}
                className="w-full py-2.5 px-4 bg-[#2d2d2d] hover:bg-[#1a1a1a] text-white rounded text-[13px] transition-colors flex items-center justify-center gap-2"
              >
                <span>Grant Access</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
