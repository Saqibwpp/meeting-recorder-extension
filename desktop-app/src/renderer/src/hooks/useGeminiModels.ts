import { useQuery, UseQueryResult } from '@tanstack/react-query'
import { useApiKey } from './useApiKey'
import { useState, useEffect, useCallback } from 'react'

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
  refetch: () => Promise<unknown>
}

const STORAGE_KEY = 'selected_gemini_model'

export function useGeminiModels(): UseGeminiModelsReturn {
  const { apiKey } = useApiKey()
  const [selectedModel, setLocalSelectedModel] = useState<string>(() => {
    return localStorage.getItem(STORAGE_KEY) || ''
  })

  useEffect(() => {
    const handleStorageChange = (): void => {
      const stored = localStorage.getItem(STORAGE_KEY) || ''
      setLocalSelectedModel(stored)
    }
    window.addEventListener('storage', handleStorageChange)
    window.addEventListener('embrace_model_changed', handleStorageChange)
    return () => {
      window.removeEventListener('storage', handleStorageChange)
      window.removeEventListener('embrace_model_changed', handleStorageChange)
    }
  }, [])

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
    staleTime: 10 * 60 * 1000,
    retry: 1
  })

  const models = query.data ?? []

  // Derive the active model
  const isValidSelection = models.some((m) => m.name === selectedModel)
  const effectiveModel = isValidSelection ? selectedModel : models[0]?.name || ''

  const handleSetSelectedModel = useCallback((modelName: string) => {
    localStorage.setItem(STORAGE_KEY, modelName)
    setLocalSelectedModel(modelName)
    window.dispatchEvent(new Event('embrace_model_changed'))
  }, [])

  const selectedModelInfo = models.find((m) => m.name === effectiveModel)

  return {
    models,
    selectedModel: effectiveModel,
    selectedModelInfo,
    setSelectedModel: handleSetSelectedModel,
    isLoading: query.isLoading,
    query,
    refetch: query.refetch
  }
}
