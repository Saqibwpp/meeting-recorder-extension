import { ExtensionMessage } from '../types';

let promptContainer: HTMLDivElement | null = null;
let hasHandledMeetingInTab = false;

// Listen for background trigger
chrome.runtime.onMessage.addListener((message: ExtensionMessage) => {
  if (message.type === 'MEETING_DETECTED') {
    if (!hasHandledMeetingInTab) {
      showMeetingPrompt(message.payload.title, message.payload.platform);
    }
  }
});

// Hook microphone usage in the page
function monitorMicrophoneUsage() {
  const originalGetUserMedia = navigator.mediaDevices?.getUserMedia?.bind(navigator.mediaDevices);
  if (originalGetUserMedia) {
    navigator.mediaDevices.getUserMedia = async function (constraints) {
      if (constraints && typeof constraints === 'object' && constraints.audio) {
        if (!hasHandledMeetingInTab) {
          showMeetingPrompt(document.title, 'browser-tab');
        }
      }
      return originalGetUserMedia(constraints);
    };
  }
}

try {
  monitorMicrophoneUsage();
} catch {
  // Ignore in restricted frames
}

async function showMeetingPrompt(title: string, platform: string) {
  if (promptContainer || hasHandledMeetingInTab) return;

  // Check if extension is already recording
  try {
    const status = await chrome.runtime.sendMessage({ type: 'GET_RECORDING_STATUS' });
    if (status?.isRecording) {
      hasHandledMeetingInTab = true;
      return;
    }
  } catch {
    // Service worker not ready
  }

  promptContainer = document.createElement('div');
  promptContainer.id = 'ai-meeting-recorder-prompt';
  promptContainer.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    z-index: 9999999;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    background: rgba(15, 23, 42, 0.94);
    backdrop-filter: blur(16px);
    border: 1px solid rgba(255, 255, 255, 0.15);
    border-radius: 16px;
    padding: 16px 20px;
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);
    color: #ffffff;
    max-width: 360px;
    display: flex;
    flex-direction: column;
    gap: 12px;
    animation: aiSlideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  `;

  // Inject animation styles if not already present
  if (!document.getElementById('ai-notetaker-styles')) {
    const style = document.createElement('style');
    style.id = 'ai-notetaker-styles';
    style.textContent = `
      @keyframes aiSlideIn {
        from { transform: translateY(-30px); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
      }
      @keyframes aiPulse {
        0%, 100% { transform: scale(1); opacity: 1; }
        50% { transform: scale(1.15); opacity: 0.7; }
      }
    `;
    document.head.appendChild(style);
  }

  promptContainer.innerHTML = `
    <div style="display: flex; align-items: center; gap: 10px;">
      <div style="width: 12px; height: 12px; border-radius: 50%; background: #22c55e; box-shadow: 0 0 10px #22c55e; animation: aiPulse 2s infinite;"></div>
      <div style="flex: 1;">
        <div style="font-size: 14px; font-weight: 600; color: #f8fafc;">Meeting Detected</div>
        <div style="font-size: 12px; color: #94a3b8; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${escapeHtml(title || 'Active Call')}</div>
      </div>
    </div>
    <div style="font-size: 13px; color: #cbd5e1; line-height: 1.4;">
      Would you like to start the AI Notetaker to record and transcribe this meeting?
    </div>
    <div style="display: flex; justify-content: flex-end; gap: 8px; margin-top: 4px;">
      <button id="ai-btn-dismiss" style="background: rgba(255,255,255,0.08); border: none; color: #94a3b8; padding: 8px 14px; border-radius: 8px; font-size: 12px; cursor: pointer; font-weight: 500;">
        Dismiss
      </button>
      <button id="ai-btn-record" style="background: linear-gradient(135deg, #22c55e, #16a34a); border: none; color: #ffffff; padding: 8px 16px; border-radius: 8px; font-size: 12px; cursor: pointer; font-weight: 600; box-shadow: 0 4px 12px rgba(34, 197, 94, 0.3);">
        Start Recording
      </button>
    </div>
  `;

  document.body.appendChild(promptContainer);

  document.getElementById('ai-btn-dismiss')?.addEventListener('click', () => {
    hasHandledMeetingInTab = true;
    removePrompt();
  });

  document.getElementById('ai-btn-record')?.addEventListener('click', () => {
    hasHandledMeetingInTab = true;
    chrome.runtime.sendMessage({ type: 'START_RECORDING' });
    if (promptContainer) {
      promptContainer.innerHTML = `
        <div style="display: flex; align-items: center; gap: 10px;">
          <div style="width: 12px; height: 12px; border-radius: 50%; background: #ef4444; box-shadow: 0 0 10px #ef4444; animation: aiPulse 1.2s infinite;"></div>
          <div style="font-size: 14px; font-weight: 600; color: #ef4444;">Recording In Progress...</div>
        </div>
        <div style="font-size: 12px; color: #94a3b8;">Click the extension icon at any time to stop and transcribe.</div>
      `;
      setTimeout(removePrompt, 3000);
    }
  });
}

function removePrompt() {
  if (promptContainer) {
    promptContainer.remove();
    promptContainer = null;
  }
}

function escapeHtml(str: string): string {
  return str.replace(/[&<>'"]/g, tag => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;'
  }[tag] || tag));
}
