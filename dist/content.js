let i=null,n=!1;chrome.runtime.onMessage.addListener(e=>{e.type==="MEETING_DETECTED"&&(n||a(e.payload.title,e.payload.platform))});window.addEventListener("AI_NOTETAKER_MIC_DETECTED",e=>{var t;if(!n){const r=((t=e.detail)==null?void 0:t.title)||document.title;a(r)}});var l,c;try{const e=(c=(l=navigator.mediaDevices)==null?void 0:l.getUserMedia)==null?void 0:c.bind(navigator.mediaDevices);e&&(navigator.mediaDevices.getUserMedia=async function(t){return t&&typeof t=="object"&&t.audio&&(n||a(document.title,"browser-tab")),e(t)})}catch{}async function a(e,t){var r,d;if(!(i||n)){try{const o=await chrome.runtime.sendMessage({type:"GET_RECORDING_STATUS"});if(o!=null&&o.isRecording){n=!0;return}}catch{}if(i=document.createElement("div"),i.id="ai-meeting-recorder-prompt",i.style.cssText=`
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
    `,document.head.appendChild(o)}i.innerHTML=`
    <div style="display: flex; align-items: center; gap: 10px;">
      <div style="width: 12px; height: 12px; border-radius: 50%; background: #22c55e; box-shadow: 0 0 10px #22c55e; animation: aiPulse 2s infinite;"></div>
      <div style="flex: 1;">
        <div style="font-size: 14px; font-weight: 600; color: #f8fafc;">Meeting Detected</div>
        <div style="font-size: 12px; color: #94a3b8; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${p(e||"Active Call")}</div>
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
  `,document.body.appendChild(i),(r=document.getElementById("ai-btn-dismiss"))==null||r.addEventListener("click",()=>{n=!0,s()}),(d=document.getElementById("ai-btn-record"))==null||d.addEventListener("click",()=>{n=!0,chrome.runtime.sendMessage({type:"START_RECORDING"}),i&&(i.innerHTML=`
        <div style="display: flex; align-items: center; gap: 10px;">
          <div style="width: 12px; height: 12px; border-radius: 50%; background: #ef4444; box-shadow: 0 0 10px #ef4444; animation: aiPulse 1.2s infinite;"></div>
          <div style="font-size: 14px; font-weight: 600; color: #ef4444;">Recording In Progress...</div>
        </div>
        <div style="font-size: 12px; color: #94a3b8;">Click the extension icon at any time to stop and transcribe.</div>
      `,setTimeout(s,3e3))})}}function s(){i&&(i.remove(),i=null)}function p(e){return e.replace(/[&<>'"]/g,t=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"})[t]||t)}
