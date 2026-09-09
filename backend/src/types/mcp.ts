export interface ApiKeyRecord {
  apiKey: string;
  userId: string;
  name: string;
  createdAt: string;
  revoked: boolean;
}

export interface McpAuthContext {
  userId: string;
  authMethod: 'api_key' | 'firebase_token';
}

export interface MeetingSegment {
  speaker: string;
  text: string;
  startTime: string;
}

export interface MeetingTranscript {
  summary: string;
  actionItems: string[];
  segments: MeetingSegment[];
}

export interface MeetingDocument {
  id: string;
  userId: string;
  title: string;
  startTime: number;
  durationSeconds: number;
  audioUrl?: string;
  createdAt?: string;
  transcript?: MeetingTranscript;
}
