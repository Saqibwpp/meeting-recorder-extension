import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Custom APIs for renderer — system audio capture via Swift companion
const api = {
  startSystemAudio: (): Promise<void> => ipcRenderer.invoke('start-system-audio'),
  // Now returns the path to the system audio file instead of ArrayBuffer
  stopSystemAudio: (): Promise<string | null> => ipcRenderer.invoke('stop-system-audio'),
  getPlatform: (): Promise<string> => ipcRenderer.invoke('get-platform'),
  // New IPC for merging and saving video + system audio using FFmpeg
  mergeAndSaveRecording: (
    videoBuffer: ArrayBuffer,
    systemAudioPath: string,
    title: string
  ): Promise<boolean> =>
    ipcRenderer.invoke('merge-and-save-recording', videoBuffer, systemAudioPath, title),
  // For Windows or fallback: just save the video buffer
  saveRecording: (videoBuffer: ArrayBuffer, title: string): Promise<boolean> =>
    ipcRenderer.invoke('save-recording', videoBuffer, title),
  // Seamless web browser login (Google/Email)
  loginWithBrowser: (): Promise<string> => ipcRenderer.invoke('login-with-browser')
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
