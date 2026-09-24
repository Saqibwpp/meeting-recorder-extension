import React, { useState, useEffect } from 'react';
import { Eye, EyeOff, HelpCircle, Loader2, Sparkles, AlertCircle } from 'lucide-react';
import { useSettingsQuery, useUpdateSettingsMutation } from '../../hooks/useSettings';
import { useGeminiModelsQuery } from '../../hooks/useGeminiModels';
import { DEFAULT_PRIMARY_MODEL } from '../../services/gemini';

const FALLBACK_DEFAULT_MODELS = [
  { id: 'gemini-2.5-flash', displayName: 'Gemini 2.5 Flash (Recommended)' },
  { id: 'gemini-2.0-flash', displayName: 'Gemini 2.0 Flash' },
  { id: 'gemini-1.5-flash', displayName: 'Gemini 1.5 Flash' },
  { id: 'gemini-2.5-pro', displayName: 'Gemini 2.5 Pro' },
  { id: 'gemini-1.5-pro', displayName: 'Gemini 1.5 Pro' }
];

export const SettingsView: React.FC = () => {
  const { data: settings } = useSettingsQuery();
  const updateMutation = useUpdateSettingsMutation();

  const [apiKey, setApiKey] = useState('');
  const [primaryModel, setPrimaryModel] = useState(DEFAULT_PRIMARY_MODEL);
  const [autoDetect, setAutoDetect] = useState(true);
  const [showKey, setShowKey] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Fetch available models dynamically for the user's API key
  const effectiveApiKey = apiKey.trim() || settings?.geminiApiKey || '';
  const {
    data: geminiModels,
    isLoading: isModelsLoading,
    isError: isModelsError,
    error: modelsError
  } = useGeminiModelsQuery(effectiveApiKey);

  useEffect(() => {
    if (settings) {
      setApiKey(settings.geminiApiKey || '');
      setPrimaryModel(settings.primaryModel || DEFAULT_PRIMARY_MODEL);
      setAutoDetect(settings.autoDetectMeetings ?? true);
    }
  }, [settings]);

  // If fetched models arrive and current model is invalid or default, ensure valid selection
  useEffect(() => {
    if (geminiModels && geminiModels.length > 0) {
      const exists = geminiModels.some((m) => m.id === primaryModel);
      if (!exists) {
        const preferred = geminiModels.find((m) => m.id === DEFAULT_PRIMARY_MODEL) ||
          geminiModels.find((m) => m.id.includes('flash')) ||
          geminiModels[0];
        if (preferred) {
          setPrimaryModel(preferred.id);
        }
      }
    }
  }, [geminiModels, primaryModel]);

  const handleSave = () => {
    updateMutation.mutate(
      {
        geminiApiKey: apiKey.trim(),
        primaryModel,
        autoDetectMeetings: autoDetect
      },
      {
        onSuccess: () => {
          setSavedSuccess(true);
          setTimeout(() => setSavedSuccess(false), 2000);
        }
      }
    );
  };

  const availableModels = geminiModels && geminiModels.length > 0
    ? geminiModels
    : FALLBACK_DEFAULT_MODELS;

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
            placeholder="AIzaSy..."
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
        <div className="flex items-center justify-between">
          <label className="font-semibold text-[#1a1a1a] flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-[#5b695e]" />
            Primary AI Model
          </label>
          {isModelsLoading && (
            <span className="flex items-center gap-1 text-[10px] text-[#888]">
              <Loader2 className="w-3 h-3 animate-spin" />
              Loading models...
            </span>
          )}
          {geminiModels && geminiModels.length > 0 && !isModelsLoading && (
            <span className="text-[10px] text-[#5b695e] font-medium">
              {geminiModels.length} text models available
            </span>
          )}
        </div>

        <select
          value={primaryModel}
          onChange={(e) => setPrimaryModel(e.target.value)}
          disabled={isModelsLoading}
          className="w-full bg-white border border-[#e5e3d9] rounded px-3 py-2 text-[13px] text-[#1a1a1a] focus:outline-none focus:border-[#2d2d2d] transition-colors disabled:opacity-50"
        >
          {availableModels.map((model) => (
            <option key={model.id} value={model.id}>
              {model.displayName} ({model.id})
            </option>
          ))}
        </select>

        {isModelsError && (
          <div className="flex items-center gap-1 text-[11px] text-[#da7756] bg-[#fcf5f3] px-2.5 py-1.5 rounded border border-[#f5dfd7]">
            <AlertCircle className="w-3 h-3 flex-shrink-0" />
            <span>Could not load models from API key: {modelsError?.message || 'Check key validity'}</span>
          </div>
        )}

        {/* Info notice */}
        <div className="text-[10px] text-[#888]">
          <strong className="font-semibold">Text-Output Models:</strong> Models fetched dynamically from your Gemini API key supporting meeting transcription and text generation.
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
