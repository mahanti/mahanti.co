export const toolPath = '/link-previews';
export const sourceFolder = 'scripts/link-previews/sources';
export const captureWidth = 2400;
export const captureHeight = 1260;
export const templates = {
  plate: { label: 'Plate', uses: { theme: true, image: true } },
  poster: { label: 'Poster', uses: { color: true } },
  inset: { label: 'Inset', uses: { theme: true, image: true } },
};

export function layoutOf({ layout, image }) {
  return image ? layout ?? 'type-and-image' : 'type-only';
}

export function canonical(value) {
  return JSON.stringify(value, (_, item) => item && typeof item === 'object' && !Array.isArray(item)
    ? Object.fromEntries(Object.entries(item).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0))
    : item);
}

export function definitionHash(entry, system) {
  const { title, theme, image, alt } = entry;
  const layout = layoutOf(entry);
  const settings = { ...system };
  if (!templates[settings.template]?.uses.color) delete settings.color;
  const drawn = layout === 'image-only' ? { title, layout, image, alt }
    : { title, theme, layout, image: layout === 'type-only' ? null : image, alt, system: settings };
  const input = canonical(drawn);
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) hash = Math.imul(hash ^ input.charCodeAt(i), 0x01000193);
  return (hash >>> 0).toString(16).padStart(8, '0');
}

export function fitsFrame(width, height) {
  return width > 0 && height > 0 && width <= captureWidth && height <= captureHeight
    && Math.abs((width / height) / (captureWidth / captureHeight) - 1) <= 0.01;
}

export function pngSize(bytes) {
  if (bytes.length < 24 || ![137, 80, 78, 71, 13, 10, 26, 10].every((byte, i) => bytes[i] === byte)
    || String.fromCharCode(...bytes.subarray(12, 16)) !== 'IHDR') return null;
  const header = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  return { width: header.getUint32(16), height: header.getUint32(20) };
}

export function sourceUrl(src) {
  return toolPath + '/source?file=' + encodeURIComponent(src.slice(sourceFolder.length + 1));
}
