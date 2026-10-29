(() => {
  const viewport = document.querySelector('[data-chessmono-horizontal-scroll]');
  if (!viewport || viewport.dataset.cylinderReady) return;
  viewport.dataset.cylinderReady = 'true';
  const strip = viewport.querySelector('.chessmono-strip');
  const cards = [...strip.children];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const step = Math.PI * 2 / cards.length;
  let position = 0, radius = 600, spacing = 500, velocity = 0, frame = 0, lastTime = 0;
  let drag = null, suppressClick = false;
  let tuning = { depth: 1, perspective: 3, gap: 180, scrollSpeed: 1, momentum: 230 };
  const wrap = (value, period) => ((value + period / 2) % period + period) % period - period / 2;
  viewport.classList.add('is-cylinder');
  viewport.tabIndex = 0;
  viewport.setAttribute('role', 'region');
  viewport.setAttribute('aria-label', 'Check gallery. Scroll, swipe, or use left and right arrow keys to rotate.');

  function render() {
    position = wrap(position, cards.length * spacing);
    cards.forEach((card, index) => {
      const offset = wrap(index * spacing - position, cards.length * spacing);
      const angle = offset / spacing * step;
      const visible = reduced.matches ? Math.abs(offset) < viewport.clientWidth / 2 + spacing / 2 : Math.abs(angle) < Math.PI / 2;
      const x = reduced.matches ? offset : Math.sin(angle) * radius;
      const z = reduced.matches ? 0 : (Math.cos(angle) - 1) * radius * tuning.depth;
      card.style.transform = `translate(-50%, -50%) translate3d(${x}px, 0, ${z}px) rotateY(${reduced.matches ? 0 : angle}rad)`;
      card.style.visibility = visible ? 'visible' : 'hidden';
      card.style.zIndex = String(Math.round(1000 + z));
      card.inert = !visible;
    });
  }
  function resize() {
    const progress = position / spacing;
    const widest = Math.max(...cards.map(card => card.offsetWidth));
    spacing = widest + Math.min(tuning.gap, viewport.clientWidth * tuning.gap / 1125);
    radius = spacing / step;
    position = progress * spacing;
    viewport.style.perspective = `${Math.max(300, radius * tuning.perspective)}px`;
    render();
  }
  function stop() {
    cancelAnimationFrame(frame);
    frame = 0;
    velocity = 0;
  }
  function coast(time) {
    const dt = Math.min(32, time - lastTime);
    lastTime = time;
    position += velocity * dt;
    velocity *= Math.exp(-dt / tuning.momentum);
    render();
    if (Math.abs(velocity) > .015) frame = requestAnimationFrame(coast);
    else stop();
  }
  viewport.addEventListener('wheel', event => {
    if (event.ctrlKey) return;
    event.preventDefault();
    stop();
    const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
    position += delta * tuning.scrollSpeed * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? viewport.clientWidth : 1);
    render();
  }, { passive: false });
  viewport.addEventListener('pointerdown', event => {
    if (!event.isPrimary || event.button !== 0 || event.target.closest('button, a')) return;
    stop();
    suppressClick = false;
    drag = { id: event.pointerId, x: event.clientX, y: event.clientY, time: event.timeStamp, distance: 0 };
  });
  viewport.addEventListener('pointermove', event => {
    if (!drag || drag.id !== event.pointerId) return;
    const dx = drag.x - event.clientX, dy = drag.y - event.clientY;
    const delta = Math.abs(dx) >= Math.abs(dy) ? dx : dy;
    drag.distance += Math.hypot(dx, dy);
    if (drag.distance > 6) {
      viewport.setPointerCapture(event.pointerId);
      viewport.classList.add('is-dragging');
      suppressClick = true;
    }
    position += delta;
    velocity = delta / Math.max(8, event.timeStamp - drag.time);
    drag.x = event.clientX; drag.y = event.clientY; drag.time = event.timeStamp;
    render();
  });
  function release(event) {
    if (!drag || drag.id !== event.pointerId) return;
    if (event.type !== 'pointerup' || event.timeStamp - drag.time > 80 || reduced.matches) velocity = 0;
    drag = null;
    viewport.classList.remove('is-dragging');
    if (viewport.hasPointerCapture(event.pointerId)) viewport.releasePointerCapture(event.pointerId);
    if (velocity) { lastTime = performance.now(); frame = requestAnimationFrame(coast); }
  }
  ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(type => viewport.addEventListener(type, release));
  viewport.addEventListener('click', event => {
    if (!suppressClick) return;
    suppressClick = false;
    event.preventDefault();
    event.stopImmediatePropagation();
  }, true);
  viewport.addEventListener('keydown', event => {
    if (event.target !== viewport) return;
    const direction = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[event.key];
    if (!direction) return;
    event.preventDefault(); stop(); position += direction * spacing; render();
  });
  viewport.addEventListener('focusin', event => {
    const card = cards.find(item => item.contains(event.target));
    if (card) { stop(); position = cards.indexOf(card) * spacing; render(); }
  });
  window.addEventListener('check-cylinder-tune', event => {
    tuning = { ...event.detail.cylinder, ...event.detail.motion };
    resize();
  });
  window.addEventListener('check-cylinder-home', () => { stop(); position = 0; render(); });
  reduced.addEventListener('change', () => { stop(); render(); });
  new ResizeObserver(resize).observe(viewport);
  resize();
})();
