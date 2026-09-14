import { ElectronAPI } from '@electron-toolkit/preload'

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      startSystemAudio: () => Promise<void>
      stopSystemAudio: () => Promise<string | null>
      getPlatform: () => Promise<string>
      mergeAndSaveRecording: (
        videoBuffer: ArrayBuffer,
        systemAudioPath: string,
        title: string
      ) => Promise<boolean>
      saveRecording: (videoBuffer: ArrayBuffer, title: string) => Promise<boolean>
    }
  }
}
