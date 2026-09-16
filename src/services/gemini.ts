import { TranscriptData, TranscriptSegment } from '../types';

export interface GeminiTranscriptionOptions {
  audioBase64: string;
  mimeType: string;
  apiKey: string;
  meetingId: string;
  title: string;
  durationSeconds: number;
  primaryModel?: string;
  fallbackModels?: string[];
}

export const DEFAULT_PRIMARY_MODEL = 'gemini-2.5-flash';
export const DEFAULT_FALLBACK_MODELS = [
  'gemini-2.0-flash',
  'gemini-1.5-flash'
];

const SYSTEM_PROMPT = `You are an expert AI meeting notetaker and transcription engine.
The attached audio is a meeting recording:
- Local User (Microphone / You)
- Remote Participants (System audio from Google Meet, Microsoft Teams, Zoom, Slack)

Perform speaker diarization and generate a precise, clean JSON response with:
1. "summary": A concise executive summary of the meeting.
2. "actionItems": An array of clear action items or next steps identified.
3. "segments": An array of timestamped dialogue segments:
   - "id": incremental integer (1, 2, 3...)
   - "startTime": timestamp string (e.g. "00:04.50")
   - "endTime": timestamp string (e.g. "00:18.00")
   - "speaker": "Speaker 1 (You)" for the local user, and distinct labels for remote participants: "Speaker 2", "Speaker 3", "Speaker 4"... or their actual names if introduced or mentioned in the conversation.
   - "channel": "left" (for local user) or "right" (for remote participants) or "mixed"
   - "text": Exact transcribed speech

Respond ONLY with valid JSON matching this structure. Do not wrap in markdown code blocks.`;

export async function transcribeWithGemini(options: GeminiTranscriptionOptions): Promise<TranscriptData> {
  const modelsToTry = [
    options.primaryModel || DEFAULT_PRIMARY_MODEL,
    ...(options.fallbackModels || DEFAULT_FALLBACK_MODELS)
  ];

  let lastError: Error | null = null;

  for (const model of modelsToTry) {
    try {
      console.log(`🎙️ Attempting transcription with Gemini model: ${model}`);
      const transcript = await callGeminiModel(model, options);
      console.log(`✅ Transcription succeeded with model: ${model}`);
      return transcript;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      console.warn(`⚠️ Model ${model} failed: ${error.message}. Checking for fallback...`);
      lastError = error;
      
      // If error is 429 (rate limit / quota reached) or 503, continue to next fallback
      continue;
    }
  }

  throw new Error(`All Gemini models in fallback chain failed. Last error: ${lastError?.message || 'Unknown error'}`);
}

async function callGeminiModel(model: string, options: GeminiTranscriptionOptions): Promise<TranscriptData> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(options.apiKey)}`;

  const requestBody = {
    contents: [
      {
        parts: [
          {
            text: SYSTEM_PROMPT
          },
          {
            inlineData: {
              mimeType: options.mimeType,
              data: options.audioBase64
            }
          }
        ]
      }
    ],
    generationConfig: {
      temperature: 0.2,
      responseMimeType: 'application/json'
    }
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(requestBody)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API HTTP ${response.status} (${response.statusText}): ${errorText}`);
  }

  const jsonResponse = await response.json();
  const rawText = jsonResponse.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!rawText) {
    throw new Error('Gemini API returned an empty response');
  }

  try {
    // Parse structured JSON response
    const parsed = JSON.parse(rawText.trim());
    
    return {
      meetingId: options.meetingId,
      title: options.title,
      date: new Date().toISOString(),
      durationSeconds: options.durationSeconds,
      engine: `Gemini (${model})`,
      summary: parsed.summary || 'Meeting transcribed successfully.',
      actionItems: parsed.actionItems || [],
      segments: (parsed.segments || []).map((s: Record<string, unknown>, idx: number): TranscriptSegment => ({
        id: typeof s.id === 'number' ? s.id : idx + 1,
        startTime: String(s.startTime || '00:00'),
        endTime: String(s.endTime || '00:00'),
        speaker: String(s.speaker || 'Speaker'),
        channel: (s.channel === 'left' || s.channel === 'right') ? s.channel : 'mixed',
        text: String(s.text || '')
      }))
    };
  } catch (parseError) {
    // If response was plain text instead of strict JSON, create a single segment
    return {
      meetingId: options.meetingId,
      title: options.title,
      date: new Date().toISOString(),
      durationSeconds: options.durationSeconds,
      engine: `Gemini (${model})`,
      summary: 'Transcript generated.',
      actionItems: [],
      segments: [
        {
          id: 1,
          startTime: '00:00',
          endTime: formatDuration(options.durationSeconds),
          speaker: 'Conversation',
          channel: 'mixed',
          text: rawText
        }
      ]
    };
  }
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}
