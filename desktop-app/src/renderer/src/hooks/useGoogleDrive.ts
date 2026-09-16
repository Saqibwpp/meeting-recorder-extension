import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

export function useGoogleDrive(): {
  isConnected: boolean
  isLoading: boolean
  connect: () => Promise<boolean>
  disconnect: () => Promise<void>
  isConnecting: boolean
  isDisconnecting: boolean
} {
  const queryClient = useQueryClient()

  // Fetch the current connection status
  const { data: isConnected = false, isLoading } = useQuery({
    queryKey: ['google-drive-status'],
    queryFn: async () => {
      if (!window.api?.checkDriveStatus) return false
      return window.api.checkDriveStatus()
    }
  })

  // Mutation to connect to Google Drive
  const connectMutation = useMutation({
    mutationFn: async () => {
      if (!window.api?.connectDrive) throw new Error('API not available')
      return window.api.connectDrive()
    },
    onSuccess: () => {
      // Invalidate the status query to trigger a re-fetch
      queryClient.invalidateQueries({ queryKey: ['google-drive-status'] })
    }
  })

  // Mutation to disconnect from Google Drive
  const disconnectMutation = useMutation({
    mutationFn: async () => {
      if (!window.api?.disconnectDrive) throw new Error('API not available')
      return window.api.disconnectDrive()
    },
    onSuccess: () => {
      queryClient.setQueryData(['google-drive-status'], false)
    }
  })

  return {
    isConnected,
    isLoading,
    connect: connectMutation.mutateAsync,
    disconnect: disconnectMutation.mutateAsync,
    isConnecting: connectMutation.isPending,
    isDisconnecting: disconnectMutation.isPending
  }
}
