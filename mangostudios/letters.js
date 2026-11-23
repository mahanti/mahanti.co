const wordmark = document.querySelector('main > svg');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');

const rad = Math.PI / 180;
let settings = {
  shape: { thickness: 7, outerRadius: 2.55, cutoutRadius: 0.15 },
  lighting: { direction: 17, faceHighlight: 9.5, faceShade: 6, rimHighlight: 4.5, rimShade: 3.5 },
  motion: {
    yawLimit: 25.2, pitchLimit: 17.2, heldYaw: 14.9, heldPitch: -6.9,
    dragResponse: 1, tapStrength: 1, bumpStrength: 1, springSpeed: 1, damping: 1, staggerMs: 290
  },
  holdTilt: false
};

// Keep the tuner values as the baseline when the site clock switches themes.
function themedMaterial(settings) {
  if (document.documentElement.dataset.theme !== 'night') return settings;
  const { shape, lighting } = settings;
  return {
    ...settings,
    shape: { ...shape, thickness: shape.thickness * 0.75, outerRadius: shape.outerRadius * 0.8 },
    lighting: {
      ...lighting,
      faceHighlight: lighting.faceHighlight * 0.45,
      rimHighlight: lighting.rimHighlight * 0.45,
      faceShade: lighting.faceShade * 0.75,
      rimShade: lighting.rimShade * 0.75
    }
  };
}

let material = themedMaterial(settings);

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
function contact(a, b, dx, dy, withNormal = false) {
  let enter = 0;
  let exit = 1;
  let normalX = 0, normalY = 0;
  let leastOverlap = Infinity;
  for (const polygon of [a, b]) {
    for (let i = 0; i < polygon.length; i++) {
      const p = polygon[i];
      const q = polygon[(i + 1) % polygon.length];
      const nx = p.y - q.y;
      const ny = q.x - p.x;
      const first = project(a, nx, ny);
      const second = project(b, nx, ny);
      const speed = dx * nx + dy * ny;
      // Already-overlapping hulls use the shallowest axis, pointing from A to B.
      if (withNormal && enter === 0) {
        const positive = first.max - second.min;
        const negative = second.max - first.min;
        const length = Math.hypot(nx, ny);
        const overlap = Math.min(positive, negative) / length;
        if (overlap >= 0 && overlap < leastOverlap) {
          leastOverlap = overlap;
          const sign = positive < negative ? 1 : -1;
          normalX = sign * nx / length;
          normalY = sign * ny / length;
        }
      }
      if (Math.abs(speed) < 1e-8) {
        if (first.max < second.min || second.max < first.min) return null;
        continue;
      }
      const t1 = (second.min - first.max) / speed;
      const t2 = (second.max - first.min) / speed;
      const arrival = Math.min(t1, t2);
      if (arrival > enter) {
        enter = arrival;
        if (withNormal) {
          const scale = Math.sign(speed) / Math.hypot(nx, ny);
          normalX = nx * scale;
          normalY = ny * scale;
        }
      }
      exit = Math.min(exit, Math.max(t1, t2));
      if (enter > exit) return null;
    }
  }
  return { touchingAtEnd: exit === 1, normalX, normalY };
}

const paths = wordmark.querySelectorAll(':scope > path');
const smilingLetter = wordmark.querySelector('[data-face]');
const faceOutline = smilingLetter.getAttribute('d');
const faceCutouts = smilingLetter.dataset.face;
const monochromeOpacity = Number(getComputedStyle(wordmark).getPropertyValue('--monochrome-opacity'));
const embedded = document.documentElement.classList.contains('embedded');

const sounds = embedded ? null : createMangoAudio();

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

// Grow each opening from its center in the same compound path as the A.
const coordinatePair = /(-?[\d.]+)\s+(-?[\d.]+)/g;
const faceOpenings = faceCutouts.match(/M[^M]+/g).map(outline => {
  const points = Array.from(outline.matchAll(coordinatePair), ([, x, y]) => [Number(x), Number(y)]);
  const xs = points.map(([x]) => x);
  const ys = points.map(([, y]) => y);
  return {
    outline,
    x: (Math.min(...xs) + Math.max(...xs)) / 2,
    y: (Math.min(...ys) + Math.max(...ys)) / 2
  };
});

function revealFace() {
  const start = performance.now();
  function tick(now) {
    const progress = Math.min(1, Math.max(0, (now - start) / 130));
    if (progress === 1 || reducedMotion.matches) {
      smilingLetter.setAttribute('d', faceOutline + faceCutouts);
      smilingLetter.setAttribute('data-face-open', '');
      return;
    }
    const scale = 1 - (1 - progress) ** 3;
    const openings = faceOpenings.map(({ outline, x, y }) => outline.replace(coordinatePair,
      (_, px, py) => `${(x + (px - x) * scale).toFixed(3)} ${(y + (py - y) * scale).toFixed(3)}`
    ));
    smilingLetter.setAttribute('d', faceOutline + openings.join(''));
    schedule(tick);
  }
  if (reducedMotion.matches) tick(start);
  else schedule(tick);
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
  // Area is a mass proxy for letters cut from the same thickness of material.
  const mass = Math.abs(shape.reduce((sum, p, i) => {
    const q = shape[(i + 1) % shape.length];
    return sum + p.x * q.y - q.x * p.y;
  }, 0)) / 2;
  const contacts = new Set();
  let returning = false;
  let drag = null;
  let press = null;
  let ripple = null;
  const yaw = spring(0, 7.5, 12, 0.0006);
  const pitch = spring(0, 8, 13, 0.0006);
  const light = faceLight.cloneNode(true);
  light.id = 'face-light-' + bodies.length;
  faceLight.parentNode.append(light);
  letter.style.setProperty('--lit-face', `url(#${light.id})`);
  let lightLevel = 0;
  const previewLetter = bodies.length === 0;
  let lastFrame = 0;

  const body = {
    points: shape,
    get inverseMass() { return drag ? 0 : 1 / mass; },
    get vx() { return drag ? drag.vx : x.velocity; },
    get vy() { return drag ? drag.vy : y.velocity; },
    receiveImpact(vx, vy) {
      returning = true;
      ripple = null;
      body.bump(vx, vy);
    },
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
      if (letter === smilingLetter && !letter.hasAttribute('data-colored')) revealFace();
      letter.setAttribute('data-colored', '');
      light.style.color = color;
      body.bump(vx, vy);
    },
    bump(vx, vy, wave) {
      if (drag || reducedMotion.matches) return;
      const impulse = Math.hypot(vx, vy);
      if (!impulse || wave?.visited.has(body)) return;
      if (wave) {
        returning = false;
        wave.visited.add(body);
        sounds?.play('collision', Math.min(1, impulse / 320));
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

  function impactOnReturn(dx, dy) {
    if (!dx && !dy) return;
    for (const other of bodies) {
      if (other === body) continue;
      const hit = contact(body.points, other.points, dx, dy, true);
      if (hit && !contacts.has(other)) {
        const { normalX, normalY } = hit;
        const closing = (x.velocity - other.vx) * normalX + (y.velocity - other.vy) * normalY;
        if (closing > 8) {
          // A soft impact exchanges normal momentum and preserves tangential motion.
          const inverseMass = 1 / mass;
          const impulse = 1.25 * closing / (inverseMass + other.inverseMass);
          // Bound very long throws without transferring more momentum than we remove.
          const bounded = Math.min(impulse, 460 / Math.max(inverseMass, other.inverseMass));
          x.velocity -= normalX * bounded * inverseMass;
          y.velocity -= normalY * bounded * inverseMass;
          if (other.inverseMass) {
            other.receiveImpact(normalX * bounded * other.inverseMass, normalY * bounded * other.inverseMass);
          }
          sounds?.play('collision', Math.min(1, closing / 450));
        }
      }
      if (hit?.touchingAtEnd) contacts.add(other);
      else contacts.delete(other);
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
    depth?.pose(letter, matrix, ry, rx, letter.style.fill ? amount : 0, letter.style.fill);
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
    // Sound the first strong crossing of the spring's rest position, then let it settle.
    if (!drag && !reducedMotion.matches && (prevX * x.value < 0 || prevY * y.value < 0)) {
      const speed = Math.hypot(x.velocity, y.velocity);
      if (speed > 65) sounds?.play('bounce', Math.min(1, speed / 300));
    }
    if (returning) {
      if (!reducedMotion.matches) impactOnReturn(x.value - prevX, y.value - prevY);
      if (!moving) {
        returning = false;
        contacts.clear();
      }
    } else if (ripple) {
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
    returning = false;
    contacts.clear();
    drag = { id: event.pointerId, time: event.timeStamp, vx: 0, vy: 0,
      startX: event.clientX, startY: event.clientY, travel: 0, moved: false };
    sounds?.play('press');
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
    drag.travel += Math.hypot(nextX - x.value, nextY - y.value);
    if (!drag.moved || drag.travel >= 36) {
      sounds?.play('drag');
      drag.moved = true;
      drag.travel = 0;
    }
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
    if (drag.moved && event.type === 'pointerup') sounds?.play('release');
    x.velocity = drag.vx * momentum;
    y.velocity = drag.vy * momentum;
    returning = drag.moved && !reducedMotion.matches;
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
    if (drag || event.repeat) return;
    sounds?.play('press');
    if (reducedMotion.matches) return;
    startSquish(performance.now());
    const origin = body.screenCenter();
    waveFrom(origin.x, origin.y);
  });
}

const cursorDot = document.querySelector('.cursor-dot');
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
    if (hit && !contacts.has(body)) {
      sounds?.play('brush', Math.min(1, 0.45 + speed / 2));
      body.bump(vx * strength, vy * strength);
    }
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
  if (!entranceFinished || event.pointerType !== 'mouse' || reducedMotion.matches || !event.target.closest?.('main')) return;

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
let previousColor;
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

function activateBackdrop(x, y) {
  const choices = palette.filter(color => color !== previousColor);
  const color = choices[Math.floor(Math.random() * choices.length)];
  previousColor = color;
  cursorDot.style.color = color;
  waveFrom(x, y, color);
}

backdrop.addEventListener('click', event => {
  finishEntrance();
  sounds?.play('colorChange');
  // Keyboard activation starts the wave at the center of the viewport.
  activateBackdrop(event.detail ? event.clientX : innerWidth / 2,
                   event.detail ? event.clientY : innerHeight / 2);
  syncIdleClicks();
});

// Local previews also run on a LAN address for testing on a phone.
const previewHost = /^(?:localhost|127\.0\.0\.1|\[::1\]|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(?:1[6-9]|2\d|3[01])\.\d+\.\d+)$/.test(location.hostname)
  || location.hostname.endsWith('.local');
document.querySelector('.tune-link').hidden = embedded || !previewHost;

const surface = document.documentElement;
const carouselFrame = embedded ? window.frameElement : null;
const pressed = new Set();
let hovered = false;
let active = false;
let visible = false;
let idleTimer;
let entranceFinished = false;
const entranceAnimations = [];
const eighthNote = 135;
const phraseDuration = 4 * eighthNote;
let beatOrigin;

function startEntrance() {
  if (entranceFinished || entranceAnimations.length) return;
  if (reducedMotion.matches) {
    finishEntrance();
    return;
  }

  const letters = Array.from(paths);
  for (let i = letters.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [letters[i], letters[j]] = [letters[j], letters[i]];
  }
  // Saria’s Song opens with two quick-quick-long phrases (R A Y, R A Y).
  const notes = [0, 1, 2, 4, 5, 6];
  beatOrigin = document.timeline.currentTime ?? performance.now();
  surface.classList.add('wordmark-entering');
  for (const [i, letter] of letters.entries()) {
    const note = Math.floor(i * notes.length / letters.length);
    const stagger = (i % 2) * (20 + Math.random() * 20);
    const lean = Math.random() < .5 ? -1 : 1;
    const drift = (2.5 + Math.random() * 3) * lean;
    const drop = 7 + Math.random() * 5;
    const angle = (3 + Math.random() * 3) * lean;
    const animation = letter.animate([
      { scale: '.42 .38', translate: `${drift}px ${drop}px`, rotate: `${angle}deg`, opacity: 0, easing: 'cubic-bezier(.2,.65,.3,1)' },
      { scale: '1.025 1.05', translate: `${-drift * .35}px ${-drop * .28}px`, rotate: `${-.32 * angle}deg`, opacity: monochromeOpacity, offset: .53 },
      { scale: '1.04 .975', translate: `${drift * .15}px 1px`, rotate: `${.12 * angle}deg`, opacity: monochromeOpacity, offset: .78 },
      { scale: '1', translate: '0 0', rotate: '0deg', opacity: monochromeOpacity }
    ], { duration: 310, delay: notes[note] * eighthNote + stagger, fill: 'backwards' });
    animation.startTime = beatOrigin;
    entranceAnimations.push(animation);
  }
  surface.classList.remove('wordmark-pending');
  Promise.allSettled(entranceAnimations.map(animation => animation.finished)).then(() => {
    if (entranceFinished) return;
    finishEntrance();
    syncIdleClicks();
  });
}

function finishEntrance() {
  if (entranceFinished) return;
  entranceFinished = true;
  for (const animation of entranceAnimations) animation.cancel();
  entranceAnimations.length = 0;
  surface.classList.remove('wordmark-pending', 'wordmark-entering');
}

function playIdleWave() {
  const { top, bottom } = wordmark.getBoundingClientRect();
  // Pick a point in the open background above or below the resting wordmark.
  const y = Math.random() * (top + innerHeight - bottom);
  activateBackdrop(Math.random() * innerWidth, y < top ? y : bottom + y - top);
}

function syncIdleClicks() {
  clearTimeout(idleTimer);
  if (document.hidden || !visible) return;
  if (!entranceFinished) {
    startEntrance();
    return;
  }
  if (active || reducedMotion.matches) return;
  if (!latestColor) playIdleWave();

  const now = performance.now();
  beatOrigin ??= now;
  const elapsed = now - beatOrigin;
  // After the opening wave, choose a phrase downbeat four to six seconds away.
  const earliest = Math.ceil((elapsed + 4000) / phraseDuration);
  const latest = Math.floor((elapsed + 6000) / phraseDuration);
  const phrase = earliest + Math.floor(Math.random() * (latest - earliest + 1));
  idleTimer = setTimeout(() => {
    playIdleWave();
    syncIdleClicks();
  }, phrase * phraseDuration - elapsed);
}

new IntersectionObserver(([entry]) => {
  visible = entry.intersectionRatio >= .35;
  syncIdleClicks();
}, { threshold: .35 }).observe(wordmark.closest('main'));
document.addEventListener('visibilitychange', syncIdleClicks);
reducedMotion.addEventListener('change', () => {
  if (reducedMotion.matches && !entranceFinished) finishEntrance();
  syncIdleClicks();
});

function syncInteraction() {
  const next = hovered || pressed.size > 0 || !!document.querySelector(':focus-visible');
  if (next === active) return;
  active = next;
  syncIdleClicks();
  // Keep the carousel still while someone is playing inside the frame.
  carouselFrame?.dispatchEvent(new CustomEvent('mango-interaction', { bubbles: true, detail: active }));
}

if (carouselFrame) {
  surface.addEventListener('pointerenter', event => {
    hovered = event.pointerType === 'mouse';
    syncInteraction();
  });
  surface.addEventListener('pointerleave', () => {
    hovered = false;
    syncInteraction();
  });
}
surface.addEventListener('pointerdown', event => {
  pressed.add(event.pointerId);
  syncInteraction();
  finishEntrance();
}, true);
function endPress(event) {
  pressed.delete(event.pointerId);
  syncInteraction();
}
window.addEventListener('pointerup', endPress);
window.addEventListener('pointercancel', endPress);
window.addEventListener('blur', () => {
  pressed.clear();
  hovered = false;
  syncInteraction();
});
surface.addEventListener('focusin', () => {
  syncInteraction();
  finishEntrance();
});
surface.addEventListener('focusout', () => queueMicrotask(syncInteraction));

function refreshMaterial() {
  material = themedMaterial(settings);
  for (const body of bodies) body.refreshMaterial();
}

new MutationObserver(refreshMaterial).observe(document.documentElement, {
  attributes: true, attributeFilter: ['data-theme']
});

if (new URLSearchParams(location.search).has('tune')) {
  document.body.classList.add('tuning');
  import('./tuner.js?v=sound-tuner').then(({ mountTuner }) => {
    mountTuner(settings, values => {
      settings = values;
      refreshMaterial();
    }, () => {
      const origin = bodies[0].screenCenter();
      waveFrom(origin.x, origin.y);
    }, sounds);
  });
}
