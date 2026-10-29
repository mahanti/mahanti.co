(() => {
  const viewport = document.querySelector('[data-chessmono-horizontal-scroll]');
  const strip = viewport?.querySelector('.chessmono-strip');
  if (!strip) return;
  const sections = [...strip.children];
  const desktop = matchMedia('(min-width: 761px)');
  let frame = 0;
  function moveSection(section, before = null) {
    // Preserve media and animation state where atomic DOM moves are supported.
    if (strip.moveBefore) strip.moveBefore(section, before);
    else strip.insertBefore(section, before);
  }

  function update() {
    frame = 0;
    if (!desktop.matches) {
      sections.forEach(section => {
        if (strip.lastElementChild !== section) moveSection(section);
      });
      viewport.scrollLeft = 0;
      return;
    }
    const bounds = viewport.getBoundingClientRect();
    const gap = parseFloat(getComputedStyle(strip).columnGap) || 0;
    // Recycle only sections that are fully outside the viewport. Keep the
    // same video elements and compensate scroll position before painting.
    for (let i = 0; i < sections.length; i++) {
      const first = strip.firstElementChild;
      const last = strip.lastElementChild;
      const firstBounds = first.getBoundingClientRect();
      const lastBounds = last.getBoundingClientRect();
      if (firstBounds.right + gap < bounds.left - 100) {
        const distance = firstBounds.width + gap;
        moveSection(first);
        viewport.scrollLeft -= distance;
      } else if (firstBounds.left > bounds.left - 100 && lastBounds.left > bounds.right) {
        const distance = lastBounds.width + gap;
        moveSection(last, first);
        viewport.scrollLeft += distance;
      } else break;
    }

  }
  function schedule() {
    if (!frame) frame = requestAnimationFrame(update);
  }
  viewport.addEventListener('scroll', schedule, { passive: true });
  desktop.addEventListener('change', schedule);
  new ResizeObserver(schedule).observe(strip);
  sections.forEach(section => new ResizeObserver(schedule).observe(section));
  update();
})();
