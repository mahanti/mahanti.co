(() => {
  const viewport = document.querySelector('[data-chessmono-horizontal-scroll]');
  const strip = viewport?.querySelector('.chessmono-strip');
  if (!strip) return;
  const sections = [...strip.children];
  const desktop = matchMedia('(min-width: 761px)');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const intro = sections[0];
  let entrance = null;
  let interacted = false;
  let snap = null;
  let snapPending = false;
  let releaseSpeed = 0;
  let releaseVelocity = 0;
  let gestureTravel = 0;
  let gestureOrigin = null;
  let lastInput = -Infinity;
  let keyboardInput = false;
  let lastMotion = -Infinity;
  let frame = 0;
  let lastScroll = viewport.scrollLeft;
  let lastTime = performance.now();
  let speed = 0;
  let squeeze = 0;
  let squeezeVelocity = 0;
  function moveSection(section, before = null) {
    // Preserve media and animation state where atomic DOM moves are supported.
    if (strip.moveBefore) strip.moveBefore(section, before);
    else strip.insertBefore(section, before);
  }

  function update(now = performance.now()) {
    frame = 0;
    if (entrance) {
      const progress = Math.min(1, Math.max(0, (now - entrance.started) / 850));
      const eased = 1 - Math.pow(1 - progress, 3);
      viewport.scrollLeft += entrance.distance * (eased - entrance.progress);
      entrance.progress = eased;
      // The introductory glide should not trigger the high-speed squeeze.
      lastScroll = viewport.scrollLeft;
      if (progress === 1) {
        entrance = null;
        centerIntro();
      }
    }
    const dt = Math.min(0.032, Math.max(0.001, (now - lastTime) / 1000));
    lastTime = now;
    const delta = viewport.scrollLeft - lastScroll;
    const tuning = window.checkGalleryTuning || {};
    const warp = tuning.speedWarp || {};
    const viewportScale = Math.max(0.5, viewport.clientWidth / 1200);
    const measuredSpeed = Math.abs(delta) / Math.max(dt, 1 / 60) / viewportScale;
    const userMoved = !entrance && Math.abs(delta) > 0.1 && desktop.matches;
    let newGesture = false;
    if (userMoved) {
      newGesture = now - lastMotion > 250 || (gestureTravel && Math.sign(delta) !== Math.sign(gestureTravel));
      if (newGesture) gestureTravel = 0;
      gestureTravel += delta;
      lastMotion = now;
      snapPending = !keyboardInput;
    }
    speed += (measuredSpeed - speed) * (1 - Math.exp(-dt / (measuredSpeed > speed ? 0.045 : 0.12)));
    if (userMoved) {
      releaseSpeed = speed;
      releaseVelocity = Math.sign(delta) * speed * viewportScale;
    }
    const threshold = warp.threshold ?? 900;
    const target = warp.enabled === false || reducedMotion.matches || !desktop.matches
      ? 0 : Math.min(1, Math.max(0, (speed - threshold) / (warp.speedRange ?? 3000)));
    const recovery = warp.recovery ?? 0.32;
    const frequency = 4 / recovery;
    squeezeVelocity += ((target - squeeze) * frequency * frequency - 2 * frequency * squeezeVelocity) * dt;
    squeeze = Math.min(1, Math.max(0, squeeze + squeezeVelocity * dt));
    if (reducedMotion.matches || !desktop.matches) {
      speed = squeeze = squeezeVelocity = 0;
    }
    // Measure the untransformed layout so the visual tilt never changes
    // wrap distances or accumulates positional error.
    sections.forEach(section => {
      section.style.removeProperty('transform');
      section.style.removeProperty('filter');
    });
    if (!desktop.matches) {
      sections.forEach(section => {
        if (strip.lastElementChild !== section) moveSection(section);
      });
      viewport.scrollLeft = 0;
      snap = null;
      snapPending = false;
      lastScroll = 0;
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
      if (firstBounds.right + gap < bounds.left - 100 * viewportScale) {
        const distance = firstBounds.width + gap;
        moveSection(first);
        viewport.scrollLeft -= distance;
      } else if (firstBounds.left > bounds.left - 100 * viewportScale && lastBounds.left > bounds.right) {
        const distance = lastBounds.width + gap;
        moveSection(last, first);
        viewport.scrollLeft += distance;
      } else break;
    }

    const viewportCenter = (bounds.left + bounds.right) / 2;
    const positions = sections.map(section => {
      const rect = section.getBoundingClientRect();
      return { section, distance: (rect.left + rect.right) / 2 - viewportCenter };
    });
    if (newGesture) {
      gestureOrigin = positions.reduce((best, item) =>
        Math.abs(item.distance + delta) < Math.abs(best.distance + delta) ? item : best
      ).section;
    }
    // Hand off from the gesture to a spring, using release velocity rather
    // than a peak-speed latch. Momentum tails can settle naturally.
    if (snapPending && !entrance && now - Math.max(lastMotion, lastInput) >= 90) {
      snapPending = false;
      if (releaseSpeed < 2200) {
        let chosen = positions.reduce((best, item) =>
          Math.abs(item.distance) < Math.abs(best.distance) ? item : best
        );
        if (chosen.section === gestureOrigin && Math.abs(gestureTravel) > viewport.clientWidth * 0.06) {
          const forward = positions.filter(item => Math.sign(item.distance) === Math.sign(gestureTravel));
          if (forward.length) chosen = forward.reduce((best, item) =>
            Math.abs(item.distance) < Math.abs(best.distance) ? item : best
          );
        }
        if (Math.abs(chosen.distance) > 0.5) {
          const velocity = Math.sign(releaseVelocity) === Math.sign(chosen.distance)
            ? Math.sign(chosen.distance) * Math.min(Math.abs(releaseVelocity), Math.abs(chosen.distance) * 12) : 0;
          snap = { section: chosen.section, velocity };
        }
      }
    }
    if (snap) {
      const rect = snap.section.getBoundingClientRect();
      const distance = (rect.left + rect.right) / 2 - viewportCenter;
      // Exact critically damped spring integration: no bounce, no frame-rate
      // dependence, and no restart from a stale scroll position after wrapping.
      const omega = 28;
      const coefficient = snap.velocity - omega * distance;
      const decay = Math.exp(-omega * dt);
      const remaining = (-distance + coefficient * dt) * decay;
      snap.velocity = (snap.velocity - omega * coefficient * dt) * decay;
      const done = reducedMotion.matches || (Math.abs(remaining) < 0.35 && Math.abs(snap.velocity) < 8);
      viewport.scrollLeft += done ? distance : distance + remaining;
      if (done) snap = null;
    }

    // Re-centering and snapping are not user velocity.
    lastScroll = viewport.scrollLeft;
    if (!reducedMotion.matches) {
      const edgeStart = tuning.edgeStart ?? 0.725;
      const width = bounds.right - bounds.left;
      const center = (bounds.left + bounds.right) / 2;
      const effects = sections.map(section => {
        const rect = section.getBoundingClientRect();
        const position = ((rect.left + rect.right) / 2 - center) / (width / 2);
        // Keep the middle clear; ease into a restrained edge treatment.
        const edge = Math.min(1, Math.max(0, (Math.abs(position) - edgeStart) / (1 - edgeStart)));
        const strength = Math.pow(edge * edge * (3 - 2 * edge), tuning.falloff ?? 0.4);
        return {
          section,
          angle: Math.max(-75, Math.min(75,
            Math.sign(position) * strength * (tuning.rotation ?? 14.75)
            + Math.max(-1, Math.min(1, position)) * squeeze * (warp.curvature ?? 38))),
          skew: Math.sign(position) * strength * (tuning.skew ?? 0),
          scale: 1 + strength * ((tuning.edgeScale ?? 0.96) - 1),
          blur: strength * (tuning.blur ?? 0.9) + squeeze * (warp.blur ?? 0.4),
          depth: -Math.min(1, position * position) * squeeze * (warp.depth ?? 120) * viewportScale,
          scaleX: 1 - squeeze * (warp.compression ?? 0.18) * 0.5,
          scaleY: 1 - squeeze * (warp.compression ?? 0.18),
        };
      });
      effects.forEach(({ section, angle, skew, scale, blur, depth, scaleX, scaleY }) => {
        if (!blur && !angle && !skew && scale === 1 && !squeeze) return;
        section.style.transform = `perspective(${(tuning.perspective ?? 3000) * viewportScale}px) translateZ(${depth}px) rotateY(${angle}deg) skewY(${skew}deg) scale(${scale * scaleX}, ${scale * scaleY})`;
        section.style.filter = `blur(${blur}px)`;
      });
    }
    if (entrance || snap || snapPending || speed > 0.5 || squeeze > 0.0001 || Math.abs(squeezeVelocity) > 0.001) schedule();
    else speed = squeeze = squeezeVelocity = 0;
  }
  function schedule() {
    if (!frame) frame = requestAnimationFrame(update);
  }
  function centerIntro(offset = 0) {
    if (!desktop.matches) return;
    intro.style.removeProperty('transform');
    const bounds = viewport.getBoundingClientRect();
    const rect = intro.getBoundingClientRect();
    const adjustment = (rect.left + rect.right - bounds.left - bounds.right) / 2 - offset;
    // Seed enough preceding sections for a longer entrance without hitting
    // scrollLeft=0 and clipping the intended travel distance.
    const gap = parseFloat(getComputedStyle(strip).columnGap) || 0;
    for (let i = 0; i < sections.length && viewport.scrollLeft + adjustment < 0; i++) {
      const last = strip.lastElementChild;
      if (last === intro) break;
      last.style.removeProperty('transform');
      const distance = last.getBoundingClientRect().width + gap;
      moveSection(last, strip.firstElementChild);
      viewport.scrollLeft += distance;
    }
    viewport.scrollLeft += adjustment;
    lastScroll = viewport.scrollLeft;
  }
  function cancelEntrance(event) {
    interacted = true;
    entrance = null;
    lastInput = performance.now();
    keyboardInput = event?.type === 'keydown';
    if (snap) {
      snap = null;
      snapPending = false;
      lastMotion = -Infinity;
    }
    // Tiny wheel-tail events must not erase a pending settle.
    if (event?.type !== 'wheel' && event?.type !== 'touchstart') snapPending = false;
    schedule();
  }
  ['wheel', 'pointerdown', 'touchstart', 'keydown'].forEach(type =>
    viewport.addEventListener(type, cancelEntrance, { capture: true, passive: true })
  );
  reducedMotion.addEventListener('change', () => {
    if (entrance && reducedMotion.matches) {
      entrance = null;
      centerIntro();
    }
  });
  desktop.addEventListener('change', () => { entrance = null; });
  viewport.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('check-gallery-tune', schedule);
  desktop.addEventListener('change', schedule);
  reducedMotion.addEventListener('change', schedule);
  new ResizeObserver(() => {
    // Keep the opening composition centered when resizing before interaction.
    if (!interacted && !entrance) centerIntro();
    schedule();
  }).observe(viewport);
  new ResizeObserver(schedule).observe(strip);
  sections.forEach(section => new ResizeObserver(schedule).observe(section));
  update();
  if (desktop.matches) {
    const distance = reducedMotion.matches ? 0 : viewport.clientWidth * 0.125;
    centerIntro(distance);
    if (distance) entrance = { started: performance.now(), distance, progress: 0 };
    schedule();
    // Recheck font metrics without moving the page after user interaction.
    document.fonts?.ready.then(() => {
      if (!interacted && !entrance) {
        centerIntro();
        schedule();
      }
    });
  }
})();
