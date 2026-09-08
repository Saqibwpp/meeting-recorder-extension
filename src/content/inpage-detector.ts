// Runs in the MAIN world to intercept the webpage's native getUserMedia calls
(function () {
  const originalGetUserMedia = navigator.mediaDevices?.getUserMedia?.bind(navigator.mediaDevices);
  if (!originalGetUserMedia) return;

  navigator.mediaDevices.getUserMedia = async function (constraints) {
    if (constraints && typeof constraints === 'object' && constraints.audio) {
      // Notify the content script running in the isolated world
      window.dispatchEvent(
        new CustomEvent('AI_NOTETAKER_MIC_DETECTED', {
          detail: { title: document.title }
        })
      );
    }
    return originalGetUserMedia(constraints);
  };
})();
