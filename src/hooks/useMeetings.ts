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
      const [user, localMeetings] = await Promise.all([
        waitForAuthUser(),
        getStoredMeetings()
      ]);

      const processingMeetings = localMeetings.filter(m => m.status === 'processing' || m.status === 'recording');

      // If we're not logged in, just show local storage
      if (!user) {
        return localMeetings;
      }

      try {
        const token = await user.getIdToken();
        const apiUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
        const response = await axios.get(`${apiUrl}/api/meetings`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        const remoteMeetings: Meeting[] = response.data.meetings || [];
        const processingIds = new Set(processingMeetings.map(m => m.id));
        const filteredRemote = remoteMeetings.filter(m => !processingIds.has(m.id));

        // Show active processing meetings at the top, followed by backend meetings
        return [...processingMeetings, ...filteredRemote];
      } catch (err) {
        console.warn('Failed to fetch remote meetings, falling back to local list:', err);
        return localMeetings;
      }
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
