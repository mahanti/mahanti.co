const wordmark = document.querySelector('main > svg');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');

const rad = Math.PI / 180;
let material = {
  shape: { thickness: 7, outerRadius: 2.55, cutoutRadius: 0.15 },
  lighting: { direction: 17, faceHighlight: 9.5, faceShade: 6, rimHighlight: 4.5, rimShade: 3.5 },
  motion: {
    yawLimit: 25.2, pitchLimit: 17.2, heldYaw: 14.9, heldPitch: -6.9,
    dragResponse: 1, tapStrength: 1, bumpStrength: 1, springSpeed: 1, damping: 1, staggerMs: 290
  },
  holdTilt: false
};

function clamp(value, limit) {
  return Math.max(-limit, Math.min(limit, value));
}

// Advance an underdamped spring by elapsed time, keeping its velocity on retarget.
function spring(rest, previousDecay, frequency, tolerance) {
  // Successive peaks are half a period apart. Keep the tempo and reduce
  // the amplitude at the next peak to 80% of its previous tuning.
  const baseDecay = previousDecay - Math.log(0.8) * frequency / Math.PI;
  return {
    value: rest,
    velocity: 0,
    step(target, dt, damping = 1) {
      const decay = baseDecay * damping;
      const offset = this.value - target;
      const wave = (this.velocity + decay * offset) / frequency;
      const envelope = Math.exp(-decay * dt);
      if (reducedMotion.matches || envelope * Math.hypot(offset, wave) < tolerance) {
        this.value = target;
        this.velocity = 0;
        return false;
      }
      const cos = Math.cos(frequency * dt);
      const sin = Math.sin(frequency * dt);
      const next = envelope * (offset * cos + wave * sin);
      this.value = target + next;
      this.velocity = envelope * frequency * (wave * cos - offset * sin) - decay * next;
      return true;
    }
  };
}

// The letters are rounded. A small convex hull follows their outer silhouette
// without treating a smile or a gap at the corner of a bounding box as an edge.
function outline(letter) {
  const length = letter.getTotalLength();
  const points = Array.from({ length: Math.ceil(length / 5) }, (_, i) => letter.getPointAtLength(i * 5));
  points.sort((a, b) => a.x - b.x || a.y - b.y);

  function hullSide(ordered) {
    const side = [];
    for (const point of ordered) {
      while (side.length >= 2) {
        const a = side[side.length - 2];
        const b = side[side.length - 1];
        if ((b.x - a.x) * (point.y - a.y) > (b.y - a.y) * (point.x - a.x)) break;
        side.pop();
      }
      side.push(point);
    }
    side.pop();
    return side;
  }
  return hullSide(points).concat(hullSide(points.reverse()));
}

function project(points, nx, ny) {
  let min = Infinity;
  let max = -Infinity;
  for (const p of points) {
    const distance = p.x * nx + p.y * ny;
    min = Math.min(min, distance);
    max = Math.max(max, distance);
  }
  return { min, max };
}

// Sweep between pointer samples so a fast flick can hit a letter in passing.
function contact(a, b, dx, dy) {
  let enter = 0;
  let exit = 1;
  for (const polygon of [a, b]) {
    for (let i = 0; i < polygon.length; i++) {
      const p = polygon[i];
      const q = polygon[(i + 1) % polygon.length];
      const nx = p.y - q.y;
      const ny = q.x - p.x;
      const first = project(a, nx, ny);
      const second = project(b, nx, ny);
      const speed = dx * nx + dy * ny;
      if (Math.abs(speed) < 1e-8) {
        if (first.max < second.min || second.max < first.min) return null;
        continue;
      }
      const t1 = (second.min - first.max) / speed;
      const t2 = (second.max - first.min) / speed;
      enter = Math.max(enter, Math.min(t1, t2));
      exit = Math.min(exit, Math.max(t1, t2));
      if (enter > exit) return null;
    }
  }
  return { touchingAtEnd: exit === 1 };
}

const paths = wordmark.querySelectorAll('path');
const baseColor = getComputedStyle(wordmark).fill;
let depth;
function prepareDepth() {
  if (depth === undefined && !reducedMotion.matches) {
    depth = createLetterDepth(document.querySelector('.letter-depth'), wordmark, paths, () => material);
  }
}
if ('requestIdleCallback' in window) requestIdleCallback(prepareDepth);

// All active letters advance together, then their edges share one GPU pass.
const nextTicks = new Set();
let scheduledFrame = 0;
function schedule(tick) {
  nextTicks.add(tick);
  if (scheduledFrame) return;
  scheduledFrame = requestAnimationFrame(now => {
    scheduledFrame = 0;
    const ticks = Array.from(nextTicks);
    nextTicks.clear();
    for (const update of ticks) update(now);
    depth?.draw();
  });
}

const faceLight = wordmark.querySelector('#face-light');
const bodies = [];
for (const letter of paths) {
  const x = spring(0, 4.8, 20, 0.04);
  const y = spring(0, 4.8, 20, 0.04);
  const tilt = spring(0, 8, 23, 0.04);
  const size = spring(1, 11, 22, 0.0005);
  const stretch = spring(0, 9, 26, 0.0005);
  const bounds = letter.getBBox();
  const center = new DOMPoint(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
  let pivot = center;
  const shape = outline(letter);
  const contacts = new Set();
  let drag = null;
  let press = null;
  let ripple = null;
  const yaw = spring(0, 7.5, 12, 0.0006);
  const pitch = spring(0, 8, 13, 0.0006);
  const light = faceLight.cloneNode(true);
  light.id = 'face-light-' + bodies.length;
  light.style.color = baseColor;
  faceLight.parentNode.append(light);
  letter.style.setProperty('--lit-face', `url(#${light.id})`);
  let lightLevel = 0;
  const previewLetter = bodies.length === 0;
  let lastFrame = 0;

  const body = {
    points: shape,
    refreshMaterial() {
      lightLevel = -1;
      animate();
    },
    screenCenter() {
      return center.matrixTransform(letter.getScreenCTM());
    },
    rock(direction) {
      if (drag || reducedMotion.matches) return;
      yaw.velocity = clamp(yaw.velocity + direction * 9.5 * material.motion.tapStrength, 10 * material.motion.tapStrength);
      pitch.velocity = clamp(pitch.velocity - 3.2 * material.motion.tapStrength, 4.5 * material.motion.tapStrength);
      animate();
    },
    setColor(color, vx, vy) {
      letter.style.fill = color;
      light.style.color = color;
      body.bump(vx, vy);
    },
    bump(vx, vy, wave) {
      if (drag || reducedMotion.matches) return;
      const impulse = Math.hypot(vx, vy);
      if (!impulse || wave?.visited.has(body)) return;
      if (wave) {
        wave.visited.add(body);
        ripple = { wave, vx, vy };
      }
      const nx = vx / impulse;
      const ny = vy / impulse;
      yaw.velocity = clamp(yaw.velocity + vx * 0.014 * material.motion.bumpStrength, 8 * material.motion.bumpStrength);
      pitch.velocity = clamp(pitch.velocity - vy * 0.012 * material.motion.bumpStrength, 6 * material.motion.bumpStrength);
      x.velocity = clamp(x.velocity + vx, 520);
      y.velocity = clamp(y.velocity + vy, 520);
      tilt.velocity = clamp(tilt.velocity + (nx - ny * 0.5) * impulse * 0.62, 300);
      stretch.velocity = clamp(stretch.velocity + (Math.abs(ny) - Math.abs(nx)) * impulse * 0.004, 2);
      animate();
    }
  };
  bodies.push(body);

  function bumpNeighbors(dx, dy, vx, vy, relay) {
    if (reducedMotion.matches || (!dx && !dy)) return;
    const speed = Math.hypot(vx, vy);
    if (!speed) return;
    for (const other of bodies) {
      if (other === body || relay?.wave.visited.has(other)) continue;
      const hit = contact(body.points, other.points, dx, dy);
      if (hit && (relay || !contacts.has(other))) {
        const wave = relay?.wave ?? { visited: new Set([body]) };
        const impulse = relay ? speed * 0.78 : Math.min(440, 115 + speed * 0.32);
        other.bump(vx / speed * impulse, vy / speed * impulse, wave);
      }
      if (!relay) {
        if (hit?.touchingAtEnd) contacts.add(other);
        else contacts.delete(other);
      }
    }
  }

  function startSquish(now) {
    const signed = (min, range) => (Math.random() < 0.5 ? -1 : 1) * (min + Math.random() * range);
    press = { angle: signed(6, 8), stretch: signed(0.08, 0.08), until: now + 105 };
    animate();
  }

  function render() {
    const sx = size.value * (1 + stretch.value);
    const sy = size.value / (1 + stretch.value);
    const ry = clamp(yaw.value, material.motion.yawLimit * rad);
    const rx = clamp(pitch.value, material.motion.pitchLimit * rad);
    // The planar face and the mesh share the orthographic projection of Rx * Ry.
    letter.setAttribute('transform', [
      `translate(${x.value + pivot.x} ${y.value + pivot.y})`,
      `rotate(${tilt.value}) scale(${sx} ${sy})`,
      `matrix(${Math.cos(ry)} ${Math.sin(rx) * Math.sin(ry)} 0 ${Math.cos(rx)} 0 0)`,
      `translate(${-pivot.x} ${-pivot.y})`
    ].join(' '));
    const matrix = letter.transform.baseVal.consolidate().matrix;
    body.points = shape.map(point => point.matrixTransform(matrix));
    const amount = reducedMotion.matches ? 0 : Math.min(1, Math.hypot(ry, rx) * 4);
    // A soft band of light across the broad face keeps a shallow tilt legible
    // even on small screens or when the GPU side-wall layer is unavailable.
    const level = Math.round(amount * 16);
    if (level !== lightLevel) {
      lightLevel = level;
      letter.toggleAttribute('data-rocking', level > 0);
      light.style.setProperty('--glint', (level / 16 * material.lighting.faceHighlight) + '%');
      light.style.setProperty('--shade', (level / 16 * material.lighting.faceShade) + '%');
    }
    if (level) {
      const mirror = ry < 0 ? ' translate(1 0) scale(-1 1)' : '';
      const transform = `rotate(${material.lighting.direction} .5 .5)${mirror}`;
      if (light.getAttribute('gradientTransform') !== transform) light.setAttribute('gradientTransform', transform);
    }
    if (amount > 0.015) prepareDepth();
    depth?.pose(letter, matrix, ry, rx, amount, letter.style.fill || baseColor);
  }

  function tick(now) {
    const dt = Math.max(0, now - lastFrame) / 1000;
    lastFrame = now;
    // Let the lean and stretch relax when the hand pauses mid-drag.
    const momentum = drag ? Math.max(0, 1 - (now - drag.time) / 90) : 0;
    const vx = (drag?.vx ?? 0) * momentum;
    const vy = (drag?.vy ?? 0) * momentum;
    const playful = drag && !reducedMotion.matches;
    if (!drag && press && now >= press.until) press = null;
    const squish = reducedMotion.matches ? null : press;
    const aim = squish ? squish.angle : playful ? clamp(vx * 0.018 + vy * 0.005, 17) : 0;
    const scale = squish ? 0.86 : playful ? 1.055 : 1;
    const squeeze = squish ? squish.stretch : playful ? clamp((Math.abs(vx) - Math.abs(vy)) / 10000, 0.09) : 0;
    const prevX = x.value;
    const prevY = y.value;
    const { motion } = material;
    const held = playful || (previewLetter && material.holdTilt && !reducedMotion.matches);
    const yawTarget = held ? motion.heldYaw * rad + vx * 0.00028 * motion.dragResponse : 0;
    const pitchTarget = held ? motion.heldPitch * rad - vy * 0.00022 * motion.dragResponse : 0;
    const moving = [
      yaw.step(clamp(yawTarget, motion.yawLimit * rad), dt * motion.springSpeed, motion.damping),
      pitch.step(clamp(pitchTarget, motion.pitchLimit * rad), dt * motion.springSpeed, motion.damping),
      !drag && x.step(0, dt),
      !drag && y.step(0, dt),
      tilt.step(aim, dt),
      size.step(scale, dt),
      stretch.step(squeeze, dt)
    ].some(Boolean);
    if (ripple) {
      const dx = x.value - prevX;
      const dy = y.value - prevY;
      // Pass the hit onward only on the outward stroke, never on the rebound.
      if (dx * ripple.vx + dy * ripple.vy > 0) {
        bumpNeighbors(dx, dy, ripple.vx, ripple.vy, ripple);
      } else if (dt > 0) {
        ripple = null;
      }
    }
    render();
    if (moving || (!drag && press) || (momentum > 0 && (vx || vy))) schedule(tick);
  }

  function animate() {
    if (nextTicks.has(tick)) return;
    lastFrame = performance.now();
    schedule(tick);
  }

  function point(event, element) {
    return new DOMPoint(event.clientX, event.clientY).matrixTransform(element.getScreenCTM().inverse());
  }

  letter.addEventListener('pointerdown', event => {
    if (drag || event.button !== 0) return;
    event.preventDefault();
    const p = point(event, wordmark);
    // Pivot at the material point under the finger, even when catching a bouncing letter.
    pivot = point(event, letter);
    x.value = p.x - pivot.x;
    y.value = p.y - pivot.y;
    x.velocity = y.velocity = 0;
    ripple = null;
    drag = { id: event.pointerId, time: event.timeStamp, vx: 0, vy: 0,
      startX: event.clientX, startY: event.clientY };
    startSquish(performance.now());
    letter.setPointerCapture(event.pointerId);
    letter.classList.add('dragging');
    animate();
  });

  function move(event) {
    if (press) {
      if (Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) < 4) return;
      press = null;
    }
    const p = point(event, wordmark);
    const nextX = p.x - pivot.x;
    const nextY = p.y - pivot.y;
    if (nextX === x.value && nextY === y.value) return;
    const dt = Math.max(8, event.timeStamp - drag.time) / 1000;
    drag.vx = clamp((nextX - x.value) / dt, 1200);
    drag.vy = clamp((nextY - y.value) / dt, 1200);
    drag.time = event.timeStamp;
    bumpNeighbors(nextX - x.value, nextY - y.value, drag.vx, drag.vy);
    x.value = nextX;
    y.value = nextY;
    render();
    animate();
  }

  letter.addEventListener('pointermove', event => {
    if (drag?.id === event.pointerId) move(event);
  });

  function release(event) {
    if (drag?.id !== event.pointerId) return;
    if (event.type === 'pointerup') move(event);
    else press = null;
    const momentum = event.type === 'pointerup' ? Math.max(0, 1 - (event.timeStamp - drag.time) / 90) : 0;
    x.velocity = drag.vx * momentum;
    y.velocity = drag.vy * momentum;
    drag = null;
    contacts.clear();
    letter.classList.remove('dragging');
    if (press && event.type === 'pointerup') waveFrom(event.clientX, event.clientY);
    animate();
  }
  letter.addEventListener('pointerup', release);
  letter.addEventListener('pointercancel', release);
  letter.addEventListener('lostpointercapture', release);

  letter.addEventListener('keydown', event => {
    if (event.key !== ' ' && event.key !== 'Enter') return;
    event.preventDefault();
    if (drag || event.repeat || reducedMotion.matches) return;
    startSquish(performance.now());
    const origin = body.screenCenter();
    waveFrom(origin.x, origin.y);
  });
}

const cursorDot = document.querySelector('.cursor-dot');
cursorDot.style.color = getComputedStyle(wordmark).fill;
let pressedAt = 0;
let releaseTimer = 0;
let settleTimer = 0;
let previousMouse = null;

const brushedLetters = new Set();
const cursorRim = Array.from({ length: 8 }, (_, i) => {
  const angle = i * Math.PI / 4;
  return { x: 8 * Math.cos(angle), y: 8 * Math.sin(angle) };
});

function brushLetters(start, dx, dy, speed, contacts) {
  // Sweep the whole dot between samples so a fast pass can graze several letters.
  const inverse = wordmark.getScreenCTM().inverse();
  const rim = cursorRim.map(offset =>
    new DOMPoint(start.x + offset.x, start.y + offset.y).matrixTransform(inverse)
  );
  const vx = inverse.a * dx + inverse.c * dy;
  const vy = inverse.b * dx + inverse.d * dy;
  const strength = (22 + 140 * Math.min(speed / 2, 1)) / Math.hypot(vx, vy);
  for (const body of bodies) {
    const hit = contact(rim, body.points, vx, vy);
    if (hit && !contacts.has(body)) body.bump(vx * strength, vy * strength);
    if (hit?.touchingAtEnd) contacts.add(body);
    else contacts.delete(body);
  }
}

// Touch events stay with the element where each finger landed. Background
// swipes can cross glyphs without taking over the glyphs' captured drags.
const backdrop = document.querySelector('.backdrop');
const touchBrushes = new Map();
backdrop.addEventListener('touchstart', event => {
  for (const touch of event.changedTouches) {
    const start = { x: touch.clientX, y: touch.clientY, time: event.timeStamp };
    touchBrushes.set(touch.identifier, { start, last: start, contacts: new Set(), swiping: false });
  }
}, { passive: true });

function advanceBrush(touch, time) {
  const brush = touchBrushes.get(touch.identifier);
  if (!brush) return false;
  const x = touch.clientX;
  const y = touch.clientY;
  if (Math.hypot(x - brush.start.x, y - brush.start.y) >= 6) brush.swiping = true;
  if (!brush.swiping) return false;
  const dx = x - brush.last.x;
  const dy = y - brush.last.y;
  const distance = Math.hypot(dx, dy);
  if (distance && !reducedMotion.matches) {
    const speed = distance / Math.max(4, time - brush.last.time);
    brushLetters(brush.last, dx, dy, speed, brush.contacts);
  }
  brush.last = { x, y, time };
  return true;
}

backdrop.addEventListener('touchmove', event => {
  for (const touch of event.changedTouches) advanceBrush(touch, event.timeStamp);
}, { passive: true });

backdrop.addEventListener('touchend', event => {
  for (const touch of event.changedTouches) {
    // A completed swipe must not also synthesize a background color click.
    if (advanceBrush(touch, event.timeStamp) && event.cancelable) event.preventDefault();
    touchBrushes.delete(touch.identifier);
  }
}, { passive: false });

backdrop.addEventListener('touchcancel', event => {
  for (const touch of event.changedTouches) touchBrushes.delete(touch.identifier);
}, { passive: true });

function roundCursor() {
  cursorDot.style.removeProperty('--stretch');
}

function hideCursorDot() {
  clearTimeout(releaseTimer);
  clearTimeout(settleTimer);
  roundCursor();
  previousMouse = null;
  brushedLetters.clear();
  document.documentElement.classList.remove('dot-active');
  cursorDot.classList.remove('pressed');
}

function positionCursorDot(event) {
  if (event.pointerType !== 'mouse' || !event.target.closest?.('main')) {
    hideCursorDot();
    return;
  }
  cursorDot.style.transform = `translate3d(${event.clientX}px, ${event.clientY}px, 0)`;
  document.documentElement.classList.add('dot-active');
}

window.addEventListener('pointermove', event => {
  positionCursorDot(event);
  if (event.pointerType !== 'mouse' || reducedMotion.matches || !event.target.closest?.('main')) return;

  const { clientX: x, clientY: y, timeStamp: time } = event;
  if (previousMouse) {
    const dx = x - previousMouse.x;
    const dy = y - previousMouse.y;
    const distance = Math.hypot(dx, dy);
    if (!distance) return;
    const speed = distance / Math.max(4, time - previousMouse.time);
    if (!event.buttons) brushLetters(previousMouse, dx, dy, speed, brushedLetters);
    const length = 1 + 0.28 * Math.min(speed / 2, 1);
    const width = 1 / length;
    const nx = dx / distance;
    const ny = dy / distance;
    // Stretch along the travel axis. Reversing direction gives the same ellipse.
    const a = width + (length - width) * nx * nx;
    const b = (length - width) * nx * ny;
    const d = width + (length - width) * ny * ny;
    cursorDot.style.setProperty('--stretch', `matrix(${a}, ${b}, ${b}, ${d}, 0, 0)`);
  }
  previousMouse = { x, y, time };
  clearTimeout(settleTimer);
  settleTimer = setTimeout(roundCursor, 45);
});
window.addEventListener('pointerdown', event => {
  positionCursorDot(event);
  if (event.pointerType !== 'mouse' || event.button !== 0) return;
  clearTimeout(releaseTimer);
  pressedAt = performance.now();
  cursorDot.classList.add('pressed');
});
window.addEventListener('pointerup', event => {
  if (event.pointerType !== 'mouse' || event.button !== 0) return;
  // Give even a quick click enough time to register before the rebound.
  const remaining = Math.max(0, 75 - (performance.now() - pressedAt));
  releaseTimer = setTimeout(() => cursorDot.classList.remove('pressed'), remaining);
});
document.documentElement.addEventListener('pointerleave', hideCursorDot);
window.addEventListener('pointercancel', hideCursorDot);
window.addEventListener('blur', hideCursorDot);
window.addEventListener('pagehide', hideCursorDot);

// Face and accent colors from the stickers on https://allo.joshpuckett.me/.
const palette = [
  'color(display-p3 1 0.4745 0.7882)', // Wordmark pink
  'oklch(0.7 0.179 245)',              // Roundness blue
  'oklch(0.88 0.253 125)',             // Arrow lime
  'oklch(0.75 0.227 320)',             // Sparkle violet
  'oklch(0.74 0.205 55)',              // Seal orange
  'oklch(0.75 0.175 185)',             // Fractions teal
  'oklch(0.72 0.227 10)',              // Glyph sticker red
  'oklch(0.9 0.212 100)'               // Star yellow
];
let colorIndex = 0;
let latestRock = 0;
let latestColor = 0;

function waveFrom(originX, originY, color) {
  const rockWave = ++latestRock;
  if (color) latestColor = rockWave;
  const fronts = bodies.map(body => {
    const center = body.screenCenter();
    const dx = center.x - originX;
    const dy = center.y - originY;
    return { body, dx, dy, distance: Math.hypot(dx, dy) };
  });
  const distances = fronts.map(front => front.distance);
  const nearest = Math.min(...distances);
  const span = Math.max(1, Math.max(...distances) - nearest);
  for (const { body, dx, dy, distance } of fronts) {
    if (reducedMotion.matches) {
      if (color) body.setColor(color, 0, 0);
      continue;
    }
    const progress = (distance - nearest) / span;
    const force = (360 - 145 * progress) / Math.max(1, distance);
    const arrive = () => {
      if (color && rockWave === latestColor) body.setColor(color, dx * force, dy * force);
      if (rockWave === latestRock) body.rock(dx < 0 ? -1 : 1);
    };
    if (progress === 0) arrive();
    else setTimeout(arrive, progress * material.motion.staggerMs);
  }
}

backdrop.addEventListener('click', event => {
  const color = palette[colorIndex];
  cursorDot.style.color = color;
  colorIndex = (colorIndex + 1) % palette.length;
  // Keyboard activation starts the wave at the center of the viewport.
  waveFrom(event.detail ? event.clientX : innerWidth / 2,
           event.detail ? event.clientY : innerHeight / 2, color);
});

// Local previews also run on a LAN address for testing on a phone.
const previewHost = /^(?:localhost|127\.0\.0\.1|\[::1\]|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(?:1[6-9]|2\d|3[01])\.\d+\.\d+)$/.test(location.hostname)
  || location.hostname.endsWith('.local');
document.querySelector('.tune-link').hidden = !previewHost;

if (new URLSearchParams(location.search).has('tune')) {
  document.body.classList.add('tuning');
  import('./tuner.js').then(({ mountTuner }) => {
    mountTuner(material, values => {
      material = values;
      for (const body of bodies) body.refreshMaterial();
    }, () => {
      const origin = bodies[0].screenCenter();
      waveFrom(origin.x, origin.y);
    });
  });
}
