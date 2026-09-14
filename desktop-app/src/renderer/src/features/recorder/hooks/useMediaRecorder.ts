import { useState, useRef, useEffect } from 'react'

export interface MediaRecorderState {
  isRecording: boolean
  isProcessing: boolean
  error: string | null
  setError: React.Dispatch<React.SetStateAction<string | null>>
  platform: string
  startRecording: (title: string, selectedMicId: string) => Promise<void>
  stopRecording: () => void
}

export function useMediaRecorder(): MediaRecorderState {
  const [isRecording, setIsRecording] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [platform, setPlatform] = useState<string>('darwin')

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const audioContextRef = useRef<AudioContext | null>(null)
  const allTracksRef = useRef<MediaStreamTrack[]>([])

  useEffect(() => {
    window.api
      ?.getPlatform()
      .then((p) => setPlatform(p))
      .catch(() => {})
  }, [])

  const startRecording = async (title: string, selectedMicId: string): Promise<void> => {
    setError(null)
    try {
      const isMac = platform === 'darwin'

      // Start Swift system audio capture on macOS
      if (isMac) {
        await window.api.startSystemAudio()
        console.log('[useMediaRecorder] Swift system audio capture started')
      }

      // Prompt for Screen (+ system audio on Windows via loopback)
      const displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: isMac
          ? false
          : {
              echoCancellation: false,
              noiseSuppression: false,
              autoGainControl: false
            }
      })

      // Prompt for Microphone
      const micStream = await navigator.mediaDevices.getUserMedia({
        audio: selectedMicId ? { deviceId: { exact: selectedMicId } } : true
      })

      let combinedStream: MediaStream

      if (!isMac && displayStream.getAudioTracks().length > 0) {
        const audioContext = new AudioContext()
        await audioContext.resume()
        audioContextRef.current = audioContext
        const destination = audioContext.createMediaStreamDestination()

        const systemSource = audioContext.createMediaStreamSource(
          new MediaStream(displayStream.getAudioTracks())
        )
        systemSource.connect(destination)

        const micSource = audioContext.createMediaStreamSource(
          new MediaStream(micStream.getAudioTracks())
        )
        micSource.connect(destination)

        combinedStream = new MediaStream([
          ...displayStream.getVideoTracks(),
          ...destination.stream.getAudioTracks()
        ])
      } else {
        combinedStream = new MediaStream([
          ...displayStream.getVideoTracks(),
          ...micStream.getAudioTracks()
        ])
      }

      allTracksRef.current = [...displayStream.getTracks(), ...micStream.getTracks()]

      const mediaRecorder = new MediaRecorder(combinedStream, { mimeType: 'video/webm' })
      mediaRecorderRef.current = mediaRecorder
      chunksRef.current = []

      mediaRecorder.ondataavailable = (e: BlobEvent): void => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data)
        }
      }

      mediaRecorder.onstop = async (): Promise<void> => {
        setIsProcessing(true)
        try {
          const videoMicBlob = new Blob(chunksRef.current, { type: 'video/webm' })

          if (isMac) {
            console.log('[useMediaRecorder] Stopping Swift audio capture...')
            const systemAudioPath = await window.api.stopSystemAudio()

            if (systemAudioPath) {
              console.log(
                `[useMediaRecorder] Got system audio path: ${systemAudioPath}, merging via FFmpeg...`
              )
              const videoBuffer = await videoMicBlob.arrayBuffer()
              await window.api.mergeAndSaveRecording(videoBuffer, systemAudioPath, title)
            } else {
              console.warn(
                '[useMediaRecorder] No system audio data received, saving video+mic only'
              )
              const videoBuffer = await videoMicBlob.arrayBuffer()
              await window.api.saveRecording(videoBuffer, title)
            }
          } else {
            const videoBuffer = await videoMicBlob.arrayBuffer()
            await window.api.saveRecording(videoBuffer, title)
          }
        } catch (err) {
          console.error('[useMediaRecorder] Error processing recording:', err)
        }

        allTracksRef.current.forEach((t) => t.stop())
        if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
          audioContextRef.current.close()
          audioContextRef.current = null
        }
        setIsProcessing(false)
      }

      mediaRecorder.start(1000)
      setIsRecording(true)
    } catch (err: unknown) {
      if (platform === 'darwin') {
        await window.api.stopSystemAudio().catch(() => {})
      }
      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError('An unknown error occurred during recording initialization')
      }
    }
  }

  const stopRecording = (): void => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
    }
  }

  return {
    isRecording,
    isProcessing,
    error,
    setError,
    platform,
    startRecording,
    stopRecording
  }
}
