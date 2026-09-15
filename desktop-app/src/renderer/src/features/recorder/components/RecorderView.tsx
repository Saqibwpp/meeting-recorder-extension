import React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Video, Mic, Monitor, StopCircle, Play, Loader2, AlertTriangle } from 'lucide-react'
import { useAudioDevices } from '../hooks/useAudioDevices'
import { useMediaRecorder } from '../hooks/useMediaRecorder'
import { useGeminiModels } from '../../../hooks/useGeminiModels'
import { useApiKey } from '../../../hooks/useApiKey'
import { DeviceSelect } from './DeviceSelect'
import { ModelSelect } from '../../../components/ui/ModelSelect'
import { Card } from '../../../components/ui/Card'
import { Input } from '../../../components/ui/Input'
import { Button } from '../../../components/ui/Button'
import { Alert } from '../../../components/ui/Alert'
import { Link } from 'react-router-dom'

const recordingSchema = z.object({
  title: z.string().min(3, 'Meeting title must be at least 3 characters')
})

type RecordingFormData = z.infer<typeof recordingSchema>

export const RecorderView: React.FC = () => {
  const {
    audioDevices,
    selectedMicId,
    setSelectedMicId,
    isBluetoothSelected,
    isLoading: isDevicesLoading
  } = useAudioDevices()

  const {
    models,
    selectedModel,
    setSelectedModel,
    selectedModelInfo,
    isLoading: modelsLoading
  } = useGeminiModels()

  const { isConfigured: hasApiKey } = useApiKey()

  const { isRecording, isProcessing, error, platform, startRecording, stopRecording } =
    useMediaRecorder()

  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<RecordingFormData>({
    resolver: zodResolver(recordingSchema),
    defaultValues: {
      title: 'Product Sync'
    }
  })

  const onSubmit = (data: RecordingFormData): void => {
    startRecording(data.title, selectedMicId, selectedModel)
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-full p-6">
      <Card className="max-w-[480px] w-full p-8 relative">
        {/* Top Status Header */}
        <div className="flex items-center justify-between pb-6 border-b border-[#e2e0d8] mb-6">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${
                isRecording
                  ? 'bg-red-50 text-red-600 border border-red-200'
                  : 'bg-[#f4f3f0] text-[#1a1a1a] border border-[#e2e0d8]'
              }`}
            >
              <Video className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-[#1a1a1a]">Meeting Recorder</h2>
              <p className="text-xs text-[#737373]">
                {platform === 'darwin'
                  ? 'macOS Native Swift Audio + Screen'
                  : 'Windows WASAPI Loopback + Screen'}
              </p>
            </div>
          </div>

          {isRecording ? (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-50 border border-red-200">
              <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse" />
              <span className="text-[10px] font-mono uppercase tracking-wider text-red-700 font-semibold">
                Live
              </span>
            </div>
          ) : (
            <span className="font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 rounded bg-[#f4f3f0] text-[#737373] border border-[#e2e0d8]">
              Ready
            </span>
          )}
        </div>

        {error && (
          <Alert type="error" title="Recording Error" className="mb-6">
            {error}
          </Alert>
        )}

        {/* API Key Warning */}
        {!hasApiKey && !isRecording && (
          <div className="flex items-center gap-3 mb-6 px-4 py-3 rounded-lg bg-amber-50 border border-amber-200">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-amber-800">No API key configured</p>
              <p className="text-xs text-amber-600 mt-0.5">
                Recording will work, but transcription requires a Gemini API key.
              </p>
            </div>
            <Link
              to="/settings"
              className="text-xs font-medium text-amber-700 hover:text-amber-900 underline shrink-0"
            >
              Settings
            </Link>
          </div>
        )}

        {!isRecording ? (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <Input
              label="Meeting Title"
              placeholder="e.g. Design Critique & Planning"
              error={errors.title?.message}
              {...register('title')}
            />

            <DeviceSelect
              devices={audioDevices}
              selectedDeviceId={selectedMicId}
              onSelectDevice={setSelectedMicId}
              isBluetoothSelected={isBluetoothSelected}
              isLoading={isDevicesLoading}
            />

            <ModelSelect
              models={models}
              selectedModel={selectedModel}
              onSelectModel={setSelectedModel}
              disabled={isProcessing}
              isLoading={modelsLoading}
            />

            <div className="pt-2">
              <Button
                type="submit"
                variant="primary"
                size="lg"
                className="w-full flex items-center justify-center gap-2"
                disabled={isProcessing}
              >
                <Play className="w-4 h-4 fill-current" />
                Start Recording
              </Button>
            </div>
          </form>
        ) : (
          <div className="space-y-6 py-4 flex flex-col items-center">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#faf9f6] border border-[#e2e0d8] text-xs text-[#1a1a1a]">
                <Monitor className="w-3.5 h-3.5 text-[#737373]" /> Screen Capture
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#faf9f6] border border-[#e2e0d8] text-xs text-[#1a1a1a]">
                <Mic className="w-3.5 h-3.5 text-[#737373]" /> Dual Audio (Sys + Mic)
              </div>
            </div>

            {selectedModelInfo && (
              <div className="text-xs text-[#737373] font-mono">
                Model: {selectedModelInfo.displayName}
              </div>
            )}

            <div className="w-full pt-4">
              <Button
                type="button"
                variant="danger"
                size="lg"
                onClick={stopRecording}
                className="w-full flex items-center justify-center gap-2 shadow-md"
              >
                <StopCircle className="w-5 h-5" />
                Stop &amp; Save Recording
              </Button>
            </div>
          </div>
        )}

        {/* Processing overlay modal */}
        {isProcessing && (
          <div className="absolute inset-0 bg-white/90 backdrop-blur-sm flex flex-col items-center justify-center z-20 rounded-xl">
            <Loader2 className="animate-spin text-[#2d2d2d] mb-3" size={36} />
            <p className="text-sm font-semibold text-[#1a1a1a]">
              Merging &amp; Saving Audio/Video...
            </p>
            <p className="text-xs text-[#737373] mt-1">
              Please choose a location to save your WebM file.
            </p>
          </div>
        )}
      </Card>
    </div>
  )
}
