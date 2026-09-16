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
  AlertTriangle
} from 'lucide-react'
import { useMeeting } from '../hooks/useMeeting'
import { useRetryTranscription } from '../hooks/useRetryTranscription'
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

  const [videoSource, setVideoSource] = useState<'local' | 'cloud' | 'error'>('local')
  const [currentMeetingId, setCurrentMeetingId] = useState(meeting?.id)
  const [activeTab, setActiveTab] = useState<'transcript' | 'notes'>('transcript')

  const { retryTranscription, isRetrying } = useRetryTranscription()
  const { isConfigured: hasApiKey } = useApiKey()

  if (meeting?.id !== currentMeetingId) {
    setCurrentMeetingId(meeting?.id)
    setVideoSource('local')
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

  return (
    <div className="flex flex-col h-full bg-background text-foreground overflow-y-auto">
      <TopBar
        title={meeting.title || 'Untitled Meeting'}
        context={`${formattedDate}${formattedTime ? `, ${formattedTime}` : ''}`}
        actions={
          <>
            <ActionButton muted icon={Share2} onClick={() => alert('Share feature coming soon')}>
              Share
            </ActionButton>
            <ActionButton icon={Download} onClick={() => alert('Export notes feature coming soon')}>
              Export
            </ActionButton>
          </>
        }
      />

      <div className="grid min-h-[calc(100vh-96px)] grid-cols-[minmax(0,1.35fr)_minmax(340px,0.65fr)]">
        {/* Left Column */}
        <div className="border-r border-border">
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

              {meeting.status === 'transcribed' && (
                <span className="status-success">
                  <Check className="w-3 h-3" /> Complete
                </span>
              )}
            </div>
          </div>

          <div className="p-7">
            {/* Video Player */}
            <div className="relative aspect-video overflow-hidden rounded-xl bg-foreground shadow-inset">
              {videoSource === 'local' && meeting.videoPath ? (
                <video
                  ref={videoRef}
                  src={`local://${meeting.videoPath}`}
                  className="w-full h-full object-contain bg-black/10"
                  controls
                  controlsList="nodownload"
                  onError={() => setVideoSource('cloud')}
                />
              ) : videoSource === 'cloud' && meeting.driveFileId ? (
                <iframe
                  src={`https://drive.google.com/file/d/${meeting.driveFileId}/preview`}
                  className="w-full h-full border-0 bg-black/10"
                  allow="autoplay"
                />
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-background/50">
                  <AlertCircle className="w-8 h-8 mb-2 opacity-50" />
                  <p className="text-[13px] font-medium">Video not available locally or in cloud</p>
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
        <aside className="bg-card h-full flex flex-col">
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
