import { Meeting, MeetingPlatform } from '../types';
import {
  getStoredSettings,
  getStoredMeetings,
  upsertMeeting,
  getActiveSession,
  setActiveSession
} from '../services/storage';
import { transcribeWithGemini } from '../services/gemini';
import { syncMeetingToLocalRepo } from '../services/sync';

let activeRecordingTabId: number | null = null;
let currentMeeting: Meeting | null = null;
let recordingTimer: ReturnType<typeof setInterval> | null = null;
let sessionRestored = false;
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
  if (url.includes('meet.google.com')) return 'google-meet';
  if (url.includes('teams.microsoft.com') || url.includes('teams.live.com')) return 'microsoft-teams';
  if (url.includes('zoom.us')) return 'zoom';
  if (url.includes('slack.com')) return 'slack';
  if (url.includes('localhost')) return 'local-test';
  return 'browser-tab';
}

// ── Tab monitoring (sends prompt to content script) ──
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  const settings = await getStoredSettings();
  if (!settings.autoDetectMeetings) return;
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

// ── Offscreen document manager ──
async function ensureOffscreenDocument(): Promise<void> {
  const existingContexts = await chrome.runtime.getContexts({
    contextTypes: [chrome.runtime.ContextType.OFFSCREEN_DOCUMENT]
  });
  if (existingContexts.length > 0) return;

  await chrome.offscreen.createDocument({
    url: 'src/offscreen/offscreen.html',
    reasons: [chrome.offscreen.Reason.USER_MEDIA, chrome.offscreen.Reason.AUDIO_PLAYBACK],
    justification: 'Recording tab audio and microphone for meeting transcription'
  });
}

// ── Start Recording ──
async function handleStartRecording(targetTabId?: number): Promise<void> {
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
        reject(new Error(chrome.runtime.lastError.message));
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
  await upsertMeeting(currentMeeting);

  chrome.action.setBadgeText({ text: 'REC' });
  chrome.action.setBadgeBackgroundColor({ color: '#EF4444' });

  if (recordingTimer) clearInterval(recordingTimer);
  recordingTimer = setInterval(() => {
    if (currentMeeting) {
      currentMeeting.durationSeconds = Math.floor((Date.now() - now) / 1000);
    }
  }, 1000);

  try {
    chrome.runtime.sendMessage({
      target: 'offscreen',
      type: 'START_OFFSCREEN_RECORDING',
      streamId,
      meetingId
    }, (response) => {
      if (chrome.runtime.lastError) {
        console.error("Offscreen communication failed:", chrome.runtime.lastError.message);
        handleStopRecording().catch(console.error);
      }
    });
  } catch (err) {
    console.error("Failed to send message to offscreen:", err);
    await handleStopRecording();
    throw err;
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
        currentMeeting,
        activeTabId: activeRecordingTabId
      });
    }).catch(err => {
      console.error("Failed to get session:", err);
      sendResponse({
        isRecording: activeRecordingTabId !== null,
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

    activeRecordingTabId = null;
    currentMeeting = null;
    setActiveSession(null);

    processFinalRecording(meetingId, audioBase64, mimeType, durationSeconds)
      .then(() => console.log('✅ Meeting processing & transcription finished!'))
      .catch(err => console.error('❌ Error processing recording:', err));

    sendResponse({ received: true });
    return true;
  }
});

// ── Transcription & Storage Pipeline ──
async function processFinalRecording(
  meetingId: string,
  audioBase64: string,
  mimeType: string,
  durationSeconds: number
): Promise<void> {
  const meetings = await getStoredMeetings();
  const meeting = meetings.find(m => m.id === meetingId) || currentMeeting;
  if (!meeting) return;

  meeting.status = 'processing';
  meeting.durationSeconds = durationSeconds;
  await upsertMeeting(meeting);

  const settings = await getStoredSettings();

  if (!settings.geminiApiKey) {
    meeting.status = 'completed';
    meeting.error = 'No Gemini API Key provided. Audio saved, transcription skipped.';
    await upsertMeeting(meeting);
    await syncMeetingToLocalRepo(meeting, audioBase64, mimeType);
    return;
  }

  try {
    const transcript = await transcribeWithGemini({
      audioBase64,
      mimeType,
      apiKey: settings.geminiApiKey,
      meetingId: meeting.id,
      title: meeting.title,
      durationSeconds,
      primaryModel: settings.primaryModel,
      fallbackModels: settings.fallbackModels
    });

    meeting.transcript = transcript;
    meeting.status = 'completed';
    await upsertMeeting(meeting);
    await syncMeetingToLocalRepo(meeting, audioBase64, mimeType);
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    console.error('Transcription failed:', error);
    meeting.status = 'error';
    meeting.error = error.message;
    await upsertMeeting(meeting);
    await syncMeetingToLocalRepo(meeting, audioBase64, mimeType);
  }
}
