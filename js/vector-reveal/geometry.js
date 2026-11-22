import './lib/path-data-polyfill.js';

const ns = 'http://www.w3.org/2000/svg';

function svg(tag, attributes = {}) {
  const node = document.createElementNS(ns, tag);
  for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, value);
  return node;
}

function buildGuides(path, group) {
  const anchors = new Set();
  const controls = new Set();
  const lines = [];
  let start, previous;
  for (const { type, values } of path.getPathData({ normalize: true })) {
    if (type === 'Z') {
      previous = start;
      continue;
    }
    const end = values.slice(-2).join(' ');
    anchors.add(end);
    if (type === 'C') {
      const handles = [values.slice(0, 2).join(' '), values.slice(2, 4).join(' ')];
      for (const [i, anchor] of [previous, end].entries()) {
        if (anchor === handles[i]) continue;
        lines.push(`M${anchor}L${handles[i]}`);
        controls.add(handles[i]);
      }
    }
    if (type === 'M') start = end;
    previous = end;
  }

  // Round line caps on zero-length paths keep each marker a fixed screen size.
  const dots = points => [...points].map(point => `M${point}h0`).join('');
  for (const [name, d] of [
    ['handle-lines', lines.join('')], ['control-points', dots(controls)],
    ['anchor-rims', dots(anchors)], ['anchor-centers', dots(anchors)]
  ]) {
    group.append(svg('path', { class: name, d }));
  }
}

// Input is a path-based SVG with a viewBox. Both sides share its exact coordinates.
export function makeLayers(text) {
  const source = new DOMParser().parseFromString(text, 'image/svg+xml').documentElement;
  const box = source.getAttribute('viewBox');
  const paths = [...source.querySelectorAll('path')].filter(path => !path.closest('defs, clipPath, mask, symbol'));
  if (source.localName !== 'svg' || !box || !paths.length) throw new Error('Expected a path-based SVG with a viewBox.');
  const fill = svg('svg', { viewBox: box });
  const outline = svg('svg', { viewBox: box });
  const guides = svg('g');
  for (const original of paths) {
    const ancestors = [];
    for (let node = original; node; node = node.parentElement) ancestors.unshift(node);
    const transform = ancestors.map(node => node.getAttribute('transform')).filter(Boolean).join(' ');
    const attrs = { d: original.getAttribute('d'), transform };
    const inherited = key => ancestors.reduce((value, node) => node.style?.getPropertyValue(key) || node.getAttribute(key) || value, '');
    const filled = svg('path', { ...attrs, 'fill-rule': inherited('fill-rule') || 'nonzero' });
    filled.style.setProperty('--source-fill', inherited('fill') || 'black');
    fill.append(filled);
    const path = svg('path', { ...attrs, class: 'outline' });
    outline.append(path);
    const group = svg('g', { transform });
    buildGuides(path, group);
    guides.append(group);
  }
  outline.append(guides);
  return [fill, outline];
}
