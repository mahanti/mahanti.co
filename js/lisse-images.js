import { generateClipPath, generatePath } from './lib/lisse/path.js';

// Enhance the actual image: no wrappers, source changes, or layout changes.
// CSS remains the source of truth for responsive and per-corner radii.
const mediaSelector = 'img, video[data-lisse]';
const images = new Set();
const pending = new Set();
let frame = 0;

function refresh(image) {
  const style = getComputedStyle(image);
  // Layout dimensions deliberately exclude hover/zoom transforms.
  const width = parseFloat(style.width) + (style.boxSizing === 'border-box' ? 0 :
    parseFloat(style.paddingLeft) + parseFloat(style.paddingRight) +
    parseFloat(style.borderLeftWidth) + parseFloat(style.borderRightWidth));
  const height = parseFloat(style.height) + (style.boxSizing === 'border-box' ? 0 :
    parseFloat(style.paddingTop) + parseFloat(style.paddingBottom) +
    parseFloat(style.borderTopWidth) + parseFloat(style.borderBottomWidth));
  if (!(width > 0 && height > 0)) return; // Hidden slides refresh when shown.

  const radius = value => {
    const lengths = value.split(' ');
    const x = parseFloat(lengths[0]) * (lengths[0].endsWith('%') ? width / 100 : 1);
    const yValue = lengths[1] || lengths[0];
    const y = parseFloat(yValue) * (yValue.endsWith('%') ? height / 100 : 1);
    return { radius: Math.min(x, y), smoothing: 0.6 };
  };
  const corners = {
    topLeft: radius(style.borderTopLeftRadius),
    topRight: radius(style.borderTopRightRadius),
    bottomRight: radius(style.borderBottomRightRadius),
    bottomLeft: radius(style.borderBottomLeftRadius),
  };
  const clip = generateClipPath(width, height, corners);
  if (image.style.clipPath !== clip) image.style.clipPath = clip;

  // Paint the existing uniform hairline along the same curve. border-image
  // paints inward without introducing a wrapper or changing the border box.
  if (image.classList.contains('image-border')) {
    const stroke = parseFloat(style.borderTopWidth);
    const slice = Math.min(width / 2, height / 2,
      Math.max(...Object.values(corners).map(corner => corner.radius)) * 1.6 + stroke);
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><path d="${generatePath(width, height, corners)}" fill="none" stroke="${style.borderTopColor}" stroke-width="${stroke * 2}"/></svg>`;
    const source = `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
    if (image.style.borderImageSource !== source) image.style.setProperty('border-image-source', source, 'important');
    image.style.setProperty('border-image-slice', String(slice), 'important');
    image.style.setProperty('border-image-width', `${slice}px`, 'important');
    image.style.setProperty('border-image-repeat', 'stretch', 'important');
  }
}

function schedule(image) {
  pending.add(image);
  if (!frame) frame = requestAnimationFrame(() => {
    frame = 0;
    pending.forEach(image => { if (image.isConnected) refresh(image); });
    pending.clear();
  });
}

const resize = new ResizeObserver(entries => entries.forEach(({ target }) => schedule(target)));
function discover(root) {
  const found = root.matches?.(mediaSelector) ? [root] : root.querySelectorAll?.(mediaSelector) || [];
  for (const image of found) {
    if (images.has(image)) continue;
    images.add(image);
    resize.observe(image);
    schedule(image);
  }
}

if (CSS.supports('clip-path', 'path("M0 0H1V1H0Z")')) {
  discover(document);
  // Capturing load supports lazy images, srcset, and later src replacements.
  document.addEventListener('load', event => {
    if (event.target instanceof HTMLImageElement) schedule(event.target);
  }, true);
  document.addEventListener('loadedmetadata', event => {
    if (event.target.matches?.('video[data-lisse]')) schedule(event.target);
  }, true);
  window.addEventListener('resize', () => images.forEach(schedule), { passive: true });
  new MutationObserver(records => {
    records.forEach(record => record.addedNodes.forEach(discover));
    for (const image of images) {
      if (!image.isConnected) {
        resize.unobserve(image);
        images.delete(image);
        pending.delete(image);
      }
    }
  }).observe(document.body, { childList: true, subtree: true });
}
