// Add a template name and its uses in model.mjs, then define its geometry here.
// Keep the same inline frame for the editor and export. Use fitted type, the
// shared image panel, and the system's bottom inset. Leave current templates as they are.
import { layoutOf, sourceUrl, templates } from './model.mjs';

export const frameWidth = 1200;
export const frameHeight = 630;
const fits = new Map();
const px = value => value + 'px';
const reset = {
  boxSizing: 'border-box', margin: '0', padding: '0', border: '0',
  minWidth: '0', letterSpacing: 'normal', textTransform: 'none', textAlign: 'left', fontStyle: 'normal',
};

export function element(tag, style = {}, text) {
  const node = document.createElement(tag);
  Object.assign(node.style, style);
  if (text !== undefined) node.textContent = text;
  return node;
}

export async function loadFonts({ font, titleSize, labelSize }) {
  await Promise.all([
    document.fonts.load(font.titleWeight + ' ' + titleSize.max + 'px ' + font.family),
    document.fonts.load(font.labelWeight + ' ' + labelSize + 'px ' + font.family),
  ]);
  await document.fonts.ready;
  fits.clear();
}

const type = system => ({
  ...reset, display: 'block', fontFamily: system.font.family, fontWeight: system.font.titleWeight,
  fontOpticalSizing: 'auto', lineHeight: String(system.lineHeight),
  whiteSpace: 'pre-wrap', overflowWrap: 'normal', wordBreak: 'normal',
});

function fitTitle(text, width, height, system) {
  const key = JSON.stringify([text, width, height, system.font, system.titleSize, system.lineHeight, system.maxLines]);
  if (fits.has(key)) return fits.get(key);
  const probe = element('div', {
    ...type(system), width: px(width), position: 'fixed', left: '-20000px', top: '0', visibility: 'hidden',
  }, text);
  document.body.append(probe);
  const { min, max } = system.titleSize;
  let best;
  for (let size = max; size >= min && (!best || size >= 0.9 * best.first); size--) {
    probe.style.fontSize = px(size);
    const measured = probe.getBoundingClientRect().height;
    const lines = Math.max(1, Math.round(measured / (size * system.lineHeight)));
    if (probe.scrollWidth <= width + 0.5 && measured <= height + 0.5 && lines <= system.maxLines) {
      if (!best) best = { size, lines, first: size };
      else if (lines < best.lines) {
        best = { size, lines };
        break;
      }
    }
  }
  probe.remove();
  const result = best ?? { size: min, overflow: true };
  if (fits.size >= 500) fits.clear();
  fits.set(key, result);
  return result;
}

function channels(hex) {
  return hex.slice(1).match(/../g).map(c => parseInt(c, 16));
}

function luminance(hex) {
  const values = channels(hex).map(c => c / 255).map(c => c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return values[0] * 0.2126 + values[1] * 0.7152 + values[2] * 0.0722;
}

function contrast(one, two) {
  const l = luminance(one);
  const r = luminance(two);
  return (Math.max(l, r) + 0.05) / (Math.min(l, r) + 0.05);
}

function palette(entry, system) {
  if (system.template !== 'poster') return system.colors[entry.theme];
  const background = system.color;
  const light = system.colors.dark.ink;
  const dark = system.colors.light.ink;
  const useLight = contrast(background, light) >= contrast(background, dark);
  const ink = useLight ? light : dark;
  const ratio = useLight ? 0.72 : 0.60;
  const bg = channels(background);
  const label = '#' + channels(ink).map((value, i) => Math.round(value * ratio + bg[i] * (1 - ratio)).toString(16).padStart(2, '0')).join('');
  return { background, ink, label: contrast(background, label) >= 4.5 ? label : ink };
}

function geometry(entry, system) {
  const layout = layoutOf(entry);
  if (layout === 'image-only') return { image: { x: 0, y: 0, width: frameWidth, height: frameHeight } };
  const { margin, labelSize, labelLineHeight, labelGap, panelWidth, panelGap, textBottom } = system;
  let image;
  if (layout === 'type-and-image' && templates[system.template].uses.image) {
    if (system.template === 'inset') {
      const height = frameHeight - 2 * margin;
      const width = Math.round(height * panelWidth / frameHeight);
      image = { x: frameWidth - margin - width, y: margin, width, height, radius: 24 };
    } else {
      image = { x: frameWidth - panelWidth, y: 0, width: panelWidth, height: frameHeight };
    }
  }
  const textWidth = image?.x ?? frameWidth;
  const right = image ? panelGap : margin;
  const title = {
    width: textWidth - margin - right,
    height: frameHeight - margin - textBottom - Math.round(labelSize * labelLineHeight) - labelGap,
  };
  return { image, title, textWidth, right };
}

function imageElement(src, width, height) {
  const img = element('img', {
    ...reset, display: 'block', width: px(width), height: px(height), maxWidth: 'none', maxHeight: 'none', objectFit: 'cover',
  });
  img.src = sourceUrl(src);
  img.alt = '';
  img.draggable = false;
  return img;
}

export function updateFocus(img, { focus, zoom = 1 }) {
  const position = (focus.x * 100) + '% ' + (focus.y * 100) + '%';
  img.style.objectPosition = position;
  img.style.transformOrigin = position;
  img.style.transform = zoom === 1 ? 'none' : 'scale(' + zoom + ')';
}

function panel(box, image, system) {
  const { x, y, width, height, radius = 0 } = box;
  const node = element('div', {
    ...reset, position: 'absolute', left: px(x), top: px(y), width: px(width), height: px(height),
    borderRadius: px(radius), overflow: 'hidden', background: system.colors.panel,
  });
  node.dataset.ogPanel = '';
  if (image.sheet) {
    const columns = image.columns;
    const rows = Math.ceil(image.sheet.length / columns);
    const cellWidth = Math.floor(width / columns);
    const cellHeight = Math.floor(height / rows);
    image.sheet.forEach((src, i) => {
      const col = i % columns;
      const row = Math.floor(i / columns);
      const left = col * cellWidth;
      const top = row * cellHeight;
      const img = imageElement(src, col === columns - 1 ? width - left : cellWidth, row === rows - 1 ? height - top : cellHeight);
      Object.assign(img.style, { position: 'absolute', left: px(left), top: px(top) });
      node.append(img);
    });
  } else {
    const img = imageElement(image.src, width, height);
    updateFocus(img, image);
    node.append(img);
  }
  return node;
}

export function frame(entry, system, editable = false) {
  const colors = palette(entry, system);
  const { title, image, textWidth, right } = geometry(entry, system);
  const node = element('div', {
    ...reset, position: 'relative', display: 'flex', width: px(frameWidth), height: px(frameHeight),
    overflow: 'hidden', background: colors.background, fontFamily: system.font.family, fontOpticalSizing: 'auto',
  });
  node.dataset.ogFrame = '';
  const imagePanel = image && panel(image, entry.image, system);
  if (imagePanel) node.append(imagePanel);
  const result = { node, image: imagePanel, imageBox: image };
  if (!title) return result;
  const { margin, textBottom } = system;
  const column = element('div', {
    ...reset, position: 'relative', display: 'flex', flexDirection: 'column', flex: 'none',
    width: px(textWidth), height: px(frameHeight), padding: [margin, right, textBottom, margin].map(px).join(' '),
  });
  const label = element('div', {
    ...reset, flex: 'none', color: colors.label, fontWeight: system.font.labelWeight,
    fontSize: px(system.labelSize), lineHeight: String(system.labelLineHeight), whiteSpace: 'nowrap',
  }, system.domain);
  const measure = (text) => fitTitle(text, title.width, title.height, system);
  const fit = measure(entry.title);
  const titleNode = element('div', {
    ...type(system), width: px(title.width), fontSize: px(fit.size), color: colors.ink, flex: 'none',
    ...(editable && { position: 'relative', zIndex: '2', cursor: 'text' }),
  }, entry.title);
  titleNode.dataset.ogTitle = '';
  column.append(label, element('div', { flexGrow: '1' }), titleNode);
  node.append(column);
  return { ...result, title: titleNode, fit, measure };
}
