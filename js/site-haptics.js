(() => {
  if (!matchMedia('(any-pointer: coarse)').matches) return;

  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const tapTargets = 'a[href], button, summary, select, input:is([type="button"], [type="submit"], [type="checkbox"], [type="radio"]), [role="button"], [data-zoomable]';

  const vibration = typeof navigator.vibrate === 'function';
  const webkitSwitch = /iPhone/.test(navigator.userAgent) && CSS.supports('appearance', '-apple-pay-button');
  if (!vibration && !webkitSwitch) return;

  const passiveCapture = { passive: true, capture: true };
  let tap;
  let onTap;

  // Confirm a single short touch even when a control consumes the click.
  document.addEventListener('touchstart', event => {
    if (!event.isTrusted) return;
    const touch = event.touches.length === 1 ? event.touches[0] : null;
    tap = touch && { id: touch.identifier, x: touch.clientX, y: touch.clientY, at: event.timeStamp };
  }, passiveCapture);

  function nearTap(touch) {
    return tap?.id === touch.identifier && Math.hypot(touch.clientX - tap.x, touch.clientY - tap.y) < 6;
  }

  document.addEventListener('touchmove', event => {
    if (event.isTrusted && tap && !Array.from(event.touches).some(nearTap)) tap = null;
  }, passiveCapture);
  document.addEventListener('touchcancel', event => {
    if (event.isTrusted) tap = null;
  }, passiveCapture);
  document.addEventListener('touchend', event => {
    if (!event.isTrusted) return;
    if (tap && !event.touches.length && event.timeStamp - tap.at < 500 &&
        Array.from(event.changedTouches).some(nearTap) && !reducedMotion.matches && !document.hidden) {
      onTap();
    }
    tap = null;
  }, passiveCapture);

  if (vibration) {
    const scrollDistance = 144;
    const scrollInterval = 120;
    const scrollGracePeriod = 250;
    const scrollPositions = new WeakMap();
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

    onTap = () => pulse(12);

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

    function gestureTick(now = performance.now()) {
      if (now - lastPulse < scrollInterval) return;
      lastPulse = now;
      pulse(6);
    }

    function scrollTick(surface, now = performance.now()) {
      if (!scrollTouch || !surface.contains(scrollTouch) || now - lastMove > scrollGracePeriod) return;
      gestureTick(now);
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
      gestureTick,
      carouselTick(surface) {
        if (horizontalDrag) scrollTick(surface);
      }
    };
    return;
  }

  // A trusted tap on the label activates WebKit's switch. The switch itself
  // stays out of hit testing so a swipe that starts on a control still scrolls.
  const nativeSwitch = document.createElement('input');
  nativeSwitch.type = 'checkbox';
  nativeSwitch.setAttribute('switch', '');
  const switchId = 'site-haptic-switch';
  nativeSwitch.className = switchId;
  nativeSwitch.tabIndex = -1;
  let disarmTimer;
  function disarmSwitch() {
    clearTimeout(disarmTimer);
    nativeSwitch.removeAttribute('id');
  }
  onTap = () => {
    nativeSwitch.id = switchId;
    clearTimeout(disarmTimer);
    disarmTimer = setTimeout(disarmSwitch, 500);
  };
  document.addEventListener('touchstart', disarmSwitch, passiveCapture);
  document.addEventListener('touchcancel', disarmSwitch, passiveCapture);
  reducedMotion.addEventListener('change', disarmSwitch);
  document.addEventListener('visibilitychange', disarmSwitch);
  nativeSwitch.setAttribute('aria-hidden', 'true');
  nativeSwitch.addEventListener('click', event => {
    event.stopPropagation();
    if (!event.isTrusted) return;
    clearTimeout(disarmTimer);
    disarmTimer = setTimeout(disarmSwitch, 0);
  });
  nativeSwitch.addEventListener('input', event => event.stopPropagation());
  nativeSwitch.addEventListener('change', event => event.stopPropagation());
  document.body.append(nativeSwitch);

  const style = document.createElement('style');
  style.textContent = `
    .site-haptic-switch {
      position: fixed;
      width: 1px;
      height: 1px;
      visibility: hidden;
      pointer-events: none;
    }
    @media (prefers-reduced-motion: no-preference) {
      .site-haptic-position { position: relative; }
      .site-haptic-surface { -webkit-tap-highlight-color: transparent; }
      .site-haptic-surface::before {
        content: '';
        position: fixed;
        inset: 0;
        z-index: -1;
      }
    }
    .site-haptic-label {
      position: absolute;
      inset: 0;
      cursor: inherit;
      touch-action: inherit;
    }
    .site-haptic-inline {
      display: inline;
      cursor: inherit;
    }
    :is(:disabled, [aria-disabled="true"]) > .site-haptic-label {
      pointer-events: none;
    }
    @media (prefers-reduced-motion: reduce) {
      .site-haptic-label { display: none; }
      .site-haptic-inline { pointer-events: none; }
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
    const inline = display === 'inline';
    if (display === 'contents' || (inline && control.childElementCount)) return;
    if (!inline && position === 'static') control.classList.add('site-haptic-position');

    const label = document.createElement('label');
    label.htmlFor = switchId;
    label.className = inline ? 'site-haptic-inline' : 'site-haptic-label';
    if (inline) label.append(...control.childNodes);
    else label.setAttribute('aria-hidden', 'true');
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
