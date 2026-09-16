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
import { Cloud } from 'lucide-react'
import { useApiKey } from '../../../hooks/useApiKey'
import { useGeminiModels } from '../../../hooks/useGeminiModels'
import { useGoogleDrive } from '../../../hooks/useGoogleDrive'

export const SettingsView: React.FC = () => {
  const { apiKey, setApiKey, isConfigured } = useApiKey()
  const { models, isLoading: modelsLoading, query } = useGeminiModels()
  const { isConnected, isConnecting, isDisconnecting, connect, disconnect } = useGoogleDrive()
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
    <div className="flex-1 overflow-y-auto p-10 lg:p-12">
      <div className="max-w-6xl mx-auto">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-[13px] font-medium text-muted-foreground mb-8">
          <span className="text-foreground font-semibold">Integrations</span>
          <span>/</span>
          <span>Connections & models</span>
        </div>

        {/* Page Header */}
        <div className="mb-10">
          <div className="text-[10px] font-bold tracking-widest text-subtle uppercase mb-2">
            Workspace setup
          </div>
          <h1 className="text-[42px] font-bold text-foreground tracking-tight leading-none mb-3">
            Connect your tools.
          </h1>
          <p className="text-muted-foreground text-[15px]">
            Manage your API access, cloud backups, and transcription model.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column (API & Cloud) */}
          <div className="lg:col-span-7 space-y-6">
            {/* API Access */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-[17px] font-bold text-foreground">API access</h2>
                {isConfigured && (
                  <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-success/15 text-success">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span className="text-[11px] font-bold tracking-wide uppercase">Active</span>
                  </div>
                )}
              </div>

              <div className="bg-card border border-border rounded-2xl p-6 shadow-sm relative overflow-hidden">
                <div className="flex items-start gap-4 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center shrink-0">
                    <Key className="w-5 h-5 text-subtle" />
                  </div>
                  <div>
                    <h3 className="text-[15px] font-bold text-foreground">Personal API key</h3>
                    <p className="text-[13px] text-muted-foreground mt-0.5">
                      Used securely for meeting transcripts and action items.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="relative flex-1">
                    <input
                      type={showKey ? 'text' : 'password'}
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      placeholder="AIzaSy... (paste your Gemini API key)"
                      className="w-full h-11 bg-background border border-border rounded-xl px-4 pr-10 text-[14px] text-foreground font-mono focus:border-foreground focus:outline-none focus:ring-1 focus:ring-foreground transition-all placeholder:text-subtle"
                    />
                    <button
                      type="button"
                      onClick={() => setShowKey(!showKey)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-subtle hover:text-foreground transition-colors"
                    >
                      {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <button
                    onClick={handleSave}
                    disabled={!isDirty || !inputValue.trim() || isSaving}
                    className="h-11 px-6 bg-foreground hover:opacity-90 disabled:opacity-50 text-background rounded-xl text-[14px] font-semibold transition-all disabled:shadow-none flex items-center justify-center shrink-0"
                  >
                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save key'}
                  </button>
                  {isConfigured && (
                    <button
                      onClick={handleClear}
                      className="h-11 px-6 bg-card hover:bg-secondary border border-border text-foreground rounded-xl text-[14px] font-semibold transition-all shrink-0"
                    >
                      Remove
                    </button>
                  )}
                </div>

                {hasError && (
                  <div className="mt-4 flex items-center gap-2 text-red-600 text-[13px] font-medium bg-red-50 p-3 rounded-lg border border-red-100">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{query.error?.message || 'Invalid API key.'}</span>
                  </div>
                )}

                <a
                  href="https://aistudio.google.com/apikey"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 mt-5 text-[12px] text-muted-foreground hover:text-foreground font-medium transition-colors"
                >
                  Get an API key from Google AI Studio <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>

            {/* Cloud Backup */}
            <div>
              <h2 className="text-[17px] font-bold text-foreground mb-4">Cloud backup</h2>
              <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-secondary`}
                    >
                      <Cloud className={`w-5 h-5 text-subtle`} />
                    </div>
                    <div>
                      <h3 className="text-[15px] font-bold text-foreground">Google Drive</h3>
                      <p className="text-[13px] text-muted-foreground mt-0.5">
                        Meeting recordings are backed up automatically.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    {isConnected && (
                      <div className="flex items-center gap-1.5 text-success">
                        <CheckCircle2 className="w-4 h-4" />
                        <span className="text-[12px] font-medium">Connected</span>
                      </div>
                    )}
                    <button
                      onClick={isConnected ? disconnect : connect}
                      disabled={isConnecting || isDisconnecting}
                      className="h-10 px-5 bg-card hover:bg-secondary border border-border text-foreground rounded-xl text-[13px] font-semibold transition-all flex items-center justify-center shrink-0"
                    >
                      {isConnecting || isDisconnecting ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : isConnected ? (
                        'Disconnect'
                      ) : (
                        'Connect'
                      )}
                    </button>
                  </div>
                </div>

                {/* Storage Bar Fake */}
                <div className="mt-8">
                  <div className="flex justify-between text-[11px] font-medium text-muted-foreground mb-2">
                    <span>3.8 GB of 15 GB used</span>
                    <span>Last synced 2 min ago</span>
                  </div>
                  <div className="w-full h-1.5 bg-secondary rounded-full overflow-hidden">
                    <div className="h-full bg-primary w-[25%]" />
                  </div>
                </div>
              </div>
            </div>

            {/* Local Storage */}
            <div className="bg-secondary border border-border rounded-2xl p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-card border border-border flex items-center justify-center shrink-0">
                    <div className="w-5 h-4 bg-border rounded-sm relative">
                      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-1 bg-card rounded-full" />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-[15px] font-bold text-foreground">Local recordings</h3>
                    <p className="text-[13px] text-muted-foreground mt-0.5">
                      Files stay on this Mac until cloud backup completes.
                    </p>
                  </div>
                </div>
                <div className="text-[13px] font-medium text-muted-foreground">12.4 GB</div>
              </div>
            </div>
          </div>

          {/* Right Column (Models) */}
          <div className="lg:col-span-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[17px] font-bold text-foreground">Transcription model</h2>
              <div className="flex items-center gap-1.5 text-[12px] font-medium text-muted-foreground">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Google AI</span>
              </div>
            </div>

            <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
              {!isConfigured ? (
                <div className="p-10 text-center">
                  <Sparkles className="w-8 h-8 text-border mx-auto mb-4" />
                  <p className="text-[14px] text-subtle font-medium">
                    Add your API key to see available transcription models.
                  </p>
                </div>
              ) : modelsLoading ? (
                <div className="p-10 flex justify-center">
                  <Loader2 className="w-6 h-6 animate-spin text-foreground" />
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {models.map((model, index) => (
                    <div
                      key={model.name}
                      className={`p-4 flex items-center justify-between cursor-pointer transition-colors ${index === 0 ? 'bg-background' : 'hover:bg-secondary'}`}
                    >
                      <div className="flex items-center gap-4">
                        <div
                          className={`w-4 h-4 rounded-full border-[1.5px] flex items-center justify-center shrink-0 ${index === 0 ? 'border-primary' : 'border-subtle'}`}
                        >
                          {index === 0 && <div className="w-2 h-2 rounded-full bg-primary" />}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-[14px] font-bold ${index === 0 ? 'text-foreground' : 'text-muted-foreground'}`}
                            >
                              {model.displayName}
                            </span>
                            {index === 0 && (
                              <span className="text-[9px] font-bold tracking-widest uppercase bg-secondary text-primary px-2 py-0.5 rounded border border-border">
                                Recommended
                              </span>
                            )}
                          </div>
                          <div className="text-[12px] text-subtle mt-0.5">
                            {index === 0
                              ? 'Fast, balanced transcription'
                              : index === 1
                                ? 'Reliable everyday performance'
                                : 'Lightweight and efficient'}
                          </div>
                        </div>
                      </div>

                      {model.inputTokenLimit > 0 && (
                        <div className="text-right">
                          <div className="text-[9px] font-bold tracking-widest text-subtle uppercase mb-0.5">
                            Input
                          </div>
                          <div
                            className={`text-[13px] font-medium ${index === 0 ? 'text-foreground' : 'text-subtle'}`}
                          >
                            {formatTokenLimit(model.inputTokenLimit)}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}

                  <div className="p-4 bg-secondary flex items-center justify-between text-[12px] text-muted-foreground font-medium">
                    <span>{models.length} available models</span>
                    <button className="flex items-center gap-1.5 hover:text-foreground transition-colors">
                      <Loader2 className="w-3.5 h-3.5" />
                      Refresh list
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
