import { useQuery } from '@tanstack/react-query';
import { User } from 'firebase/auth';

export interface TranscriptSegment {
  id?: string | number;
  startTime?: string;
  endTime?: string;
  speaker?: string;
  channel?: string;
  text: string;
}

export interface MeetingItem {
  id: string;
  title: string;
  startTime: number;
  durationSeconds: number;
  audioUrl?: string;
  transcript?: {
    title?: string;
    summary?: string;
    actionItems?: string[];
    date?: string;
    durationSeconds?: number;
    engine?: string;
    meetingId?: string;
    segments?: TranscriptSegment[];
  };
}

export function useMeetings(user: User | null) {
  return useQuery({
    queryKey: ['meetings', user?.uid],
    queryFn: async () => {
      if (!user) throw new Error('Not authenticated');
      const token = await user.getIdToken();
      const res = await fetch('/api/meetings', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        throw new Error('Failed to fetch meetings');
      }
      const data = await res.json();
      return (data.meetings || []) as MeetingItem[];
    },
    enabled: !!user,
  });
}
