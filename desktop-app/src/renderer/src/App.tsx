import React, { useState } from 'react'
import { HashRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { useAuth, AuthCard } from './features/auth'
import { useApiKey } from './hooks/useApiKey'
import { RecorderView } from './features/recorder'
import { LibraryView, PlayerView } from './features/library'
import { SettingsView } from './features/settings'
import { TrayView } from './features/tray/components/TrayView'
import { Sidebar } from './components/layout/Sidebar'
import { Loader2 } from 'lucide-react'

function MainLayout(): React.ReactElement {
  const { user, logout } = useAuth()
  const { isConfigured } = useApiKey()
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true)

  if (!user) {
    return <AuthCard />
  }

  return (
    <div className="h-screen flex flex-col bg-background text-foreground overflow-hidden font-body antialiased">
      {/* Slim draggable title bar */}
      <div
        className="h-[32px] shrink-0 flex items-center bg-transparent fixed top-0 w-full z-50"
        style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
      />

      {/* Sidebar + Content */}
      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          userEmail={user.email}
          isApiKeyConfigured={isConfigured}
          onLogout={() => logout()}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed((prev) => !prev)}
        />

        {/* Main content area */}
        <main
          className="flex-1 flex flex-col overflow-hidden bg-transparent"
          style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
        >
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default function App(): React.ReactElement {
  const { loading } = useAuth()

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[#f3eee4]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="animate-spin w-6 h-6 text-[#22211f]" />
          <span className="text-xs text-[#737373] font-mono">Initializing Embrace...</span>
        </div>
      </div>
    )
  }

  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<MainLayout />}>
          <Route index element={<Navigate to="/library" replace />} />
          <Route path="library" element={<LibraryView />} />
          <Route path="player/:meetingId" element={<PlayerView />} />
          <Route path="record" element={<RecorderView />} />
          <Route path="settings" element={<SettingsView />} />
        </Route>
        <Route path="/tray" element={<TrayView />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  )
}
