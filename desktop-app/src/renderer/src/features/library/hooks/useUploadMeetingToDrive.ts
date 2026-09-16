import { useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../../../lib/api'
import { useAuth } from '../../auth/hooks/useAuth'

interface UploadMeetingToDriveParams {
  meetingId: string
  videoPath: string
  title: string
}

interface UseUploadMeetingToDriveReturn {
  uploadMeetingToDrive: (params: UploadMeetingToDriveParams) => Promise<string | null>
  isUploading: boolean
}

export function useUploadMeetingToDrive(): UseUploadMeetingToDriveReturn {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  const mutation = useMutation<string | null, Error, UploadMeetingToDriveParams>({
    mutationFn: async ({ meetingId, videoPath, title }) => {
      if (!user) throw new Error('Not authenticated')
      if (!window.api?.uploadToDrive) throw new Error('Drive API not available')

      const isLinkSharing = localStorage.getItem('drive_link_sharing') !== 'false'
      const driveUrl = await window.api.uploadToDrive(videoPath, title, isLinkSharing)

      if (!driveUrl) {
        throw new Error('Google Drive upload failed.')
      }

      // Update backend meeting record with videoUrl
      await api.patch('/api/meetings', {
        id: meetingId,
        videoUrl: driveUrl
      })

      return driveUrl
    },
    onSuccess: (_data, { meetingId }) => {
      queryClient.invalidateQueries({ queryKey: ['meetings'] })
      queryClient.invalidateQueries({ queryKey: ['meeting', meetingId] })
    }
  })

  return {
    uploadMeetingToDrive: mutation.mutateAsync,
    isUploading: mutation.isPending
  }
}
