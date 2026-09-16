import React, { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Video, Library, Link2, LogOut } from 'lucide-react'
import { useGoogleDrive } from '../../hooks/useGoogleDrive'
import { ConfirmModal } from '../ui/ConfirmModal'

interface SidebarProps {
  userEmail: string | null
  isApiKeyConfigured: boolean
  onLogout: () => void
  collapsed?: boolean
  onToggleCollapse?: () => void
}

export const Sidebar: React.FC<SidebarProps> = ({ userEmail, isApiKeyConfigured, onLogout }) => {
  const location = useLocation()
  const path = location.pathname
  const { isConnected: isDriveConnected } = useGoogleDrive()
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)

  const items = [
    { id: '/record', label: 'Record', icon: Video },
    { id: '/library', label: 'Library', icon: Library },
    { id: '/settings', label: 'Integrations', icon: Link2 }
  ]

  const initials =
    userEmail
      ?.substring(0, 2)
      .toUpperCase()
      .replace(/[^A-Z]/g, '') || 'ME'

  let systemStatusText = 'API Key missing'
  let systemStatusDot = 'bg-red-500'

  if (isApiKeyConfigured && isDriveConnected) {
    systemStatusText = 'All systems connected'
    systemStatusDot = 'bg-success'
  } else if (isApiKeyConfigured) {
    systemStatusText = 'API Key connected'
    systemStatusDot = 'bg-success'
  }

  return (
    <>
      <aside className="sticky top-0 flex h-full w-[248px] shrink-0 flex-col border-r border-border bg-sidebar pt-8">
        <div className="flex items-center gap-2.5 px-5 pb-5 pt-2">
          <div className="grid w-8 h-8 place-items-center rounded-lg bg-foreground shrink-0">
            <span className="rec-dot w-2.5 h-2.5 rounded-full bg-primary" />
          </div>
          <div className="leading-none">
            <p className="font-display text-[15px] font-semibold text-foreground">Cadence</p>
            <p className="mt-1 text-[10px] uppercase tracking-[0.18em] text-subtle">Studio</p>
          </div>
        </div>

        <div className="px-3">
          <Link
            to="/record"
            className="block rounded-lg bg-foreground p-3 text-background shadow-inset hover:opacity-90 transition-opacity"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase tracking-[0.16em] text-background/55">
                Ready to record
              </span>
              <span className="w-2 h-2 rounded-full bg-primary" />
            </div>
            <p className="mt-2 font-display text-[15px] font-semibold leading-tight text-background">
              New meeting
            </p>
            <p className="mt-0.5 text-[11px] text-background/50">Screen + microphone</p>
          </Link>
        </div>

        <nav className="mt-5 space-y-0.5 px-3" aria-label="Primary navigation">
          {items.map(({ id, label, icon: Icon }) => {
            const isActive = path.startsWith(id)
            return (
              <Link
                key={id}
                to={id}
                className={`flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-[13px] transition-colors ${
                  isActive
                    ? 'bg-primary/12 font-medium text-foreground'
                    : 'text-muted-foreground hover:bg-background hover:text-foreground'
                }`}
              >
                <Icon className="w-4 h-4" strokeWidth={1.7} />
                <span>{label}</span>
              </Link>
            )
          })}
        </nav>

        <div className="mt-auto p-3">
          <div className="rounded-lg border border-border bg-background p-3">
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${systemStatusDot}`} />
              <span className="text-[12px] font-medium text-foreground">{systemStatusText}</span>
            </div>
            <div className="mt-3 flex items-center justify-between border-t border-border pt-3 gap-2">
              <div className="leading-none flex-1 min-w-0">
                <p
                  className="text-[12px] font-medium text-foreground truncate block"
                  title={userEmail || ''}
                >
                  {userEmail || 'Account'}
                </p>
                <button
                  type="button"
                  onClick={() => setShowLogoutConfirm(true)}
                  className="mt-1 flex items-center gap-1 text-[11px] text-subtle hover:text-foreground transition-colors"
                >
                  <LogOut className="w-2.5 h-2.5" />
                  <span>Log out</span>
                </button>
              </div>
              <div
                className="grid w-8 h-8 place-items-center rounded-lg bg-secondary text-[11px] font-semibold text-foreground shrink-0"
                title={userEmail || ''}
              >
                {initials}
              </div>
            </div>
          </div>
        </div>
      </aside>

      <ConfirmModal
        isOpen={showLogoutConfirm}
        title="Log out of Cadence"
        message="Are you sure you want to log out? You will need to sign in again to record and access your library."
        confirmLabel="Log out"
        cancelLabel="Cancel"
        isDestructive={true}
        onConfirm={() => {
          setShowLogoutConfirm(false)
          onLogout()
        }}
        onCancel={() => setShowLogoutConfirm(false)}
      />
    </>
  )
}
