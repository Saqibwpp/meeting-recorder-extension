import { Meeting, ExtensionSettings } from '../types';
import { DEFAULT_PRIMARY_MODEL, DEFAULT_FALLBACK_MODELS } from './gemini';

const MEETINGS_KEY = 'ai_meetings_history';
const SETTINGS_KEY = 'ai_meetings_settings';

const DEFAULT_SETTINGS: ExtensionSettings = {
  geminiApiKey: (import.meta.env.VITE_GEMINI_API_KEY as string) || '',
  primaryModel: DEFAULT_PRIMARY_MODEL,
  fallbackModels: DEFAULT_FALLBACK_MODELS,
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
    const stored = (result[SETTINGS_KEY] as Partial<ExtensionSettings>) || {};
    return {
      ...DEFAULT_SETTINGS,
      ...stored,
      geminiApiKey: stored.geminiApiKey || DEFAULT_SETTINGS.geminiApiKey
    };
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
