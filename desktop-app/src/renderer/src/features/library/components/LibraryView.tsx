import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Video,
  Search,
  ChevronDown,
  Play,
  MoreHorizontal,
  Check,
  Loader2,
  LucideIcon
} from 'lucide-react'
import { TopBar } from '../../../components/layout/TopBar'
import { useMeetings } from '../hooks/useMeetings'

interface ActionProps {
  children: React.ReactNode
  icon?: LucideIcon
  onClick?: () => void
}

const Action = ({ children, icon: Icon, onClick }: ActionProps): React.ReactElement => {
  return (
    <button type="button" className="action-button" onClick={onClick}>
      {Icon && <Icon className="w-3.5 h-3.5" strokeWidth={1.8} />}
      {children}
    </button>
  )
}

export const LibraryView: React.FC = () => {
  const navigate = useNavigate()
  const { data: meetings = [], isLoading } = useMeetings()
  const [searchQuery, setSearchQuery] = useState('')
  const [filter, setFilter] = useState<'all' | 'week' | 'shared'>('all')

  const filteredMeetings = meetings.filter((m) => {
    const matchesSearch = m.title?.toLowerCase().includes(searchQuery.toLowerCase())

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

  return (
    <div className="flex flex-col h-full bg-background text-foreground overflow-y-auto">
      <TopBar
        title="Library"
        context={`${meetings.length} recordings`}
        actions={
          <Action icon={Video} onClick={() => navigate('/record')}>
            New recording
          </Action>
        }
      />

      <div className="mx-auto w-full max-w-[1180px] px-8 py-8 flex-1">
        <div className="flex items-end justify-between">
          <div>
            <p className="eyebrow text-primary">Your archive</p>
            <h1 className="mt-2 font-display text-[40px] font-semibold leading-none">
              Every conversation,
              <br />
              ready when you are.
            </h1>
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2.5 text-[12px] text-subtle focus-within:ring-2 focus-within:ring-ring transition-all">
            <Search className="w-4 h-4" />
            <input
              type="text"
              placeholder="Search recordings"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-44 bg-transparent outline-none text-foreground placeholder:text-subtle"
            />
            <span className="rounded border border-border px-1.5 py-0.5 text-[10px]">⌘ K</span>
          </div>
        </div>

        <div className="mt-8 flex items-center justify-between border-y border-border py-3">
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => setFilter('all')}
              className={filter === 'all' ? 'filter-active' : 'filter'}
            >
              All
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
          <span className="flex items-center gap-2 text-[12px] text-muted-foreground cursor-pointer hover:text-foreground transition-colors">
            Newest first <ChevronDown className="w-3.5 h-3.5" />
          </span>
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
                    className={`relative flex aspect-[16/8.7] items-center justify-center border-b border-border ${index % 3 === 0 ? 'bg-amber-soft' : index % 3 === 1 ? 'bg-foreground' : 'bg-secondary'}`}
                  >
                    <div
                      className={`grid w-11 h-11 place-items-center rounded-full border ${index % 3 === 1 ? 'border-background/20 text-background' : 'border-foreground/15 text-foreground'}`}
                    >
                      <Play className="w-4 h-4 fill-current ml-0.5" />
                    </div>
                    <span
                      className={`absolute bottom-3 right-3 rounded px-1.5 py-1 text-[10px] font-medium tracking-wide ${index % 3 === 1 ? 'bg-background/10 text-background' : 'bg-background/80 text-foreground'}`}
                    >
                      {formattedDuration}
                    </span>
                  </div>
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <h2 className="font-display text-[15px] font-semibold text-foreground truncate">
                        {item.title || 'Untitled Meeting'}
                      </h2>
                      <MoreHorizontal className="w-4 h-4 shrink-0 text-subtle hover:text-foreground transition-colors" />
                    </div>
                    <p className="mt-1.5 text-[11px] text-subtle">{formattedDate}</p>
                    <div className="mt-4 flex items-center justify-between text-[11px] text-muted-foreground">
                      <span>
                        {peopleCount} speaker{peopleCount !== 1 ? 's' : ''}
                      </span>
                      {item.status === 'transcribed' ? (
                        <span className="flex items-center gap-1 text-success font-medium">
                          <Check className="w-3 h-3" /> Transcribed
                        </span>
                      ) : item.status === 'processing' ? (
                        <span className="flex items-center gap-1 text-primary font-medium">
                          <Loader2 className="w-3 h-3 animate-spin" /> Processing
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-subtle font-medium">
                          Pending
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
