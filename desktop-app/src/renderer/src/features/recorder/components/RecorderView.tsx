import React, { useState } from 'react'
import {
  Play,
  Settings,
  Mic2,
  Monitor,
  Sparkles,
  ChevronDown,
  Check,
  Square,
  AlertTriangle
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { TopBar } from '../../../components/layout/TopBar'
import { ActionButton } from '../../../components/ui/ActionButton'
import { useRecorder } from '../hooks/useRecorder'
import { useAudioDevices } from '../hooks/useAudioDevices'
import { useGeminiModels } from '../../../hooks/useGeminiModels'
import { useApiKey } from '../../../hooks/useApiKey'
import { useMeetings } from '../../library/hooks/useMeetings'

export const RecorderView: React.FC = () => {
  const navigate = useNavigate()
  const [title, setTitle] = useState('')
  const { isRecording, startRecording, stopRecording } = useRecorder()
  const { isConfigured: isApiKeyConfigured } = useApiKey()
  const { audioDevices, selectedMicId, setSelectedMicId } = useAudioDevices()
  const { models, selectedModel, setSelectedModel } = useGeminiModels()
  const { data: meetings = [] } = useMeetings()

  // 48 waveform bars representing balanced audio levels across the full card width
  const baseBars = [
    18, 32, 48, 24, 60, 36, 44, 20, 40, 68, 28, 48, 22, 58, 34, 50, 26, 62, 38, 22, 70, 42, 30, 52,
    22, 38, 26, 56, 34, 46, 20, 54, 38, 64, 28, 44, 18, 50, 32, 60, 24, 42, 20, 56, 36, 48, 26, 34
  ]

  const recentRecordings = meetings.slice(0, 3)

  return (
    <div className="flex flex-col h-full bg-background text-foreground overflow-y-auto">
      <TopBar
        title="Record"
        context="New session"
        actions={
          <>
            <ActionButton muted icon={Settings} onClick={() => navigate('/settings')}>
              Setup
            </ActionButton>
            <ActionButton
              icon={isRecording ? Square : Play}
              onClick={() => {
                if (isRecording) {
                  stopRecording()
                } else {
                  startRecording(title, selectedMicId, selectedModel)
                }
              }}
            >
              {isRecording ? 'Stop recording' : 'Start recording'}
            </ActionButton>
          </>
        }
      />

      <div className="mx-auto w-full max-w-[1180px] px-8 py-8 flex-1">
        {/* Missing API Key Alert Banner */}
        {!isApiKeyConfigured && (
          <div className="mb-6 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 flex items-center justify-between gap-4 animate-in fade-in duration-200">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-600 dark:text-amber-400 grid place-items-center shrink-0 mt-0.5">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-[13px] font-semibold text-foreground">Gemini API Key Required for AI Transcripts</h4>
                <p className="text-[12px] text-muted-foreground mt-0.5">
                  Your meeting will still record and save audio/video locally, but automated transcription and AI summaries require a Google Gemini API key.
                </p>
              </div>
            </div>
            <ActionButton
              onClick={() => navigate('/settings')}
              className="shrink-0 text-[12px]"
            >
              Configure in Settings
            </ActionButton>
          </div>
        )}

        <div className="grid grid-cols-12 gap-6">
          <section className="col-span-7">
            <div className="mb-3 flex items-center gap-2.5">
              <span
                className={`w-2.5 h-2.5 rounded-full ${isRecording ? 'bg-red-500 animate-pulse' : 'bg-primary'}`}
              />
              <span
                className={`text-[11px] uppercase tracking-[0.18em] font-semibold ${isRecording ? 'text-red-500' : 'text-primary'
                  }`}
              >
                {isRecording ? 'Recording active' : 'Recorder ready'}
              </span>
              <span className="text-[12px] text-subtle">Screen and audio</span>
            </div>

            <h1 className="max-w-[20ch] text-balance font-display text-[28px] font-bold leading-tight text-foreground">
              Capture the meeting. Keep the momentum.
            </h1>
            <p className="mt-2.5 max-w-[48ch] text-[14px] leading-relaxed text-muted-foreground">
              Record your screen and microphone while Embrace prepares a searchable transcript,
              concise summary, and clear next steps.
            </p>

            <div className="mt-6 rounded-xl bg-foreground p-5 text-background shadow-inset">
              <div className="flex h-16 w-full items-end justify-between gap-[3px] overflow-hidden">
                {baseBars.map((heightPercent, index) => {
                  const barHeight = isRecording
                    ? `${Math.max(15, (heightPercent + (index % 5) * 8) % 100)}%`
                    : `${heightPercent}%`

                  return (
                    <span
                      key={index}
                      style={{ height: barHeight }}
                      className={`flex-1 min-w-[2px] max-w-[6px] rounded-full transition-all duration-300 ${isRecording
                          ? index % 2 === 0
                            ? 'bg-red-400'
                            : 'bg-red-500/60'
                          : index < 32
                            ? 'bg-primary/55'
                            : 'bg-background/20'
                        }`}
                    />
                  )
                })}
              </div>
              <div className="mt-4 flex items-center justify-between border-t border-background/10 pt-4 text-[11px] text-background/50">
                <span className="flex items-center gap-2">
                  <Mic2 className="w-3.5 h-3.5" />
                  {audioDevices.find((d) => d.deviceId === selectedMicId)?.label ||
                    'Default Microphone'}
                </span>
                <span>Mono · 48 kHz</span>
              </div>
            </div>
          </section>

          <section className="col-span-5 rounded-xl border border-border bg-secondary/60 p-5">
            <div className="flex items-center justify-between">
              <span className="eyebrow">Recording setup</span>
              <span className="status-success">
                <Check className="w-3 h-3" /> Ready
              </span>
            </div>

            <label className="field-label mt-5">Meeting title</label>
            <div className="field focus-within:ring-2 focus-within:ring-ring">
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Product Sync"
                className="w-full h-full bg-transparent outline-none text-[13px]"
                disabled={isRecording}
              />
            </div>

            <label className="field-label mt-4">Capture source</label>
            <div className="field relative">
              <span className="flex items-center gap-2 text-foreground truncate max-w-[200px]">
                <Monitor className="w-3.5 h-3.5 text-primary shrink-0" />
                {audioDevices.find((d) => d.deviceId === selectedMicId)?.label || 'Entire screen'}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-subtle shrink-0" />
              <select
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                value={selectedMicId}
                onChange={(e) => setSelectedMicId(e.target.value)}
                disabled={isRecording}
              >
                {audioDevices.map((d) => (
                  <option key={d.deviceId} value={d.deviceId}>
                    {d.label}
                  </option>
                ))}
              </select>
            </div>

            <label className="field-label mt-4">Transcription model</label>
            <div className="field relative">
              <span className="flex items-center gap-2 text-foreground truncate max-w-[200px]">
                <Sparkles className="w-3.5 h-3.5 text-primary shrink-0" />
                {models.find((m) => m.name === selectedModel)?.name ||
                  selectedModel ||
                  'Gemini 3.6 Flash'}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-subtle shrink-0" />
              <select
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                disabled={isRecording}
              >
                {models.map((m) => (
                  <option key={m.name} value={m.name}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={() => {
                if (isRecording) {
                  stopRecording()
                } else {
                  startRecording(title, selectedMicId, selectedModel)
                }
              }}
              className={`mt-6 flex w-full items-center justify-center gap-2 rounded-lg py-3 text-[13px] font-medium transition-colors ${isRecording
                  ? 'bg-red-500 text-white hover:bg-red-600'
                  : 'bg-foreground text-background hover:opacity-90'
                }`}
            >
              {isRecording ? (
                <>
                  <Square className="w-3.5 h-3.5 fill-current" /> Stop recording
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" /> Start recording
                </>
              )}
            </button>
          </section>
        </div>

        <section className="mt-10">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="section-title">Recent recordings</h2>
            <button
              type="button"
              onClick={() => navigate('/library')}
              className="text-[13px] text-muted-foreground hover:text-foreground transition-colors"
            >
              View library
            </button>
          </div>
          <div className="grid grid-cols-3 gap-4">
            {recentRecordings.map((item, idx) => {
              const tone = idx % 3 === 0 ? 'amber' : idx % 3 === 1 ? 'mint' : 'ink'

              const dateObj = new Date(item.date || item.createdAt || 0)
              const formattedDate =
                !isNaN(dateObj.getTime()) && dateObj.getTime() > 0
                  ? dateObj.toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit'
                  })
                  : 'Recent'

              const totalMins = Math.floor((item.durationSeconds || 0) / 60)
              const formattedDuration = totalMins > 0 ? `${totalMins} min` : '< 1 min'
              const peopleCount = new Set((item.segments || []).map((s) => s.speaker)).size || 1

              return (
                <article
                  key={item.id}
                  className="rounded-xl border border-border bg-card p-4 transition-colors hover:bg-secondary/45 cursor-pointer"
                  onClick={() => navigate(`/player/${item.id}`)}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-subtle">{formattedDate}</span>
                    <span
                      className={`w-2 h-2 rounded-full ${tone === 'amber' ? 'bg-primary' : tone === 'mint' ? 'bg-success' : 'bg-muted-foreground'}`}
                    />
                  </div>
                  <h3 className="mt-2 font-display text-[15px] font-medium text-foreground truncate">
                    {item.title || 'Untitled'}
                  </h3>
                  <p className="mt-1 text-[12px] text-muted-foreground">
                    {formattedDuration} · {peopleCount} speakers
                  </p>
                </article>
              )
            })}
            {recentRecordings.length === 0 && (
              <div className="col-span-3 text-center py-8 text-[13px] text-muted-foreground border border-dashed border-border rounded-xl">
                No recent recordings found.
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}
