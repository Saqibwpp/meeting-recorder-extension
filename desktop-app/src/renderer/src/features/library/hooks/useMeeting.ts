import { useQuery, UseQueryResult } from '@tanstack/react-query'
import axios, { AxiosError } from 'axios'
import { useAuth } from '../../auth/hooks/useAuth'
import { Meeting, normalizeMeeting } from './useMeetings'

export const useMeeting = (meetingId?: string): UseQueryResult<Meeting | null, Error> => {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['meeting', meetingId, user?.uid],
    queryFn: async () => {
      if (!meetingId || !user) return null

      const token = await user.getIdToken()
      try {
        const res = await axios.get(
          `${import.meta.env.VITE_BACKEND_URL}/api/meetings?id=${meetingId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`
            }
          }
        )
        if (!res.data.meeting) return null
        return normalizeMeeting(res.data.meeting as Record<string, unknown>)
      } catch (error) {
        if (error instanceof AxiosError && error.response?.status === 404) {
          return null
        }
        throw error
      }
    },
    enabled: !!meetingId
  })
}
