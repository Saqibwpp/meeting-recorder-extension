import React, { useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Loader2,
  ArrowLeft,
  CalendarDays,
  Clock3,
  Check,
  Share2,
  Download,
  WandSparkles,
  AlertCircle,
  RefreshCw,
  AlertTriangle,
  Cloud,
  HardDrive,
  ExternalLink
} from 'lucide-react'
import { useMeeting } from '../hooks/useMeeting'
import { useRetryTranscription } from '../hooks/useRetryTranscription'
import { useUploadMeetingToDrive } from '../hooks/useUploadMeetingToDrive'
import { useGeminiModels } from '../../../hooks/useGeminiModels'
import { useApiKey } from '../../../hooks/useApiKey'
import { ModelSelect } from '../../../components/ui/ModelSelect'
import { TopBar } from '../../../components/layout/TopBar'
import { ActionButton } from '../../../components/ui/ActionButton'

const parseTimeToSeconds = (timeStr: string): number => {
  if (!timeStr) return 0
  const parts = timeStr.split(':')
  if (parts.length === 2) {
    const min = parseFloat(parts[0])
    const sec = parseFloat(parts[1])
    return min * 60 + sec
  }
  return 0
}

export const PlayerView: React.FC = () => {
  const { meetingId } = useParams<{ meetingId: string }>()
  const navigate = useNavigate()
  const videoRef = useRef<HTMLVideoElement>(null)

  const { data: meeting, isLoading: loading } = useMeeting(meetingId)
  const { models, selectedModel, setSelectedModel, isLoading: modelsLoading } = useGeminiModels()

  const hasLocal = Boolean(meeting?.videoPath)
  const hasCloud = Boolean(meeting?.driveFileId)

  const [videoSource, setVideoSource] = useState<'local' | 'cloud' | 'error'>('local')
  const [currentMeetingId, setCurrentMeetingId] = useState(meeting?.id)
  const [activeTab, setActiveTab] = useState<'transcript' | 'notes'>('transcript')
  const [copiedShare, setCopiedShare] = useState(false)
  const [copiedExport, setCopiedExport] = useState(false)

  const { retryTranscription, isRetrying } = useRetryTranscription()
  const { uploadMeetingToDrive, isUploading } = useUploadMeetingToDrive()
  const { isConfigured: hasApiKey } = useApiKey()

  if (meeting?.id !== currentMeetingId) {
    setCurrentMeetingId(meeting?.id)
    setVideoSource(hasLocal ? 'local' : hasCloud ? 'cloud' : 'error')
  }

  const handleRetryTranscription = (): void => {
    if (!meeting?.audioPath || !meeting?.id) return
    retryTranscription({
      meetingId: meeting.id,
      audioPath: meeting.audioPath,
      title: meeting.title,
      selectedModel
    })
  }

  if (loading) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-background">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    )
  }

  if (!meeting) {
    return (
      <div className="flex flex-col h-full items-center justify-center p-8 text-center bg-background">
        <h2 className="text-[20px] font-display font-semibold text-foreground">
          Meeting not found
        </h2>
        <p className="text-[14px] text-muted-foreground mt-2 mb-6">
          The requested meeting recording does not exist or has been removed.
        </p>
        <button onClick={() => navigate('/library')} className="action-button">
          Go back to Library
        </button>
      </div>
    )
  }

  const handleSeek = (timeStr: string): void => {
    if (videoRef.current) {
      const seconds = parseTimeToSeconds(timeStr)
      videoRef.current.currentTime = seconds
      videoRef.current.play().catch(() => {})
    }
  }

  const dateObj = new Date(meeting.date || meeting.createdAt || 0)
  const formattedDate =
    !isNaN(dateObj.getTime()) && dateObj.getTime() > 0
      ? dateObj.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
      : 'Recent'
  const formattedTime =
    !isNaN(dateObj.getTime()) && dateObj.getTime() > 0
      ? dateObj.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
      : ''

  const totalMins = Math.floor((meeting.durationSeconds || 0) / 60)
  let formattedDuration = '< 1 min'
  if (totalMins > 0) {
    if (totalMins >= 60) {
      const hrs = Math.floor(totalMins / 60)
      const mins = totalMins % 60
      formattedDuration = mins > 0 ? `${hrs} hr ${mins} min` : `${hrs} hr`
    } else {
      formattedDuration = `${totalMins} min`
    }
  }

  const wordCount =
    meeting.segments?.reduce((acc, seg) => acc + (seg.text.match(/\S+/g)?.length || 0), 0) || 0

  const handleShare = async (): Promise<void> => {
    try {
      if (meeting.videoUrl) {
        await navigator.clipboard.writeText(meeting.videoUrl)
      } else if (meeting.driveFileId) {
        await navigator.clipboard.writeText(
          `https://drive.google.com/file/d/${meeting.driveFileId}/view`
        )
      } else {
        const summaryText = meeting.summary ? `\n\nSummary:\n${meeting.summary}` : ''
        await navigator.clipboard.writeText(`${meeting.title || 'Meeting Recording'}${summaryText}`)
      }
      setCopiedShare(true)
      setTimeout(() => setCopiedShare(false), 2000)
    } catch (err) {
      console.error('Failed to copy share link:', err)
    }
  }

  const handleExport = async (): Promise<void> => {
    try {
      const lines: string[] = []
      lines.push(`# ${meeting.title || 'Meeting Notes'}`)
      lines.push(`Date: ${formattedDate}${formattedTime ? ` ${formattedTime}` : ''}`)
      lines.push(`Duration: ${formattedDuration}`)
      if (meeting.summary) {
        lines.push(`\n## Summary\n${meeting.summary}`)
      }
      if (meeting.actionItems && meeting.actionItems.length > 0) {
        lines.push('\n## Action Items')
        meeting.actionItems.forEach((item) => {
          lines.push(`- [ ] ${item}`)
        })
      }
      if (meeting.segments && meeting.segments.length > 0) {
        lines.push('\n## Transcript')
        meeting.segments.forEach((seg) => {
          lines.push(`[${seg.startTime || '00:00'}] ${seg.speaker || 'Speaker'}: ${seg.text}`)
        })
      }
      await navigator.clipboard.writeText(lines.join('\n'))
      setCopiedExport(true)
      setTimeout(() => setCopiedExport(false), 2000)
    } catch (err) {
      console.error('Failed to export notes:', err)
    }
  }

  return (
    <div className="flex flex-col h-full bg-background text-foreground overflow-hidden">
      <TopBar
        title={meeting.title || 'Untitled Meeting'}
        context={`${formattedDate}${formattedTime ? `, ${formattedTime}` : ''}`}
        actions={
          <>
            <ActionButton muted icon={copiedShare ? Check : Share2} onClick={handleShare}>
              {copiedShare ? 'Link Copied!' : 'Share'}
            </ActionButton>
            <ActionButton icon={copiedExport ? Check : Download} onClick={handleExport}>
              {copiedExport ? 'Notes Copied!' : 'Export'}
            </ActionButton>
          </>
        }
      />

      <div className="flex-1 grid grid-cols-[minmax(0,1.35fr)_minmax(360px,0.65fr)] min-h-0 overflow-hidden">
        {/* Left Column */}
        <div className="h-full overflow-y-auto border-r border-border flex flex-col">
          <div className="border-b border-border px-7 py-5">
            <button
              type="button"
              onClick={() => navigate('/library')}
              className="mb-4 flex items-center gap-1.5 text-[12px] text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to library
            </button>
            <div className="flex items-end justify-between">
              <div>
                <h1 className="font-display text-[28px] font-semibold text-foreground">
                  {meeting.title || 'Untitled Meeting'}
                </h1>
                <div className="mt-2 flex items-center gap-4 text-[11px] text-subtle">
                  <span className="flex items-center gap-1.5">
                    <CalendarDays className="w-3.5 h-3.5" /> {formattedDate}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Clock3 className="w-3.5 h-3.5" /> {formattedDuration}
                  </span>
                </div>
              </div>

              {meeting.status === 'processing' ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-600 text-[11px] font-medium">
                  <Loader2 className="w-3 h-3 animate-spin" /> Transcribing
                </span>
              ) : meeting.status === 'completed' || meeting.status === 'transcribed' ? (
                <span className="status-success">
                  <Check className="w-3 h-3" /> Complete
                </span>
              ) : null}
            </div>
          </div>

          <div className="p-7">
            {/* Playback Source Header & Tags */}
            <div className="mb-3 flex items-center justify-between">
              {/* Storage / Backup Tag */}
              <div className="flex items-center gap-2">
                {hasCloud ? (
                  <div className="flex items-center gap-1.5">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[11px] font-medium border border-emerald-500/20">
                      <Cloud className="w-3.5 h-3.5" /> Backed up to Drive
                    </span>
                    {meeting.driveFileId && (
                      <a
                        href={`https://drive.google.com/file/d/${meeting.driveFileId}/view`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors px-1.5 py-0.5 rounded hover:bg-secondary"
                        title="Open in Google Drive"
                      >
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                ) : hasLocal ? (
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-secondary text-muted-foreground text-[11px] font-medium border border-border">
                      <HardDrive className="w-3.5 h-3.5" /> Local storage only
                    </span>
                    {meeting.videoPath && (
                      <button
                        type="button"
                        onClick={() => {
                          if (meeting.id && meeting.videoPath) {
                            uploadMeetingToDrive({
                              meetingId: meeting.id,
                              videoPath: meeting.videoPath,
                              title: meeting.title || 'Meeting Recording'
                            })
                          }
                        }}
                        disabled={isUploading}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 text-primary hover:bg-primary/20 text-[11px] font-semibold transition-colors border border-primary/20 cursor-pointer disabled:opacity-50"
                        title="Upload this recording to Google Drive"
                      >
                        {isUploading ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" /> Backing up...
                          </>
                        ) : (
                          <>
                            <Cloud className="w-3.5 h-3.5" /> Back up to Drive
                          </>
                        )}
                      </button>
                    )}
                  </div>
                ) : null}
              </div>

              {/* Source Switcher Toggle */}
              {hasLocal && hasCloud ? (
                <div className="flex items-center bg-secondary/80 p-0.5 rounded-lg border border-border text-[11px] font-medium">
                  <button
                    type="button"
                    onClick={() => setVideoSource('local')}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition-all ${
                      videoSource === 'local'
                        ? 'bg-card text-foreground shadow-xs font-semibold'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <HardDrive className="w-3 h-3" />
                    <span>Local</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setVideoSource('cloud')}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition-all ${
                      videoSource === 'cloud'
                        ? 'bg-card text-foreground shadow-xs font-semibold'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <Cloud className="w-3 h-3" />
                    <span>Drive</span>
                  </button>
                </div>
              ) : hasLocal ? (
                <span className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground font-medium">
                  <HardDrive className="w-3.5 h-3.5 text-subtle" />
                  Playing from Local
                </span>
              ) : hasCloud ? (
                <span className="inline-flex items-center gap-1.5 text-[11px] text-emerald-600 font-medium">
                  <Cloud className="w-3.5 h-3.5" />
                  Playing from Drive
                </span>
              ) : null}
            </div>

            {/* Video Player */}
            <div className="relative aspect-video overflow-hidden rounded-xl bg-foreground shadow-inset">
              {videoSource === 'local' && meeting.videoPath ? (
                <>
                  <video
                    key={meeting.videoPath}
                    ref={videoRef}
                    src={`local://${meeting.videoPath}`}
                    className="w-full h-full object-contain bg-black/10"
                    controls
                    controlsList="nodownload"
                    onError={() => {
                      if (hasCloud) {
                        setVideoSource('cloud')
                      } else {
                        setVideoSource('error')
                      }
                    }}
                  />
                  {meeting.status === 'processing' && (
                    <div className="absolute top-3 right-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md text-amber-400 text-[10px] font-medium pointer-events-none">
                      <Loader2 className="w-3 h-3 animate-spin text-amber-400" />
                      <span>Transcribing in background...</span>
                    </div>
                  )}
                </>
              ) : videoSource === 'cloud' && meeting.driveFileId ? (
                <iframe
                  src={`https://drive.google.com/file/d/${meeting.driveFileId}/preview`}
                  className="w-full h-full border-0 bg-black/10"
                  allow="autoplay"
                />
              ) : meeting.status === 'processing' ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-background/80 p-6 text-center">
                  <Loader2 className="w-8 h-8 mb-3 animate-spin text-primary" />
                  <p className="text-[14px] font-semibold text-background">
                    Processing Recording...
                  </p>
                  <p className="text-[12px] text-background/60 mt-1">
                    Generating transcript and finalizing media.
                  </p>
                </div>
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-background/50 p-6 text-center">
                  <AlertCircle className="w-8 h-8 mb-2 opacity-50" />
                  <p className="text-[13px] font-medium">Video not available locally or in cloud</p>
                  <div className="mt-3 flex items-center gap-2">
                    {meeting.videoPath && (
                      <button
                        type="button"
                        onClick={() => setVideoSource('local')}
                        className="px-3 py-1.5 bg-background/15 hover:bg-background/25 text-background rounded-md text-[11px] font-medium transition-colors"
                      >
                        Retry Local Player
                      </button>
                    )}
                    {hasCloud && (
                      <button
                        type="button"
                        onClick={() => setVideoSource('cloud')}
                        className="px-3 py-1.5 bg-primary hover:bg-primary/90 text-primary-foreground rounded-md text-[11px] font-medium transition-colors"
                      >
                        Play from Drive
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Executive Summary */}
            {meeting.summary && (
              <section className="mt-7">
                <div className="mb-4 flex items-center gap-2">
                  <WandSparkles className="w-4 h-4 text-primary" />
                  <h2 className="eyebrow">Executive summary</h2>
                </div>
                <p className="rounded-xl border border-border bg-card p-5 text-[14px] leading-7 text-muted-foreground">
                  {meeting.summary}
                </p>
              </section>
            )}

            {/* Action Items */}
            {meeting.actionItems && meeting.actionItems.length > 0 && (
              <section className="mt-7">
                <h2 className="section-title text-foreground">Action items</h2>
                <div className="mt-3 divide-y divide-border rounded-xl border border-border bg-card">
                  {meeting.actionItems.map((item, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-3 px-4 py-3 text-[13px] text-foreground"
                    >
                      <span className="grid w-5 h-5 place-items-center rounded border border-border text-[10px] text-subtle shrink-0">
                        {index + 1}
                      </span>
                      <span>{item}</span>
                      <span className="ml-auto text-[11px] text-subtle shrink-0">Unassigned</span>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        </div>

        {/* Right Column (Transcript Sidebar) */}
        <aside className="bg-card h-full flex flex-col min-h-0 overflow-hidden">
          <div className="flex h-16 items-center justify-between border-b border-border px-5 shrink-0">
            <div className="flex gap-5">
              <button
                onClick={() => setActiveTab('transcript')}
                className={`py-[22px] text-[12px] transition-colors ${activeTab === 'transcript' ? 'border-b-2 border-primary font-medium text-foreground' : 'text-subtle hover:text-foreground'}`}
              >
                Transcript
              </button>
              <button
                onClick={() => setActiveTab('notes')}
                className={`py-[22px] text-[12px] transition-colors ${activeTab === 'notes' ? 'border-b-2 border-primary font-medium text-foreground' : 'text-subtle hover:text-foreground'}`}
              >
                Notes
              </button>
            </div>
            <span className="text-[10px] text-subtle">{wordCount.toLocaleString()} words</span>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-7">
            {activeTab === 'notes' ? (
              <div className="flex flex-col h-full text-center p-6 mt-10">
                <WandSparkles className="w-8 h-8 text-primary mx-auto mb-4 opacity-50" />
                <p className="text-[14px] font-medium text-foreground">AI Meeting Notes</p>
                <p className="text-[13px] text-muted-foreground mt-2 max-w-xs mx-auto">
                  Automatically generated notes based on the transcript will appear here.
                </p>
                {meeting.summary && (
                  <div className="mt-8 text-left bg-background border border-border p-5 rounded-xl">
                    <p className="text-[13px] text-foreground leading-relaxed">{meeting.summary}</p>
                  </div>
                )}
              </div>
            ) : meeting.status === 'processing' ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground space-y-4">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <p className="text-[14px] font-medium text-foreground">Transcribing with AI...</p>
                <p className="text-[12px] text-center px-6">
                  Using {selectedModel}. This usually takes a moment.
                </p>
              </div>
            ) : meeting.status === 'error' || (!meeting.segments?.length && meeting.audioPath) ? (
              <div className="flex flex-col items-center justify-center h-full text-center space-y-4 max-w-sm mx-auto p-6">
                <div className="w-12 h-12 rounded-xl bg-red-50 border border-red-200 flex items-center justify-center text-red-600">
                  <AlertCircle className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-[14px] font-medium text-foreground">
                    Transcription Incomplete
                  </p>
                  <p className="text-[12px] text-muted-foreground mt-1 leading-relaxed">
                    {meeting.errorMessage || 'An error occurred during transcription.'}
                  </p>
                </div>

                {!hasApiKey && (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 text-[12px] font-medium w-full text-left">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>No API key configured. Configure in Integrations.</span>
                  </div>
                )}

                {hasApiKey && (
                  <div className="w-full mt-4 text-left bg-background rounded-xl p-4 border border-border">
                    <div className="mb-3 text-[11px] font-semibold text-subtle uppercase tracking-wider">
                      Model Selection
                    </div>
                    <ModelSelect
                      models={models}
                      selectedModel={selectedModel}
                      onSelectModel={setSelectedModel}
                      isLoading={modelsLoading}
                    />

                    <button
                      onClick={handleRetryTranscription}
                      disabled={isRetrying}
                      className="action-button mt-4 w-full"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isRetrying ? 'animate-spin' : ''}`} />
                      <span>{isRetrying ? 'Retrying...' : 'Retry Transcription'}</span>
                    </button>
                  </div>
                )}
              </div>
            ) : !meeting.segments || meeting.segments.length === 0 ? (
              <p className="text-[13px] text-muted-foreground text-center italic py-10">
                No transcript available.
              </p>
            ) : (
              meeting.segments.map((segment, index) => {
                const isYou =
                  segment.speaker.toLowerCase() === 'you' ||
                  segment.speaker.toLowerCase() === 'speaker 1'
                const initials = isYou ? 'ME' : segment.speaker.substring(0, 2).toUpperCase()

                return (
                  <div key={`${segment.id}-${index}`} className="grid grid-cols-[36px_1fr] gap-3">
                    <span
                      className={`grid w-8 h-8 place-items-center rounded-lg text-[10px] font-semibold ${
                        isYou ? 'bg-primary/15 text-primary' : 'bg-secondary text-muted-foreground'
                      }`}
                    >
                      {initials}
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-[12px] font-semibold text-foreground">
                          {isYou ? 'You' : segment.speaker}
                        </p>
                        <button
                          onClick={() => handleSeek(segment.startTime)}
                          className="text-[10px] text-subtle hover:text-foreground transition-colors"
                        >
                          {segment.startTime}
                        </button>
                      </div>
                      <p className="mt-1.5 text-[13px] leading-6 text-muted-foreground">
                        {segment.text}
                      </p>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </aside>
      </div>
    </div>
  )
}
