import { Meeting } from '../types';
import { getStoredSettings } from './storage';

export async function syncMeetingToLocalRepo(
  meeting: Meeting,
  audioBase64?: string,
  mimeType: string = 'audio/webm'
): Promise<boolean> {
  const settings = await getStoredSettings();
  const serverUrl = settings.localServerUrl || 'http://localhost:4829';

  try {
    const response = await fetch(`${serverUrl}/api/records`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        meetingId: meeting.id,
        title: meeting.title,
        date: new Date(meeting.startTime).toISOString(),
        durationSeconds: meeting.durationSeconds,
        transcript: meeting.transcript,
        audioBase64: audioBase64 || null,
        mimeType
      })
    });

    if (response.ok) {
      console.log(`💾 Successfully synced meeting ${meeting.id} to local repository!`);
      return true;
    }
  } catch (err) {
    console.warn('⚠️ Local sync server not reachable, skipping server write.');
  }

  // Fallback: Trigger browser downloads so files are still saved locally
  if (meeting.transcript) {
    try {
      const jsonBlob = new Blob([JSON.stringify(meeting.transcript, null, 2)], { type: 'application/json' });
      const jsonUrl = URL.createObjectURL(jsonBlob);
      await chrome.downloads.download({
        url: jsonUrl,
        filename: `records/meeting_${meeting.id}.json`,
        saveAs: false
      });
    } catch (e) {
      console.warn('Chrome download fallback skipped:', e);
    }
  }

  return false;
}
