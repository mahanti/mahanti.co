import { captureWidth, captureHeight, fitsFrame, layoutOf, pngSize, sourceUrl } from './model.mjs';
import { element, frame, frameHeight, frameWidth } from './templates.mjs';

function dataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

async function fetchBlob(url) {
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) throw new Error('Could not load ' + url + '.');
  return response.blob();
}

function canvas(width, height) {
  const surface = document.createElement('canvas');
  surface.width = width;
  surface.height = height;
  return surface;
}

const fontCache = new Map();
function inlineFont(family) {
  if (fontCache.has(family)) return fontCache.get(family);
  const task = (async () => {
    const names = family.split(',').map(name => name.trim().replace(/^['"]|['"]$/g, ''));
    const rules = [];
    for (const sheet of document.styleSheets) {
      let cssRules;
      try { cssRules = sheet.cssRules; } catch { continue; }
      for (const rule of cssRules) {
        if (rule.type !== CSSRule.FONT_FACE_RULE) continue;
        const name = rule.style.fontFamily.replace(/^['"]|['"]$/g, '');
        if (names.includes(name) && (!rule.style.fontStyle || rule.style.fontStyle === 'normal')) {
          rules.push({ rule, name, base: sheet.href ?? document.baseURI });
        }
      }
    }
    const styles = await Promise.all(rules.map(async ({ rule, name, base }) => {
      const urls = rule.style.getPropertyValue('src').matchAll(/url\(["']?([^"'\)]+)["']?\)(?:\s*format\(["']?([^"'\)]+)["']?\))?/g);
      const formats = { woff2: 'woff2', woff: 'woff', ttf: 'truetype', otf: 'opentype' };
      for (const [, url, format] of urls) {
        const kind = format?.replace(/-variations$/, '') ?? formats[url.split(/[?#]/)[0].split('.').at(-1)];
        if (!Object.values(formats).includes(kind)) continue;
        const src = await dataUrl(await fetchBlob(new URL(url, base)));
        return '@font-face{font-family:' + JSON.stringify(name) + ';src:url(' + src + ') format("' + kind +
          '");font-weight:' + (rule.style.fontWeight || '400') + ';font-style:normal}';
      }
      return '';
    }));
    if (rules.length && !styles.some(Boolean)) throw new Error('Could not find the ' + family + ' font on this page.');
    return styles.join('');
  })();
  fontCache.set(family, task);
  task.catch(() => fontCache.delete(family));
  return task;
}

async function originalImage(entry) {
  if (layoutOf(entry) !== 'image-only' || !entry.image.src || (entry.image.zoom ?? 1) !== 1) return;
  const blob = await fetchBlob(sourceUrl(entry.image.src));
  const bitmap = await createImageBitmap(blob);
  try {
    const { width, height } = bitmap;
    if (!fitsFrame(width, height)) return;
    if (pngSize(new Uint8Array(await blob.slice(0, 24).arrayBuffer()))) return dataUrl(blob);
    const surface = canvas(width, height);
    surface.getContext('2d').drawImage(bitmap, 0, 0);
    return surface.toDataURL('image/png');
  } finally {
    bitmap.close();
  }
}

export async function capture(entry, system) {
  const original = await originalImage(entry);
  if (original) return original;
  const { node, fit } = frame(entry, system);
  if (fit?.overflow) throw new Error('The title doesn’t fit, even at 40px. Shorten it or break it differently, then save.');
  const host = element('div', {
    position: 'fixed', left: '-20000px', top: '0', width: frameWidth + 'px', height: frameHeight + 'px', pointerEvents: 'none',
  });
  host.setAttribute('aria-hidden', 'true');
  host.inert = true;
  host.append(node);
  document.body.append(host);
  try {
    const clone = node.cloneNode(true);
    const images = [...node.querySelectorAll('img')];
    await Promise.all([...clone.querySelectorAll('img')].map(async (img, i) => {
      const original = images[i];
      await original.decode().catch(() => { throw new Error('Could not load ' + original.src + '.'); });
      img.src = await dataUrl(await fetchBlob(original.currentSrc || original.src));
    }));
    const font = await inlineFont(system.font.family);
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="' + captureWidth + '" height="' + captureHeight +
      '" viewBox="0 0 ' + frameWidth + ' ' + frameHeight + '"><foreignObject width="' + frameWidth +
      '" height="' + frameHeight + '"><div xmlns="http://www.w3.org/1999/xhtml" style="margin:0;padding:0;overflow:hidden">' +
      '<style>' + font + '</style>' + new XMLSerializer().serializeToString(clone) + '</div></foreignObject></svg>';
    const img = new Image();
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
    await img.decode();
    const surface = canvas(captureWidth, captureHeight);
    const context = surface.getContext('2d');
    context.drawImage(img, 0, 0);
    await new Promise(requestAnimationFrame);
    context.clearRect(0, 0, captureWidth, captureHeight);
    context.drawImage(img, 0, 0);
    const output = surface.toDataURL('image/png');
    const size = pngSize(Uint8Array.from(atob(output.split(',')[1].slice(0, 32)), char => char.charCodeAt(0)));
    if (size?.width !== captureWidth || size.height !== captureHeight) throw new Error('The capture must be 2400×1260.');
    return output;
  } finally {
    host.remove();
  }
}
