import { useQuery, UseQueryResult } from '@tanstack/react-query'
import api from '../../../lib/api'
import { AxiosError } from 'axios'
import { useAuth } from '../../auth/hooks/useAuth'
import { Meeting, normalizeMeeting } from './useMeetings'

export const useMeeting = (meetingId?: string): UseQueryResult<Meeting | null, Error> => {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['meeting', meetingId, user?.uid],
    queryFn: async () => {
      if (!meetingId || !user) return null

      try {
        const res = await api.get(`/api/meetings?id=${meetingId}`)
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
