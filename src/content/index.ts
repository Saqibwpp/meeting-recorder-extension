let promptContainer: HTMLDivElement | null = null;
let userDismissedPrompt = false;
let domCallDetected = false;

// 1. DOM Watcher for Active Calls (Works for Meet and Teams)
setInterval(() => {
  const isMeet = location.href.includes('meet.google.com');
  const isTeams = location.href.includes('teams.microsoft.com') || 
                  location.href.includes('teams.live.com') || 
                  location.href.includes('teams.cloud.microsoft');
                  
  if (!isMeet && !isTeams) return;
      
  const isCallActive = checkCallUiActive();
  
  if (isCallActive && !domCallDetected) {
    domCallDetected = true;
    userDismissedPrompt = false; // Force prompt on new DOM call detected
    const platform = isMeet ? 'Google Meet' : 'Teams Call';
    maybeShowPrompt(document.title || platform);
  } else if (!isCallActive && domCallDetected) {
    domCallDetected = false;
  }
}, 2000);

function checkCallUiActive(): boolean {
  // Look specifically for "Leave", "End call", or "Hang up" buttons
  const selectors = [
    '[aria-label*="leave" i]', '[title*="leave" i]', '[data-tid*="leave" i]',
    '[aria-label*="hang" i]', '[title*="hang" i]', '#hangup-button',
    '[aria-label*="end call" i]', '[title*="end call" i]',
    '[data-tid="call-status"]', '[data-tid="participant-state-indicator"]'
  ];
  for (const sel of selectors) {
    if (document.querySelector(sel)) return true;
  }
  
  // Fallback: check button text
  const buttons = document.querySelectorAll('button, [role="button"]');
  for (let i = 0; i < Math.min(buttons.length, 100); i++) {
    const text = buttons[i].textContent?.toLowerCase();
    if (text?.includes('leave') || text?.includes('calling...') || text?.includes('hang up') || text?.includes('end call')) {
      return true;
    }
  }
  return false;
}

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
    <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 4px;">
      <div style="width: 10px; height: 10px; border-radius: 50%; background: #5b695e; box-shadow: 0 0 8px rgba(91,105,94,0.4); animation: aiPulseReady 2s infinite;"></div>
      <div style="flex: 1; min-width: 0;">
        <div style="font-size: 14px; font-weight: 600; color: #1a1a1a;">Meeting Detected</div>
        <div style="font-size: 12px; color: #888; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${escapeHtml(title || 'Active Call')}</div>
      </div>
    </div>
    <div style="font-size: 13px; color: #555; line-height: 1.5; margin-bottom: 12px;">
      Would you like to start the AI Notetaker to record and transcribe this meeting?
    </div>
    <div style="display: flex; justify-content: flex-end; gap: 8px;">
      <button id="ai-btn-dismiss" style="background: #f2f0e9; border: 1px solid #e5e3d9; color: #666; padding: 8px 14px; border-radius: 6px; font-size: 12px; cursor: pointer; font-weight: 500; transition: all 0.2s;" onmouseover="this.style.background='#e5e3d9'" onmouseout="this.style.background='#f2f0e9'">
        Dismiss
      </button>
      <button id="ai-btn-record" style="background: #2d2d2d; border: 1px solid #2d2d2d; color: #ffffff; padding: 8px 16px; border-radius: 6px; font-size: 12px; cursor: pointer; font-weight: 500; transition: all 0.2s;" onmouseover="this.style.background='#1a1a1a'" onmouseout="this.style.background='#2d2d2d'">
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
    
    // Show a loading state instantly
    if (promptContainer) {
      promptContainer.innerHTML = `
        <div style="display: flex; align-items: center; gap: 10px;">
          <div style="width: 10px; height: 10px; border-radius: 50%; background: #e5e3d9; box-shadow: 0 0 8px rgba(0,0,0,0.1); animation: aiPulseReady 1.2s infinite;"></div>
          <div style="font-size: 14px; font-weight: 600; color: #555;">Starting...</div>
        </div>
      `;
    }

    chrome.runtime.sendMessage({ type: 'START_RECORDING' }, (response) => {
      if (response && response.success) {
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
      } else {
        // Chrome blocked it because of missing user gesture
        if (promptContainer) {
          promptContainer.innerHTML = `
            <div style="display: flex; align-items: center; gap: 10px;">
              <div style="font-size: 14px; font-weight: 600; color: #da7756;">Permission Required</div>
            </div>
            <div style="font-size: 13px; color: #555; margin-top: 4px; line-height: 1.4;">
              Chrome requires you to click the <strong>AI Notetaker extension icon</strong> in your browser toolbar to start recording.
            </div>
            <div style="display: flex; justify-content: flex-end; gap: 8px; margin-top: 4px;">
              <button id="ai-btn-close-error" style="background: #f2f0e9; border: 1px solid #e5e3d9; color: #666; padding: 8px 14px; border-radius: 4px; font-size: 12px; cursor: pointer; font-weight: 500;">
                Got it
              </button>
            </div>
          `;
          document.getElementById('ai-btn-close-error')?.addEventListener('click', removePrompt);
        }
      }
    });
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
