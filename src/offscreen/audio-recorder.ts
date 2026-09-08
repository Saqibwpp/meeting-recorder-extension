let mediaRecorder: MediaRecorder | null = null;
let recordedChunks: Blob[] = [];
let audioContext: AudioContext | null = null;
let currentMeetingId: string = '';
let startTime: number = 0;
let keepAlivePort: chrome.runtime.Port | null = null;
let keepAliveTimer: NodeJS.Timeout | null = null;

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

    // Start keep-alive port to keep MV3 service worker alive while recording
    try {
      keepAlivePort = chrome.runtime.connect({ name: 'offscreen-keepalive' });
      keepAliveTimer = setInterval(() => {
        try {
          keepAlivePort?.postMessage({ type: 'PING' });
        } catch {
          // Port disconnected
        }
      }, 10000);
    } catch (portErr) {
      console.warn('Could not establish keepalive port:', portErr);
    }

    // 1. Capture Tab Audio via streamId
    let tabStream: MediaStream | null = null;
    try {
      tabStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          // @ts-expect-error - chromeMediaSource is Chrome-specific constraints
          mandatory: {
            chromeMediaSource: 'tab',
            chromeMediaSourceId: tabStreamId
          }
        },
        video: {
          // @ts-expect-error - chromeMediaSource is Chrome-specific constraints
          mandatory: {
            chromeMediaSource: 'tab',
            chromeMediaSourceId: tabStreamId
          }
        }
      });

      console.log('🔊 [Offscreen] Successfully captured tab audio stream, tracks:', tabStream.getAudioTracks().length);
      
      // Trick Chrome into keeping the stream alive by binding it to a hidden video element attached to the DOM
      const videoEl = document.createElement('video');
      videoEl.srcObject = tabStream;
      videoEl.muted = true;
      document.body.appendChild(videoEl);
      videoEl.play().catch(e => console.warn('Video play failed:', e));
    } catch (tabErr) {
      console.error('❌ [Offscreen] Error capturing tab audio:', tabErr);
    }

    // 2. Capture Local Microphone
    let micStream: MediaStream | null = null;
    try {
      micStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      console.log('🎙️ [Offscreen] Successfully captured microphone stream, tracks:', micStream.getAudioTracks().length);
    } catch (micErr) {
      console.warn('⚠️ [Offscreen] Microphone permission not granted or mic unavailable (will record tab only):', micErr);
    }

    // 3. Web Audio API Setup: Mono Mixer
    audioContext = new AudioContext({ sampleRate: 48000 });
    if (audioContext.state === 'suspended') {
      await audioContext.resume();
      console.log('🔊 [Offscreen] AudioContext resumed, active state:', audioContext.state);
    }

    const destination = audioContext.createMediaStreamDestination();
    const mixer = audioContext.createGain();
    mixer.gain.value = 1.0;
    mixer.connect(destination);

    // Keep stream alive with an inaudible oscillator
    const osc = audioContext.createOscillator();
    const oscGain = audioContext.createGain();
    oscGain.gain.value = 0.0001; // barely audible
    osc.connect(oscGain);
    oscGain.connect(mixer);
    osc.start();

    let hasAudioTrack = false;

    // Connect Microphone
    if (micStream && micStream.getAudioTracks().length > 0) {
      const micSource = audioContext.createMediaStreamSource(micStream);
      micSource.connect(mixer);
      hasAudioTrack = true;
    }

    // Connect Tab Audio
    if (tabStream && tabStream.getAudioTracks().length > 0) {
      const tabSource = audioContext.createMediaStreamSource(tabStream);
      tabSource.connect(mixer);
      hasAudioTrack = true;
    }

    if (!hasAudioTrack) {
      console.error('❌ [Offscreen] Neither microphone nor tab audio tracks were available!');
    }

    // 4. MediaRecorder initialization
    const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
      ? 'audio/webm;codecs=opus'
      : 'audio/webm';

    // Prefer destination stream; fallback to raw streams if destination has no tracks
    const streamToRecord = destination.stream.getAudioTracks().length > 0
      ? destination.stream
      : (micStream || tabStream || destination.stream);

    mediaRecorder = new MediaRecorder(streamToRecord, {
      mimeType,
      audioBitsPerSecond: 128000
    });

    mediaRecorder.onerror = (event: Event) => {
      console.error('❌ [Offscreen] MediaRecorder error:', (event as any).error);
    };

    mediaRecorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) {
        console.log(`🎙️ [Offscreen] Captured chunk: ${event.data.size} bytes`);
        recordedChunks.push(event.data);
      }
    };

    mediaRecorder.onstop = async () => {
      console.log('🛑 [Offscreen] MediaRecorder stopped. Packaging audio...');
      if (keepAliveTimer) {
        clearInterval(keepAliveTimer);
        keepAliveTimer = null;
      }
      if (keepAlivePort) {
        keepAlivePort.disconnect();
        keepAlivePort = null;
      }

      try {
        console.log('🛑 [Offscreen] MediaRecorder stopped. Packaging audio...');
        const blob = new Blob(recordedChunks, { type: mimeType });
        const durationSeconds = Math.round((Date.now() - startTime) / 1000);
        console.log(`📦 [Offscreen] Final recording size: ${blob.size} bytes, duration: ${durationSeconds}s`);

        const base64 = await blobToBase64(blob);

        // Send to background service worker
        chrome.runtime.sendMessage({
          type: 'OFFSCREEN_RECORDING_DATA',
          meetingId: currentMeetingId,
          audioBase64: base64,
          mimeType,
          durationSeconds
        });
      } catch (err) {
        console.error('❌ [Offscreen] Error processing recording on stop:', err);
      } finally {
        // Clean up streams & audio context
        if (tabStream) tabStream.getTracks().forEach(t => t.stop());
        if (micStream) micStream.getTracks().forEach(t => t.stop());
        if (audioContext && audioContext.state !== 'closed') {
          await audioContext.close();
        }
      }
    };

    mediaRecorder.start(); // Record continuously without chunking
    console.log('🎙️ [Offscreen] Started dual-stream recording successfully!');
  } catch (err) {
    console.error('❌ [Offscreen] Failed to start offscreen recording:', err);
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
