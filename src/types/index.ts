export type MeetingPlatform = 'google-meet' | 'microsoft-teams' | 'zoom' | 'slack' | 'browser-tab' | 'local-test' | 'unknown';

export interface TranscriptSegment {
  id: number;
  startTime: string;
  endTime: string;
  speaker: string;
  channel: 'left' | 'right' | 'mixed';
  text: string;
}

export interface TranscriptData {
  meetingId: string;
  title: string;
  date: string;
  durationSeconds: number;
  engine: string;
  segments: TranscriptSegment[];
  summary?: string;
  actionItems?: string[];
}

export interface Meeting {
  id: string;
  title: string;
  url: string;
  platform: MeetingPlatform;
  startTime: number;
  endTime?: number;
  durationSeconds: number;
  status: 'recording' | 'processing' | 'completed' | 'error';
  transcript?: TranscriptData;
  audioUrl?: string;
  audioBlobUrl?: string;
  error?: string;
}

export interface ExtensionSettings {
  geminiApiKey: string;
  primaryModel: string;
  fallbackModels: string[];
  autoDetectMeetings: boolean;
}

export type ExtensionMessage =
  | { type: 'MEETING_DETECTED'; payload: { platform: MeetingPlatform; title: string; url: string } }
  | { type: 'START_RECORDING'; payload?: { tabId?: number } }
  | { type: 'STOP_RECORDING' }
  | { type: 'RECORDING_STATUS_CHANGED'; payload: { isRecording: boolean; durationSeconds: number; meeting?: Meeting } }
  | { type: 'AUDIO_CHUNK'; payload: { chunk: string } }
  | { type: 'RECORDING_FINISHED'; payload: { meetingId: string; audioBase64: string; mimeType: string; durationSeconds: number } }
  | { type: 'DISMISS_PROMPT' };
