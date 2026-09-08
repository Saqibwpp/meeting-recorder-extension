import React, { useState, useEffect } from 'react';
import { Key, Sparkles, Check, Server, Eye, EyeOff, ShieldCheck, HelpCircle } from 'lucide-react';
import { useSettingsQuery, useUpdateSettingsMutation } from '../../hooks/useSettings';
import { DEFAULT_PRIMARY_MODEL } from '../../services/gemini';

export const SettingsView: React.FC = () => {
  const { data: settings } = useSettingsQuery();
  const updateMutation = useUpdateSettingsMutation();

  const [apiKey, setApiKey] = useState('');
  const [primaryModel, setPrimaryModel] = useState(DEFAULT_PRIMARY_MODEL);
  const [autoDetect, setAutoDetect] = useState(true);
  const [serverUrl, setServerUrl] = useState('http://localhost:4829');
  const [showKey, setShowKey] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    if (settings) {
      setApiKey(settings.geminiApiKey || '');
      setPrimaryModel(settings.primaryModel || DEFAULT_PRIMARY_MODEL);
      setAutoDetect(settings.autoDetectMeetings ?? true);
      setServerUrl(settings.localServerUrl || 'http://localhost:4829');
    }
  }, [settings]);

  const handleSave = () => {
    updateMutation.mutate(
      {
        geminiApiKey: apiKey.trim(),
        primaryModel,
        autoDetectMeetings: autoDetect,
        localServerUrl: serverUrl.trim()
      },
      {
        onSuccess: () => {
          setSavedSuccess(true);
          setTimeout(() => setSavedSuccess(false), 2000);
        }
      }
    );
  };

  return (
    <div className="flex flex-col gap-5 text-[13px]">
      {/* Gemini API Key */}
      <div className="flex flex-col gap-1.5">
        <label className="font-semibold text-[#1a1a1a] flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            Gemini API Key
          </span>
          <a
            href="https://aistudio.google.com/app/apikey"
            target="_blank"
            rel="noreferrer"
            className="text-[10px] text-[#555] hover:text-[#1a1a1a] flex items-center gap-1 transition-colors"
          >
            Get Key <HelpCircle className="w-2.5 h-2.5" />
          </a>
        </label>
        <div className="relative flex items-center">
          <input
            type={showKey ? 'text' : 'password'}
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="AQ.Ab8..."
            className="w-full bg-white border border-[#e5e3d9] rounded px-3 py-2 pr-10 text-[13px] text-[#1a1a1a] placeholder-[#aaa] focus:outline-none focus:border-[#2d2d2d] transition-colors font-mono"
          />
          <button
            type="button"
            onClick={() => setShowKey(!showKey)}
            className="absolute right-3 text-[#aaa] hover:text-[#1a1a1a] transition-colors"
          >
            {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        <p className="text-[10px] text-[#888]">Stored securely in browser local storage.</p>
      </div>

      {/* Model Selection */}
      <div className="flex flex-col gap-1.5">
        <label className="font-semibold text-[#1a1a1a] flex items-center gap-1.5">
          Primary AI Model
        </label>
        <select
          value={primaryModel}
          onChange={(e) => setPrimaryModel(e.target.value)}
          className="w-full bg-white border border-[#e5e3d9] rounded px-3 py-2 text-[13px] text-[#1a1a1a] focus:outline-none focus:border-[#2d2d2d] transition-colors"
        >
          <option value="gemini-3.1-flash-lite">Gemini 3.1 Flash Lite (Recommended)</option>
          <option value="gemini-3.7-flash">Gemini 3.7 Flash</option>
          <option value="gemini-3.8-flash">Gemini 3.8 Flash</option>
          <option value="gemini-flash-latest">Gemini Flash Latest</option>
        </select>
        
        {/* Fallback chain notice */}
        <div className="text-[10px] text-[#888]">
          <strong className="font-semibold">Automatic Fallback:</strong> Will gracefully fall back to 3.7/3.8 if rate limited.
        </div>
      </div>

      {/* Auto-detect Toggle */}
      <div className="flex flex-col gap-1.5 mt-2">
        <label className="font-semibold text-[#1a1a1a] flex items-center justify-between">
          Auto-Detect Meetings
          <input
            type="checkbox"
            checked={autoDetect}
            onChange={(e) => setAutoDetect(e.target.checked)}
            className="w-3.5 h-3.5 rounded text-[#2d2d2d] focus:ring-[#2d2d2d] accent-[#2d2d2d] cursor-pointer"
          />
        </label>
        <p className="text-[10px] text-[#888]">Prompt to record when active in Meet/Teams.</p>
      </div>

      {/* Local Repo Sync Server */}
      <div className="flex flex-col gap-1.5 mt-2">
        <label className="font-semibold text-[#1a1a1a] flex items-center gap-1.5">
          Local Repo Sync Server
        </label>
        <input
          type="text"
          value={serverUrl}
          onChange={(e) => setServerUrl(e.target.value)}
          placeholder="http://localhost:4829"
          className="w-full bg-white border border-[#e5e3d9] rounded px-3 py-2 text-[13px] text-[#1a1a1a] placeholder-[#aaa] focus:outline-none focus:border-[#2d2d2d] transition-colors font-mono"
        />
        <p className="text-[10px] text-[#888]">Writes audio and JSON directly to local repo for debugging.</p>
      </div>

      {/* Save Button */}
      <button
        onClick={handleSave}
        disabled={updateMutation.isPending}
        className="w-full py-2.5 px-4 bg-[#2d2d2d] hover:bg-[#1a1a1a] text-white rounded flex items-center justify-center transition-colors mt-4"
      >
        {savedSuccess ? (
          <span className="text-white">Settings Saved</span>
        ) : (
          <span>Save Configuration</span>
        )}
      </button>
    </div>
  );
};
