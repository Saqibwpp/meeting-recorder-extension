import { useCallback } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'

const STORAGE_KEY = 'embrace_gemini_api_key'

interface ApiKeyState {
  apiKey: string
  setApiKey: (key: string) => void
  clearApiKey: () => void
  isConfigured: boolean
}

/**
 * BYOK (Bring Your Own Key) hook for managing the user's Gemini API key.
 * Uses TanStack Query as a global state manager to ensure instantly reactive updates
 * across all components without needing useEffect or custom window events.
 */
export function useApiKey(): ApiKeyState {
  const queryClient = useQueryClient()

  // Use React Query to read from localStorage and provide reactive state globally
  const { data: apiKey = '' } = useQuery({
    queryKey: ['api-key'],
    queryFn: () => localStorage.getItem(STORAGE_KEY) || '',
    staleTime: Infinity // Local data doesn't go stale
  })

  const setApiKey = useCallback(
    (key: string): void => {
      const trimmed = key.trim()
      if (trimmed) {
        localStorage.setItem(STORAGE_KEY, trimmed)
      } else {
        localStorage.removeItem(STORAGE_KEY)
      }
      // Instantly update the query cache, triggering all subscribers to re-render
      queryClient.setQueryData(['api-key'], trimmed)
    },
    [queryClient]
  )

  const clearApiKey = useCallback((): void => {
    localStorage.removeItem(STORAGE_KEY)
    queryClient.setQueryData(['api-key'], '')
  }, [queryClient])

  return {
    apiKey,
    setApiKey,
    clearApiKey,
    isConfigured: apiKey.length > 0
  }
}
