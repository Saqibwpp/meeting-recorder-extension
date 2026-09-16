import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

export interface RecordingState {
  isRecording: boolean
  elapsedSeconds: number
  title: string
}

// Custom APIs for renderer — system audio capture via Swift companion
const api = {
  startSystemAudio: (): Promise<void> => ipcRenderer.invoke('start-system-audio'),
  stopSystemAudio: (): Promise<string | null> => ipcRenderer.invoke('stop-system-audio'),
  getPlatform: (): Promise<string> => ipcRenderer.invoke('get-platform'),
  mergeAndSaveRecording: (
    videoBuffer: ArrayBuffer,
    systemAudioPath: string,
    title: string
  ): Promise<{ videoPath: string; audioPath: string } | false> =>
    ipcRenderer.invoke('merge-and-save-recording', videoBuffer, systemAudioPath, title),
  saveRecording: (
    videoBuffer: ArrayBuffer,
    title: string
  ): Promise<{ videoPath: string; audioPath: string } | false> =>
    ipcRenderer.invoke('save-recording', videoBuffer, title),
  loginWithBrowser: (): Promise<string> => ipcRenderer.invoke('login-with-browser'),
  transcribeAudio: (
    audioPath: string,
    apiKey: string,
    title: string,
    modelName?: string
  ): Promise<unknown> =>
    ipcRenderer.invoke('transcribe-audio', audioPath, apiKey, title, modelName),
  getGeminiModels: (
    apiKey: string
  ): Promise<
    {
      name: string
      displayName: string
      description: string
      inputTokenLimit: number
      outputTokenLimit: number
    }[]
  > => ipcRenderer.invoke('get-gemini-models', apiKey),
  connectDrive: (): Promise<boolean> => ipcRenderer.invoke('connect-drive'),
  disconnectDrive: (): Promise<void> => ipcRenderer.invoke('disconnect-drive'),
  checkDriveStatus: (): Promise<boolean> => ipcRenderer.invoke('check-drive-status'),
  uploadToDrive: (filePath: string, title: string): Promise<string | null> =>
    ipcRenderer.invoke('upload-to-drive', filePath, title),
  getLaunchAtLogin: (): Promise<boolean> => ipcRenderer.invoke('get-launch-at-login'),
  setLaunchAtLogin: (enabled: boolean): Promise<boolean> =>
    ipcRenderer.invoke('set-launch-at-login', enabled),

  // Tray & Recording Synchronization
  startRecordingFromTray: (title?: string): void => ipcRenderer.send('tray-start-recording', title),
  stopRecordingFromTray: (): void => ipcRenderer.send('tray-stop-recording'),
  sendRecordingState: (state: RecordingState): void =>
    ipcRenderer.send('broadcast-recording-state', state),
  onRecordingStateChanged: (callback: (state: RecordingState) => void): (() => void) => {
    const handler = (_event: unknown, state: RecordingState): void => callback(state)
    ipcRenderer.on('recording-state-changed', handler)
    return () => ipcRenderer.removeListener('recording-state-changed', handler)
  },
  onTriggerStartRecording: (callback: (title?: string) => void): (() => void) => {
    const handler = (_event: unknown, title?: string): void => callback(title)
    ipcRenderer.on('trigger-start-recording', handler)
    return () => ipcRenderer.removeListener('trigger-start-recording', handler)
  },
  onTriggerStopRecording: (callback: () => void): (() => void) => {
    const handler = (): void => callback()
    ipcRenderer.on('trigger-stop-recording', handler)
    return () => ipcRenderer.removeListener('trigger-stop-recording', handler)
  },
  onMeetingDetected: (callback: () => void): (() => void) => {
    const handler = (): void => callback()
    ipcRenderer.on('meeting-detected', handler)
    return () => ipcRenderer.removeListener('meeting-detected', handler)
  },
  openMainWindow: (route?: string): void => ipcRenderer.send('open-main-window', route),
  hideTrayWindow: (): void => ipcRenderer.send('hide-tray-window')
}

// Use `contextBridge` APIs to expose Electron APIs to renderer
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
