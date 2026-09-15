import { useMutation, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import { useAuth } from '../../auth/hooks/useAuth'
import { useApiKey } from '../../../hooks/useApiKey'

interface RetryTranscriptionParams {
  meetingId: string
  audioPath: string
  title: string
  selectedModel: string
}

interface UseRetryTranscriptionReturn {
  retryTranscription: (params: RetryTranscriptionParams) => void
  isRetrying: boolean
}

/**
 * Extracted retry transcription logic from PlayerView.
 * Handles the full flow: set status → call Gemini → save result or error.
 */
export function useRetryTranscription(): UseRetryTranscriptionReturn {
  const { user } = useAuth()
  const { apiKey } = useApiKey()
  const queryClient = useQueryClient()

  const mutation = useMutation<void, Error, RetryTranscriptionParams>({
    mutationFn: async ({ meetingId, audioPath, title, selectedModel }) => {
      if (!user) throw new Error('Not authenticated')
      if (!apiKey) throw new Error('No API key configured. Go to Settings to add one.')

      const token = await user.getIdToken()

      // 1. Set status to processing
      await axios.patch(
        `${import.meta.env.VITE_BACKEND_URL}/api/meetings`,
        { id: meetingId, status: 'processing' },
        { headers: { Authorization: `Bearer ${token}` } }
      )

      // 2. Call Gemini via IPC
      const transcript = (await window.api.transcribeAudio(
        audioPath,
        apiKey,
        title,
        selectedModel
      )) as Record<string, unknown>

      // 3. Save success
      await axios.patch(
        `${import.meta.env.VITE_BACKEND_URL}/api/meetings`,
        { id: meetingId, ...transcript, status: 'completed' },
        { headers: { Authorization: `Bearer ${token}` } }
      )
    },
    onError: async (_error, { meetingId }) => {
      // PATCH status: error
      if (!user) return
      try {
        const token = await user.getIdToken()
        await axios.patch(
          `${import.meta.env.VITE_BACKEND_URL}/api/meetings`,
          {
            id: meetingId,
            status: 'error',
            errorMessage: _error.message
          },
          { headers: { Authorization: `Bearer ${token}` } }
        )
      } catch (patchErr) {
        console.error('Failed to update error status:', patchErr)
      }
    },
    onSettled: (_data, _error, { meetingId }) => {
      queryClient.invalidateQueries({ queryKey: ['meetings'] })
      queryClient.invalidateQueries({ queryKey: ['meeting', meetingId] })
    }
  })

  return {
    retryTranscription: mutation.mutate,
    isRetrying: mutation.isPending
  }
}
