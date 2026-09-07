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
    <div className="flex flex-col gap-4 text-xs">
      {/* Gemini API Key */}
      <div className="flex flex-col gap-1.5">
        <label className="font-semibold text-slate-300 flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <Key className="w-3.5 h-3.5 text-emerald-400" />
            Gemini API Key
          </span>
          <a
            href="https://aistudio.google.com/app/apikey"
            target="_blank"
            rel="noreferrer"
            className="text-[10px] text-emerald-400 hover:underline flex items-center gap-1"
          >
            Get Key <HelpCircle className="w-2.5 h-2.5" />
          </a>
        </label>
        <div className="relative flex items-center">
          <input
            type={showKey ? 'text' : 'password'}
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="AQ.Ab8... or AIzaSy..."
            className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 pr-9 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 transition-colors font-mono"
          />
          <button
            type="button"
            onClick={() => setShowKey(!showKey)}
            className="absolute right-2.5 text-slate-500 hover:text-slate-300 transition-colors"
          >
            {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        <p className="text-[10px] text-slate-500">Loaded from .env / configured locally in browser storage.</p>
      </div>

      {/* Model Selection */}
      <div className="flex flex-col gap-1.5">
        <label className="font-semibold text-slate-300 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
          Primary AI Model
        </label>
        <select
          value={primaryModel}
          onChange={(e) => setPrimaryModel(e.target.value)}
          className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 transition-colors"
        >
          <option value="gemini-3.1-flash-lite">Gemini 3.1 Flash Lite (Recommended)</option>
          <option value="gemini-3.7-flash">Gemini 3.7 Flash</option>
          <option value="gemini-3.8-flash">Gemini 3.8 Flash</option>
          <option value="gemini-flash-latest">Gemini Flash Latest</option>
        </select>
        
        {/* Fallback chain notice */}
        <div className="p-2.5 bg-slate-900/60 border border-slate-800/80 rounded-xl flex items-start gap-2 text-[11px] text-slate-400">
          <ShieldCheck className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
          <span>
            <strong>Automatic Fallback:</strong> If the primary model hits rate limits (HTTP 429), it automatically falls back across <em>3.1-preview</em>, <em>3.7-flash</em>, and <em>3.8-flash</em>.
          </span>
        </div>
      </div>

      {/* Auto-detect Toggle */}
      <div className="flex items-center justify-between p-3 bg-slate-900/60 border border-slate-800/80 rounded-xl">
        <div className="flex flex-col">
          <span className="font-semibold text-slate-200">Auto-Detect Meetings</span>
          <span className="text-[10px] text-slate-500">Prompt to record when microphone is active in Meet/Teams/Zoom</span>
        </div>
        <input
          type="checkbox"
          checked={autoDetect}
          onChange={(e) => setAutoDetect(e.target.checked)}
          className="w-4 h-4 rounded text-emerald-500 focus:ring-emerald-500 accent-emerald-500 cursor-pointer"
        />
      </div>

      {/* Local Repo Sync Server */}
      <div className="flex flex-col gap-1.5">
        <label className="font-semibold text-slate-300 flex items-center gap-1.5">
          <Server className="w-3.5 h-3.5 text-emerald-400" />
          Local Repo Sync Server
        </label>
        <input
          type="text"
          value={serverUrl}
          onChange={(e) => setServerUrl(e.target.value)}
          placeholder="http://localhost:4829"
          className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 transition-colors font-mono"
        />
        <p className="text-[10px] text-slate-500">Automatically writes audio and JSON files directly into your repository records/ folder.</p>
      </div>

      {/* Save Button */}
      <button
        onClick={handleSave}
        disabled={updateMutation.isPending}
        className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs rounded-xl shadow-lg shadow-emerald-950/40 transition-all flex items-center justify-center gap-2 mt-1"
      >
        {savedSuccess ? (
          <>
            <Check className="w-4 h-4 text-white" />
            <span>Settings Saved!</span>
          </>
        ) : (
          <span>Save Settings</span>
        )}
      </button>
    </div>
  );
};
