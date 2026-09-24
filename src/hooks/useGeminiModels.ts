import { useQuery } from '@tanstack/react-query';
import { fetchGeminiModels, GeminiModelInfo } from '../services/gemini';

export const GEMINI_MODELS_QUERY_KEY = ['gemini-models'];

export function useGeminiModelsQuery(apiKey: string | undefined) {
  const cleanKey = apiKey?.trim() || '';

  return useQuery<GeminiModelInfo[], Error>({
    queryKey: [...GEMINI_MODELS_QUERY_KEY, cleanKey],
    queryFn: async () => {
      if (!cleanKey) return [];
      return await fetchGeminiModels(cleanKey);
    },
    enabled: Boolean(cleanKey && cleanKey.length > 5),
    staleTime: 1000 * 60 * 10, // 10 minutes cache
    retry: 1
  });
}
