import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const RECORDS_DIR = path.resolve(__dirname, '../records');

if (!fs.existsSync(RECORDS_DIR)) {
  fs.mkdirSync(RECORDS_DIR, { recursive: true });
}

const PORT = 4829;

const TEST_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Simulated Team Call - AI Notetaker Test</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: #090d16;
      color: #f8fafc;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      padding: 24px;
    }
    .card {
      background: rgba(15, 23, 42, 0.85);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 20px;
      padding: 32px;
      max-width: 580px;
      width: 100%;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.7);
      backdrop-filter: blur(16px);
      text-align: center;
    }
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: rgba(16, 185, 129, 0.15);
      border: 1px solid rgba(16, 185, 129, 0.3);
      color: #34d399;
      padding: 4px 12px;
      border-radius: 9999px;
      font-size: 12px;
      font-weight: 600;
      margin-bottom: 16px;
    }
    .badge .dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #10b981;
      box-shadow: 0 0 8px #10b981;
    }
    h1 {
      font-size: 24px;
      font-weight: 700;
      margin-bottom: 8px;
      background: linear-gradient(135deg, #ffffff, #94a3b8);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    p {
      color: #94a3b8;
      font-size: 14px;
      line-height: 1.6;
      margin-bottom: 24px;
    }
    .actions {
      display: flex;
      flex-direction: column;
      gap: 12px;
      margin-bottom: 24px;
    }
    button {
      padding: 14px 20px;
      border-radius: 12px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      border: none;
      transition: all 0.2s ease;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
    }
    .btn-mic {
      background: linear-gradient(135deg, #10b981, #059669);
      color: white;
      box-shadow: 0 4px 14px rgba(16, 185, 129, 0.4);
    }
    .btn-mic:hover {
      background: linear-gradient(135deg, #059669, #047857);
      transform: translateY(-1px);
    }
    .btn-audio {
      background: rgba(255, 255, 255, 0.08);
      color: #e2e8f0;
      border: 1px solid rgba(255, 255, 255, 0.15);
    }
    .btn-audio:hover {
      background: rgba(255, 255, 255, 0.14);
    }
    .status-box {
      background: rgba(0, 0, 0, 0.3);
      border: 1px solid rgba(255, 255, 255, 0.05);
      border-radius: 12px;
      padding: 16px;
      text-align: left;
      font-size: 12px;
      font-family: monospace;
      color: #cbd5e1;
      margin-top: 16px;
      max-height: 140px;
      overflow-y: auto;
    }
    .info-callout {
      margin-top: 20px;
      padding: 12px 16px;
      background: rgba(56, 189, 248, 0.1);
      border: 1px solid rgba(56, 189, 248, 0.2);
      border-radius: 10px;
      font-size: 13px;
      color: #7dd3fc;
      text-align: left;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="badge">
      <span class="dot"></span>
      SIMULATED MEETING ROOM
    </div>
    <h1>Weekly Engineering Sync</h1>
    <p>Test the Chrome Extension's in-page auto-detection, dual-stream recording, and Gemini 3.1 Flash transcription here.</p>

    <div class="actions">
      <button class="btn-mic" id="btn-start-mic">
        🎙️ 1. Request Microphone (Triggers Auto-Detect Toast)
      </button>
      <button class="btn-audio" id="btn-play-sound">
        🔊 2. Play Simulated Remote Speaker (Tab Audio)
      </button>
    </div>

    <div class="info-callout">
      💡 <strong>What happens when you click:</strong><br>
      1. Clicking "Request Microphone" will trigger the extension's floating prompt in the top-right.<br>
      2. Click <strong>"Start Recording"</strong> on the prompt (or click the extension icon in Chrome).<br>
      3. Speak for 10–15 seconds, then stop recording from the popup to see Gemini transcribe!
    </div>

    <div class="status-box" id="log-box">
      [System] Ready for test. Click button 1 above.
    </div>
  </div>

  <script>
    const logBox = document.getElementById('log-box');
    function log(msg) {
      logBox.innerHTML += '<br>' + msg;
      logBox.scrollTop = logBox.scrollHeight;
    }

    let micStream = null;

    document.getElementById('btn-start-mic').addEventListener('click', async () => {
      try {
        log('⏳ Requesting microphone access (navigator.mediaDevices.getUserMedia)...');
        micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        log('✅ Microphone ACTIVE! The extension prompt should appear in the top-right corner now.');
        document.getElementById('btn-start-mic').textContent = '✅ Microphone Active (In Call)';
        document.getElementById('btn-start-mic').style.background = '#059669';
      } catch (err) {
        log('❌ Mic permission error: ' + err.message);
      }
    });

    document.getElementById('btn-play-sound').addEventListener('click', () => {
      try {
        const text = "Hi everyone! Welcome to the meeting. We are testing the AI meeting notetaker dual-stream recording with Gemini 3.1 Flash. The roadmap looks great, and next steps are to review pull requests by end of day.";
        const utter = new SpeechSynthesisUtterance(text);
        utter.rate = 1.0;
        utter.pitch = 1.0;
        window.speechSynthesis.speak(utter);
        log('🔊 Remote participant speaking synthesized speech for tab audio capture...');
      } catch (e) {
        log('Audio synthesis error: ' + e.message);
      }
    });
  </script>
</body>
</html>`;

const server = http.createServer(async (req, res) => {
  // Enable CORS for Chrome Extensions
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // Serve the interactive test page
  if (req.url === '/' || req.url === '/test') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(TEST_HTML);
    return;
  }

  if (req.url === '/api/records' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
    });

    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        const meetingId = data.meetingId || `meeting_${Date.now()}`;
        const savedFiles = [];

        // 1. Save JSON transcript
        if (data.transcript) {
          const jsonPath = path.join(RECORDS_DIR, `meeting_${meetingId}.json`);
          fs.writeFileSync(jsonPath, JSON.stringify(data.transcript, null, 2), 'utf-8');
          savedFiles.push(jsonPath);

          // 2. Save Markdown transcript
          const mdPath = path.join(RECORDS_DIR, `meeting_${meetingId}.md`);
          let mdContent = `# Meeting Transcript: ${data.title || meetingId}\n\n`;
          mdContent += `* **Date:** ${data.date || new Date().toISOString()}\n`;
          mdContent += `* **Duration:** ${data.durationSeconds || 0}s\n\n`;
          if (data.transcript.summary) {
            mdContent += `## 📋 Summary\n${data.transcript.summary}\n\n`;
          }
          if (data.transcript.actionItems && data.transcript.actionItems.length > 0) {
            mdContent += `## ✅ Action Items\n`;
            data.transcript.actionItems.forEach(item => {
              mdContent += `* ${item}\n`;
            });
            mdContent += `\n`;
          }
          mdContent += `## 💬 Dialogue\n\n`;
          mdContent += `| Time | Speaker | Utterance |\n| :--- | :--- | :--- |\n`;
          (data.transcript.segments || []).forEach(seg => {
            mdContent += `| **${seg.startTime} - ${seg.endTime}** | **${seg.speaker}** | ${seg.text} |\n`;
          });
          fs.writeFileSync(mdPath, mdContent, 'utf-8');
          savedFiles.push(mdPath);
        }

        // 3. Save Audio file if provided
        if (data.audioBase64) {
          const ext = data.mimeType && data.mimeType.includes('mp4') ? 'm4a' : 'webm';
          const audioPath = path.join(RECORDS_DIR, `meeting_${meetingId}.${ext}`);
          const buffer = Buffer.from(data.audioBase64, 'base64');
          fs.writeFileSync(audioPath, buffer);
          savedFiles.push(audioPath);
        }

        console.log(`✅ [Server] Stored meeting ${meetingId} into records/:`, savedFiles);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, savedFiles }));
      } catch (err) {
        console.error('❌ [Server] Error saving record:', err);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  if (req.url === '/api/records' && req.method === 'GET') {
    const files = fs.readdirSync(RECORDS_DIR);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ records: files }));
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not Found' }));
});

server.listen(PORT, () => {
  console.log(`🚀 Meeting Record Sync Server running on http://localhost:${PORT}`);
  console.log(`🧪 Test page available at: http://localhost:${PORT}/test`);
  console.log(`📁 Saving records to: ${RECORDS_DIR}`);
});
