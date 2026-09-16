import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

export function useLaunchAtLogin(): {
  isLaunchAtLogin: boolean
  isLoading: boolean
  toggleLaunchAtLogin: (enabled: boolean) => Promise<boolean>
  isUpdating: boolean
} {
  const queryClient = useQueryClient()

  const { data: isLaunchAtLogin = false, isLoading } = useQuery<boolean, Error>({
    queryKey: ['launch-at-login'],
    queryFn: async () => {
      if (!window.api?.getLaunchAtLogin) return false
      return window.api.getLaunchAtLogin()
    }
  })

  const mutation = useMutation<boolean, Error, boolean>({
    mutationFn: async (enabled: boolean) => {
      if (!window.api?.setLaunchAtLogin) return false
      return window.api.setLaunchAtLogin(enabled)
    },
    onSuccess: (newValue) => {
      queryClient.setQueryData(['launch-at-login'], newValue)
    }
  })

  return {
    isLaunchAtLogin,
    isLoading,
    toggleLaunchAtLogin: mutation.mutateAsync,
    isUpdating: mutation.isPending
  }
}
