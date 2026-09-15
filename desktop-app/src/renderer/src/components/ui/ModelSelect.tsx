import React from 'react'
import { Sparkles } from 'lucide-react'

export interface ModelOption {
  name: string
  displayName: string
  description: string
  inputTokenLimit: number
  outputTokenLimit: number
}

interface ModelSelectProps {
  models: ModelOption[]
  selectedModel: string
  onSelectModel: (model: string) => void
  disabled?: boolean
  isLoading?: boolean
  className?: string
}

/**
 * Pure presentational model selector.
 * All state management happens in useGeminiModels hook.
 */
export const ModelSelect: React.FC<ModelSelectProps> = ({
  models,
  selectedModel,
  onSelectModel,
  disabled = false,
  isLoading = false,
  className = ''
}) => {
  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex items-center justify-between">
        <label
          htmlFor="ai-model-select"
          className="flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider text-[#737373]"
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
          Transcription Model
        </label>
        {isLoading && (
          <span className="text-[10px] font-mono text-[#a0a0a0] animate-pulse">
            Fetching models...
          </span>
        )}
      </div>

      <select
        id="ai-model-select"
        value={selectedModel}
        onChange={(e) => onSelectModel(e.target.value)}
        disabled={disabled || isLoading || models.length === 0}
        className="w-full rounded-lg border border-[#e2e0d8] bg-white px-3.5 py-2.5 text-sm text-[#1a1a1a] transition-all focus:border-[#2d2d2d] focus:outline-none focus:ring-1 focus:ring-[#2d2d2d] disabled:opacity-50 disabled:bg-[#f4f3f0] cursor-pointer"
      >
        {models.length === 0 ? (
          <option value="" disabled>
            {isLoading ? 'Loading models...' : 'Enter API key to see models'}
          </option>
        ) : (
          models.map((m) => (
            <option key={m.name} value={m.name}>
              {m.displayName}
            </option>
          ))
        )}
      </select>
    </div>
  )
}
