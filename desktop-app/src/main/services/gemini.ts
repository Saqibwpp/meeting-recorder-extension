export interface TranscriptSegment {
  id: number
  startTime: string
  endTime: string
  speaker: string
  channel: string
  text: string
}

export interface UsageMetadata {
  promptTokenCount: number
  candidatesTokenCount: number
  totalTokenCount: number
}

export interface TranscriptData {
  meetingId: string
  title: string
  date: string
  durationSeconds: number
  engine: string
  summary: string
  actionItems: string[]
  segments: TranscriptSegment[]
  usage?: UsageMetadata
}

export interface GeminiModel {
  name: string
  displayName: string
  description: string
  inputTokenLimit: number
  outputTokenLimit: number
}

/**
 * Whitelist of model name patterns that are known to support audio transcription.
 * Flash models are the go-to: fast, cheap, and support audio input natively.
 */
const TRANSCRIPTION_MODEL_PATTERNS = ['flash']

/**
 * Explicit blocklist for model name substrings that should never appear,
 * even if they match the whitelist (e.g. "flash-thinking").
 */
const MODEL_BLOCKLIST = [
  'thinking',
  'tts',
  'image',
  'robotics',
  'computer-use',
  'embedding',
  'aqa',
  'code',
  'nano',
  'search',
  'live'
]

export async function fetchAvailableModels(apiKey: string): Promise<GeminiModel[]> {
  const cleanKey = apiKey.trim()
  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(cleanKey)}`
  const response = await fetch(url)

  if (!response.ok) {
    const errorText = await response.text()
    if (response.status === 400 || response.status === 403) {
      throw new Error(`Invalid API key. Google responded with ${response.status}: ${errorText}`)
    }
    throw new Error(`Failed to fetch models: ${response.status} ${errorText}`)
  }

  const data = await response.json()
  const models = data.models || []

  const filtered = models
    .filter((m: Record<string, unknown>) => {
      const name = typeof m.name === 'string' ? (m.name as string).toLowerCase() : ''
      const methods = m.supportedGenerationMethods as string[] | undefined

      // Must support generateContent
      if (!methods?.includes('generateContent')) return false

      // Must be a Gemini model
      if (!name.includes('gemini')) return false

      // Must match at least one whitelist pattern (Flash family)
      const matchesWhitelist = TRANSCRIPTION_MODEL_PATTERNS.some((pattern) =>
        name.includes(pattern)
      )
      if (!matchesWhitelist) return false

      // Must NOT match any blocklist pattern
      const matchesBlocklist = MODEL_BLOCKLIST.some((blocked) => name.includes(blocked))
      if (matchesBlocklist) return false

      return true
    })
    .map((m: Record<string, unknown>) => ({
      name: (m.name as string).replace('models/', ''),
      displayName: (m.displayName as string) || (m.name as string),
      description: (m.description as string) || '',
      inputTokenLimit: typeof m.inputTokenLimit === 'number' ? m.inputTokenLimit : 0,
      outputTokenLimit: typeof m.outputTokenLimit === 'number' ? m.outputTokenLimit : 0
    }))

  return filtered
}

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
   - "speaker": "Speaker 1 (You)" for the local user, and distinct labels for remote participants: "Speaker 2", "Speaker 3"...
   - "channel": "left" (for local user) or "right" (for remote participants) or "mixed"
   - "text": Exact transcribed speech

Respond ONLY with valid JSON matching this structure. Do not wrap in markdown code blocks.`

async function callGeminiApi(
  audioBase64: string,
  apiKey: string,
  title: string,
  model: string
): Promise<TranscriptData> {
  const cleanKey = apiKey.trim()
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(cleanKey)}`

  const requestBody = {
    contents: [
      {
        parts: [
          { text: SYSTEM_PROMPT },
          {
            inlineData: {
              mimeType: 'audio/mp4', // .m4a is mp4 audio
              data: audioBase64
            }
          }
        ]
      }
    ],
    generationConfig: {
      temperature: 0.2,
      responseMimeType: 'application/json'
    }
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody)
  })

  if (!response.ok) {
    const errorText = await response.text()

    // Parse specific quota/rate-limit errors
    if (response.status === 429) {
      throw new Error(
        `Rate limit exceeded for model "${model}". Please wait a moment or try a different model.`
      )
    }
    if (response.status === 403) {
      throw new Error(
        `API key does not have access to model "${model}". Check your API key permissions.`
      )
    }

    throw new Error(`Gemini API HTTP ${response.status}: ${errorText}`)
  }

  const jsonResponse = await response.json()
  const rawText = jsonResponse.candidates?.[0]?.content?.parts?.[0]?.text

  // Extract usage metadata
  const rawUsage = jsonResponse.usageMetadata
  const usage: UsageMetadata | undefined = rawUsage
    ? {
        promptTokenCount: rawUsage.promptTokenCount || 0,
        candidatesTokenCount: rawUsage.candidatesTokenCount || 0,
        totalTokenCount: rawUsage.totalTokenCount || 0
      }
    : undefined

  if (!rawText) {
    throw new Error('Gemini API returned an empty response')
  }

  try {
    const parsed = JSON.parse(rawText.trim())
    return {
      meetingId: `meeting_${Date.now()}`,
      title: title,
      date: new Date().toISOString(),
      durationSeconds: 0,
      engine: `Gemini (${model})`,
      summary: parsed.summary || 'Meeting transcribed successfully.',
      actionItems: parsed.actionItems || [],
      segments: (parsed.segments || []).map((s: Record<string, unknown>, idx: number) => ({
        id: typeof s.id === 'number' ? s.id : idx + 1,
        startTime: String(s.startTime || '00:00'),
        endTime: String(s.endTime || '00:00'),
        speaker: String(s.speaker || 'Speaker'),
        channel: s.channel === 'left' || s.channel === 'right' ? s.channel : 'mixed',
        text: String(s.text || '')
      })),
      usage
    }
  } catch {
    throw new Error('Failed to parse Gemini JSON response')
  }
}

export async function transcribeAudioFile(
  audioBase64: string,
  apiKey: string,
  title: string,
  modelName?: string
): Promise<TranscriptData> {
  if (!modelName) {
    throw new Error('No model selected for transcription.')
  }

  console.log(`[Gemini] Attempting transcription with model: ${modelName}`)
  return await callGeminiApi(audioBase64, apiKey, title, modelName)
}
