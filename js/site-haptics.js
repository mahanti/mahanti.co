(() => {
  if (!matchMedia('(any-pointer: coarse)').matches) return;

  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const tapTargets = 'a[href], button, summary, select, input:is([type="button"], [type="submit"], [type="checkbox"], [type="radio"]), [role="button"], [data-zoomable]';

  if (typeof navigator.vibrate === 'function') {
    const scrollDistance = 144;
    const scrollInterval = 120;
    const scrollGracePeriod = 250;
    const scrollPositions = new WeakMap();
    const passiveCapture = { passive: true, capture: true };
    let scrollTouch;
    let touchStartX;
    let touchStartY;
    let horizontalDrag = false;
    let lastMove = -Infinity;
    let lastPulse = -Infinity;
    let gesture = 0;

    function pulse(duration) {
      if (!reducedMotion.matches && !document.hidden && navigator.userActivation?.hasBeenActive !== false) {
        navigator.vibrate(duration);
      }
    }

    document.addEventListener('click', event => {
      if (!event.isTrusted || event.detail === 0 || (event.pointerType && event.pointerType !== 'touch')) return;
      const target = event.target.closest?.(tapTargets);
      if (target && !target.closest(':disabled, [aria-disabled="true"]')) pulse(12);
    }, passiveCapture);

    document.addEventListener('touchstart', event => {
      gesture += 1;
      scrollTouch = event.touches.length === 1 ? event.target : null;
      touchStartX = event.touches[0]?.clientX;
      touchStartY = event.touches[0]?.clientY;
      horizontalDrag = false;
      lastMove = -Infinity;
    }, passiveCapture);

    document.addEventListener('touchmove', event => {
      if (event.touches.length !== 1 || !scrollTouch) return;
      const touch = event.touches[0];
      horizontalDrag = Math.abs(touch.clientX - touchStartX) > Math.abs(touch.clientY - touchStartY);
      lastMove = performance.now();
    }, passiveCapture);

    function scrollTick(surface, now = performance.now()) {
      if (!scrollTouch || !surface.contains(scrollTouch) ||
          now - lastMove > scrollGracePeriod || now - lastPulse < scrollInterval) return;
      lastPulse = now;
      pulse(6);
    }

    document.addEventListener('scroll', event => {
      const now = performance.now();
      if (!scrollTouch || now - lastMove > scrollGracePeriod) return;

      const surface = event.target === document ? document.scrollingElement : event.target;
      if (!(surface instanceof Element) || !surface.contains(scrollTouch)) return;

      const x = surface.scrollLeft;
      const y = surface.scrollTop;
      const previous = scrollPositions.get(surface);
      if (previous?.gesture !== gesture) {
        scrollPositions.set(surface, { x, y, gesture });
        return;
      }

      const distance = Math.max(Math.abs(x - previous.x), Math.abs(y - previous.y));
      if (distance >= scrollDistance && now - lastPulse >= scrollInterval) {
        scrollPositions.set(surface, { x, y, gesture });
        scrollTick(surface, now);
      }
    }, passiveCapture);

    window.siteHaptics = {
      carouselTick(surface) {
        if (horizontalDrag) scrollTick(surface);
      }
    };
    return;
  }

  // A trusted tap on the label activates WebKit's switch. The switch itself
  // stays out of hit testing so a swipe that starts on a control still scrolls.
  if (!/iPhone/.test(navigator.userAgent) || !CSS.supports('appearance', '-apple-pay-button')) return;

  const nativeSwitch = document.createElement('input');
  nativeSwitch.type = 'checkbox';
  nativeSwitch.setAttribute('switch', '');
  nativeSwitch.id = 'site-haptic-switch';
  nativeSwitch.tabIndex = -1;
  nativeSwitch.setAttribute('aria-hidden', 'true');
  nativeSwitch.addEventListener('click', event => event.stopPropagation());
  nativeSwitch.addEventListener('input', event => event.stopPropagation());
  nativeSwitch.addEventListener('change', event => event.stopPropagation());
  document.body.append(nativeSwitch);

  const style = document.createElement('style');
  style.textContent = `
    #site-haptic-switch {
      position: fixed;
      width: 1px;
      height: 1px;
      visibility: hidden;
      pointer-events: none;
    }
    @media (prefers-reduced-motion: no-preference) {
      .site-haptic-position { position: relative; }
    }
    .site-haptic-label {
      position: absolute;
      inset: 0;
      cursor: inherit;
      touch-action: inherit;
    }
    :is(:disabled, [aria-disabled="true"]) > .site-haptic-label {
      pointer-events: none;
    }
    @media (prefers-reduced-motion: reduce) {
      .site-haptic-label { display: none; }
    }
  `;
  document.head.append(style);

  const switchTargets = 'a[href], button';
  const nestedControls = `${tapTargets}, label, audio, video, iframe, [contenteditable], [tabindex]`;
  const enhanced = new WeakSet();

  function addTapLabel(control) {
    if (!(control instanceof HTMLElement) || enhanced.has(control) ||
        control.querySelector(nestedControls) || control.closest('[contenteditable]')) return;

    const { display, position } = getComputedStyle(control);
    // An inset overlay follows a single box. Leave flowing text links alone.
    if (display === 'inline' || display === 'contents') return;
    if (position === 'static') control.classList.add('site-haptic-position');

    const label = document.createElement('label');
    label.htmlFor = nativeSwitch.id;
    label.className = 'site-haptic-label';
    label.setAttribute('aria-hidden', 'true');
    label.addEventListener('click', event => {
      if (!event.isTrusted || event.defaultPrevented) return;
      event.stopPropagation();
      // Keep activation on the original control, including links and submits.
      // The label's own default action is still needed to toggle the switch.
      const ClickEvent = event instanceof PointerEvent ? PointerEvent : MouseEvent;
      control.dispatchEvent(new ClickEvent('click', event));
    });
    enhanced.add(control);
    control.append(label);
  }

  document.querySelectorAll(switchTargets).forEach(addTapLabel);
  new MutationObserver(records => {
    for (const record of records) {
      for (const node of record.addedNodes) {
        if (!(node instanceof Element)) continue;
        if (node.matches(switchTargets)) addTapLabel(node);
        node.querySelectorAll(switchTargets).forEach(addTapLabel);
      }
    }
  }).observe(document.body, { childList: true, subtree: true });
})();
