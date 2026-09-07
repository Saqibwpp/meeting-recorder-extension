# 🎙️ AI Meeting Notetaker Chrome Extension

A native Chrome Extension (Manifest V3) that auto-detects browser meetings, records dual-stream audio (Tab + Microphone), transcribes dialogue using Google Gemini Flash with automatic model fallback chains, and syncs audio and JSON transcripts directly into the repository.

---

## 🚀 Key Features

1. **Auto Meeting & Microphone Detection:**
   - Detects Google Meet (`meet.google.com`), Microsoft Teams (`teams.microsoft.com`), Zoom Web, and Slack Calls.
   - Monitors tab microphone usage and displays a sleek in-page floating toast: *"🎙️ Meeting Detected — Start AI Notetaker?"*.

2. **Persistent Dual-Stream Audio Engine:**
   - Built with Chrome MV3 **Offscreen Documents** and Web Audio API (`ChannelMergerNode`).
   - **Channel 1 (Left):** Local user / host microphone.
   - **Channel 2 (Right):** Remote participants from browser tab audio.
   - Audio keeps recording in the background even if the popup is closed!

3. **Gemini AI Transcription with Automated Fallback:**
   - Direct integration with Google's Gemini multimodal models.
   - Primary: `gemini-2.0-flash`
   - Automated Fallbacks: `gemini-1.5-flash` ➔ `gemini-1.5-pro` (handles HTTP 429 quota limits gracefully).
   - Generates executive summary, action items, and timestamped dialogue.

4. **Direct Local Repository Sync:**
   - Lightweight local server (`server/index.mjs` on port 4829).
   - Automatically writes `.webm` audio, `.json` data, and `.md` documents directly into `records/`.

5. **Modern Tech Stack:**
   - React 19 + TypeScript + Vite + Tailwind CSS + Lucide Icons.
   - TanStack Query (`@tanstack/react-query`) with custom mutation hooks.

---

## 🛠️ Installation & Setup (Under 2 Minutes)

### Step 1: Load Extension into Chrome
1. Open Google Chrome and navigate to `chrome://extensions/`.
2. Toggle on **Developer mode** in the top right corner.
3. Click **Load unpacked** in the top left.
4. Select the directory:
   ```text
   /Users/saqibejazm1/Documents/meeting-recorder-extension/dist
   ```
5. The **AI Meeting Notetaker** icon will appear in your Chrome toolbar. Pin it for quick access!

---

### Step 2: (Optional) Start the Local Repo Sync Server
If you want audio files and JSON transcripts to be saved automatically into the `records/` folder on your computer:
```bash
cd /Users/saqibejazm1/Documents/meeting-recorder-extension
npm run server
```
*(Leave this running in a terminal tab. If the server is not running, the extension still saves everything in Chrome storage and downloads the files automatically).*

---

### Step 3: Enter Your Gemini API Key
1. Click the **AI Meeting Notetaker** icon in your Chrome toolbar.
2. Click the **Settings** tab.
3. Paste your **Gemini API Key** and click **Save Settings**.
   *(If you don't have one, get a free key from [Google AI Studio](https://aistudio.google.com/app/apikey)).*

---

## 🎙️ How to Use

* **Automatic Detection:** Open Google Meet, Microsoft Teams, or any meeting call. When your microphone activates, a floating prompt appears in the top right corner asking if you want to start recording. Click **Start Recording**!
* **Manual Recording:** Click the extension icon at any time on any tab and click **Start Dual-Stream Recording**.
* **Review & Export:** Click **Stop & Transcribe with Gemini**. The meeting is immediately processed, diarized, summarized, and listed in the **Meetings** tab with one-click JSON export.

---

## 📂 Project Structure
```text
/Users/saqibejazm1/Documents/meeting-recorder-extension/
├── dist/                          # Ready-to-load Chrome Extension folder
├── src/
│   ├── manifest.json              # Chrome Extension MV3 Manifest
│   ├── background/
│   │   └── service-worker.ts      # Meeting detection & tab lifecycle
│   ├── content/
│   │   └── index.ts               # In-page floating meeting prompt
│   ├── offscreen/
│   │   ├── offscreen.html
│   │   └── audio-recorder.ts      # Dual-channel audio merger & MediaRecorder
│   ├── popup/
│   │   ├── index.html
│   │   ├── main.tsx
│   │   ├── App.tsx                # Popup UI with TanStack Query
│   │   └── components/
│   │       ├── RecordingCard.tsx
│   │       ├── MeetingHistory.tsx
│   │       └── SettingsView.tsx
│   ├── services/
│   │   ├── gemini.ts              # Gemini API with model fallback chain
│   │   ├── storage.ts             # chrome.storage.local persistence
│   │   └── sync.ts                # Sync service to local records/
│   └── hooks/
│       ├── useMeetings.ts         # TanStack Query hook with mutation invalidation
│       └── useSettings.ts         # Settings hook
├── server/
│   └── index.mjs                  # Local sync server (port 4829)
└── records/                       # Saved audio files & JSON transcripts
```
