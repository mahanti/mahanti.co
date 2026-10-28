(() => {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  document.querySelectorAll('[data-project-preview]').forEach(video => {
    let visible = false;
    let userPlayback = null;
    const toggle = video.id && document.querySelector(`[data-preview-toggle][aria-controls="${video.id}"]`);
    const updateControl = () => {
      if (!toggle) return;
      toggle.textContent = video.paused ? 'Play video' : 'Pause video';
      toggle.setAttribute('aria-label', video.paused ? 'Play Proto video' : 'Pause Proto video');
    };
    const syncPlayback = () => {
      if (visible && !document.hidden && (userPlayback ?? !reducedMotion.matches)) {
        // Defer the Proto download until visible and motion is allowed/requested.
        if (video.dataset.previewSrc && !video.getAttribute('src')) {
          video.src = video.dataset.previewSrc;
        }
        video.play().catch(updateControl);
      } else {
        video.pause();
      }
      updateControl();
    };

    if (toggle) {
      toggle.hidden = false;
      toggle.addEventListener('click', () => {
        userPlayback = video.paused;
        syncPlayback();
      });
      video.addEventListener('play', updateControl);
      video.addEventListener('pause', updateControl);
    }
    syncPlayback();
    document.addEventListener('visibilitychange', syncPlayback);
    reducedMotion.addEventListener('change', () => {
      userPlayback = null;
      syncPlayback();
    });
    new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      syncPlayback();
    }, { threshold: 0.1 }).observe(video);
  });
})();
