import React from 'react'
import { useAuth } from './features/auth/hooks/useAuth'
import { AuthCard } from './features/auth/components/AuthCard'
import { RecorderView } from './features/recorder/components/RecorderView'
import { Button } from './components/ui/Button'
import { Loader2 } from 'lucide-react'

export default function App(): React.ReactElement {
  const { user, loading, logout } = useAuth()

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[#faf9f6]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="animate-spin w-6 h-6 text-[#2d2d2d]" />
          <span className="text-xs text-[#737373] font-mono">Initializing Embrace...</span>
        </div>
      </div>
    )
  }

  if (!user) {
    return <AuthCard />
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#faf9f6] text-[#1a1a1a]">
      {/* Global Header */}
      <header className="border-b border-[#e2e0d8] bg-white shrink-0 h-[60px] flex items-center shadow-[0_2px_10px_-2px_rgba(0,0,0,0.03)] px-6 z-10">
        <div className="w-full flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-md bg-[#2d2d2d] flex items-center justify-center shadow-sm">
              <span className="text-white text-xs font-semibold">AI</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[15px] font-semibold tracking-tight text-[#1a1a1a]">
                Embrace AI
              </span>
              <span className="font-mono text-[10px] uppercase tracking-widest px-2 py-0.5 rounded bg-[#f4f3f0] text-[#737373] border border-[#e2e0d8]">
                Desktop
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <span className="font-mono text-xs text-[#737373] hidden sm:inline">{user.email}</span>
            <Button variant="secondary" size="sm" onClick={() => logout()}>
              Sign out
            </Button>
          </div>
        </div>
      </header>

      {/* Main View Area */}
      <main className="flex-1">
        <RecorderView />
      </main>
    </div>
  )
}
