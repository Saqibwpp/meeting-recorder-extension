import React, { useRef, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  Loader2,
  ArrowLeft,
  Calendar,
  Clock,
  RefreshCw,
  AlertCircle,
  Sparkles,
  AlertTriangle
} from 'lucide-react'
import { useMeeting } from '../hooks/useMeeting'
import { useRetryTranscription } from '../hooks/useRetryTranscription'
import { useGeminiModels } from '../../../hooks/useGeminiModels'
import { useApiKey } from '../../../hooks/useApiKey'
import { ModelSelect } from '../../../components/ui/ModelSelect'

// Helper to convert "00:04.50" to seconds (4.5)
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
  
  const { retryTranscription, isRetrying } = useRetryTranscription()
  const { isConfigured: hasApiKey } = useApiKey()

  // React derived state (no useEffect needed)
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
      <div className="flex h-full w-full items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-[#737373]">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span className="text-sm font-mono">Loading meeting details...</span>
        </div>
      </div>
    )
  }

  if (!meeting) {
    return (
      <div className="flex flex-col h-full items-center justify-center p-8 text-center">
        <h2 className="text-lg font-semibold text-[#1a1a1a]">Meeting not found</h2>
        <p className="text-sm text-[#737373] mt-1">
          The requested meeting recording does not exist or has been removed.
        </p>
        <button
          onClick={() => navigate('/library')}
          className="mt-4 px-4 py-2 bg-[#2d2d2d] text-white rounded-lg text-sm font-medium hover:bg-black transition-colors"
        >
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
      ? dateObj.toLocaleDateString(undefined, {
          month: 'short',
          day: 'numeric',
          year: 'numeric'
        })
      : 'Recent'

  const durationMins = Math.floor((meeting.durationSeconds || 0) / 60)
  const formattedDuration =
    durationMins > 0
      ? `${durationMins}m`
      : meeting.durationSeconds
        ? `${meeting.durationSeconds}s`
        : '< 1m'

  return (
    <div className="flex flex-col h-full w-full bg-white">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-[#e2e0d8] shrink-0">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/library')}
            className="p-1.5 rounded-md hover:bg-[#f4f3f0] text-[#737373] transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-lg font-semibold text-[#1a1a1a]">
              {meeting.title || 'Untitled Meeting'}
            </h1>
            <div className="flex items-center gap-3 text-xs font-mono text-[#737373] mt-0.5">
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                {formattedDate}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                {formattedDuration}
              </span>
            </div>
          </div>
        </div>

        {/* Re-transcribe controls */}
        <div className="flex items-center gap-3">
          {meeting.audioPath && hasApiKey && (
            <div className="flex items-center gap-2">
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                disabled={isRetrying || meeting.status === 'processing' || modelsLoading}
                className="text-xs border border-[#e2e0d8] rounded-md px-2.5 py-1.5 bg-[#f4f3f0] text-[#1a1a1a] focus:outline-none focus:ring-1 focus:ring-[#2d2d2d] cursor-pointer"
              >
                {models.map((m) => (
                  <option key={m.name} value={m.name}>
                    {m.displayName}
                  </option>
                ))}
              </select>

              <button
                onClick={handleRetryTranscription}
                disabled={isRetrying || meeting.status === 'processing'}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#2d2d2d] text-white text-xs font-medium rounded-md hover:bg-black transition-colors disabled:opacity-50"
                title="Re-run transcription with the selected Gemini model"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRetrying ? 'animate-spin' : ''}`} />
                <span>{isRetrying ? 'Transcribing...' : 'Re-transcribe'}</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Split View */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: Video / Media Player */}
        <div className="w-[60%] flex flex-col border-r border-[#e2e0d8] bg-[#faf9f6]">
          <div className="w-full aspect-video bg-black flex-shrink-0 relative">
            {meeting.videoPath && videoSource === 'local' ? (
              <video
                ref={videoRef}
                src={`local://${meeting.videoPath}`}
                controls
                className="w-full h-full object-contain"
                onError={() => {
                  if (meeting.videoUrl) {
                    setVideoSource('cloud')
                  } else {
                    setVideoSource('error')
                  }
                }}
              />
            ) : meeting.videoUrl && (videoSource === 'cloud' || !meeting.videoPath) ? (
              <video
                ref={videoRef}
                src={meeting.videoUrl}
                controls
                className="w-full h-full object-contain"
                onError={() => setVideoSource('error')}
              />
            ) : videoSource === 'error' ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center space-y-3 bg-[#111] text-[#a0a0a0]">
                <AlertCircle className="w-8 h-8 text-red-500/80 mb-2" />
                <p className="text-sm font-medium text-white/90">Local video file missing</p>
                <p className="text-xs max-w-xs leading-relaxed">
                  The original video file was deleted from your hard drive. 
                  {!meeting.videoUrl && ' No Google Drive backup was found for this meeting.'}
                </p>
              </div>
            ) : meeting.audioUrl ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-white space-y-3">
                <p className="text-sm font-mono text-white/70">Audio Recording (Cloud)</p>
                <audio src={meeting.audioUrl} controls className="w-full max-w-md" />
              </div>
            ) : meeting.audioPath ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-white space-y-3">
                <p className="text-sm font-mono text-white/70">Audio Recording (Local)</p>
                <audio src={`local://${meeting.audioPath}`} controls className="w-full max-w-md" />
              </div>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-[#737373] text-sm">
                No video or audio file found for this meeting
              </div>
            )}
          </div>

          <div className="p-6 flex-1 overflow-y-auto">
            {meeting.summary && (
              <div className="mb-6">
                <h3 className="text-xs font-bold tracking-wider uppercase text-[#737373] mb-2 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Executive Summary
                </h3>
                <p className="text-sm text-[#333] leading-relaxed bg-white p-4 rounded-xl border border-[#e2e0d8]">
                  {meeting.summary}
                </p>
              </div>
            )}

            {meeting.actionItems && meeting.actionItems.length > 0 && (
              <div>
                <h3 className="text-xs font-bold tracking-wider uppercase text-[#737373] mb-2">
                  Action Items
                </h3>
                <div className="bg-white p-4 rounded-xl border border-[#e2e0d8]">
                  <ul className="list-disc pl-5 space-y-1.5">
                    {meeting.actionItems.map((item, idx) => (
                      <li key={idx} className="text-sm text-[#333]">
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right: Transcript */}
        <div className="w-[40%] flex flex-col bg-white overflow-hidden">
          <div className="px-5 py-3 border-b border-[#e2e0d8] bg-[#faf9f6] shrink-0 flex items-center justify-between">
            <h3 className="text-xs font-bold tracking-widest uppercase text-[#737373]">
              Transcript
            </h3>
            <div className="flex items-center gap-3">
              {meeting.usage && meeting.usage.totalTokenCount > 0 && (
                <span className="text-[11px] font-mono text-[#a0a0a0]">
                  {meeting.usage.totalTokenCount.toLocaleString()} tokens
                </span>
              )}
              {meeting.segments && meeting.segments.length > 0 && (
                <span className="text-[11px] font-mono text-[#a0a0a0]">
                  {meeting.segments.length} segments
                </span>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-6">
            {meeting.status === 'processing' || isRetrying ? (
              <div className="flex flex-col items-center justify-center h-full text-[#737373] space-y-3">
                <Loader2 className="w-8 h-8 animate-spin text-[#2d2d2d]" />
                <p className="text-sm font-semibold text-[#1a1a1a]">Transcribing with AI...</p>
                <p className="text-xs text-[#a0a0a0]">
                  Using {selectedModel}. This usually takes a moment.
                </p>
              </div>
            ) : meeting.status === 'error' || (!meeting.segments?.length && meeting.audioPath) ? (
              <div className="flex flex-col items-center justify-center h-full text-center space-y-4 max-w-sm mx-auto">
                <div className="w-12 h-12 rounded-full bg-red-50 border border-red-200 flex items-center justify-center text-red-600">
                  <AlertCircle className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#1a1a1a]">Transcription Incomplete</p>
                  <p className="text-xs text-[#737373] mt-1 leading-relaxed">
                    {meeting.errorMessage || 'An error occurred during transcription.'}
                  </p>
                </div>

                {!hasApiKey && (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 text-xs">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    <span>
                      No API key configured.{' '}
                      <Link to="/settings" className="underline font-medium">
                        Go to Settings
                      </Link>
                    </span>
                  </div>
                )}

                {hasApiKey && (
                  <div className="w-full mt-4 bg-[#faf9f6] p-4 rounded-xl border border-[#e2e0d8] text-left">
                    <ModelSelect
                      models={models}
                      selectedModel={selectedModel}
                      onSelectModel={setSelectedModel}
                      isLoading={modelsLoading}
                    />

                    <button
                      onClick={handleRetryTranscription}
                      disabled={isRetrying}
                      className="mt-3 w-full flex items-center justify-center gap-2 px-4 py-2 bg-[#2d2d2d] text-white text-sm font-medium rounded-md hover:bg-black transition-colors disabled:opacity-50"
                    >
                      <RefreshCw className={`w-4 h-4 ${isRetrying ? 'animate-spin' : ''}`} />
                      <span>{isRetrying ? 'Retrying...' : 'Retry Transcription'}</span>
                    </button>
                  </div>
                )}
              </div>
            ) : !meeting.segments || meeting.segments.length === 0 ? (
              <p className="text-sm text-[#737373] italic">No transcript segments available.</p>
            ) : (
              meeting.segments.map((segment) => (
                <div key={segment.id} className="group">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-[#1a1a1a]">{segment.speaker}</span>
                    <button
                      onClick={() => handleSeek(segment.startTime)}
                      className="text-[10px] font-mono text-[#737373] hover:text-[#1a1a1a] transition-colors px-1.5 py-0.5 rounded bg-[#f4f3f0] opacity-0 group-hover:opacity-100"
                    >
                      {segment.startTime}
                    </button>
                  </div>
                  <p className="text-sm text-[#4a4a4a] leading-relaxed">{segment.text}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
