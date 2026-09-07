import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ExtensionSettings } from '../types';
import { getStoredSettings, saveStoredSettings } from '../services/storage';

export const SETTINGS_QUERY_KEY = ['settings'];

export function useSettingsQuery() {
  return useQuery<ExtensionSettings, Error>({
    queryKey: SETTINGS_QUERY_KEY,
    queryFn: async () => {
      return await getStoredSettings();
    }
  });
}

export function useUpdateSettingsMutation() {
  const queryClient = useQueryClient();

  return useMutation<ExtensionSettings, Error, Partial<ExtensionSettings>>({
    mutationFn: async (newSettings) => {
      return await saveStoredSettings(newSettings);
    },
    onSuccess: () => {
      // Invalidation handled exclusively within custom hook
      queryClient.invalidateQueries({ queryKey: SETTINGS_QUERY_KEY });
    }
  });
}
