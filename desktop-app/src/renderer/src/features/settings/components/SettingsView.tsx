import React, { useState } from 'react'
import {
  Key,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ExternalLink,
  Loader2,
  RefreshCw,
  Cloud,
  FolderOpen,
  Link2
} from 'lucide-react'
import { useApiKey } from '../../../hooks/useApiKey'
import { useGeminiModels } from '../../../hooks/useGeminiModels'
import { useGoogleDrive } from '../../../hooks/useGoogleDrive'
import { useLaunchAtLogin } from '../../../hooks/useLaunchAtLogin'

export const SettingsView: React.FC = () => {
  const { apiKey, setApiKey, isConfigured } = useApiKey()
  const {
    models,
    selectedModel,
    setSelectedModel,
    isLoading: modelsLoading,
    query,
    refetch
  } = useGeminiModels()
  const { isConnected, isConnecting, isDisconnecting, connect, disconnect } = useGoogleDrive()
  const { isLaunchAtLogin, toggleLaunchAtLogin, isUpdating: isUpdatingLaunch } = useLaunchAtLogin()
  const [inputValue, setInputValue] = useState(apiKey)
  const [showKey, setShowKey] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isLinkSharing, setIsLinkSharing] = useState<boolean>(() => {
    return localStorage.getItem('drive_link_sharing') !== 'false'
  })

  const handleToggleLinkSharing = (enabled: boolean): void => {
    setIsLinkSharing(enabled)
    localStorage.setItem('drive_link_sharing', enabled ? 'true' : 'false')
  }

  const handleSave = (): void => {
    setIsSaving(true)
    setApiKey(inputValue)
    setTimeout(() => setIsSaving(false), 600)
  }

  const handleClear = (): void => {
    setInputValue('')
    setApiKey('')
  }

  const handleRefreshModels = async (): Promise<void> => {
    setIsRefreshing(true)
    try {
      await refetch()
    } finally {
      setTimeout(() => setIsRefreshing(false), 500)
    }
  }

  const hasError = query.isError
  const isDirty = inputValue.trim() !== apiKey

  function formatTokenLimit(limit: number): string {
    if (limit >= 1_000_000) return `${(limit / 1_000_000).toFixed(1)}M`
    if (limit >= 1_000) return `${Math.round(limit / 1_000)}K`
    return String(limit)
  }

  return (
    <div className="flex-1 overflow-y-auto p-8 lg:p-10">
      <div className="max-w-6xl mx-auto">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-[13px] font-medium text-muted-foreground mb-6">
          <span className="text-foreground font-semibold">Integrations</span>
          <span>/</span>
          <span>Connections & models</span>
        </div>

        {/* Page Header */}
        <div className="mb-8">
          <div className="text-[10px] font-bold tracking-widest text-subtle uppercase mb-1.5">
            Workspace setup
          </div>
          <h1 className="text-[28px] font-bold text-foreground tracking-tight leading-none mb-2">
            Connect your tools.
          </h1>
          <p className="text-muted-foreground text-[14px]">
            Manage your API access, cloud backups, and transcription model.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column (API & Cloud) */}
          <div className="lg:col-span-7 space-y-6">
            {/* API Access */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-[15px] font-bold text-foreground">API access</h2>
                {isConfigured && (
                  <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-success/15 text-success">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span className="text-[11px] font-bold tracking-wide uppercase">Active</span>
                  </div>
                )}
              </div>

              <div className="bg-card border border-border rounded-xl p-5 shadow-sm relative overflow-hidden">
                <div className="flex items-start gap-3.5 mb-5">
                  <div className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                    <Key className="w-4 h-4 text-subtle" />
                  </div>
                  <div>
                    <h3 className="text-[14px] font-bold text-foreground">Personal API key</h3>
                    <p className="text-[12px] text-muted-foreground mt-0.5">
                      Used securely for meeting transcripts and AI action items.
                    </p>
                  </div>
                </div>

                <div className="flex gap-2.5">
                  <div className="relative flex-1">
                    <input
                      type={showKey ? 'text' : 'password'}
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      placeholder="AIzaSy... (paste your Gemini API key)"
                      className="w-full h-10 bg-background border border-border rounded-lg px-3.5 pr-10 text-[13px] text-foreground font-mono focus:border-foreground focus:outline-none focus:ring-1 focus:ring-foreground transition-all placeholder:text-subtle"
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
                    type="button"
                    onClick={handleSave}
                    disabled={!isDirty || !inputValue.trim() || isSaving}
                    className="h-10 px-5 bg-foreground hover:opacity-90 disabled:opacity-50 text-background rounded-lg text-[13px] font-semibold transition-all disabled:shadow-none flex items-center justify-center shrink-0"
                  >
                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save key'}
                  </button>
                  {isConfigured && (
                    <button
                      type="button"
                      onClick={handleClear}
                      className="h-10 px-4 bg-card hover:bg-secondary border border-border text-foreground rounded-lg text-[13px] font-semibold transition-all shrink-0"
                    >
                      Remove
                    </button>
                  )}
                </div>

                {hasError && (
                  <div className="mt-3 flex items-center gap-2 text-red-600 text-[12px] font-medium bg-red-50 p-2.5 rounded-lg border border-red-100">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{query.error?.message || 'Invalid API key.'}</span>
                  </div>
                )}

                <a
                  href="https://aistudio.google.com/apikey"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 mt-4 text-[12px] text-muted-foreground hover:text-foreground font-medium transition-colors"
                >
                  Get an API key from Google AI Studio <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>

            {/* Cloud Backup */}
            <div>
              <h2 className="text-[15px] font-bold text-foreground mb-3">Cloud backup</h2>
              <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3.5">
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 bg-secondary">
                      <Cloud className="w-4 h-4 text-subtle" />
                    </div>
                    <div>
                      <h3 className="text-[14px] font-bold text-foreground">Google Drive</h3>
                      <p className="text-[12px] text-muted-foreground mt-0.5">
                        {isConnected
                          ? 'Automatic cloud backups enabled for completed recordings.'
                          : 'Connect Google Drive to sync recordings automatically.'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {isConnected && (
                      <div className="flex items-center gap-1.5 text-success">
                        <CheckCircle2 className="w-4 h-4" />
                        <span className="text-[12px] font-medium">Connected</span>
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={isConnected ? disconnect : connect}
                      disabled={isConnecting || isDisconnecting}
                      className="h-9 px-4 bg-card hover:bg-secondary border border-border text-foreground rounded-lg text-[13px] font-semibold transition-all flex items-center justify-center shrink-0"
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

                {/* Link Sharing Toggle (Unlisted) */}
                <div className="pt-3 border-t border-border flex items-center justify-between">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center shrink-0 mt-0.5">
                      <Link2 className="w-3.5 h-3.5 text-subtle" />
                    </div>
                    <div>
                      <h4 className="text-[13px] font-semibold text-foreground">
                        Link-accessible cloud playback
                      </h4>
                      <p className="text-[11px] text-muted-foreground mt-0.5 max-w-[340px]">
                        Sets uploaded Drive recordings as unlisted (viewable via link) for seamless
                        in-app preview and easy team sharing.
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleToggleLinkSharing(!isLinkSharing)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none shrink-0 ${
                      isLinkSharing ? 'bg-foreground' : 'bg-secondary border border-border'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-background transition-transform ${
                        isLinkSharing ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>

            {/* Local Storage */}
            <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3.5">
                  <div className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                    <FolderOpen className="w-4 h-4 text-subtle" />
                  </div>
                  <div>
                    <h3 className="text-[14px] font-bold text-foreground">Local storage</h3>
                    <p className="text-[12px] text-muted-foreground mt-0.5">
                      Recordings are saved to your local Mac directory and persisted across
                      sessions.
                    </p>
                  </div>
                </div>
                <div className="text-[12px] font-medium text-subtle">Local Disk</div>
              </div>
            </div>

            {/* Application Startup */}
            <div>
              <h2 className="text-[15px] font-bold text-foreground mb-3">Background & startup</h2>
              <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-[14px] font-bold text-foreground">Launch on Mac startup</h3>
                    <p className="text-[12px] text-muted-foreground mt-0.5 max-w-[340px]">
                      Runs Embrace in the background Menu Bar so meetings on Zoom, Meet, and Teams
                      are auto-detected.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => toggleLaunchAtLogin(!isLaunchAtLogin)}
                    disabled={isUpdatingLaunch}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                      isLaunchAtLogin ? 'bg-foreground' : 'bg-secondary border border-border'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-background transition-transform ${
                        isLaunchAtLogin ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column (Models) */}
          <div className="lg:col-span-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-[15px] font-bold text-foreground">Transcription model</h2>
              <div className="flex items-center gap-1.5 text-[12px] font-medium text-muted-foreground">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Google AI</span>
              </div>
            </div>

            <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
              {!isConfigured ? (
                <div className="p-8 text-center">
                  <Sparkles className="w-7 h-7 text-border mx-auto mb-3" />
                  <p className="text-[13px] text-subtle font-medium">
                    Add your Gemini API key to see available transcription models.
                  </p>
                </div>
              ) : modelsLoading ? (
                <div className="p-8 flex justify-center">
                  <Loader2 className="w-6 h-6 animate-spin text-foreground" />
                </div>
              ) : (
                <div className="divide-y divide-border">
                  <div className="max-h-[380px] overflow-y-auto divide-y divide-border no-scrollbar">
                    {models.map((model, index) => {
                      const isSelected = selectedModel === model.name

                      return (
                        <div
                          key={model.name}
                          onClick={() => setSelectedModel(model.name)}
                          className={`p-3.5 flex items-center justify-between cursor-pointer transition-colors ${
                            isSelected ? 'bg-primary/10 font-medium' : 'hover:bg-secondary/60'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-4 h-4 rounded-full border-[1.5px] flex items-center justify-center shrink-0 ${
                                isSelected ? 'border-primary' : 'border-subtle'
                              }`}
                            >
                              {isSelected && <div className="w-2 h-2 rounded-full bg-primary" />}
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span
                                  className={`text-[13px] font-semibold ${
                                    isSelected ? 'text-foreground' : 'text-foreground/80'
                                  }`}
                                >
                                  {model.displayName}
                                </span>
                                {index === 0 && (
                                  <span className="text-[9px] font-bold tracking-wider uppercase bg-secondary text-primary px-1.5 py-0.5 rounded border border-border">
                                    Recommended
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-subtle mt-0.5">
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
                              <div className="text-[9px] font-bold tracking-widest text-subtle uppercase">
                                Input
                              </div>
                              <div
                                className={`text-[12px] font-medium ${
                                  isSelected ? 'text-foreground' : 'text-subtle'
                                }`}
                              >
                                {formatTokenLimit(model.inputTokenLimit)}
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>

                  <div className="p-3 bg-secondary/70 flex items-center justify-between text-[12px] text-muted-foreground font-medium">
                    <span>{models.length} available models</span>
                    <button
                      type="button"
                      onClick={handleRefreshModels}
                      disabled={isRefreshing}
                      className="flex items-center gap-1.5 text-foreground hover:text-primary transition-colors disabled:opacity-50"
                    >
                      <RefreshCw
                        className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-primary' : ''}`}
                      />
                      <span>{isRefreshing ? 'Refreshing...' : 'Refresh list'}</span>
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
