import { Meeting, MeetingPlatform } from '../types';
import axios from 'axios';
import {
  getStoredSettings,
  getActiveSession,
  setActiveSession
} from '../services/storage';
import { transcribeWithGemini } from '../services/gemini';


let activeRecordingTabId: number | null = null;
let currentMeeting: Meeting | null = null;
let recordingTimer: ReturnType<typeof setInterval> | null = null;
let sessionRestored = false;
let isProcessing = false;
let processingStatus = '';
const notifiedTabs = new Set<number>();

// ── Restore session on service worker startup ──
// This runs ONCE when the worker wakes up, before any status polls arrive.
(async function restoreSessionOnStartup() {
  const session = await getActiveSession();
  if (session && session.isRecording) {
    activeRecordingTabId = session.targetTabId;
    currentMeeting = {
      id: session.meetingId,
      title: session.title,
      url: '',
      platform: session.platform as MeetingPlatform,
      startTime: session.startTime,
      durationSeconds: Math.floor((Date.now() - session.startTime) / 1000),
      status: 'recording'
    };
    chrome.action.setBadgeText({ text: 'REC' });
    chrome.action.setBadgeBackgroundColor({ color: '#EF4444' });

    // Restart the duration counter
    recordingTimer = setInterval(() => {
      if (currentMeeting) {
        currentMeeting.durationSeconds = Math.floor((Date.now() - session.startTime) / 1000);
      }
    }, 1000);
  }
  sessionRestored = true;
})();

// ── Keepalive listener for offscreen port ──
chrome.runtime.onConnect.addListener((port) => {
  if (port.name === 'offscreen-keepalive') {
    port.onMessage.addListener(() => {
      // Ping received — keeps service worker alive
    });
  }
});

// ── Platform detection ──
function detectPlatform(url?: string): MeetingPlatform {
  if (!url) return 'unknown';
  try {
    const urlObj = new URL(url);
    if (url.includes('meet.google.com') && urlObj.pathname.length > 2) return 'google-meet';
    if ((url.includes('teams.microsoft.com') || url.includes('teams.live.com')) && 
        (url.includes('meetup-join') || url.includes('meet'))) return 'microsoft-teams';
    if (url.includes('zoom.us') && (url.includes('/j/') || url.includes('/wc/') || url.includes('/join'))) return 'zoom';
    if (url.includes('slack.com') && url.includes('huddle')) return 'slack';
  } catch {
    // Invalid URL
  }
  return 'unknown';
}

// ── Tab monitoring (sends prompt to content script) ──
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  const settings = await getStoredSettings();
  // Don't show if auto-detect is off, or if the user hasn't set up the extension (missing API key)
  if (!settings.autoDetectMeetings || !settings.geminiApiKey) return;
  if (changeInfo.status !== 'complete') return;

  const url = tab.url || '';
  const platform = detectPlatform(url);

  if (platform !== 'unknown' && platform !== 'browser-tab') {
    if (notifiedTabs.has(tabId) || activeRecordingTabId === tabId) return;
    notifiedTabs.add(tabId);
    try {
      await chrome.tabs.sendMessage(tabId, {
        type: 'MEETING_DETECTED',
        payload: { platform, title: tab.title || 'Meeting', url }
      });
    } catch {
      // Content script not injected yet
    }
  }
});

chrome.tabs.onRemoved.addListener((tabId) => {
  notifiedTabs.delete(tabId);
  if (activeRecordingTabId === tabId) {
    handleStopRecording().catch(console.error);
  }
});

let creatingOffscreenPromise: Promise<void> | null = null;

async function ensureOffscreenDocument(): Promise<void> {
  if (creatingOffscreenPromise) {
    await creatingOffscreenPromise;
    return;
  }

  creatingOffscreenPromise = (async () => {
    try {
      const existingContexts = await chrome.runtime.getContexts({
        contextTypes: [chrome.runtime.ContextType.OFFSCREEN_DOCUMENT]
      });
      if (existingContexts.length > 0) return;

      await chrome.offscreen.createDocument({
        url: 'src/offscreen/offscreen.html',
        reasons: [chrome.offscreen.Reason.USER_MEDIA, chrome.offscreen.Reason.DISPLAY_MEDIA, chrome.offscreen.Reason.AUDIO_PLAYBACK],
        justification: 'Recording tab audio and microphone for meeting transcription'
      });
    } catch (err: any) {
      if (!err.message.includes('single offscreen document')) {
        throw err;
      }
    } finally {
      creatingOffscreenPromise = null;
    }
  })();

  await creatingOffscreenPromise;
}

// ── Start Recording ──
async function handleStartRecording(targetTabId?: number): Promise<void> {
  try {
    // Prevent double-start
    if (activeRecordingTabId !== null) {
      console.warn('⚠️ Already recording, ignoring duplicate start request');
      return;
    }

    const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const tabId = targetTabId || activeTab?.id;
    if (!tabId) throw new Error('No active tab found to record');

    await ensureOffscreenDocument();

    const streamId = await new Promise<string>((resolve, reject) => {
      chrome.tabCapture.getMediaStreamId({ targetTabId: tabId }, (id) => {
        if (chrome.runtime.lastError) {
          reject(new Error(`getMediaStreamId failed: ${chrome.runtime.lastError.message}`));
        } else {
          resolve(id);
        }
      });
    });

    activeRecordingTabId = tabId;
    const platform = detectPlatform(activeTab?.url);
    const meetingId = `meeting_${Date.now()}`;
    const now = Date.now();

    currentMeeting = {
      id: meetingId,
      title: activeTab?.title || 'Meeting Recording',
      url: activeTab?.url || '',
      platform,
      startTime: now,
      durationSeconds: 0,
      status: 'recording'
    };

    await setActiveSession({
      isRecording: true,
      meetingId,
      startTime: now,
      targetTabId: tabId,
      title: currentMeeting.title,
      platform
    });

    chrome.action.setBadgeText({ text: 'REC' });
    chrome.action.setBadgeBackgroundColor({ color: '#EF4444' });

    if (recordingTimer) clearInterval(recordingTimer);
    recordingTimer = setInterval(() => {
      if (currentMeeting) {
        currentMeeting.durationSeconds = Math.floor((Date.now() - now) / 1000);
      }
    }, 1000);

    chrome.runtime.sendMessage({
      target: 'offscreen',
      type: 'START_OFFSCREEN_RECORDING',
      streamId,
      meetingId,
      startTime: now
    }, (response) => {
      if (chrome.runtime.lastError) {
        console.error("Offscreen communication failed:", chrome.runtime.lastError.message);
        handleStopRecording().catch(console.error);
      }
    });
  } catch (error: any) {
    // If it's a known permission error from our fallback flow, just warn. Otherwise error.
    if (error.message?.includes('Extension has not been invoked')) {
      console.warn("Expected permission missing for seamless capture. Falling back to manual extension click.", error.message);
    } else {
      console.error("handleStartRecording ERROR:", error);
    }
    throw error;
  }
}

// ── Stop Recording ──
async function handleStopRecording(): Promise<void> {
  if (recordingTimer) {
    clearInterval(recordingTimer);
    recordingTimer = null;
  }
  activeRecordingTabId = null;
  currentMeeting = null;
  await setActiveSession(null);
  chrome.action.setBadgeText({ text: '' });
  isProcessing = true;
  processingStatus = 'Finalizing audio recording...';

  chrome.runtime.sendMessage({
    target: 'offscreen',
    type: 'STOP_OFFSCREEN_RECORDING'
  });
}

// ── Message handler ──
chrome.runtime.onMessage.addListener((message: Record<string, unknown>, sender, sendResponse) => {
  const type = message.type as string;

  if (type === 'START_RECORDING') {
    const payload = message.payload as { tabId?: number } | undefined;
    const tabId = payload?.tabId ?? sender.tab?.id;
    handleStartRecording(tabId)
      .then(() => sendResponse({ success: true }))
      .catch(err => sendResponse({ success: false, error: (err as Error).message }));
    return true;
  }

  if (type === 'STOP_RECORDING') {
    handleStopRecording()
      .then(() => sendResponse({ success: true }))
      .catch(err => sendResponse({ success: false, error: (err as Error).message }));
    return true;
  }

  if (type === 'GET_RECORDING_STATUS') {
    getActiveSession().then((session) => {
      if (session && session.isRecording && activeRecordingTabId === null) {
        activeRecordingTabId = session.targetTabId;
        currentMeeting = {
          id: session.meetingId,
          title: session.title,
          url: '',
          platform: session.platform as MeetingPlatform,
          startTime: session.startTime,
          durationSeconds: Math.floor((Date.now() - session.startTime) / 1000),
          status: 'recording'
        };
      }
      sendResponse({
        isRecording: activeRecordingTabId !== null,
        isProcessing,
        processingStatus,
        currentMeeting,
        activeTabId: activeRecordingTabId
      });
    }).catch(err => {
      console.error("Failed to get session:", err);
      sendResponse({
        isRecording: activeRecordingTabId !== null,
        isProcessing,
        processingStatus,
        currentMeeting,
        activeTabId: activeRecordingTabId
      });
    });
    return true;
  }

  if (type === 'OFFSCREEN_RECORDING_DATA') {
    const meetingId = message.meetingId as string;
    const audioBase64 = message.audioBase64 as string;
    const mimeType = message.mimeType as string;
    const durationSeconds = message.durationSeconds as number;
    const authToken = message.authToken as string;
    const audioUrl = message.audioUrl as string;

    activeRecordingTabId = null;
    currentMeeting = null;
    setActiveSession(null);
    isProcessing = true;
    processingStatus = 'Transcribing with Gemini AI & uploading audio...';

    processFinalRecording(meetingId, audioBase64, mimeType, durationSeconds, authToken, audioUrl)
      .then(() => console.log('✅ Meeting processing & transcription finished!'))
      .catch(err => console.error('❌ Error processing recording:', err))
      .finally(() => {
        isProcessing = false;
        processingStatus = '';
        // Broadcast to all extension views that a new meeting is ready
        chrome.runtime.sendMessage({ type: 'MEETINGS_UPDATED' }).catch(() => {});
      });

    sendResponse({ received: true });
    
    // Forcefully close the offscreen document now that data is received to free hardware mic
    setTimeout(() => {
      chrome.offscreen.closeDocument().catch(() => {});
    }, 500);

    return true;
  }
});

// ── Direct Signed Upload to Cloudinary (Bypasses Vercel 4.5MB Serverless Limit) ──
async function uploadAudioDirectlyToCloudinary(
  audioBase64: string,
  meetingId: string,
  authToken: string,
  apiUrl: string
): Promise<string | undefined> {
  try {
    // 1. Request temporary signature from Next.js backend (secret stays protected on backend)
    const signatureRes = await axios.get(`${apiUrl}/api/upload-signature?meetingId=${meetingId}`, {
      headers: {
        Authorization: `Bearer ${authToken}`
      }
    });

    const { signature, timestamp, apiKey, cloudName, folder, publicId } = signatureRes.data;
    if (!signature || !apiKey || !cloudName) {
      console.warn('⚠️ Invalid signature response from backend for Cloudinary upload.');
      return undefined;
    }

    // 2. Convert base64 to Blob
    const byteCharacters = atob(audioBase64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const audioBlob = new Blob([byteArray], { type: 'audio/webm' });

    // 3. Prepare FormData for Cloudinary Direct Upload
    const formData = new FormData();
    formData.append('file', audioBlob, `${meetingId}.webm`);
    formData.append('api_key', apiKey);
    formData.append('timestamp', String(timestamp));
    formData.append('signature', signature);
    formData.append('folder', folder || 'meeting-recordings');
    if (publicId) {
      formData.append('public_id', publicId);
    }

    // 4. Direct upload to Cloudinary API (resource_type: video for audio streaming)
    const cloudinaryUploadUrl = `https://api.cloudinary.com/v1_1/${cloudName}/video/upload`;
    const uploadRes = await axios.post(cloudinaryUploadUrl, formData);

    if (uploadRes.data && uploadRes.data.secure_url) {
      console.log('✅ Direct Cloudinary upload succeeded:', uploadRes.data.secure_url);
      return uploadRes.data.secure_url;
    }
  } catch (directErr) {
    console.warn('⚠️ Direct Cloudinary upload failed, falling back to backend upload:', directErr);
  }
  return undefined;
}

// ── Transcription & Storage Pipeline ──
async function processFinalRecording(
  meetingId: string,
  audioBase64: string,
  mimeType: string,
  durationSeconds: number,
  authToken?: string,
  audioUrl?: string
): Promise<void> {
  const settings = await getStoredSettings();
  const apiUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

  let finalAudioUrl = audioUrl;

  // 1. Upload audio directly to Cloudinary (Bypasses Vercel serverless limit completely)
  if (!finalAudioUrl && authToken && audioBase64) {
    try {
      finalAudioUrl = await uploadAudioDirectlyToCloudinary(audioBase64, meetingId, authToken, apiUrl);
    } catch (uploadErr) {
      console.warn('Direct upload error:', uploadErr);
    }
  }

  const meeting: Meeting = {
    id: meetingId,
    title: 'Meeting Recording',
    url: '',
    platform: 'browser-tab',
    startTime: Date.now() - (durationSeconds || 0) * 1000,
    durationSeconds: durationSeconds || 0,
    status: 'completed',
    audioUrl: finalAudioUrl
  };

  if (!settings.geminiApiKey) {
    meeting.error = 'No Gemini API Key provided. Audio saved, transcription skipped.';
    console.warn('Meeting skipped: No Gemini API Key provided.');
  } else {
    try {
      const transcript = await transcribeWithGemini({
        audioBase64,
        mimeType,
        apiKey: settings.geminiApiKey,
        meetingId: meeting.id,
        title: meeting.title,
        durationSeconds: meeting.durationSeconds,
        primaryModel: settings.primaryModel,
        fallbackModels: settings.fallbackModels
      });

      meeting.transcript = transcript;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      console.error('Transcription failed:', error);
      meeting.status = 'error';
      meeting.error = error.message;
    }
  }

  // 2. Upload metadata & transcript to Next.js API securely
  if (authToken) {
    try {
      await axios.post(
        `${apiUrl}/api/meetings`,
        {
          ...meeting,
          // Only send heavy audioBase64 to Vercel if direct Cloudinary upload didn't succeed
          ...(finalAudioUrl ? {} : { audioBase64, mimeType })
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
          }
        }
      );
      console.log('✅ Successfully synced meeting & audio to backend via Next.js API');
    } catch (uploadErr) {
      console.error('Error syncing meeting to backend:', uploadErr);
    }
  } else {
    console.warn('⚠️ No Firebase Auth token found. Meeting not synced to backend.');
  }
}
