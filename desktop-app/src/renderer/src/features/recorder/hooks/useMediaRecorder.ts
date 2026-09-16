import api from '../../../lib/api'
import { useState, useRef, useEffect, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useApiKey } from '../../../hooks/useApiKey'

export interface MediaRecorderState {
  isRecording: boolean
  isProcessing: boolean
  elapsedSeconds: number
  error: string | null
  setError: React.Dispatch<React.SetStateAction<string | null>>
  platform: string
  startRecording: (title: string, selectedMicId: string, modelName: string) => Promise<void>
  stopRecording: () => void
}

export function useMediaRecorder(): MediaRecorderState {
  const queryClient = useQueryClient()
  const { apiKey } = useApiKey()
  const [isRecording, setIsRecording] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [platform, setPlatform] = useState<string>('darwin')

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const audioContextRef = useRef<AudioContext | null>(null)
  const allTracksRef = useRef<MediaStreamTrack[]>([])
  const startTimeRef = useRef<number>(0)
  const selectedModelRef = useRef<string>('')
  const apiKeyRef = useRef<string>('')
  const platformInitialized = useRef(false)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const currentTitleRef = useRef<string>('')

  // Initialize platform once
  useEffect(() => {
    if (!platformInitialized.current) {
      platformInitialized.current = true
      window.api
        ?.getPlatform()
        .then((p) => setPlatform(p))
        .catch(() => {})
    }
  }, [])

  const stopRecording = useCallback((): void => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
    }
    setIsRecording(false)
    setElapsedSeconds(0)
    window.api?.sendRecordingState({
      isRecording: false,
      elapsedSeconds: 0,
      title: ''
    })
  }, [])

  const startRecording = useCallback(
    async (title: string, selectedMicId: string, modelName: string): Promise<void> => {
      setError(null)
      startTimeRef.current = Date.now()
      selectedModelRef.current = modelName
      apiKeyRef.current = apiKey
      currentTitleRef.current = title || 'Untitled Meeting'

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

        // Combine video track + all audio tracks
        const tracks = [...displayStream.getVideoTracks()]

        if (isMac) {
          tracks.push(...micStream.getAudioTracks())
        } else {
          const audioCtx = new AudioContext()
          audioContextRef.current = audioCtx
          const dest = audioCtx.createMediaStreamDestination()

          if (displayStream.getAudioTracks().length > 0) {
            const sysSource = audioCtx.createMediaStreamSource(
              new MediaStream(displayStream.getAudioTracks())
            )
            sysSource.connect(dest)
          }

          if (micStream.getAudioTracks().length > 0) {
            const micSource = audioCtx.createMediaStreamSource(
              new MediaStream(micStream.getAudioTracks())
            )
            micSource.connect(dest)
          }

          tracks.push(...dest.stream.getAudioTracks())
        }

        allTracksRef.current = [...displayStream.getTracks(), ...micStream.getTracks(), ...tracks]

        const combinedStream = new MediaStream(tracks)
        chunksRef.current = []

        // High quality WebM format with Opus audio
        const mimeType = MediaRecorder.isTypeSupported('video/webm; codecs=vp9,opus')
          ? 'video/webm; codecs=vp9,opus'
          : 'video/webm'

        const mediaRecorder = new MediaRecorder(combinedStream, { mimeType })
        mediaRecorderRef.current = mediaRecorder

        mediaRecorder.ondataavailable = (e: BlobEvent): void => {
          if (e.data.size > 0) {
            chunksRef.current.push(e.data)
          }
        }

        mediaRecorder.onstop = async (): Promise<void> => {
          setIsProcessing(true)
          const durationSeconds = Math.max(
            1,
            Math.round((Date.now() - startTimeRef.current) / 1000)
          )

          // Helper to process transcription and DB updates
          const processRecording = async (paths: {
            videoPath: string
            audioPath: string
          }): Promise<void> => {
            console.log('[useMediaRecorder] Saved to:', paths)
            const meetingId = `meeting_${Date.now()}`
            let backendDocId = meetingId

            try {
              // 1. POST to backend (status: processing)
              const res = await api.post('/api/meetings', {
                id: meetingId,
                title: currentTitleRef.current,
                status: 'processing',
                videoPath: paths.videoPath,
                audioPath: paths.audioPath,
                durationSeconds,
                startTime: startTimeRef.current,
                date: new Date().toISOString(),
                createdAt: new Date().toISOString()
              })
              backendDocId = res.data?.id || meetingId
              console.log('[useMediaRecorder] Created processing doc:', backendDocId)
              queryClient.invalidateQueries({ queryKey: ['meetings'] })
            } catch (e) {
              console.error('[useMediaRecorder] Failed to create processing doc:', e)
            }

            const currentApiKey = apiKeyRef.current
            if (currentApiKey) {
              console.log(
                '[useMediaRecorder] Starting Gemini transcription with model:',
                selectedModelRef.current
              )
              try {
                const transcript = (await window.api.transcribeAudio(
                  paths.audioPath,
                  currentApiKey,
                  currentTitleRef.current,
                  selectedModelRef.current
                )) as Record<string, unknown>
                console.log('[useMediaRecorder] Transcription success:', transcript)

                // 2. PATCH to backend (status: completed)
                if (backendDocId) {
                  await api.patch('/api/meetings', {
                    id: backendDocId,
                    ...transcript,
                    durationSeconds,
                    status: 'completed'
                  })

                  // Auto-upload to Google Drive if connected
                  try {
                    if (window.api?.checkDriveStatus && window.api?.uploadToDrive) {
                      const isDriveConnected = await window.api.checkDriveStatus()
                      if (isDriveConnected) {
                        console.log('[useMediaRecorder] Auto-uploading to Google Drive...')
                        const isLinkSharingEnabled =
                          localStorage.getItem('drive_link_sharing') !== 'false'
                        const driveUrl = await window.api.uploadToDrive(
                          paths.videoPath,
                          currentTitleRef.current,
                          isLinkSharingEnabled
                        )
                        if (driveUrl && backendDocId) {
                          await api.patch('/api/meetings', {
                            id: backendDocId,
                            videoUrl: driveUrl
                          })
                          console.log('[useMediaRecorder] Drive upload complete:', driveUrl)
                        }
                      }
                    }
                  } catch (driveErr) {
                    console.error('[useMediaRecorder] Drive upload failed:', driveErr)
                  }

                  queryClient.invalidateQueries({ queryKey: ['meetings'] })
                  queryClient.invalidateQueries({ queryKey: ['meeting', backendDocId] })
                }
              } catch (err) {
                console.error('[useMediaRecorder] Transcription failed:', err)
                if (backendDocId) {
                  await api.patch('/api/meetings', {
                    id: backendDocId,
                    status: 'error',
                    errorMessage: err instanceof Error ? err.message : 'Unknown error'
                  })
                  queryClient.invalidateQueries({ queryKey: ['meetings'] })
                  queryClient.invalidateQueries({ queryKey: ['meeting', backendDocId] })
                }
              }
            } else {
              console.warn('[useMediaRecorder] No API key configured, skipping transcription')
            }
          }

          try {
            const videoMicBlob = new Blob(chunksRef.current, { type: 'video/webm' })

            if (isMac) {
              console.log('[useMediaRecorder] Stopping Swift audio capture...')
              const systemAudioPath = await window.api.stopSystemAudio()

              let paths: { videoPath: string; audioPath: string } | false = false
              if (systemAudioPath) {
                console.log(
                  `[useMediaRecorder] Got system audio path: ${systemAudioPath}, merging via FFmpeg...`
                )
                const videoBuffer = await videoMicBlob.arrayBuffer()
                paths = await window.api.mergeAndSaveRecording(
                  videoBuffer,
                  systemAudioPath,
                  currentTitleRef.current
                )
              } else {
                console.warn(
                  '[useMediaRecorder] No system audio data received, saving video+mic only'
                )
                const videoBuffer = await videoMicBlob.arrayBuffer()
                paths = await window.api.saveRecording(videoBuffer, currentTitleRef.current)
              }
              if (paths && paths.audioPath) {
                await processRecording(paths)
              }
            } else {
              const videoBuffer = await videoMicBlob.arrayBuffer()
              const paths = await window.api.saveRecording(videoBuffer, currentTitleRef.current)
              if (paths && paths.audioPath) {
                await processRecording(paths)
              }
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
        setElapsedSeconds(0)

        // Broadcast initial state
        window.api?.sendRecordingState({
          isRecording: true,
          elapsedSeconds: 0,
          title: currentTitleRef.current
        })

        // Start interval counter
        let sec = 0
        timerRef.current = setInterval(() => {
          sec += 1
          setElapsedSeconds(sec)
          window.api?.sendRecordingState({
            isRecording: true,
            elapsedSeconds: sec,
            title: currentTitleRef.current
          })
        }, 1000)
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
    },
    [apiKey, platform, queryClient]
  )

  // Listen for Tray IPC triggers
  useEffect(() => {
    const unsubStart = window.api?.onTriggerStartRecording?.((payload) => {
      if (!isRecording) {
        const title = typeof payload === 'string' ? payload : payload?.title || 'Meeting Recording'
        const passedModel = typeof payload === 'object' ? payload?.model : undefined
        const activeModel =
          passedModel ||
          localStorage.getItem('selected_gemini_model') ||
          selectedModelRef.current ||
          ''

        startRecording(title, '', activeModel)
      }
    })

    const unsubStop = window.api?.onTriggerStopRecording?.(() => {
      stopRecording()
    })

    return () => {
      unsubStart?.()
      unsubStop?.()
    }
  }, [isRecording, startRecording, stopRecording])

  return {
    isRecording,
    isProcessing,
    elapsedSeconds,
    error,
    setError,
    platform,
    startRecording,
    stopRecording
  }
}
