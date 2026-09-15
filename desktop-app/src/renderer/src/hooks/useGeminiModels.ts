import { useQuery, UseQueryResult } from '@tanstack/react-query'
import { useApiKey } from './useApiKey'
import { useState, useCallback } from 'react'

export interface GeminiModelOption {
  name: string
  displayName: string
  description: string
  inputTokenLimit: number
  outputTokenLimit: number
}

interface UseGeminiModelsReturn {
  models: GeminiModelOption[]
  selectedModel: string
  selectedModelInfo: GeminiModelOption | undefined
  setSelectedModel: (modelName: string) => void
  isLoading: boolean
  query: UseQueryResult<GeminiModelOption[], Error>
}

/**
 * Single source of truth for Gemini model selection.
 * Fetches models from the API via react-query, falls back to hardcoded list.
 * No localStorage — always defaults to the recommended model on app start.
 */
export function useGeminiModels(): UseGeminiModelsReturn {
  const { apiKey } = useApiKey()
  const [selectedModel, setSelectedModel] = useState<string>('')

  const query = useQuery<GeminiModelOption[], Error>({
    queryKey: ['gemini-models', apiKey],
    queryFn: async () => {
      if (!apiKey || !window.api?.getGeminiModels) {
        return []
      }
      const models = await window.api.getGeminiModels(apiKey)
      return models || []
    },
    enabled: !!apiKey,
    staleTime: 10 * 60 * 1000, // Cache for 10 minutes
    retry: 1
  })

  const models = query.data ?? []

  // Derive the active model purely during render (avoids useEffect cascading renders)
  const isValidSelection = models.some((m) => m.name === selectedModel)
  const effectiveModel = isValidSelection ? selectedModel : models[0]?.name || ''

  const handleSetSelectedModel = useCallback((modelName: string) => {
    setSelectedModel(modelName)
  }, [])

  const selectedModelInfo = models.find((m) => m.name === effectiveModel)

  return {
    models,
    selectedModel: effectiveModel,
    selectedModelInfo,
    setSelectedModel: handleSetSelectedModel,
    isLoading: query.isLoading,
    query
  }
}
