import { Meeting, ExtensionSettings } from '../types';

const MEETINGS_KEY = 'ai_meetings_history';
const SETTINGS_KEY = 'ai_meetings_settings';

const DEFAULT_SETTINGS: ExtensionSettings = {
  geminiApiKey: '',
  primaryModel: 'gemini-2.0-flash',
  fallbackModels: ['gemini-1.5-flash', 'gemini-1.5-pro'],
  autoDetectMeetings: true,
  localServerUrl: 'http://localhost:4829'
};

export async function getStoredMeetings(): Promise<Meeting[]> {
  try {
    const result = await chrome.storage.local.get([MEETINGS_KEY]);
    return (result[MEETINGS_KEY] as Meeting[]) || [];
  } catch (error) {
    console.error('Failed to load meetings from storage:', error);
    return [];
  }
}

export async function saveStoredMeetings(meetings: Meeting[]): Promise<void> {
  await chrome.storage.local.set({ [MEETINGS_KEY]: meetings });
}

export async function upsertMeeting(meeting: Meeting): Promise<void> {
  const current = await getStoredMeetings();
  const index = current.findIndex(m => m.id === meeting.id);
  if (index >= 0) {
    current[index] = meeting;
  } else {
    current.unshift(meeting);
  }
  await saveStoredMeetings(current);
}

export async function getStoredSettings(): Promise<ExtensionSettings> {
  try {
    const result = await chrome.storage.local.get([SETTINGS_KEY]);
    return { ...DEFAULT_SETTINGS, ...((result[SETTINGS_KEY] as Partial<ExtensionSettings>) || {}) };
  } catch (error) {
    console.error('Failed to load settings:', error);
    return DEFAULT_SETTINGS;
  }
}

export async function saveStoredSettings(settings: Partial<ExtensionSettings>): Promise<ExtensionSettings> {
  const current = await getStoredSettings();
  const updated: ExtensionSettings = { ...current, ...settings };
  await chrome.storage.local.set({ [SETTINGS_KEY]: updated });
  return updated;
}
