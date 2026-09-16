import React, { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Video,
  Search,
  ChevronDown,
  Play,
  Loader2,
  Calendar,
  Users,
  Cloud,
  HardDrive,
  X
} from 'lucide-react'
import { TopBar } from '../../../components/layout/TopBar'
import { ActionButton } from '../../../components/ui/ActionButton'
import { useMeetings } from '../hooks/useMeetings'
import { useGoogleDrive } from '../../../hooks/useGoogleDrive'

type SortOption = 'newest' | 'oldest' | 'duration'

export const LibraryView: React.FC = () => {
  const navigate = useNavigate()
  const { data: meetings = [], isLoading } = useMeetings()
  const { isConnected: isDriveConnected, isLoading: isDriveLoading } = useGoogleDrive()
  const [bannerDismissed, setBannerDismissed] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [filter, setFilter] = useState<'all' | 'week' | 'shared'>('all')
  const [sortBy, setSortBy] = useState<SortOption>('newest')

  const filteredMeetings = useMemo(() => {
    const list = meetings.filter((m) => {
      const matchesSearch =
        m.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.summary?.toLowerCase().includes(searchQuery.toLowerCase())

      let matchesFilter = true
      if (filter === 'week') {
        const date = new Date(m.date || m.createdAt || 0)
        const oneWeekAgo = new Date()
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)
        matchesFilter = date > oneWeekAgo
      } else if (filter === 'shared') {
        matchesFilter = m.isShared === true
      }

      return matchesSearch && matchesFilter
    })

    return list.sort((a, b) => {
      const dateA = new Date(a.date || a.createdAt || 0).getTime()
      const dateB = new Date(b.date || b.createdAt || 0).getTime()

      if (sortBy === 'newest') return dateB - dateA
      if (sortBy === 'oldest') return dateA - dateB
      if (sortBy === 'duration') return (b.durationSeconds || 0) - (a.durationSeconds || 0)
      return 0
    })
  }, [meetings, searchQuery, filter, sortBy])

  return (
    <div className="flex flex-col h-full bg-background text-foreground overflow-y-auto">
      <TopBar
        title="Library"
        context={`${meetings.length} recordings`}
        actions={
          <ActionButton icon={Video} onClick={() => navigate('/record')}>
            New recording
          </ActionButton>
        }
      />

      <div className="mx-auto w-full max-w-[1180px] px-8 py-8 flex-1">
        {/* Drive Integration Banner */}
        {!isDriveLoading && !isDriveConnected && !bannerDismissed && (
          <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-xl border border-border bg-card p-4 sm:px-5 sm:py-3.5 shadow-xs relative">
            <div className="flex items-center gap-3.5 pr-6">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary text-foreground shrink-0">
                <Cloud className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-[13px] font-semibold text-foreground">
                  Google Drive is not connected
                </h3>
                <p className="text-[12px] text-muted-foreground mt-0.5">
                  Connect your Google account to automatically back up recordings to the cloud and
                  share them via link.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => navigate('/settings')}
                className="h-8 px-3.5 bg-foreground text-background hover:opacity-90 rounded-lg text-[12px] font-semibold transition-all"
              >
                Connect Drive
              </button>
              <button
                type="button"
                onClick={() => setBannerDismissed(true)}
                className="p-1 text-subtle hover:text-foreground transition-colors"
                title="Dismiss"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        <div className="flex items-end justify-between">
          <div>
            <p className="eyebrow text-primary">Your archive</p>
            <h1 className="mt-2 font-display text-[28px] font-bold leading-tight">
              Every conversation, ready when you are.
            </h1>
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-[12px] text-subtle focus-within:ring-2 focus-within:ring-ring transition-all">
            <Search className="w-4 h-4" />
            <input
              type="text"
              placeholder="Search recordings..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-48 bg-transparent outline-none text-foreground placeholder:text-subtle"
            />
            <span className="rounded border border-border px-1.5 py-0.5 text-[10px]">⌘ K</span>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-between border-y border-border py-2.5">
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => setFilter('all')}
              className={filter === 'all' ? 'filter-active' : 'filter'}
            >
              All ({meetings.length})
            </button>
            <button
              type="button"
              onClick={() => setFilter('week')}
              className={filter === 'week' ? 'filter-active' : 'filter'}
            >
              This week
            </button>
            <button
              type="button"
              onClick={() => setFilter('shared')}
              className={filter === 'shared' ? 'filter-active' : 'filter'}
            >
              Shared
            </button>
          </div>

          <div className="relative flex items-center gap-1.5 text-[12px] text-muted-foreground hover:text-foreground transition-colors">
            <span className="text-subtle">Sort:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="bg-transparent text-foreground font-medium cursor-pointer outline-none pr-4 appearance-none"
            >
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="duration">Longest duration</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 pointer-events-none -ml-3" />
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : filteredMeetings.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <p className="text-[15px] font-medium text-foreground">No recordings found</p>
            <p className="text-[13px] text-muted-foreground mt-1">
              Try a different search or record a new meeting.
            </p>
          </div>
        ) : (
          <div className="mt-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredMeetings.map((item, index) => {
              const dateObj = new Date(item.date || item.createdAt || 0)
              const formattedDate =
                !isNaN(dateObj.getTime()) && dateObj.getTime() > 0
                  ? dateObj.toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    })
                  : 'Recent'

              const totalMins = Math.floor((item.durationSeconds || 0) / 60)
              const formattedDuration = totalMins > 0 ? `${totalMins} min` : '< 1 min'
              const peopleCount = new Set((item.segments || []).map((s) => s.speaker)).size || 1

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => navigate(`/player/${item.id}`)}
                  className="group overflow-hidden rounded-xl border border-border bg-card text-left transition-all hover:-translate-y-0.5 hover:shadow-soft"
                >
                  <div
                    className={`relative flex aspect-[16/8.7] items-center justify-center border-b border-border ${
                      index % 3 === 0
                        ? 'bg-amber-soft'
                        : index % 3 === 1
                          ? 'bg-foreground'
                          : 'bg-secondary'
                    }`}
                  >
                    <div
                      className={`grid w-11 h-11 place-items-center rounded-full border ${
                        index % 3 === 1
                          ? 'border-background/20 text-background'
                          : 'border-foreground/15 text-foreground'
                      }`}
                    >
                      <Play className="w-4 h-4 fill-current ml-0.5" />
                    </div>
                    <span
                      className={`absolute bottom-2.5 right-2.5 rounded px-2 py-0.5 text-[11px] font-medium backdrop-blur-sm ${
                        index % 3 === 1
                          ? 'bg-black/50 text-white'
                          : 'bg-background/80 text-foreground'
                      }`}
                    >
                      {formattedDuration}
                    </span>
                  </div>

                  <div className="p-4">
                    <h3 className="font-display text-[15px] font-semibold text-foreground group-hover:text-primary transition-colors truncate">
                      {item.title || 'Untitled session'}
                    </h3>
                    <div className="mt-2.5 flex items-center justify-between text-[11px] text-muted-foreground">
                      <span className="flex items-center gap-1.5">
                        <Calendar className="w-3 h-3" />
                        {formattedDate}
                      </span>
                      {item.driveFileId ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                          <Cloud className="w-2.5 h-2.5" /> Drive
                        </span>
                      ) : item.videoPath ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-medium text-muted-foreground bg-secondary px-1.5 py-0.5 rounded border border-border">
                          <HardDrive className="w-2.5 h-2.5" /> Local
                        </span>
                      ) : (
                        <span className="flex items-center gap-1.5">
                          <Users className="w-3 h-3" />
                          {peopleCount} {peopleCount === 1 ? 'speaker' : 'speakers'}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
