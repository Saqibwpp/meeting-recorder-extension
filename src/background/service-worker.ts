import { Meeting, MeetingPlatform, ExtensionMessage } from '../types';
import { getStoredSettings, getStoredMeetings, upsertMeeting } from '../services/storage';
import { transcribeWithGemini } from '../services/gemini';
import { syncMeetingToLocalRepo } from '../services/sync';

let activeRecordingTabId: number | null = null;
let currentMeeting: Meeting | null = null;
let recordingTimer: number | null = null;

// Determine platform from URL
function detectPlatform(url?: string): MeetingPlatform {
  if (!url) return 'unknown';
  if (url.includes('meet.google.com')) return 'google-meet';
  if (url.includes('teams.microsoft.com') || url.includes('teams.live.com')) return 'microsoft-teams';
  if (url.includes('zoom.us')) return 'zoom';
  if (url.includes('slack.com')) return 'slack';
  return 'browser-tab';
}

// 1. Monitor Tabs for Meeting Activity
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  const settings = await getStoredSettings();
  if (!settings.autoDetectMeetings) return;

  const url = tab.url || '';
  const platform = detectPlatform(url);

  // If tab navigated to meeting URL or became audible during a meeting call
  if (platform !== 'unknown' && platform !== 'browser-tab') {
    if (changeInfo.status === 'complete' || changeInfo.audible === true) {
      if (activeRecordingTabId !== tabId) {
        // Send prompt message to content script
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
          // Content script might not be loaded yet
        }
      }
    }
  }
});

// 2. Offscreen Document Manager for Persistent Audio Capture
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

// 3. Start Recording
async function handleStartRecording(targetTabId?: number): Promise<void> {
  const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const tabId = targetTabId || activeTab?.id;

  if (!tabId) {
    throw new Error('No active tab found to record');
  }

  await ensureOffscreenDocument();

  // Get Tab Capture stream ID
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

  currentMeeting = {
    id: meetingId,
    title: activeTab?.title || 'Meeting Recording',
    url: activeTab?.url || '',
    platform,
    startTime: Date.now(),
    durationSeconds: 0,
    status: 'recording'
  };

  await upsertMeeting(currentMeeting);

  // Set extension badge
  chrome.action.setBadgeText({ text: 'REC' });
  chrome.action.setBadgeBackgroundColor({ color: '#EF4444' });

  // Start duration counter
  let seconds = 0;
  if (recordingTimer) clearInterval(recordingTimer);
  recordingTimer = setInterval(() => {
    seconds += 1;
    if (currentMeeting) {
      currentMeeting.durationSeconds = seconds;
    }
  }, 1000) as unknown as number;

  // Signal offscreen document to start capturing
  chrome.runtime.sendMessage({
    target: 'offscreen',
    type: 'START_OFFSCREEN_RECORDING',
    streamId,
    meetingId
  });
}

// 4. Stop Recording
async function handleStopRecording(): Promise<void> {
  if (recordingTimer) {
    clearInterval(recordingTimer);
    recordingTimer = null;
  }

  chrome.action.setBadgeText({ text: '' });

  // Signal offscreen document to stop
  chrome.runtime.sendMessage({
    target: 'offscreen',
    type: 'STOP_OFFSCREEN_RECORDING'
  });
}

// 5. Message Handling
chrome.runtime.onMessage.addListener((message: any, sender, sendResponse) => {
  if (message.type === 'START_RECORDING') {
    handleStartRecording(message.payload?.tabId)
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
    sendResponse({
      isRecording: activeRecordingTabId !== null,
      currentMeeting,
      activeTabId: activeRecordingTabId
    });
    return true;
  }

  if (message.type === 'OFFSCREEN_RECORDING_DATA') {
    // Received final audio payload from offscreen document
    const { meetingId, audioBase64, mimeType, durationSeconds } = message;
    activeRecordingTabId = null;

    processFinalRecording(meetingId, audioBase64, mimeType, durationSeconds)
      .then(() => console.log('✅ Meeting processing & transcription finished!'))
      .catch(err => console.error('❌ Error processing recording:', err));
    
    sendResponse({ received: true });
    return true;
  }
});

// 6. Transcription & Storage Pipeline
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

    // Sync audio and JSON transcript to local records/ directory via local server
    await syncMeetingToLocalRepo(meeting, audioBase64, mimeType);
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    console.error('Transcription failed:', error);
    meeting.status = 'error';
    meeting.error = error.message;
    await upsertMeeting(meeting);
    // Still sync audio even if transcription had an error
    await syncMeetingToLocalRepo(meeting, audioBase64, mimeType);
  }
}
