import { createDialKit, createDialRoot } from './lib/dialkit-2.2.1/index.js';

export function mountTuner(defaults, apply, replay) {
  const stylesheet = document.createElement('link');
  stylesheet.rel = 'stylesheet';
  stylesheet.href = new URL('./lib/dialkit-2.2.1/styles.css', import.meta.url);
  document.head.append(stylesheet);

  const { shape, lighting, motion } = defaults;
  createDialRoot({ position: 'bottom-right', theme: 'light', defaultOpen: true, versions: 'menu' });
  const kit = createDialKit('Mango 3D', {
    holdTilt: true,
    replay: { type: 'action' },
    shape: {
      thickness: [shape.thickness, 0.5, 20, 0.1],
      outerRadius: [shape.outerRadius, 0.1, 8, 0.05],
      cutoutRadius: [shape.cutoutRadius, 0.1, 4, 0.05]
    },
    lighting: {
      _collapsed: true,
      direction: [lighting.direction, -180, 180, 1],
      faceHighlight: [lighting.faceHighlight, 0, 50, 0.1],
      faceShade: [lighting.faceShade, 0, 40, 0.1],
      rimHighlight: [lighting.rimHighlight, 0, 45, 0.5],
      rimShade: [lighting.rimShade, 0, 40, 0.5]
    },
    motion: {
      _collapsed: true,
      yawLimit: [motion.yawLimit, 0, 60, 0.1],
      pitchLimit: [motion.pitchLimit, 0, 45, 0.1],
      heldYaw: [motion.heldYaw, -45, 45, 0.1],
      heldPitch: [motion.heldPitch, -35, 35, 0.1],
      dragResponse: [motion.dragResponse, 0, 3, 0.05],
      tapStrength: [motion.tapStrength, 0, 2, 0.05],
      bumpStrength: [motion.bumpStrength, 0, 2, 0.05],
      springSpeed: [motion.springSpeed, 0.4, 2, 0.05],
      damping: [motion.damping, 0.4, 2, 0.05],
      staggerMs: [motion.staggerMs, 0, 650, 5]
    },
    restoreDefaults: { type: 'action' }
  }, {
    id: 'mango-studios-material-v1',
    persist: true,
    onAction(action) {
      if (action === 'replay') replay();
      if (action === 'restoreDefaults') kit.resetValues();
    }
  });
  kit.subscribe(apply);
}
