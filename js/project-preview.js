(() => {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  document.querySelectorAll('[data-project-preview]').forEach(video => {
    let visible = false;

    const syncPlayback = () => {
      if (visible && !document.hidden && !reducedMotion.matches) {
        // Keep the poster visible if the browser declines muted autoplay.
        video.play().catch(() => {});
      } else {
        video.pause();
      }
    };

    syncPlayback();
    document.addEventListener('visibilitychange', syncPlayback);
    reducedMotion.addEventListener('change', syncPlayback);
    new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      syncPlayback();
    }, { threshold: 0.1 }).observe(video);
  });
})();
