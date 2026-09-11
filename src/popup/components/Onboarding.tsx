import React, { useState, useEffect } from 'react';
import { useSettingsQuery, useUpdateSettingsMutation } from '../../hooks/useSettings';
import { auth } from '../../services/firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';

interface OnboardingProps {
  onComplete: () => void;
}

export const Onboarding: React.FC<OnboardingProps> = ({ onComplete }) => {
  const { data: settings, isLoading } = useSettingsQuery();
  const updateMutation = useUpdateSettingsMutation();
  
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [isAuthLoading, setIsAuthLoading] = useState(false);

  const [apiKey, setApiKey] = useState('');
  const [hasMic, setHasMic] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (settings?.geminiApiKey) {
      setApiKey(settings.geminiApiKey);
    }
    
    navigator.mediaDevices.enumerateDevices().then(devices => {
        const hasMicAccess = devices.some(d => d.kind === 'audioinput' && d.label !== '');
        if (hasMicAccess) setHasMic(true);
    });

    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user && step === 1) {
        if (settings?.geminiApiKey) {
          setStep(3); // Auto jump to mic if auth and key are present
        } else {
          setStep(2); // Auto advance to step 2 if only logged in
        }
      }
    });
    
    // Fallback if they are already on step 2 but have an API key saved
    if (step === 2 && settings?.geminiApiKey && auth.currentUser) {
      setStep(3);
    }

    return () => unsubscribe();
  }, [settings, step]);

  useEffect(() => {
    if (auth.currentUser && settings?.geminiApiKey && hasMic) {
      onComplete();
    }
  }, [settings?.geminiApiKey, hasMic, onComplete]);

  const handleAuth = async () => {
    if (!email.trim() || !password.trim()) {
      setError('Please enter email and password.');
      return;
    }
    setError('');
    setIsAuthLoading(true);
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }
      setStep(2);
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setIsAuthLoading(false);
    }
  };

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
          setStep(3);
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
    <div className="flex flex-col min-h-screen bg-[#fdfcf9] text-[#2d2d2d] items-center justify-center">
      <div className="w-full max-w-[360px] px-6 py-10 flex flex-col justify-center">
      
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
          <div className="text-[#e5e3d9] mx-2">/</div>
          <div className={`text-[13px] transition-all ${
            step >= 3 ? 'text-[#1a1a1a] font-semibold' : 'text-[#aaa]'
          }`}>
            Step 3
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col justify-center">
        {step === 1 && (
          <div className="animate-in fade-in duration-300">
            <h1 className="text-2xl text-[#1a1a1a] mb-2">{isLogin ? 'Welcome Back' : 'Create Account'}</h1>
            <p className="text-[13px] text-[#555] mb-8 leading-relaxed">
              Sign in to securely sync your meeting transcripts.
            </p>
            
            <div className="space-y-4">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email address"
                className="w-full bg-white border border-[#e5e3d9] rounded px-3 py-2.5 text-[13px] text-[#1a1a1a] placeholder-[#aaa] focus:outline-none focus:border-[#2d2d2d] transition-colors"
              />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                className="w-full bg-white border border-[#e5e3d9] rounded px-3 py-2.5 text-[13px] text-[#1a1a1a] placeholder-[#aaa] focus:outline-none focus:border-[#2d2d2d] transition-colors"
              />
              {error && (
                <div className="flex items-center gap-1.5 text-[#da7756] text-[11px] bg-[#fcf5f3] p-2 rounded border border-[#f5dfd7]">
                  {error}
                </div>
              )}
              <button
                onClick={handleAuth}
                disabled={isAuthLoading || !email.trim() || !password.trim()}
                className="w-full py-2.5 px-4 bg-[#2d2d2d] hover:bg-[#1a1a1a] text-white rounded text-[13px] transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span>{isAuthLoading ? 'Please wait...' : (isLogin ? 'Sign In' : 'Create Account')}</span>
              </button>
              
              <div className="text-center pt-2">
                <button 
                  onClick={() => setIsLogin(!isLogin)}
                  className="text-[12px] text-[#555] hover:text-[#1a1a1a] underline underline-offset-2"
                >
                  {isLogin ? "Don't have an account? Sign up" : "Already have an account? Log in"}
                </button>
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
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

        {step === 3 && (
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
    </div>
  );
};
