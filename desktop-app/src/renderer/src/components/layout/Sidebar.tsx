import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Library, Video, Settings, LogOut, Key, ChevronLeft, ChevronRight } from 'lucide-react'

interface SidebarProps {
  userEmail: string | null
  isApiKeyConfigured: boolean
  onLogout: () => void
  collapsed: boolean
  onToggleCollapse: () => void
}

interface NavItem {
  path: string
  icon: React.ElementType
  label: string
  matchPaths?: string[]
}

const NAV_ITEMS: NavItem[] = [
  {
    path: '/library',
    icon: Library,
    label: 'Library',
    matchPaths: ['/library', '/player']
  },
  {
    path: '/record',
    icon: Video,
    label: 'Record'
  },
  {
    path: '/settings',
    icon: Settings,
    label: 'Settings'
  }
]

export const Sidebar: React.FC<SidebarProps> = ({
  userEmail,
  isApiKeyConfigured,
  onLogout,
  collapsed,
  onToggleCollapse
}) => {
  const location = useLocation()

  const isActive = (item: NavItem): boolean => {
    const paths = item.matchPaths || [item.path]
    return paths.some((p) => location.pathname.startsWith(p))
  }

  return (
    <aside
      className={`flex flex-col h-full bg-[#faf9f6] border-r border-[#e2e0d8] shrink-0 transition-all duration-200 ease-in-out ${
        collapsed ? 'w-[64px]' : 'w-[220px]'
      }`}
    >
      {/* Logo area — also draggable */}
      <div
        className="flex items-center gap-2.5 px-4 h-[52px] shrink-0 border-b border-[#e2e0d8]"
        style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
      >
        <div className="w-7 h-7 rounded-md bg-[#2d2d2d] flex items-center justify-center shadow-sm shrink-0">
          <span className="text-white text-xs font-semibold">AI</span>
        </div>
        {!collapsed && (
          <div className="flex items-center gap-2 overflow-hidden">
            <span className="text-[14px] font-semibold tracking-tight text-[#1a1a1a] whitespace-nowrap">
              Embrace AI
            </span>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-3 space-y-1">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon
          const active = isActive(item)

          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group relative ${
                active
                  ? 'bg-white text-[#1a1a1a] shadow-sm border border-[#e2e0d8]'
                  : 'text-[#737373] hover:text-[#1a1a1a] hover:bg-white/60'
              }`}
              title={collapsed ? item.label : undefined}
            >
              <Icon className={`w-[18px] h-[18px] shrink-0 ${active ? 'text-[#1a1a1a]' : ''}`} />
              {!collapsed && <span className="truncate">{item.label}</span>}

              {/* API key warning dot on Settings */}
              {item.path === '/settings' && !isApiKeyConfigured && (
                <span
                  className={`w-2 h-2 rounded-full bg-amber-400 shrink-0 ${
                    collapsed ? 'absolute top-1.5 right-1.5' : 'ml-auto'
                  }`}
                />
              )}
            </Link>
          )
        })}
      </nav>

      {/* Collapse toggle */}
      <button
        onClick={onToggleCollapse}
        className="mx-2 mb-2 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs text-[#a0a0a0] hover:text-[#737373] hover:bg-white/60 transition-colors"
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
      >
        {collapsed ? (
          <ChevronRight className="w-4 h-4" />
        ) : (
          <>
            <ChevronLeft className="w-4 h-4" />
            <span>Collapse</span>
          </>
        )}
      </button>

      {/* User section */}
      <div
        className="px-3 py-3 border-t border-[#e2e0d8] space-y-2"
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
      >
        {/* API key status */}
        {!collapsed && (
          <Link
            to="/settings"
            className={`flex items-center gap-2 px-2 py-1.5 rounded-md text-[11px] font-mono transition-colors ${
              isApiKeyConfigured
                ? 'text-emerald-600 bg-emerald-50 border border-emerald-200'
                : 'text-amber-600 bg-amber-50 border border-amber-200 hover:bg-amber-100'
            }`}
          >
            <Key className="w-3 h-3 shrink-0" />
            <span className="truncate">
              {isApiKeyConfigured ? 'API Key Active' : 'Set API Key'}
            </span>
          </Link>
        )}

        {/* User email */}
        {userEmail && !collapsed && (
          <div className="px-2 text-[11px] font-mono text-[#a0a0a0] truncate">{userEmail}</div>
        )}

        {/* Sign out */}
        <button
          onClick={onLogout}
          className={`flex items-center gap-2 w-full px-3 py-2 rounded-lg text-xs text-[#737373] hover:text-red-600 hover:bg-red-50 transition-colors ${
            collapsed ? 'justify-center' : ''
          }`}
          title="Sign out"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          {!collapsed && <span>Sign out</span>}
        </button>
      </div>
    </aside>
  )
}
