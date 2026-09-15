import React from 'react'
import { useAuth } from '../../auth/hooks/useAuth'
import { Button } from '../../../components/ui/Button'

export const TrayView: React.FC = () => {
  const { user } = useAuth()

  // For now, this is a placeholder UI for the Tray
  // We will connect it to the recorder logic next

  return (
    <div className="flex flex-col h-screen w-full bg-white text-[#1a1a1a]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#e2e0d8]">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded bg-[#2d2d2d] flex items-center justify-center">
            <span className="text-white text-[10px] font-semibold">AI</span>
          </div>
          <span className="text-sm font-semibold">Embrace AI</span>
        </div>
        <button
          onClick={() => window.electron.ipcRenderer.send('open-main-window')}
          className="text-xs text-[#737373] hover:text-[#1a1a1a] transition-colors"
        >
          Library
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-4 flex flex-col items-center justify-center gap-4">
        {!user ? (
          <div className="text-center">
            <p className="text-sm text-[#737373] mb-3">Please sign in to record</p>
            <Button size="sm" onClick={() => window.electron.ipcRenderer.send('open-main-window')}>
              Open Settings
            </Button>
          </div>
        ) : (
          <>
            <div className="text-center w-full">
              <div className="text-xs font-mono text-[#737373] mb-1 uppercase tracking-widest">
                Ready
              </div>
              <div className="text-sm font-medium truncate px-2">{user.email}</div>
            </div>

            <button className="w-20 h-20 rounded-full bg-[#f4f3f0] hover:bg-[#eae8e0] border border-[#e2e0d8] flex items-center justify-center shadow-sm transition-all group">
              <div className="w-8 h-8 rounded-full bg-red-500 group-hover:bg-red-600 shadow-inner flex items-center justify-center">
                <div className="w-3 h-3 rounded-full bg-white"></div>
              </div>
            </button>
            <p className="text-xs font-medium text-[#737373]">Start Recording</p>
          </>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-2 border-t border-[#e2e0d8] flex justify-end">
        <button
          onClick={() => window.electron.ipcRenderer.send('quit-app')}
          className="text-xs text-[#737373] hover:text-red-500 transition-colors font-medium"
        >
          Quit
        </button>
      </div>
    </div>
  )
}
