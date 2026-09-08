let e=null,r=!1;chrome.runtime.onMessage.addListener(t=>{t.type==="MEETING_DETECTED"&&(r||s(t.payload.title,t.payload.platform))});function l(){var n,a;const t=(a=(n=navigator.mediaDevices)==null?void 0:n.getUserMedia)==null?void 0:a.bind(navigator.mediaDevices);t&&(navigator.mediaDevices.getUserMedia=async function(i){return i&&typeof i=="object"&&i.audio&&(r||s(document.title)),t(i)})}try{l()}catch{}async function s(t,n){var a,i;if(!(e||r)){try{const o=await chrome.runtime.sendMessage({type:"GET_RECORDING_STATUS"});if(o!=null&&o.isRecording){r=!0;return}}catch{}if(e=document.createElement("div"),e.id="ai-meeting-recorder-prompt",e.style.cssText=`
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
  `,!document.getElementById("ai-notetaker-styles")){const o=document.createElement("style");o.id="ai-notetaker-styles",o.textContent=`
      @keyframes aiSlideIn {
        from { transform: translateY(-30px); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
      }
      @keyframes aiPulse {
        0%, 100% { transform: scale(1); opacity: 1; }
        50% { transform: scale(1.15); opacity: 0.7; }
      }
    `,document.head.appendChild(o)}e.innerHTML=`
    <div style="display: flex; align-items: center; gap: 10px;">
      <div style="width: 12px; height: 12px; border-radius: 50%; background: #22c55e; box-shadow: 0 0 10px #22c55e; animation: aiPulse 2s infinite;"></div>
      <div style="flex: 1;">
        <div style="font-size: 14px; font-weight: 600; color: #f8fafc;">Meeting Detected</div>
        <div style="font-size: 12px; color: #94a3b8; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${p(t||"Active Call")}</div>
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
  `,document.body.appendChild(e),(a=document.getElementById("ai-btn-dismiss"))==null||a.addEventListener("click",()=>{r=!0,d()}),(i=document.getElementById("ai-btn-record"))==null||i.addEventListener("click",()=>{r=!0,chrome.runtime.sendMessage({type:"START_RECORDING"}),e&&(e.innerHTML=`
        <div style="display: flex; align-items: center; gap: 10px;">
          <div style="width: 12px; height: 12px; border-radius: 50%; background: #ef4444; box-shadow: 0 0 10px #ef4444; animation: aiPulse 1.2s infinite;"></div>
          <div style="font-size: 14px; font-weight: 600; color: #ef4444;">Recording In Progress...</div>
        </div>
        <div style="font-size: 12px; color: #94a3b8;">Click the extension icon at any time to stop and transcribe.</div>
      `,setTimeout(d,3e3))})}}function d(){e&&(e.remove(),e=null)}function p(t){return t.replace(/[&<>'"]/g,n=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"})[n]||n)}
