(() => {
  const video = document.querySelector('[data-project-preview]');
  if (!video) return;

  const button = video.closest('.block-project-card').querySelector('.block-preview-toggle');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let wantsPlayback = !reducedMotion.matches;
  let visible = false;
  let playRequest = 0;

  const updateButton = () => {
    button.textContent = video.paused ? 'Play preview' : 'Pause preview';
  };

  const syncPlayback = async () => {
    const request = ++playRequest;
    if (wantsPlayback && visible && !document.hidden) {
      try {
        await video.play();
      } catch {
        // A blocked autoplay attempt leaves the poster and play button usable.
        if (request === playRequest) wantsPlayback = false;
      }
    } else {
      video.pause();
    }
    updateButton();
  };

  button.hidden = false;
  button.addEventListener('click', () => {
    wantsPlayback = video.paused;
    syncPlayback();
  });
  video.addEventListener('play', updateButton);
  video.addEventListener('pause', updateButton);
  document.addEventListener('visibilitychange', syncPlayback);
  reducedMotion.addEventListener('change', () => {
    wantsPlayback = !reducedMotion.matches;
    syncPlayback();
  });
  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    syncPlayback();
  }, { threshold: 0.1 }).observe(video);
})();
