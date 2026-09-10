import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { User } from 'firebase/auth';

export interface ApiKeyItem {
  apiKey: string;
  name: string;
  createdAt: string;
  revoked: boolean;
}

export function useApiKeys(user: User | null) {
  return useQuery({
    queryKey: ['apiKeys', user?.uid],
    queryFn: async () => {
      if (!user) throw new Error('Not authenticated');
      const token = await user.getIdToken();
      const res = await fetch('/api/auth/key', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        throw new Error('Failed to fetch API keys');
      }
      const data = await res.json();
      return (data.keys || []) as ApiKeyItem[];
    },
    enabled: !!user,
  });
}

export function useGenerateApiKey() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ user, name }: { user: User; name: string }) => {
      const token = await user.getIdToken();
      const res = await fetch('/api/auth/key', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) {
        throw new Error('Failed to generate API key');
      }
      return res.json();
    },
    onSuccess: (_, { user }) => {
      queryClient.invalidateQueries({ queryKey: ['apiKeys', user.uid] });
    },
  });
}

export function useRevokeApiKey() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ user, apiKey }: { user: User; apiKey: string }) => {
      const token = await user.getIdToken();
      const res = await fetch(`/api/auth/key?apiKey=${encodeURIComponent(apiKey)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        throw new Error('Failed to revoke API key');
      }
      return true;
    },
    onSuccess: (_, { user }) => {
      queryClient.invalidateQueries({ queryKey: ['apiKeys', user.uid] });
    },
  });
}
