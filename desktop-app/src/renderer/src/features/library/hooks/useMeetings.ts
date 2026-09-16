import { useQuery, UseQueryResult } from '@tanstack/react-query'
import api from '../../../lib/api'
import { useAuth } from '../../auth/hooks/useAuth'

export interface TranscriptSegment {
  id: number | string
  startTime: string
  endTime: string
  speaker: string
  channel: string
  text: string
}
export interface UsageMetadata {
  promptTokenCount: number
  candidatesTokenCount: number
  totalTokenCount: number
}

export interface Meeting {
  id: string
  title: string
  date: string
  createdAt?: string
  startTime?: number
  durationSeconds: number
  videoPath?: string
  audioPath?: string
  audioUrl?: string
  videoUrl?: string
  summary?: string
  actionItems?: string[]
  segments?: TranscriptSegment[]
  status?: string
  errorMessage?: string
  usage?: UsageMetadata
  isShared?: boolean
  driveFileId?: string
}

export function extractDriveFileId(urlOrId?: string): string | undefined {
  if (!urlOrId) return undefined
  // If already an alphanumeric ID without slash or dot
  if (!urlOrId.includes('/') && !urlOrId.includes('.')) return urlOrId
  const match =
    urlOrId.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) ||
    urlOrId.match(/[?&]id=([a-zA-Z0-9_-]+)/) ||
    urlOrId.match(/\/d\/([a-zA-Z0-9_-]+)/)
  return match ? match[1] : undefined
}

export function normalizeMeeting(raw: Record<string, unknown>): Meeting {
  const transcript = (raw.transcript as Record<string, unknown>) || {}

  let rawDate = (raw.date as string) || (raw.createdAt as string) || (transcript.date as string)
  if (!rawDate && raw.startTime) {
    rawDate = new Date(Number(raw.startTime)).toISOString()
  }
  if (!rawDate) {
    rawDate = new Date().toISOString()
  }

  const rawDuration =
    typeof raw.durationSeconds === 'number'
      ? raw.durationSeconds
      : typeof transcript.durationSeconds === 'number'
        ? transcript.durationSeconds
        : 0

  const rawSummary = (raw.summary as string) || (transcript.summary as string) || ''
  const rawActionItems = (raw.actionItems as string[]) || (transcript.actionItems as string[]) || []
  const rawSegments =
    (raw.segments as TranscriptSegment[]) || (transcript.segments as TranscriptSegment[]) || []

  const rawVideoUrl = (raw.videoUrl as string) || (transcript.videoUrl as string) || undefined
  const rawDriveId = (raw.driveFileId as string) || (transcript.driveFileId as string) || undefined
  const driveFileId = rawDriveId || extractDriveFileId(rawVideoUrl)

  return {
    id: (raw.id as string) || '',
    title: (raw.title as string) || 'Untitled Meeting',
    date: rawDate,
    createdAt: (raw.createdAt as string) || rawDate,
    startTime: typeof raw.startTime === 'number' ? raw.startTime : undefined,
    durationSeconds: rawDuration,
    videoPath: (raw.videoPath as string) || (transcript.videoPath as string) || undefined,
    audioPath: (raw.audioPath as string) || (transcript.audioPath as string) || undefined,
    audioUrl: (raw.audioUrl as string) || (transcript.audioUrl as string) || undefined,
    videoUrl: rawVideoUrl,
    driveFileId,
    summary: rawSummary,
    actionItems: rawActionItems,
    segments: rawSegments,
    usage: (raw.usage as UsageMetadata) || (transcript.usage as UsageMetadata) || undefined,
    status: (raw.status as string) || (rawSummary ? 'completed' : 'processing'),
    errorMessage: (raw.errorMessage as string) || (raw.error as string) || undefined
  }
}

export const useMeetings = (): UseQueryResult<Meeting[], Error> => {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['meetings', user?.uid],
    queryFn: async () => {
      if (!user) return []

      const res = await api.get('/api/meetings')

      const rawList = (res.data.meetings || []) as Record<string, unknown>[]
      const fetchedMeetings = rawList.map(normalizeMeeting)

      // Sort newest first
      fetchedMeetings.sort((a, b) => {
        const dateA = new Date(a.createdAt || a.date || 0).getTime()
        const dateB = new Date(b.createdAt || b.date || 0).getTime()
        return dateB - dateA
      })

      return fetchedMeetings
    }
  })
}
