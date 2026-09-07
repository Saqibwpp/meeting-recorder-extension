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
  console.log(`📁 Saving records to: ${RECORDS_DIR}`);
});
