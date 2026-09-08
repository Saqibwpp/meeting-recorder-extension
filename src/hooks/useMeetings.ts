import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Meeting } from '../types';
import { getStoredMeetings } from '../services/storage';
import axios from 'axios';

export const MEETINGS_QUERY_KEY = ['meetings'];
export const RECORDING_STATUS_KEY = ['recording_status'];

interface RecordingStatusResponse {
  isRecording: boolean;
  currentMeeting: Meeting | null;
  activeTabId: number | null;
}

import { auth } from '../services/firebase';

export function useMeetingsQuery() {
  return useQuery<Meeting[], Error>({
    queryKey: MEETINGS_QUERY_KEY,
    queryFn: async () => {
      // If we're not logged in, just fallback to empty array or local storage
      const user = auth.currentUser;
      if (!user) {
        return await getStoredMeetings();
      }

      const token = await user.getIdToken();
      const apiUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
      const [response, localMeetings] = await Promise.all([
        axios.get(`${apiUrl}/api/meetings`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }),
        getStoredMeetings()
      ]);
      
      const remoteMeetings = response.data.meetings || [];
      const processingMeetings = localMeetings.filter(m => m.status === 'processing' || m.status === 'recording');
      
      // Show processing meetings at the top, followed by completed remote meetings
      return [...processingMeetings, ...remoteMeetings];
    },
    refetchInterval: 3000 // auto-refresh meeting history
  });
}

export function useRecordingStatusQuery() {
  return useQuery<RecordingStatusResponse, Error>({
    queryKey: RECORDING_STATUS_KEY,
    queryFn: async (): Promise<RecordingStatusResponse> => {
      return new Promise((resolve) => {
        chrome.runtime.sendMessage({ type: 'GET_RECORDING_STATUS' }, (response) => {
          if (chrome.runtime.lastError || !response) {
            resolve({ isRecording: false, currentMeeting: null, activeTabId: null });
          } else {
            resolve(response as RecordingStatusResponse);
          }
        });
      });
    },
    refetchInterval: 1000 // live duration & status poll
  });
}

export function useStartRecordingMutation() {
  const queryClient = useQueryClient();

  return useMutation<{ success: boolean }, Error, number | undefined>({
    mutationFn: async (tabId?: number) => {
      return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({ type: 'START_RECORDING', payload: { tabId } }, (response) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else if (response && response.success) {
            resolve(response);
          } else {
            reject(new Error(response?.error || `Fallback error. Response: ${JSON.stringify(response)}`));
          }
        });
      });
    },
    onSuccess: () => {
      // Invalidation handled exclusively within custom hook
      queryClient.invalidateQueries({ queryKey: RECORDING_STATUS_KEY });
      queryClient.invalidateQueries({ queryKey: MEETINGS_QUERY_KEY });
    }
  });
}

export function useStopRecordingMutation() {
  const queryClient = useQueryClient();

  return useMutation<{ success: boolean }, Error, void>({
    mutationFn: async () => {
      return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({ type: 'STOP_RECORDING' }, (response) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else if (response && response.success) {
            resolve(response);
          } else {
            reject(new Error(response?.error || `Fallback error. Response: ${JSON.stringify(response)}`));
          }
        });
      });
    },
    onSuccess: () => {
      // Invalidation handled exclusively within custom hook
      queryClient.invalidateQueries({ queryKey: RECORDING_STATUS_KEY });
      queryClient.invalidateQueries({ queryKey: MEETINGS_QUERY_KEY });
    }
  });
}
