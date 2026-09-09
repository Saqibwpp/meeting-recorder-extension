import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Meeting } from '../types';
import axios from 'axios';

export const MEETINGS_QUERY_KEY = ['meetings'];
export const RECORDING_STATUS_KEY = ['recording_status'];

interface RecordingStatusResponse {
  isRecording: boolean;
  currentMeeting: Meeting | null;
  activeTabId: number | null;
}

import { auth } from '../services/firebase';
import type { User } from 'firebase/auth';

function waitForAuthUser(): Promise<User | null> {
  if (auth.currentUser) return Promise.resolve(auth.currentUser);
  return new Promise((resolve) => {
    let resolved = false;
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (!resolved) {
        resolved = true;
        unsubscribe();
        resolve(user);
      }
    });
    // Fallback timeout in case auth state takes long
    setTimeout(() => {
      if (!resolved) {
        resolved = true;
        unsubscribe();
        resolve(auth.currentUser);
      }
    }, 1200);
  });
}

export function useMeetingsQuery() {
  return useQuery<Meeting[], Error>({
    queryKey: MEETINGS_QUERY_KEY,
    queryFn: async () => {
      const user = await waitForAuthUser();
      if (!user) {
        return [];
      }

      const token = await user.getIdToken();
      const apiUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
      const response = await axios.get(`${apiUrl}/api/meetings`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      return (response.data.meetings || []) as Meeting[];
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

export function useDeleteMeetingMutation() {
  const queryClient = useQueryClient();

  return useMutation<{ success: boolean }, Error, string>({
    mutationFn: async (meetingId: string) => {
      const user = auth.currentUser;
      if (!user) throw new Error('User not authenticated');
      const token = await user.getIdToken();
      const apiUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

      const response = await axios.delete(`${apiUrl}/api/meetings?id=${meetingId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MEETINGS_QUERY_KEY });
    }
  });
}
