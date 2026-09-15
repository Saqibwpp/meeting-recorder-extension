import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2, Video, Calendar, Clock, AlertCircle } from 'lucide-react'
import { useMeetings } from '../hooks/useMeetings'

export const LibraryView: React.FC = () => {
  const navigate = useNavigate()

  const { data: meetings = [], isLoading: loading } = useMeetings()

  if (loading) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-[#737373]">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span className="text-sm font-mono">Loading library...</span>
        </div>
      </div>
    )
  }

  if (meetings.length === 0) {
    return (
      <div className="flex flex-col h-full w-full items-center justify-center p-8 text-center">
        <div className="w-16 h-16 rounded-2xl bg-[#f4f3f0] border border-[#e2e0d8] flex items-center justify-center mb-4">
          <Video className="w-8 h-8 text-[#737373]" />
        </div>
        <h2 className="text-lg font-semibold text-[#1a1a1a] mb-2">No meetings yet</h2>
        <p className="text-sm text-[#737373] max-w-sm">
          Your recorded meetings and transcripts will appear here. Start a recording from the Record
          tab or menu bar icon!
        </p>
      </div>
    )
  }

  return (
    <div className="p-8 w-full h-full overflow-y-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-[#1a1a1a] tracking-tight">Your Library</h1>
        <p className="text-[#737373] mt-1 text-sm">All your recorded meetings and transcripts</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {meetings.map((meeting) => {
          const dateObj = new Date(meeting.date || meeting.createdAt || 0)
          const isValidDate = !isNaN(dateObj.getTime()) && dateObj.getTime() > 0
          const formattedDate = isValidDate
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
            <div
              key={meeting.id}
              onClick={() => navigate(`/player/${meeting.id}`)}
              className="group bg-white border border-[#e2e0d8] rounded-xl overflow-hidden hover:shadow-lg hover:border-[#d0cece] transition-all cursor-pointer flex flex-col"
            >
              <div className="aspect-video bg-[#1a1a1a] relative flex items-center justify-center overflow-hidden">
                {meeting.videoPath ? (
                  <video
                    src={`local://${meeting.videoPath}#t=0.1`}
                    className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    preload="metadata"
                    muted
                    playsInline
                  />
                ) : (
                  <Video className="w-10 h-10 text-white/20 group-hover:scale-110 transition-transform duration-300" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                {/* Status Badges */}
                {meeting.status === 'processing' && (
                  <div className="absolute top-3 right-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-500/90 text-white text-[11px] font-mono">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    <span>Processing</span>
                  </div>
                )}
                {meeting.status === 'error' && (
                  <div className="absolute top-3 right-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-500/90 text-white text-[11px] font-mono">
                    <AlertCircle className="w-3 h-3" />
                    <span>Error</span>
                  </div>
                )}
              </div>
              <div className="p-5 flex-1 flex flex-col">
                <h3 className="font-semibold text-[#1a1a1a] text-[15px] truncate mb-3">
                  {meeting.title || 'Untitled Meeting'}
                </h3>

                <div className="mt-auto flex items-center gap-4 text-xs font-mono text-[#737373]">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>{formattedDate}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{formattedDuration}</span>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
