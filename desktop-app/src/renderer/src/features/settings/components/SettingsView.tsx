import React, { useState } from 'react'
import {
  Key,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ExternalLink,
  Loader2
} from 'lucide-react'
import { useApiKey } from '../../../hooks/useApiKey'
import { useGeminiModels } from '../../../hooks/useGeminiModels'
import { Card } from '../../../components/ui/Card'
import { Button } from '../../../components/ui/Button'

export const SettingsView: React.FC = () => {
  const { apiKey, setApiKey, isConfigured } = useApiKey()
  const { models, isLoading: modelsLoading, query } = useGeminiModels()
  const [inputValue, setInputValue] = useState(apiKey)
  const [showKey, setShowKey] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const handleSave = (): void => {
    setIsSaving(true)
    setApiKey(inputValue)
    // Small delay for visual feedback
    setTimeout(() => setIsSaving(false), 600)
  }

  const handleClear = (): void => {
    setInputValue('')
    setApiKey('')
  }

  const hasError = query.isError
  const isDirty = inputValue.trim() !== apiKey

  function formatTokenLimit(limit: number): string {
    if (limit >= 1_000_000) return `${(limit / 1_000_000).toFixed(1)}M`
    if (limit >= 1_000) return `${Math.round(limit / 1_000)}K`
    return String(limit)
  }

  return (
    <div className="flex-1 overflow-y-auto p-8">
      <div className="max-w-2xl mx-auto space-y-8">
        {/* Page Header */}
        <div>
          <h1 className="text-2xl font-semibold text-[#1a1a1a] tracking-tight">Settings</h1>
          <p className="text-[#737373] mt-1 text-sm">
            Configure your Gemini API key and transcription preferences
          </p>
        </div>

        {/* API Key Section */}
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-5">
            <div
              className={`w-10 h-10 rounded-lg flex items-center justify-center border ${
                isConfigured
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-600'
                  : 'bg-amber-50 border-amber-200 text-amber-600'
              }`}
            >
              <Key className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-[#1a1a1a]">Gemini API Key</h2>
              <p className="text-xs text-[#737373]">
                Your key is stored locally and never sent to our servers
              </p>
            </div>
            {isConfigured && (
              <div className="ml-auto flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-700 font-semibold">
                  Active
                </span>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="space-y-3">
            <div className="relative">
              <input
                type={showKey ? 'text' : 'password'}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="AIzaSy... (paste your Gemini API key)"
                className="w-full rounded-lg border border-[#e2e0d8] bg-white px-3.5 py-2.5 pr-10 text-sm text-[#1a1a1a] font-mono transition-all focus:border-[#2d2d2d] focus:outline-none focus:ring-1 focus:ring-[#2d2d2d] placeholder:text-[#c0c0c0]"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#a0a0a0] hover:text-[#737373] transition-colors"
              >
                {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {hasError && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>
                  {query.error?.message ||
                    'Could not validate API key. Check the key and try again.'}
                </span>
              </div>
            )}

            <div className="flex items-center gap-2">
              <Button
                variant="primary"
                size="sm"
                onClick={handleSave}
                disabled={!isDirty || !inputValue.trim() || isSaving}
                className="flex items-center gap-1.5"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Key'
                )}
              </Button>

              {isConfigured && (
                <Button variant="secondary" size="sm" onClick={handleClear}>
                  Remove Key
                </Button>
              )}

              <a
                href="https://aistudio.google.com/apikey"
                target="_blank"
                rel="noopener noreferrer"
                className="ml-auto flex items-center gap-1 text-xs text-[#737373] hover:text-[#1a1a1a] transition-colors"
              >
                Get a free API key
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </Card>

        {/* Available Models Section */}
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-[#f4f3f0] border border-[#e2e0d8] text-[#1a1a1a]">
              <Sparkles className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-[#1a1a1a]">Available Models</h2>
              <p className="text-xs text-[#737373]">
                {isConfigured
                  ? 'Models available with your API key for audio transcription'
                  : 'Add your API key above to see available models'}
              </p>
            </div>
            {modelsLoading && <Loader2 className="w-4 h-4 animate-spin text-[#737373] ml-auto" />}
          </div>

          {isConfigured ? (
            <div className="space-y-2">
              {models.map((model, index) => (
                <div
                  key={model.name}
                  className="flex items-center justify-between px-4 py-3 rounded-lg border border-[#e2e0d8] bg-white hover:bg-[#faf9f6] transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-2 h-2 rounded-full ${
                        index === 0 ? 'bg-emerald-400' : 'bg-[#d0d0d0]'
                      }`}
                    />
                    <div>
                      <div className="text-sm font-medium text-[#1a1a1a]">
                        {model.displayName}
                        {index === 0 && (
                          <span className="ml-2 text-[10px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-600 border border-emerald-200">
                            Recommended
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-[#a0a0a0] font-mono mt-0.5">
                        {model.name}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-[11px] font-mono text-[#737373]">
                    {model.inputTokenLimit > 0 && (
                      <>
                        <div className="text-right">
                          <div className="text-[10px] text-[#a0a0a0] uppercase">Input</div>
                          <div>{formatTokenLimit(model.inputTokenLimit)}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-[10px] text-[#a0a0a0] uppercase">Output</div>
                          <div>{formatTokenLimit(model.outputTokenLimit)}</div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-sm text-[#a0a0a0]">
              No API key configured. Add your key above to see available models.
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
