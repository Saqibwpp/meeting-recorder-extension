import React, { useState, useEffect } from 'react'
import { Square, Play, Sparkles, Mic2, ExternalLink, Power, Video, AlertTriangle } from 'lucide-react'
import { useAuth } from '../../auth/hooks/useAuth'
import { useGeminiModels } from '../../../hooks/useGeminiModels'
import { useApiKey } from '../../../hooks/useApiKey'

export const TrayView: React.FC = () => {
  const { user } = useAuth()
  const { isConfigured: isApiKeyConfigured } = useApiKey()
  const {
    models,
    selectedModel,
    setSelectedModel,
    selectedModelInfo,
    isLoading: modelsLoading
  } = useGeminiModels()

  const [title, setTitle] = useState('')
  const [isRecording, setIsRecording] = useState(false)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [meetingDetected, setMeetingDetected] = useState(false)

  // Listen for recording state changes broadcast from Main process
  useEffect(() => {
    const unsubState = window.api?.onRecordingStateChanged?.((state) => {
      setIsRecording(state.isRecording)
      setElapsedSeconds(state.elapsedSeconds)
      if (state.title) setTitle(state.title)
      if (state.isRecording) {
        setMeetingDetected(false)
      }
    })

    const unsubDetected = window.api?.onMeetingDetected?.(() => {
      if (!isRecording) {
        setMeetingDetected(true)
      }
    })

    return () => {
      unsubState?.()
      unsubDetected?.()
    }
  }, [isRecording])

  const formatTimer = (totalSec: number): string => {
    const mins = Math.floor(totalSec / 60)
    const secs = totalSec % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const handleStart = (): void => {
    setMeetingDetected(false)
    window.api?.startRecordingFromTray(title || 'Quick Meeting', selectedModel)
  }

  const handleStop = (): void => {
    window.api?.stopRecordingFromTray()
  }

  const handleOpenStudio = (route = '/record'): void => {
    window.api?.openMainWindow(route)
  }

  return (
    <div className="flex flex-col h-screen w-full bg-card text-foreground select-none overflow-hidden font-body border border-border/80 shadow-2xl rounded-2xl">
      {/* Top Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-sidebar/70">
        <div className="flex items-center gap-2">
          <div className="grid w-6 h-6 place-items-center rounded-md bg-foreground text-background shrink-0">
            <span className="rec-dot w-2 h-2 rounded-full bg-primary" />
          </div>
          <div>
            <span className="font-display text-[13px] font-bold text-foreground">Embrace</span>
            <span className="ml-1 text-[10px] uppercase font-semibold text-subtle tracking-wider">
              Studio
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => handleOpenStudio('/library')}
          className="text-[12px] font-medium text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
        >
          <span>Library</span>
          <ExternalLink className="w-3 h-3" />
        </button>
      </div>

      {/* Auto-Meeting Detected Banner */}
      {meetingDetected && !isRecording && (
        <div className="bg-primary/15 border-b border-primary/20 px-3.5 py-2 flex items-center justify-between animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-2 h-2 rounded-full bg-primary animate-ping shrink-0" />
            <span className="text-[11px] font-semibold text-foreground truncate">
              Meeting active on Mac
            </span>
          </div>
          <button
            type="button"
            onClick={handleStart}
            className="px-2.5 py-1 bg-foreground text-background hover:opacity-90 rounded-md text-[11px] font-bold shrink-0 transition-opacity"
          >
            Record
          </button>
        </div>
      )}

      {/* Missing Gemini API Key Warning Banner */}
      {!isApiKeyConfigured && !isRecording && (
        <div className="bg-amber-500/10 border-b border-amber-500/25 px-3 py-2 flex items-center justify-between gap-2 animate-in fade-in slide-in-from-top-2 duration-200 text-left">
          <div className="flex items-start gap-1.5 min-w-0">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
            <div className="text-[11px] leading-tight text-foreground/90">
              <span className="font-semibold text-amber-600 dark:text-amber-400">Gemini Key Missing:</span>{' '}
              <span className="text-muted-foreground text-[10px]">AI notes will be skipped</span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => handleOpenStudio('/settings')}
            className="px-2 py-0.5 bg-amber-500 hover:bg-amber-600 text-white rounded text-[10px] font-bold shrink-0 transition-colors shadow-xs"
          >
            Add Key
          </button>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 p-5 flex flex-col items-center justify-center text-center">
        {!user ? (
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-secondary grid place-items-center text-subtle">
              <Video className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[13px] font-semibold text-foreground">Sign in to Record</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Sign in to sync transcripts and cloud backups.
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleOpenStudio('/')}
              className="mt-2 action-button text-[12px]"
            >
              Open Sign In
            </button>
          </div>
        ) : isRecording ? (
          /* Active Recording State */
          <div className="w-full flex flex-col items-center justify-center gap-5">
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/10 text-red-500 text-[11px] font-bold uppercase tracking-wider">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              Recording active
            </div>

            <div className="text-[36px] font-bold font-display tracking-tight text-foreground">
              {formatTimer(elapsedSeconds)}
            </div>

            <p className="text-[12px] text-muted-foreground truncate max-w-[240px] px-2 text-center">
              {title || 'Meeting Recording'}
            </p>

            <button
              type="button"
              onClick={handleStop}
              className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center shadow-lg transition-transform hover:scale-105 active:scale-95"
            >
              <Square className="w-6 h-6 fill-current" />
            </button>
            <span className="text-[11px] font-medium text-subtle">Click to stop and save</span>
          </div>
        ) : (
          /* Idle Ready State */
          <div className="w-full flex flex-col items-center justify-center gap-5">
            <div className="w-full max-w-[260px]">
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Meeting Title..."
                className="w-full h-9 bg-background/80 border border-border rounded-xl px-3 text-[12px] text-foreground placeholder:text-subtle text-center focus:outline-none focus:ring-1 focus:ring-foreground transition-all shadow-xs"
              />
            </div>

            <button
              type="button"
              onClick={handleStart}
              className="w-18 h-18 rounded-full bg-foreground hover:opacity-90 text-background flex items-center justify-center shadow-lg transition-transform hover:scale-105 active:scale-95 group"
            >
              <div className="w-14 h-14 rounded-full border border-background/25 flex items-center justify-center">
                <Play className="w-6 h-6 fill-current ml-0.5" />
              </div>
            </button>

            <div className="flex flex-col items-center gap-2">
              <p className="text-[13px] font-semibold text-foreground tracking-tight">
                Start Recording
              </p>
              {models.length > 0 ? (
                <div className="flex items-center justify-center gap-1.5 px-3 py-1 rounded-full border border-border bg-secondary/80 hover:bg-secondary text-foreground text-[11px] font-medium transition-colors shadow-xs max-w-[240px]">
                  <Sparkles className="w-3.5 h-3.5 text-primary shrink-0" />
                  <select
                    value={selectedModel}
                    onChange={(e) => setSelectedModel(e.target.value)}
                    disabled={modelsLoading}
                    className="bg-transparent border-0 text-foreground text-[11px] font-medium outline-none cursor-pointer truncate max-w-[190px]"
                  >
                    {models.map((m) => (
                      <option key={m.name} value={m.name} className="bg-card text-foreground">
                        {m.displayName}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-1.5 px-3 py-1 rounded-full border border-border bg-secondary/60 text-subtle text-[11px] font-medium shadow-xs">
                  <Sparkles className="w-3.5 h-3.5 text-primary shrink-0" />
                  <span>
                    {selectedModelInfo?.displayName ||
                      selectedModel ||
                      (modelsLoading ? 'Loading models...' : 'Gemini AI')}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Footer Info & Actions */}
      <div className="px-4 py-2.5 border-t border-border bg-sidebar/50 flex items-center justify-between text-[11px] text-muted-foreground">
        <div className="flex items-center gap-1.5 truncate max-w-[170px]" title={user?.email || ''}>
          <Mic2 className="w-3 h-3 text-subtle shrink-0" />
          <span className="truncate">{user?.email || 'Guest'}</span>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => handleOpenStudio('/settings')}
            className="hover:text-foreground transition-colors font-medium"
          >
            Settings
          </button>
          <button
            type="button"
            onClick={() => window.electron.ipcRenderer.send('quit-app')}
            className="hover:text-red-500 transition-colors flex items-center gap-1 font-medium"
            title="Quit Embrace"
          >
            <Power className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  )
}
