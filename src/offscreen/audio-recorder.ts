let mediaRecorder: MediaRecorder | null = null;
let recordedChunks: Blob[] = [];
let audioContext: AudioContext | null = null;
let currentMeetingId: string = '';
let startTime: number = 0;

chrome.runtime.onMessage.addListener(async (message) => {
  if (message.target !== 'offscreen') return;

  if (message.type === 'START_OFFSCREEN_RECORDING') {
    const { streamId, meetingId } = message;
    currentMeetingId = meetingId;
    startTime = Date.now();
    await startDualStreamRecording(streamId);
  }

  if (message.type === 'STOP_OFFSCREEN_RECORDING') {
    stopRecording();
  }
});

async function startDualStreamRecording(tabStreamId: string): Promise<void> {
  try {
    recordedChunks = [];

    // 1. Capture Tab Audio via streamId
    const tabStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        // @ts-expect-error - chromeMediaSource is Chrome-specific constraints
        mandatory: {
          chromeMediaSource: 'tab',
          chromeMediaSourceId: tabStreamId
        }
      },
      video: false
    });

    // 2. Capture Local Microphone
    let micStream: MediaStream | null = null;
    try {
      micStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true
        },
        video: false
      });
    } catch (micErr) {
      console.warn('Microphone permission not granted or mic unavailable, recording tab only:', micErr);
    }

    // 3. Web Audio API Setup: 2-Channel Stereo Merger
    audioContext = new AudioContext({ sampleRate: 48000 });
    const tabSource = audioContext.createMediaStreamSource(tabStream);
    const destination = audioContext.createMediaStreamDestination();
    const merger = audioContext.createChannelMerger(2);

    if (micStream) {
      const micSource = audioContext.createMediaStreamSource(micStream);
      // Connect Mic to Channel 0 (Left)
      micSource.connect(merger, 0, 0);
    }

    // Connect Tab Audio to Channel 1 (Right)
    tabSource.connect(merger, 0, 1);

    // Route merger into destination stream
    merger.connect(destination);

    // Also route Tab Audio to speakers so user can still hear the call!
    tabSource.connect(audioContext.destination);

    // 4. MediaRecorder initialization
    const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
      ? 'audio/webm;codecs=opus'
      : 'audio/webm';

    mediaRecorder = new MediaRecorder(destination.stream, { mimeType });

    mediaRecorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) {
        recordedChunks.push(event.data);
      }
    };

    mediaRecorder.onstop = async () => {
      const blob = new Blob(recordedChunks, { type: mimeType });
      const durationSeconds = Math.round((Date.now() - startTime) / 1000);
      const base64 = await blobToBase64(blob);

      // Clean up streams & audio context
      tabStream.getTracks().forEach(t => t.stop());
      if (micStream) micStream.getTracks().forEach(t => t.stop());
      if (audioContext && audioContext.state !== 'closed') {
        await audioContext.close();
      }

      // Send to background service worker
      chrome.runtime.sendMessage({
        type: 'OFFSCREEN_RECORDING_DATA',
        meetingId: currentMeetingId,
        audioBase64: base64,
        mimeType,
        durationSeconds
      });
    };

    mediaRecorder.start(1000); // 1-second chunks
    console.log('🎙️ [Offscreen] Started dual-stream recording!');
  } catch (err) {
    console.error('Failed to start offscreen recording:', err);
  }
}

function stopRecording(): void {
  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    mediaRecorder.stop();
    console.log('🛑 [Offscreen] Stopped recording.');
  }
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result as string;
      const base64 = dataUrl.split(',')[1] || '';
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
