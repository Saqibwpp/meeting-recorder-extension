import React, { useState, useRef, useEffect, useCallback } from 'react'
import { Mic, Monitor, StopCircle, Play, Video, Loader2, AlertTriangle } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'

const recordingSchema = z.object({
  title: z.string().min(3, 'Meeting title must be at least 3 characters')
})

type RecordingForm = z.infer<typeof recordingSchema>

// Known Bluetooth device keywords to detect wireless mics
const BLUETOOTH_KEYWORDS = [
  'bluetooth',
  'airpods',
  'beats',
  'bose',
  'sony wh',
  'sony wf',
  'jabra',
  'galaxy buds',
  'jbl',
  'sennheiser',
  'wireless'
]

function isBluetoothDevice(label: string): boolean {
  const lower = label.toLowerCase()
  return BLUETOOTH_KEYWORDS.some((keyword) => lower.includes(keyword))
}

export default function App(): React.ReactElement {
  const [isRecording, setIsRecording] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [platform, setPlatform] = useState<string>('darwin')

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const audioContextRef = useRef<AudioContext | null>(null)
  const allTracksRef = useRef<MediaStreamTrack[]>([])

  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<RecordingForm>({
    resolver: zodResolver(recordingSchema),
    defaultValues: { title: 'New Meeting' }
  })

  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([])
  const [selectedMicId, setSelectedMicId] = useState<string>('')

  // Detect platform on mount
  useEffect(() => {
    window.api.getPlatform().then((p) => setPlatform(p))
  }, [])

  // Fetch available audio devices
  const refreshDevices = useCallback(async (): Promise<void> => {
    try {
      // Request initial permission to get full device labels
      await navigator.mediaDevices
        .getUserMedia({ audio: true })
        .then((s) => s.getTracks().forEach((t) => t.stop()))
      const devices = await navigator.mediaDevices.enumerateDevices()
      const mics = devices.filter((d) => d.kind === 'audioinput')
      setAudioDevices(mics)

      // Only auto-select if no mic is currently chosen
      setSelectedMicId((currentId) => {
        const stillExists = mics.some((m) => m.deviceId === currentId)
        if (currentId && stillExists) return currentId

        // Try to default to the Built-in microphone
        const builtIn = mics.find(
          (m) =>
            m.label.toLowerCase().includes('built-in') || m.label.toLowerCase().includes('macbook')
        )
        if (builtIn) return builtIn.deviceId
        if (mics.length > 0) return mics[0].deviceId
        return ''
      })
    } catch (err) {
      console.error('Error fetching devices', err)
    }
  }, [])

  // Auto-refresh device list on mount and when devices are connected/disconnected
  useEffect(() => {
    // Defer initial fetch to next tick to avoid synchronous setState in effect body
    const timeoutId = setTimeout(() => {
      refreshDevices()
    }, 0)

    navigator.mediaDevices.addEventListener('devicechange', refreshDevices)
    return (): void => {
      clearTimeout(timeoutId)
      navigator.mediaDevices.removeEventListener('devicechange', refreshDevices)
    }
  }, [refreshDevices])

  // Check if the currently selected mic is Bluetooth
  const selectedDevice = audioDevices.find((d) => d.deviceId === selectedMicId)
  const isBluetoothSelected = selectedDevice ? isBluetoothDevice(selectedDevice.label) : false

  const startRecording = async (data: RecordingForm): Promise<void> => {
    setError(null)
    try {
      const isMac = platform === 'darwin'

      // Start Swift system audio capture on macOS
      if (isMac) {
        await window.api.startSystemAudio()
        console.log('[Renderer] Swift system audio capture started')
      }

      // Prompt for Screen (+ system audio on Windows via loopback)
      const displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: isMac
          ? false // macOS: Swift handles system audio
          : {
              // Windows: capture system audio via loopback
              echoCancellation: false,
              noiseSuppression: false,
              autoGainControl: false
            }
      })

      // Prompt for Microphone
      const micStream = await navigator.mediaDevices.getUserMedia({
        audio: selectedMicId ? { deviceId: { exact: selectedMicId } } : true
      })

      console.log('--- AUDIO DEBUG ---')
      console.log('Platform:', platform)
      console.log('System Audio via:', isMac ? 'Swift (native)' : 'Chromium loopback')
      console.log('Display Audio Tracks:', displayStream.getAudioTracks().length)
      console.log('Microphone Audio Tracks:', micStream.getAudioTracks().length)
      console.log('Selected Mic:', audioDevices.find((d) => d.deviceId === selectedMicId)?.label)

      let combinedStream: MediaStream

      if (!isMac && displayStream.getAudioTracks().length > 0) {
        // Windows: mix display audio + mic audio using AudioContext
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
        // macOS: only mic audio in the MediaRecorder (system audio merged after stop)
        combinedStream = new MediaStream([
          ...displayStream.getVideoTracks(),
          ...micStream.getAudioTracks()
        ])
      }

      // Keep reference to all original tracks for cleanup
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
            // Get system audio path from Swift
            console.log('[Renderer] Stopping Swift audio capture...')
            const systemAudioPath = await window.api.stopSystemAudio()

            if (systemAudioPath) {
              console.log(
                `[Renderer] Got system audio path: ${systemAudioPath}, merging via FFmpeg...`
              )
              const videoBuffer = await videoMicBlob.arrayBuffer()
              await window.api.mergeAndSaveRecording(videoBuffer, systemAudioPath, data.title)
            } else {
              console.warn('[Renderer] No system audio data received, saving video+mic only')
              const videoBuffer = await videoMicBlob.arrayBuffer()
              await window.api.saveRecording(videoBuffer, data.title)
            }
          } else {
            // Windows: everything is already mixed
            const videoBuffer = await videoMicBlob.arrayBuffer()
            await window.api.saveRecording(videoBuffer, data.title)
          }
        } catch (err) {
          console.error('[Renderer] Error processing recording:', err)
        }

        // Cleanup tracks
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
      // If recording fails, make sure to stop Swift process too
      if (platform === 'darwin') {
        await window.api.stopSystemAudio().catch(() => {})
      }
      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError('An unknown error occurred')
      }
    }
  }

  const stopRecording = (): void => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
    }
  }

  const handleFormSubmit = (e: React.FormEvent<HTMLFormElement>): void => {
    e.preventDefault()
    handleSubmit(startRecording)(e)
  }

  return (
    <div className="flex h-screen flex-col items-center justify-center bg-slate-900 text-slate-100 font-sans p-6">
      <div className="max-w-md w-full bg-slate-800 rounded-2xl shadow-2xl overflow-hidden border border-slate-700">
        <div className="p-8">
          <div className="flex justify-center mb-6">
            <div
              className={`p-4 rounded-full ${isRecording ? 'bg-red-500/20 text-red-500 animate-pulse' : 'bg-indigo-500/20 text-indigo-400'}`}
            >
              <Video size={48} />
            </div>
          </div>

          <h1 className="text-2xl font-bold text-center mb-2">Meeting Recorder</h1>
          <p className="text-slate-400 text-center mb-8 text-sm">
            Capture your screen, microphone, and system audio.
          </p>

          {error && (
            <div className="bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-3 rounded-lg mb-6 text-sm">
              {error}
            </div>
          )}

          {!isRecording ? (
            <form onSubmit={handleFormSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Meeting Title
                </label>
                <input
                  {...register('title')}
                  className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-3 text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                  placeholder="e.g. Product Sync"
                />
                {errors.title && (
                  <p className="text-red-400 text-xs mt-2">{errors.title.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Microphone</label>
                <select
                  value={selectedMicId}
                  onChange={(e): void => setSelectedMicId(e.target.value)}
                  disabled={isRecording}
                  className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-3 text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 transition-all"
                >
                  {audioDevices.length === 0 && <option value="">Loading microphones...</option>}
                  {audioDevices.map((mic) => (
                    <option key={mic.deviceId} value={mic.deviceId}>
                      {mic.label || `Microphone ${mic.deviceId.slice(0, 5)}...`}
                    </option>
                  ))}
                </select>
              </div>

              {/* Bluetooth warning banner */}
              {isBluetoothSelected && (
                <div className="flex items-start gap-3 bg-amber-500/10 border border-amber-500/40 text-amber-300 px-4 py-3 rounded-lg text-sm">
                  <AlertTriangle size={20} className="flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium mb-1">Bluetooth microphone detected</p>
                    <p className="text-amber-300/80 text-xs leading-relaxed">
                      Using a wireless mic will reduce your voice recording to phone-call quality
                      (8kHz mono). For best results, select{' '}
                      <strong>&quot;MacBook Air Microphone (Built-in)&quot;</strong> above. Wired
                      headphone mics work fine.
                    </p>
                  </div>
                </div>
              )}

              {/* Non-bluetooth helper text */}
              {!isBluetoothSelected && (
                <p className="text-xs text-slate-500 -mt-3">
                  Devices update automatically when connected or disconnected.
                </p>
              )}

              <button
                type="submit"
                disabled={isRecording || isProcessing}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors shadow-lg shadow-indigo-500/30 disabled:opacity-50"
              >
                <Play size={20} />
                Start Recording
              </button>
            </form>
          ) : (
            <div className="space-y-6 flex flex-col items-center">
              <div className="flex gap-4">
                <div className="flex items-center gap-2 text-indigo-400 bg-indigo-400/10 px-3 py-1.5 rounded-full text-sm">
                  <Monitor size={16} /> Screen
                </div>
                <div className="flex items-center gap-2 text-indigo-400 bg-indigo-400/10 px-3 py-1.5 rounded-full text-sm">
                  <Mic size={16} /> Audio
                </div>
              </div>

              <button
                onClick={stopRecording}
                className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors shadow-lg shadow-red-500/30 group"
              >
                <StopCircle size={20} className="group-hover:scale-110 transition-transform" />
                Stop Recording
              </button>
            </div>
          )}
        </div>

        {isProcessing && (
          <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm flex flex-col items-center justify-center z-10">
            <Loader2 className="animate-spin text-indigo-500 mb-4" size={48} />
            <p className="text-lg font-medium animate-pulse">Processing Recording...</p>
          </div>
        )}
      </div>
    </div>
  )
}
