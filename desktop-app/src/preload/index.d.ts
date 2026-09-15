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
      ) => Promise<{ videoPath: string; audioPath: string } | false>
      saveRecording: (
        videoBuffer: ArrayBuffer,
        title: string
      ) => Promise<{ videoPath: string; audioPath: string } | false>
      loginWithBrowser: () => Promise<string>
      transcribeAudio: (
        audioPath: string,
        apiKey: string,
        title: string,
        modelName?: string
      ) => Promise<unknown>
      getGeminiModels: (apiKey: string) => Promise<
        {
          name: string
          displayName: string
          description: string
          inputTokenLimit: number
          outputTokenLimit: number
        }[]
      >
    }
  }
}
