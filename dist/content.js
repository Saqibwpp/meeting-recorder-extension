let t=null;chrome.runtime.onMessage.addListener(e=>{e.type==="MEETING_DETECTED"&&d(e.payload.title,e.payload.platform)});function s(){var o,n;const e=(n=(o=navigator.mediaDevices)==null?void 0:o.getUserMedia)==null?void 0:n.bind(navigator.mediaDevices);e&&(navigator.mediaDevices.getUserMedia=async function(i){return i&&typeof i=="object"&&i.audio&&(console.log("🎙️ [AI Notetaker] Microphone access detected in meeting tab!"),d(document.title)),e(i)})}try{s()}catch{}function d(e,o){var n,i;if(!t){if(t=document.createElement("div"),t.id="ai-meeting-recorder-prompt",t.style.cssText=`
    position: fixed;
    top: 20px;
    right: 20px;
    z-index: 9999999;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    background: rgba(15, 23, 42, 0.92);
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
  `,!document.getElementById("ai-notetaker-styles")){const r=document.createElement("style");r.id="ai-notetaker-styles",r.textContent=`
      @keyframes aiSlideIn {
        from { transform: translateY(-30px); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
      }
      @keyframes aiPulse {
        0%, 100% { transform: scale(1); opacity: 1; }
        50% { transform: scale(1.15); opacity: 0.7; }
      }
    `,document.head.appendChild(r)}t.innerHTML=`
    <div style="display: flex; align-items: center; gap: 10px;">
      <div style="width: 12px; height: 12px; border-radius: 50%; background: #22c55e; box-shadow: 0 0 10px #22c55e; animation: aiPulse 2s infinite;"></div>
      <div style="flex: 1;">
        <div style="font-size: 14px; font-weight: 600; color: #f8fafc;">Meeting Detected</div>
        <div style="font-size: 12px; color: #94a3b8; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${l(e||"Active Call")}</div>
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
  `,document.body.appendChild(t),(n=document.getElementById("ai-btn-dismiss"))==null||n.addEventListener("click",()=>{a()}),(i=document.getElementById("ai-btn-record"))==null||i.addEventListener("click",()=>{chrome.runtime.sendMessage({type:"START_RECORDING"}),t&&(t.innerHTML=`
        <div style="display: flex; align-items: center; gap: 10px;">
          <div style="width: 12px; height: 12px; border-radius: 50%; background: #ef4444; box-shadow: 0 0 10px #ef4444; animation: aiPulse 1.2s infinite;"></div>
          <div style="font-size: 14px; font-weight: 600; color: #ef4444;">Recording In Progress...</div>
        </div>
        <div style="font-size: 12px; color: #94a3b8;">Click the extension icon at any time to stop and transcribe.</div>
      `,setTimeout(a,3500))})}}function a(){t&&(t.remove(),t=null)}function l(e){return e.replace(/[&<>'"]/g,o=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"})[o]||o)}
