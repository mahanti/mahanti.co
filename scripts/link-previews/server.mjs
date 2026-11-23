import { createServer } from 'node:http';
import { createHash, randomUUID } from 'node:crypto';
import { mkdir, readFile, readdir, stat, writeFile, rename, link, unlink } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { captureWidth, captureHeight, definitionHash, fitsFrame, pngSize, sourceFolder, templates, toolPath } from './model.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
const manifest = join(root, '_data/link_previews.json');
const sources = join(root, sourceFolder);
const og = join(root, 'og');
const MiB = 1024 ** 2;
const types = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp' };
const imageName = /^(?!\.)[a-z0-9][a-z0-9._-]*\.(png|jpe?g|webp)$/i;
const pageId = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const pagePath = /^\/(?:[a-z0-9-]+(?:\/[a-z0-9-]+)*)?$/;
const local = /^(localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/;
const loopback = new Set(['127.0.0.1', '::1', '::ffff:127.0.0.1']);
const json = { 'Content-Type': 'application/json; charset=utf-8' };
const securityHeaders = { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow', 'X-Content-Type-Options': 'nosniff' };
const assets = new Map([
  ['', ['index.html', 'text/html; charset=utf-8']],
  ['/editor.css', ['editor.css', 'text/css; charset=utf-8']],
  ...['editor', 'model', 'templates', 'capture'].map(name => ['/' + name + '.mjs', [name + '.mjs', 'text/javascript; charset=utf-8']]),
]);
let pending = Promise.resolve();

function fail(status, message) {
  throw Object.assign(new Error(message), { status });
}
const load = async () => JSON.parse(await readFile(manifest, 'utf8'));
const fileSize = async (file) => (await stat(file).catch(error => {
  if (error.code !== 'ENOENT') throw error;
}))?.size ?? 0;
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex').slice(0, 12);

function serialized(work) {
  const next = pending.then(work);
  pending = next.catch(() => {});
  return next;
}

async function atomicWrite(file, data) {
  const temp = file + '.' + randomUUID() + '.tmp';
  try {
    await writeFile(temp, data, { flag: 'wx' });
    await rename(temp, file);
  } finally {
    await unlink(temp).catch(error => { if (error.code !== 'ENOENT') throw error; });
  }
}

async function writeAsset(file, bytes, data) {
  await mkdir(og, { recursive: true });
  const previous = await fileSize(file) ? await readFile(file) : null;
  await atomicWrite(file, bytes);
  try {
    await atomicWrite(manifest, JSON.stringify(data, null, 2) + '\n');
  } catch (error) {
    if (previous) await atomicWrite(file, previous);
    else await unlink(file);
    throw error;
  }
}

async function body(req, limit, message) {
  if (Number(req.headers['content-length']) > limit) fail(413, message);
  const chunks = [];
  let size = 0;
  // Keep the socket open for the 413 response instead of letting the iterator destroy it.
  for await (const chunk of req.iterator({ destroyOnReturn: false })) {
    size += chunk.length;
    if (size > limit) fail(413, message);
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

async function readJson(req, limit, message) {
  const bytes = await body(req, limit, message);
  try {
    const value = JSON.parse(bytes);
    if (value && typeof value === 'object' && !Array.isArray(value)) return value;
  } catch {}
  fail(400, 'Send a JSON object.');
}

function decodeData(input) {
  const match = typeof input === 'string' && input.match(/^data:[\w.+/-]+;base64,([A-Za-z0-9+/]+={0,2})$/);
  return match ? Buffer.from(match[1], 'base64') : Buffer.alloc(0);
}

async function checkSource(src) {
  const name = typeof src === 'string' && src.slice(sourceFolder.length + 1);
  if (!name || src !== sourceFolder + '/' + name || !imageName.test(name) || !await fileSize(join(sources, name))) {
    fail(400, 'Use an image from the picker.');
  }
  return src;
}

function between(value, min, max) {
  return Number.isFinite(value) && value >= min && value <= max;
}

async function normalizeEntry(entry) {
  if (!entry || typeof entry.id !== 'string' || entry.id.length > 64 || !pageId.test(entry.id)) fail(400, 'Choose a page.');
  if (typeof entry.path !== 'string' || entry.path.length > 200 || !pagePath.test(entry.path)) {
    fail(400, 'Use a path such as /notes, lowercase, without a query or hash.');
  }
  const { id, path, title, group, theme, alt } = entry;
  if (typeof title !== 'string' || !title.trim() || title.length > 200) fail(400, 'Add a title.');
  if (typeof group !== 'string' || !group.trim() || group.length > 40) fail(400, 'Add a group name up to 40 characters.');
  if (theme !== 'light' && theme !== 'dark') fail(400, 'Choose a theme.');
  if (alt !== undefined && (typeof alt !== 'string' || !alt.trim() || alt.length > 420)) {
    fail(400, 'The alt text must be 1 to 420 characters.');
  }
  const layout = entry.layout ?? (entry.image ? 'type-and-image' : 'type-only');
  if (!['type-only', 'type-and-image', 'image-only'].includes(layout)) fail(400, 'Choose a layout: type-only, type-and-image, image-only.');
  let image = null;
  if (Array.isArray(entry.image?.sheet)) {
    const { sheet, columns } = entry.image;
    if (!between(sheet.length, 1, 12) || !Number.isInteger(columns) || !between(columns, 1, 6)) fail(400, 'Choose a valid sheet.');
    image = { sheet: await Promise.all(sheet.map(checkSource)), columns };
  } else if (entry.image !== null && entry.image !== undefined) {
    const { src, focus, zoom = 1 } = entry.image;
    if (!between(focus?.x, 0, 1) || !between(focus?.y, 0, 1) || !between(zoom, 1, 4)) fail(400, 'Choose a valid crop.');
    image = { src: await checkSource(src), focus: { x: focus.x, y: focus.y }, ...(zoom !== 1 && { zoom }) };
  }
  if (layout !== 'type-only' && !image) fail(400, 'Choose an image for this layout.');
  return { id, path, title, group, theme, image, layout, ...(alt !== undefined && { alt }) };
}

async function save(req) {
  const { entry: draft, png, template, color } = await readJson(req, 10 * MiB, 'The image is too large to save.');
  const entry = await normalizeEntry(draft);
  if (!Object.hasOwn(templates, template)) fail(400, 'Choose a template: ' + Object.keys(templates).join(', ') + '.');
  if (color !== undefined && (typeof color !== 'string' || !/^#[0-9a-f]{6}$/i.test(color))) {
    fail(400, 'The color must be a six-digit hex, such as #000000.');
  }
  const bytes = decodeData(png);
  const size = pngSize(bytes);
  const originalSize = entry.layout === 'image-only' && entry.image.src && !entry.image.zoom;
  if (!size || (originalSize ? !fitsFrame(size.width, size.height) : size.width !== captureWidth || size.height !== captureHeight)) {
    fail(400, originalSize ? 'The PNG must have the frame’s shape (1200:630, within 1%) and be at most 2400×1260.' : 'The PNG must be exactly 2400×1260.');
  }
  const route = join(root, entry.path.slice(1));
  if (!await fileSize(join(route, 'index.html')) && !await fileSize(route + '.html')) {
    fail(422, entry.path + ' has no page yet. Create the page first, then save its image.');
  }
  return serialized(async () => {
    const data = await load();
    const index = data.entries.findIndex(item => item.id === entry.id);
    if (data.entries.some(item => item.path === entry.path && item.id !== entry.id)) fail(409, 'Another page already uses ' + entry.path + '.');
    Object.assign(data.system, { template }, color === undefined ? {} : { color: color.toLowerCase() });
    const video = data.entries[index]?.video;
    const saved = { ...entry, ...size, version: hash(bytes), savedHash: definitionHash(entry, data.system), ...(video && { video }) };
    if (index === -1) data.entries.push(saved);
    else data.entries[index] = saved;
    const file = 'og/' + entry.id + '.png';
    await writeAsset(join(root, file), bytes, data);
    return { entry: saved, file, bytes: bytes.length };
  });
}

function imageExtension(bytes) {
  if (pngSize(bytes)) return 'png';
  if (bytes.subarray(0, 3).toString('hex') === 'ffd8ff') return 'jpg';
  if (bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP') return 'webp';
}

const sourceItem = name => ({ src: sourceFolder + '/' + name, label: name, folder: 'Sources' });

async function upload(req) {
  const message = 'Images can be up to 10 MB.';
  const { name, data } = await readJson(req, Math.ceil(10 * MiB * 4 / 3) + 64 * 1024, message);
  if (typeof name !== 'string' || name.length > 200) fail(400, 'Choose a file name up to 200 characters.');
  const bytes = decodeData(data);
  if (bytes.length > 10 * MiB) fail(413, message);
  const extension = imageExtension(bytes);
  if (!extension) fail(415, 'Upload a PNG, JPEG or WebP image.');
  const stem = name.replace(/\.[^.]*$/, '').normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60).replace(/-$/, '') || 'image';
  await mkdir(sources, { recursive: true });
  const temp = join(sources, '.' + randomUUID());
  try {
    await writeFile(temp, bytes, { flag: 'wx' });
    for (let i = 1; i <= 999; i++) {
      const filename = stem + (i === 1 ? '' : '-' + i) + '.' + extension;
      try {
        await link(temp, join(sources, filename));
        return { source: sourceItem(filename) };
      } catch (error) {
        if (error.code !== 'EEXIST') throw error;
      }
    }
    fail(409, 'Too many files with this name.');
  } finally {
    await unlink(temp).catch(error => { if (error.code !== 'ENOENT') throw error; });
  }
}

const mp4Brands = new Set(['isom', 'iso2', 'iso3', 'iso4', 'iso5', 'iso6', 'mp41', 'mp42', 'avc1', 'M4V ', 'mmp4', 'MSNV', 'dash']);
async function video(req, url) {
  const remove = req.headers['content-type'] === 'application/json';
  const request = remove ? await readJson(req, 4096, 'The request is too large.') : Object.fromEntries(url.searchParams);
  const { id } = request;
  if (remove && request.remove !== true) fail(400, 'Send a video, or { id, remove: true }.');
  if (typeof id !== 'string' || id.length > 64 || !pageId.test(id)) fail(400, 'Choose a page.');
  const width = Number(request.width);
  const height = Number(request.height);
  let bytes;
  if (!remove) {
    if (!Number.isInteger(width) || !between(width, 1, 8192)) fail(400, 'Send the video’s width in pixels.');
    if (!Number.isInteger(height) || !between(height, 1, 8192)) fail(400, 'Send the video’s height in pixels.');
    bytes = await body(req, 8 * MiB, 'Videos can be up to 8.4 MB.');
    if (!bytes.length) fail(400, 'Nothing was sent.');
    if (bytes.toString('ascii', 4, 8) !== 'ftyp' || !mp4Brands.has(bytes.toString('ascii', 8, 12))) fail(415, 'That isn’t an MP4 video.');
  }
  return serialized(async () => {
    const data = await load();
    const entry = data.entries.find(item => item.id === id);
    if (!entry || (!remove && !await fileSize(join(og, id + '.png')))) fail(404, 'Save the page’s image first.');
    if (remove) {
      const kept = entry.video?.src;
      if (kept) {
        delete entry.video;
        await atomicWrite(manifest, JSON.stringify(data, null, 2) + '\n');
      }
      return { kept };
    }
    const src = 'og/' + id + '.mp4';
    if (data.entries.some(item => item.id !== id && item.video?.src === src)) fail(409, 'Another page already uses ' + src + '.');
    entry.video = { src, type: 'video/mp4', width, height, version: hash(bytes) };
    await writeAsset(join(root, src), bytes, data);
    return { video: entry.video, bytes: bytes.length };
  });
}

async function state() {
  const data = await load();
  const entries = await Promise.all(data.entries.map(async entry => [
    entry.id, {
      image: await fileSize(join(og, entry.id + '.png')),
      video: entry.video ? await fileSize(join(root, entry.video.src)) : 0,
    },
  ]));
  const names = await readdir(sources).catch(error => {
    if (error.code === 'ENOENT') return [];
    throw error;
  });
  return { ...data, files: Object.fromEntries(entries), sources: names.filter(name => imageName.test(name)).sort().map(sourceItem) };
}

function checkLocal(req) {
  const { host, forwarded, 'x-forwarded-host': proxy, 'x-forwarded-for': chain = '', 'x-real-ip': ip = '' } = req.headers;
  if (!local.test(host ?? '') || !loopback.has(req.socket.remoteAddress) || forwarded !== undefined
    || (proxy !== undefined && proxy !== host) || [chain, ip].flatMap(value => value.split(',').map(part => part.trim())).some(part => part && !loopback.has(part))) {
    fail(403, 'Local requests only.');
  }
}

const writes = new Map([['/save', save], ['/upload', upload], ['/video', video]]);
const server = createServer(async (req, res) => {
  const send = (code, headers, contents) => res.writeHead(code, { ...securityHeaders, ...headers }).end(contents);
  try {
    checkLocal(req);
    const url = new URL(req.url, 'http://' + req.headers.host);
    if (url.origin !== 'http://' + req.headers.host || !req.url.startsWith('/')) fail(403, 'Local requests only.');
    const route = url.pathname.startsWith(toolPath + '/') ? url.pathname.slice(toolPath.length) : url.pathname === toolPath ? '' : null;
    if (writes.has(route)) {
      if (req.method !== 'POST') fail(403, 'POST only.');
      if (req.headers.origin !== url.origin || req.headers['sec-fetch-site'] !== 'same-origin' || req.headers['x-link-previews'] !== '1') {
        fail(403, 'Use the Link Previews tool.');
      }
      const contentType = req.headers['content-type'];
      if (contentType !== 'application/json' && !(route === '/video' && contentType === 'video/mp4')) fail(403, 'Send JSON.');
      const result = await writes.get(route)(req, url);
      return send(200, json, JSON.stringify(result));
    }
    if (req.method !== 'GET') fail(404, 'Page not found.');
    if (route === '/state') return send(200, json, JSON.stringify(await state()));
    if (route === '/source') {
      const name = url.searchParams.get('file') ?? '';
      if (!imageName.test(name)) fail(404, 'Image not found.');
      return send(200, { 'Content-Type': types[name.split('.').at(-1).toLowerCase()] }, await readFile(join(sources, name)));
    }
    if (route === '/video-file') {
      const id = url.searchParams.get('id') ?? '';
      if (!pageId.test(id)) fail(404, 'Video not found.');
      return send(200, { 'Content-Type': 'video/mp4' }, await readFile(join(og, id + '.mp4')));
    }
    const asset = assets.get(route === '/' ? '' : route);
    if (asset) return send(200, { 'Content-Type': asset[1] }, await readFile(new URL('./' + asset[0], import.meta.url)));
    fail(404, 'Page not found.');
  } catch (error) {
    if (error.code === 'ENOENT') return send(404, json, JSON.stringify({ error: 'File not found.' }));
    if (!error.status) console.error(error);
    if (error.status === 413) res.setHeader('Connection', 'close');
    return send(error.status ?? 500, json, JSON.stringify({ error: error.status ? error.message : 'The request could not be completed. Try again.' }));
  }
});

if (process.env.NODE_ENV === 'production') {
  console.error('Link Previews is available in development only.');
  process.exitCode = 1;
} else {
  const port = Number(process.env.LINK_PREVIEWS_PORT ?? 4178);
  server.listen(port, '127.0.0.1', () => console.log('http://127.0.0.1:' + server.address().port + toolPath));
}
