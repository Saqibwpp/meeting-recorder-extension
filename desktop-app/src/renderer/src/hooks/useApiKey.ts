import { useState, useCallback } from 'react'

const STORAGE_KEY = 'embrace_gemini_api_key'

interface ApiKeyState {
  apiKey: string
  setApiKey: (key: string) => void
  clearApiKey: () => void
  isConfigured: boolean
}

/**
 * BYOK (Bring Your Own Key) hook for managing the user's Gemini API key.
 * Stored in localStorage — no env vars needed.
 */
export function useApiKey(): ApiKeyState {
  const [apiKey, setApiKeyState] = useState<string>(() => {
    return localStorage.getItem(STORAGE_KEY) || ''
  })

  const setApiKey = useCallback((key: string) => {
    const trimmed = key.trim()
    setApiKeyState(trimmed)
    if (trimmed) {
      localStorage.setItem(STORAGE_KEY, trimmed)
    } else {
      localStorage.removeItem(STORAGE_KEY)
    }
  }, [])

  const clearApiKey = useCallback(() => {
    setApiKeyState('')
    localStorage.removeItem(STORAGE_KEY)
  }, [])

  return {
    apiKey,
    setApiKey,
    clearApiKey,
    isConfigured: apiKey.length > 0
  }
}
