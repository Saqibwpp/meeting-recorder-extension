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
let recordingTimer: NodeJS.Timeout | null = null;
const notifiedTabs = new Set<number>();

// 1. Maintain keepalive connection from Offscreen document
chrome.runtime.onConnect.addListener((port) => {
  if (port.name === 'offscreen-keepalive') {
    port.onMessage.addListener(() => {
      // Ping received, keeping service worker alive
    });
    port.onDisconnect.addListener(() => {
      console.log('🔌 Offscreen keepalive port disconnected');
    });
  }
});

// Determine platform from URL
function detectPlatform(url?: string): MeetingPlatform {
  if (!url) return 'unknown';
  if (url.includes('meet.google.com')) return 'google-meet';
  if (url.includes('teams.microsoft.com') || url.includes('teams.live.com')) return 'microsoft-teams';
  if (url.includes('zoom.us')) return 'zoom';
  if (url.includes('slack.com')) return 'slack';
  return 'browser-tab';
}

// 2. Monitor Tabs for Meeting Activity (Clean, non-spammy detection)
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  const settings = await getStoredSettings();
  if (!settings.autoDetectMeetings) return;

  // Only trigger once when navigation completes, NOT on every audio toggle!
  if (changeInfo.status !== 'complete') return;

  const url = tab.url || '';
  const platform = detectPlatform(url);

  if (platform !== 'unknown' && platform !== 'browser-tab') {
    if (notifiedTabs.has(tabId) || activeRecordingTabId === tabId) return;

    notifiedTabs.add(tabId);
    try {
      await chrome.tabs.sendMessage(tabId, {
        type: 'MEETING_DETECTED',
        payload: {
          platform,
          title: tab.title || 'Meeting',
          url
        }
      });
    } catch {
      // Tab or script not ready
    }
  }
});

chrome.tabs.onRemoved.addListener((tabId) => {
  notifiedTabs.delete(tabId);
  if (activeRecordingTabId === tabId) {
    handleStopRecording().catch(console.error);
  }
});

// 3. Offscreen Document Manager
async function ensureOffscreenDocument(): Promise<void> {
  const existingContexts = await chrome.runtime.getContexts({
    contextTypes: [chrome.runtime.ContextType.OFFSCREEN_DOCUMENT]
  });

  if (existingContexts.length > 0) {
    return;
  }

  await chrome.offscreen.createDocument({
    url: 'src/offscreen/offscreen.html',
    reasons: [chrome.offscreen.Reason.USER_MEDIA, chrome.offscreen.Reason.AUDIO_PLAYBACK],
    justification: 'Recording tab audio and microphone for meeting transcription'
  });
}

// 4. Start Recording
async function handleStartRecording(targetTabId?: number): Promise<void> {
  const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const tabId = targetTabId || activeTab?.id;

  if (!tabId) {
    throw new Error('No active tab found to record');
  }

  await ensureOffscreenDocument();

  // Obtain short-lived streamId for the target tab
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

  // Persist session to disk so worker restarts NEVER lose active recording state
  await setActiveSession({
    isRecording: true,
    meetingId,
    startTime: now,
    targetTabId: tabId,
    title: currentMeeting.title,
    platform
  });

  await upsertMeeting(currentMeeting);

  // Set extension badge
  chrome.action.setBadgeText({ text: 'REC' });
  chrome.action.setBadgeBackgroundColor({ color: '#EF4444' });

  // Start duration counter in memory
  if (recordingTimer) clearInterval(recordingTimer);
  recordingTimer = setInterval(() => {
    if (currentMeeting) {
      currentMeeting.durationSeconds = Math.floor((Date.now() - now) / 1000);
    }
  }, 1000);

  // Signal offscreen document to start capturing
  chrome.runtime.sendMessage({
    target: 'offscreen',
    type: 'START_OFFSCREEN_RECORDING',
    streamId,
    meetingId
  });
}

// 5. Stop Recording
async function handleStopRecording(): Promise<void> {
  if (recordingTimer) {
    clearInterval(recordingTimer);
    recordingTimer = null;
  }

  await setActiveSession(null);
  chrome.action.setBadgeText({ text: '' });

  // Signal offscreen document to stop
  chrome.runtime.sendMessage({
    target: 'offscreen',
    type: 'STOP_OFFSCREEN_RECORDING'
  });
}

// 6. Message Handling
chrome.runtime.onMessage.addListener((message: any, sender, sendResponse) => {
  if (message.type === 'START_RECORDING') {
    const tabId = message.payload?.tabId || sender.tab?.id;
    handleStartRecording(tabId)
      .then(() => sendResponse({ success: true }))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true;
  }

  if (message.type === 'STOP_RECORDING') {
    handleStopRecording()
      .then(() => sendResponse({ success: true }))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true;
  }

  if (message.type === 'GET_RECORDING_STATUS') {
    (async () => {
      // If in-memory state is null, restore from persisted storage session
      if (activeRecordingTabId === null) {
        const session = await getActiveSession();
        if (session && session.isRecording) {
          activeRecordingTabId = session.targetTabId;
          const currentDuration = Math.floor((Date.now() - session.startTime) / 1000);
          currentMeeting = {
            id: session.meetingId,
            title: session.title,
            url: '',
            platform: session.platform as MeetingPlatform,
            startTime: session.startTime,
            durationSeconds: currentDuration,
            status: 'recording'
          };
          chrome.action.setBadgeText({ text: 'REC' });
          chrome.action.setBadgeBackgroundColor({ color: '#EF4444' });
        }
      }

      sendResponse({
        isRecording: activeRecordingTabId !== null,
        currentMeeting,
        activeTabId: activeRecordingTabId
      });
    })();
    return true;
  }

  if (message.type === 'OFFSCREEN_RECORDING_DATA') {
    // Received final audio payload from offscreen document
    const { meetingId, audioBase64, mimeType, durationSeconds } = message;
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

// 7. Transcription & Storage Pipeline
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

    // Sync audio and JSON transcript to local records/ directory
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
