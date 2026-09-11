import { ExtensionMessage } from '../types';

let promptContainer: HTMLDivElement | null = null;
let userDismissedPrompt = false;

// Listen for background trigger (meeting platform detected)
chrome.runtime.onMessage.addListener((message: ExtensionMessage) => {
  if (message.type === 'MEETING_DETECTED') {
    maybeShowPrompt(message.payload.title);
  }
});

async function maybeShowPrompt(title: string) {
  // Don't show if user already dismissed in this page session
  if (userDismissedPrompt) return;
  // Don't show if already visible
  if (promptContainer) return;

  // Don't show if already recording
  try {
    const status = await chrome.runtime.sendMessage({ type: 'GET_RECORDING_STATUS' });
    if (status?.isRecording) return;
  } catch {
    // Service worker not ready yet
  }

  showMeetingPrompt(title);
}

function showMeetingPrompt(title: string) {
  promptContainer = document.createElement('div');
  promptContainer.id = 'ai-meeting-recorder-prompt';
  promptContainer.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    z-index: 9999999;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    background: rgba(253, 252, 249, 0.98);
    backdrop-filter: blur(16px);
    border: 1px solid #e5e3d9;
    border-radius: 12px;
    padding: 16px 20px;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
    color: #2d2d2d;
    max-width: 360px;
    display: flex;
    flex-direction: column;
    gap: 12px;
    animation: aiSlideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  `;

  if (!document.getElementById('ai-notetaker-styles')) {
    const style = document.createElement('style');
    style.id = 'ai-notetaker-styles';
    style.textContent = `
      @keyframes aiSlideIn {
        from { transform: translateY(-30px); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
      }
      @keyframes aiPulseReady {
        0%, 100% { transform: scale(1); opacity: 1; }
        50% { transform: scale(1.15); opacity: 0.7; }
      }
    `;
    document.head.appendChild(style);
  }

  promptContainer.innerHTML = `
    <div style="display: flex; align-items: center; gap: 10px;">
      <div style="width: 10px; height: 10px; border-radius: 50%; background: #5b695e; box-shadow: 0 0 8px rgba(91,105,94,0.4); animation: aiPulseReady 2s infinite;"></div>
      <div style="flex: 1;">
        <div style="font-size: 14px; font-weight: 600; color: #1a1a1a;">Meeting Detected</div>
        <div style="font-size: 12px; color: #888; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${escapeHtml(title || 'Active Call')}</div>
      </div>
    </div>
    <div style="font-size: 13px; color: #555; line-height: 1.4;">
      Would you like to start the AI Notetaker to record and transcribe this meeting?
    </div>
    <div style="display: flex; justify-content: flex-end; gap: 8px; margin-top: 4px;">
      <button id="ai-btn-dismiss" style="background: #f2f0e9; border: 1px solid #e5e3d9; color: #666; padding: 8px 14px; border-radius: 4px; font-size: 12px; cursor: pointer; font-weight: 500;">
        Dismiss
      </button>
      <button id="ai-btn-record" style="background: #2d2d2d; border: 1px solid #2d2d2d; color: #ffffff; padding: 8px 16px; border-radius: 4px; font-size: 12px; cursor: pointer; font-weight: 500;">
        Start Recording
      </button>
    </div>
  `;

  document.body.appendChild(promptContainer);

  document.getElementById('ai-btn-dismiss')?.addEventListener('click', () => {
    userDismissedPrompt = true;
    removePrompt();
  });

  document.getElementById('ai-btn-record')?.addEventListener('click', () => {
    userDismissedPrompt = true;
    chrome.runtime.sendMessage({ type: 'START_RECORDING' });
    if (promptContainer) {
      promptContainer.innerHTML = `
        <div style="display: flex; align-items: center; gap: 10px;">
          <div style="width: 10px; height: 10px; border-radius: 50%; background: #d97757; box-shadow: 0 0 8px rgba(217,119,87,0.4); animation: aiPulseReady 1.2s infinite;"></div>
          <div style="font-size: 14px; font-weight: 600; color: #d97757;">Recording In Progress...</div>
        </div>
        <div style="font-size: 12px; color: #888; margin-top: 4px;">Click the extension icon at any time to stop and transcribe.</div>
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
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;'
  };
  return str.replace(/[&<>'"]/g, tag => map[tag] || tag);
}
