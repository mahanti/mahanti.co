(() => {
  const viewport = document.querySelector('[data-chessmono-horizontal-scroll]');
  const strip = viewport?.querySelector('.chessmono-strip');
  if (!strip) return;
  const sections = [...strip.children];
  const desktop = matchMedia('(min-width: 761px)');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  let frame = 0;

  function update() {
    frame = 0;
    if (!desktop.matches) {
      sections.forEach(section => {
        strip.append(section);
        section.style.removeProperty('opacity');
        section.style.removeProperty('filter');
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
        strip.append(first);
        viewport.scrollLeft -= distance;
      } else if (firstBounds.left > bounds.left - 100 && lastBounds.left > bounds.right) {
        const distance = lastBounds.width + gap;
        strip.prepend(last);
        viewport.scrollLeft += distance;
      } else break;
    }
    sections.forEach(section => {
      const rect = section.getBoundingClientRect();
      const visible = Math.max(0, Math.min(rect.right, bounds.right) - Math.max(rect.left, bounds.left));
      const exit = 1 - Math.min(1, visible / rect.width);
      section.style.opacity = reducedMotion.matches ? '1' : String(1 - exit * 0.45);
      section.style.filter = reducedMotion.matches || exit === 0 ? 'none' : `blur(${exit * 2}px)`;
    });
  }
  function schedule() {
    if (!frame) frame = requestAnimationFrame(update);
  }
  viewport.addEventListener('scroll', schedule, { passive: true });
  desktop.addEventListener('change', schedule);
  reducedMotion.addEventListener('change', schedule);
  new ResizeObserver(schedule).observe(strip);
  sections.forEach(section => new ResizeObserver(schedule).observe(section));
  update();
})();
