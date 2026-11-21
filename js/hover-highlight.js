(() => {
  const pointerHover = matchMedia('(hover: hover) and (pointer: fine)');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const groupedLinks = 'nav .button-link, .section-content > a.row:not(:has(img, picture, video))';
  const magnet = { reach: 24, displacement: 3, stretch: 3 };
  let active;

  function edgePressure(position, size) {
    const reach = Math.min(magnet.reach, size / 2);
    const distanceFromCenter = position - size / 2;
    const proximity = Math.max(0, 1 - Math.max(0, size / 2 - Math.abs(distanceFromCenter)) / reach);
    return Math.sign(distanceFromCenter) * proximity ** 2;
  }

  function attractHighlight(event) {
    if (!active || event.pointerType === 'touch') return;
    const { link, highlight } = active;
    const { left, top, width, height } = link.getBoundingClientRect();
    if (!width || !height) return;

    const x = edgePressure(event.clientX - left, width);
    const y = edgePressure(event.clientY - top, height);
    const stretchX = 1 + Math.abs(x) * magnet.stretch / width;
    const stretchY = 1 + Math.abs(y) * magnet.stretch / height;
    highlight.firstElementChild.style.transform =
      `translate(${x * magnet.displacement}px, ${y * magnet.displacement}px) scale(${stretchX}, ${stretchY})`;
  }

  function hideHighlight() {
    if (!active) return;
    active.link.classList.remove('has-hover-highlight');
    active.highlight.style.opacity = '0';
    active.highlight.firstElementChild.style.removeProperty('transform');
    active = undefined;
  }

  document.addEventListener('pointerover', event => {
    if (!pointerHover.matches || reducedMotion.matches || event.pointerType === 'touch') return;

    const link = event.target.closest(groupedLinks);
    if (!link || link === active?.link) return;

    const group = link.closest('nav, .section-content');
    const previous = active;
    let highlight = group.querySelector(':scope > .hover-highlight');

    if (!highlight) {
      highlight = document.createElement('span');
      highlight.className = 'hover-highlight';
      highlight.setAttribute('aria-hidden', 'true');
      highlight.append(document.createElement('span'));
      group.classList.add('hover-highlight-group');
      group.append(highlight);
    }

    if (previous?.highlight !== highlight) {
      hideHighlight();
      highlight.style.transitionProperty = 'opacity';
    } else {
      previous.link.classList.remove('has-hover-highlight');
    }

    const bounds = link.getBoundingClientRect();
    const origin = group.getBoundingClientRect();
    highlight.style.width = `${bounds.width}px`;
    highlight.style.height = `${bounds.height}px`;
    highlight.style.transform = `translate(${bounds.left - origin.left}px, ${bounds.top - origin.top}px)`;
    if (previous?.highlight !== highlight) {
      // Place the hidden highlight before enabling transitions between links.
      highlight.getBoundingClientRect();
      highlight.style.removeProperty('transition-property');
    }
    highlight.style.opacity = '1';
    link.classList.add('has-hover-highlight');
    active = { group, link, highlight };
    attractHighlight(event);
  });

  document.addEventListener('pointermove', attractHighlight, { passive: true });

  document.addEventListener('pointerout', event => {
    if (!active || !active.link.contains(event.target)) return;
    const next = event.relatedTarget instanceof Element && event.relatedTarget.closest(groupedLinks);
    if (!next || !active.group.contains(next)) hideHighlight();
  });

  pointerHover.addEventListener('change', hideHighlight);
  reducedMotion.addEventListener('change', hideHighlight);
  window.addEventListener('resize', hideHighlight);
})();
