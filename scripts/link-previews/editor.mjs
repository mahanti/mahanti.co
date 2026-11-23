import { canonical, definitionHash, layoutOf, sourceUrl, templates, toolPath } from './model.mjs';
import { element, frame, frameWidth, loadFonts, updateFocus } from './templates.mjs';
import { capture } from './capture.mjs';

const root = document.querySelector('.link-previews');
const nav = root.querySelector('nav');
const main = root.querySelector('main');
const heading = root.querySelector('h1');
const saveButton = root.querySelector('#save');
const saveNote = root.querySelector('#save-note');
const content = root.querySelector('#content');
const saved = new Map();
const originalSheets = new Map();
const notes = new Map();
const failures = new Map();
const undo = [];
const redo = [];
const videoBusy = new Set();
let files, sources, system, entries;
let view = 'all';
let batch = null;
let batchNote = '';
let closePicker = () => {};

async function api(route, payload, type = 'application/json') {
  const response = await fetch(toolPath + route, payload === undefined ? {} : {
    method: 'POST', headers: { 'Content-Type': type, 'x-link-previews': '1' },
    body: type === 'application/json' ? JSON.stringify(payload) : payload,
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error);
  return result;
}

function dom(tag, className, text) {
  const node = element(tag, {}, text);
  if (className) node.className = className;
  return node;
}

function button(text, action, className = '') {
  const node = dom('button', className, text);
  node.type = 'button';
  node.onclick = action;
  return node;
}

const current = () => entries.get(view);
const clean = ({ version, savedHash, width, height, video, ...entry }) => entry;
function status(entry) {
  const previous = saved.get(entry.id);
  if (!previous && !entry.edited) return 'Missing';
  if (!previous || !files[entry.id]?.image || canonical(clean(entry)) !== canonical(clean(previous))) return 'Draft';
  if (!previous.savedHash && layoutOf(entry) === 'image-only') return 'Saved';
  return previous.savedHash === definitionHash(entry, system) ? 'Saved' : 'Stale';
}

function dot(entry) {
  const state = status(entry);
  if (state === 'Saved') return document.createDocumentFragment();
  const node = dom('span', 'dot ' + state.toLowerCase());
  node.setAttribute('role', 'img');
  node.setAttribute('aria-label', state);
  node.title = state;
  return node;
}

function navigate(id) {
  closePicker();
  view = id;
  render();
  main.scrollTop = 0;
}

function record(change, key, redraw = true) {
  const before = { entries, system, view };
  change();
  const after = { entries, system, view };
  if (before.entries === after.entries && before.system === after.system) return;
  const now = Date.now();
  if (key && undo.at(-1)?.key === key && now - undo.at(-1).time <= 1000) {
    Object.assign(undo.at(-1), { after, time: now });
  } else {
    undo.push({ before, after, key, time: now });
  }
  redo.length = 0;
  failures.delete(view);
  batchNote = '';
  if (redraw) render();
  else refreshStatus();
}

function edit(id, patch, key, redraw = true) {
  const old = entries.get(id);
  const next = { ...old, ...patch };
  if (canonical(old) === canonical(next)) return;
  if (!saved.has(id)) next.edited = true;
  record(() => { entries = new Map(entries).set(id, next); }, key, redraw);
}

function historyStep(from, to, side) {
  if (!from.length) return;
  const step = from.pop();
  to.push(step);
  ({ entries, system, view } = step[side]);
  if (!entries.has(view) && !['all', 'template'].includes(view)) view = 'all';
  render();
}

window.addEventListener('keydown', event => {
  if ((!event.metaKey && !event.ctrlKey) || event.altKey || event.target.matches?.('textarea,input:is([type=text],[type=search],[type=url],[type=tel],[type=email],[type=password],[type=number])')) return;
  const key = event.key.toLowerCase();
  if (key === 'z' || (key === 'y' && event.ctrlKey && !event.metaKey)) {
    event.preventDefault();
    if (key === 'y' || event.shiftKey) historyStep(redo, undo, 'after');
    else historyStep(undo, redo, 'before');
  }
}, true);

const resize = new ResizeObserver(items => {
  for (const item of items) {
    const layer = item.target.firstElementChild;
    const scale = item.contentRect.width / frameWidth;
    layer.style.transform = 'scale(' + scale + ')';
    layer.style.setProperty('--frame-scale', scale);
    layer.style.visibility = 'visible';
  }
});

function scaled(result) {
  const box = dom('div', 'frame');
  result.node.classList.add('layer');
  result.node.style.visibility = 'hidden';
  box.append(result.node);
  resize.observe(box);
  return box;
}

function groupEntries() {
  const groups = new Map();
  for (const entry of entries.values()) {
    if (!groups.has(entry.group)) groups.set(entry.group, []);
    groups.get(entry.group).push(entry);
  }
  return groups;
}

function renderNav() {
  const focused = nav.contains(document.activeElement) ? document.activeElement.dataset.view : null;
  const row = (id, name, entry) => {
    const item = button('', () => navigate(id));
    item.dataset.view = id;
    if (view === id) item.setAttribute('aria-current', 'page');
    item.append(dom('span', 'truncate grow', name));
    if (entry) item.append(dot(entry));
    return item;
  };
  const rows = [row('all', 'All'), row('template', 'Template')];
  const groups = groupEntries();
  for (const [name, pages] of groups) {
    if (groups.size > 1) rows.push(dom('h2', '', name));
    rows.push(...pages.map(entry => row(entry.id, entry.path, entry)));
  }
  nav.replaceChildren(...rows);
  if (focused) [...nav.querySelectorAll('button')].find(node => node.dataset.view === focused)?.focus({ preventScroll: true });
}

function refreshStatus() {
  const entry = current();
  const candidates = entry ? [entry] : [...entries.values()];
  const dirty = candidates.some(item => status(item) !== 'Saved');
  saveButton.hidden = !batch && !dirty;
  saveButton.disabled = !!batch;
  saveButton.textContent = batch ? (batch.total === 1 ? 'Saving…' : 'Saving ' + batch.index + ' of ' + batch.total + '…')
    : entry ? 'Save' : 'Save all';
  saveNote.textContent = entry ? failures.get(entry.id) ?? '' : batchNote;
  renderNav();
}

function card(result, label, buttonLabel, activate, extra) {
  const figure = dom('figure');
  const caption = dom('figcaption');
  caption.append(dom('span', 'truncate grow', label));
  if (extra) caption.append(extra);
  const action = button('', activate, 'card-button');
  action.setAttribute('aria-label', buttonLabel);
  figure.append(scaled(result), caption, action);
  return { figure, caption, action, box: figure.firstElementChild };
}

function allView() {
  const grid = dom('div', 'grid');
  for (const pages of groupEntries().values()) {
    for (const entry of pages) {
      const item = card(frame(entry, system), entry.path, 'Edit ' + entry.path, () => navigate(entry.id), dot(entry));
      if (saved.get(entry.id)?.video) item.caption.insertBefore(dom('span', '', 'Video'), item.caption.children[1] ?? null);
      grid.append(item.figure);
    }
  }
  return grid;
}

const promptSlot = '[Describe it: where the title and image go, the colors, the type, anything else.]';
const promptBefore = 'I want a new share image template for this site.\n\nWhat I want: ';
const promptAfter = "\n\nRead the comment at the top of scripts/link-previews/templates.mjs first. It explains how templates work and the rules to keep. Add mine there as a new template, and don't change the existing ones. It will appear in the Template gallery of the Link Previews tool.";

function templateView() {
  const grid = dom('div', 'grid gallery');
  const list = [...entries.values()];
  const sample = list.find(entry => layoutOf(entry) === 'type-and-image' && entry.image.src) ?? list[0]
    ?? { title: 'Your page title', theme: 'light', image: null };
  for (const [name, { label, uses }] of Object.entries(templates)) {
    const active = system.template === name;
    const settings = { ...system, template: name };
    const item = card(frame(sample, settings), label, active ? label + ', the current template' : 'Use ' + label + ' for every page',
      () => { if (!active) changeSystem({ template: name }); });
    item.action.setAttribute('aria-pressed', active);
    if (active) {
      item.figure.classList.add('current');
      item.caption.append(dom('span', '', 'Current'));
    }
    if (uses.color) {
      const pill = dom('label', 'color');
      const swatch = dom('span');
      const value = dom('span', '', system.color.toUpperCase());
      const input = dom('input');
      input.type = 'color';
      input.value = system.color;
      input.setAttribute('aria-label', label + ' background color');
      swatch.style.background = system.color;
      input.oninput = () => {
        changeSystem({ color: input.value }, 'color', false);
        value.textContent = input.value.toUpperCase();
        swatch.style.background = input.value;
        item.box.firstElementChild.replaceWith(frame(sample, { ...system, template: name }).node);
        const layer = item.box.firstElementChild;
        layer.classList.add('layer');
        layer.style.transform = 'scale(' + item.box.clientWidth / frameWidth + ')';
      };
      pill.append(swatch, value, input);
      item.caption.insertBefore(pill, active ? item.caption.lastChild : null);
    }
    grid.append(item.figure);
  }
  const item = dom('figure');
  const prompt = dom('div', 'prompt');
  const words = dom('div');
  words.append(promptBefore, dom('mark', '', promptSlot), promptAfter);
  const copy = button('Copy prompt', async () => {
    const value = promptBefore + promptSlot + promptAfter;
    try { await navigator.clipboard.writeText(value); }
    catch {
      const scratch = dom('textarea');
      scratch.value = value;
      prompt.append(scratch);
      scratch.select();
      document.execCommand('copy');
      scratch.remove();
      copy.focus();
    }
    copy.textContent = 'Copied';
    setTimeout(() => { copy.textContent = 'Copy prompt'; }, 1600);
  }, 'quiet');
  prompt.append(words, copy);
  item.append(prompt, dom('figcaption', '', 'Make your own'));
  grid.append(item);
  return grid;
}

function changeSystem(patch, key, redraw) {
  record(() => { system = { ...system, ...patch }; }, key, redraw);
}

function segmented(label, options, selected, change) {
  const group = dom('div', 'segmented');
  group.setAttribute('role', 'radiogroup');
  group.setAttribute('aria-label', label);
  const thumb = dom('span', 'segment-thumb');
  group.append(thumb);
  const select = index => {
    change(options[index][0]);
    const replacement = [...content.querySelectorAll('[role=radiogroup]')].find(node => node.getAttribute('aria-label') === label);
    replacement?.querySelectorAll('button')[index]?.focus();
  };
  options.forEach(([value, text], i) => {
    const option = button(text, () => select(i));
    option.setAttribute('role', 'radio');
    option.setAttribute('aria-checked', selected === value);
    option.tabIndex = selected === value ? 0 : -1;
    option.onkeydown = event => {
      const delta = { ArrowLeft: -1, ArrowUp: -1, ArrowRight: 1, ArrowDown: 1 }[event.key];
      if (!delta) return;
      event.preventDefault();
      select((i + delta + options.length) % options.length);
    };
    group.append(option);
  });
  requestAnimationFrame(() => {
    const active = group.querySelector('[aria-checked=true]');
    if (!active) return;
    thumb.style.width = active.offsetWidth + 'px';
    thumb.style.transform = 'translateX(' + active.offsetLeft + 'px)';
  });
  return group;
}

const centered = src => ({ src, focus: { x: 0.5, y: 0.5 } });
function applySource(entry, image) {
  if (canonical(entry.image) === canonical(image) && layoutOf(entry) !== 'type-only') return;
  edit(entry.id, {
    image, layout: layoutOf(entry) === 'type-only' ? (templates[system.template].uses.image ? 'type-and-image' : 'image-only') : layoutOf(entry),
  });
}

function fileInput(accept, label, choose) {
  const input = dom('input');
  input.type = 'file';
  input.accept = accept;
  input.hidden = true;
  input.setAttribute('aria-label', label);
  input.onchange = () => {
    if (input.files[0]) choose(input.files[0]);
    input.value = '';
  };
  return input;
}

function picker(entry) {
  const wrap = dom('div', 'picker');
  const sheet = originalSheets.get(entry.id);
  const optionList = [
    ...(sheet ? [{ image: sheet, src: sheet.sheet[0], label: 'Sheet of ' + sheet.sheet.length }] : []),
    ...sources.map(source => ({ ...source, image: centered(source.src) })),
  ];
  const currentSrc = entry.image?.src ?? entry.image?.sheet?.[0];
  const label = entry.image?.sheet ? 'Sheet of ' + entry.image.sheet.length : currentSrc?.split('/').at(-1) ?? 'Choose image';
  const toggle = button('', () => pop.hidden ? open() : dismiss(true), 'quiet');
  toggle.setAttribute('aria-haspopup', 'listbox');
  toggle.setAttribute('aria-expanded', 'false');
  toggle.setAttribute('aria-label', 'Image source: ' + label);
  if (currentSrc) {
    const thumb = dom('img');
    thumb.alt = '';
    thumb.src = sourceUrl(currentSrc);
    toggle.append(thumb);
  }
  toggle.append(dom('span', 'truncate', label), '⌄');
  const pop = dom('div', 'popover');
  pop.hidden = true;
  const options = dom('div', 'options');
  options.setAttribute('role', 'listbox');
  options.setAttribute('aria-label', 'Image source');
  optionList.forEach(({ image, src, label }, i) => {
    const option = button('', () => {
      dismiss(false);
      applySource(entries.get(entry.id), image);
      content.querySelector('.picker button')?.focus();
    });
    option.setAttribute('role', 'option');
    option.setAttribute('aria-selected', image.sheet ? !!entry.image?.sheet : src === entry.image?.src);
    const thumb = dom('img');
    thumb.alt = '';
    thumb.src = sourceUrl(src);
    thumb.loading = 'lazy';
    option.append(thumb, dom('span', 'truncate', label));
    option.onkeydown = event => {
      const delta = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -3, ArrowDown: 3 }[event.key];
      if (!delta) return;
      event.preventDefault();
      options.children[Math.max(0, Math.min(i + delta, optionList.length - 1))]?.focus();
    };
    options.append(option);
  });
  const footer = dom('div', 'picker-footer');
  const input = fileInput('image/png,image/jpeg,image/webp', 'Image file', file => upload(entry.id, file));
  const uploadButton = button('Upload', () => input.click(), 'quiet');
  footer.append(uploadButton, input, dom('span', '', 'PNG, JPEG or WebP, up to 10 MB'));
  pop.append(options, footer);
  wrap.append(toggle, pop);
  function outside(event) {
    if (!wrap.contains(event.target)) dismiss(false);
  }
  function dismiss(focus) {
    pop.hidden = true;
    toggle.setAttribute('aria-expanded', 'false');
    document.removeEventListener('pointerdown', outside);
    if (focus) toggle.focus();
  }
  function open() {
    closePicker();
    closePicker = () => dismiss(false);
    pop.hidden = false;
    toggle.setAttribute('aria-expanded', 'true');
    document.addEventListener('pointerdown', outside);
    (options.querySelector('[aria-selected=true]') ?? options.firstElementChild ?? uploadButton).focus();
  }
  wrap.onkeydown = event => {
    if (event.key === 'Escape' && !pop.hidden) { event.stopPropagation(); dismiss(true); }
  };
  return { wrap, open };
}

function note(id, message) {
  notes.set(id, message);
  if (view === id) {
    const target = content.querySelector('[data-note]');
    if (target) target.textContent = message;
  }
}

async function upload(id, file) {
  if (file.size > 10 * 1024 ** 2) return note(id, 'Images can be up to 10 MB.');
  note(id, 'Uploading…');
  try {
    const data = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
    const { source } = await api('/upload', { name: file.name, data });
    sources = [...sources, source].sort((a, b) => a.label.localeCompare(b.label));
    note(id, '');
    applySource(entries.get(id), centered(source.src));
  } catch (error) {
    note(id, error.message);
  }
}

function titleEditor(entry, result, warning) {
  const title = result.title;
  title.contentEditable = 'plaintext-only';
  title.spellcheck = false;
  title.setAttribute('role', 'textbox');
  title.setAttribute('aria-label', 'Title');
  title.setAttribute('aria-multiline', 'true');
  let breaks = (entry.title.match(/\n/g) ?? []).length;
  let key = 'title-' + entry.id + '-' + performance.now();
  const sync = () => {
    const text = title.innerText.replace(/\u00a0/g, ' ');
    const nextBreaks = (text.match(/\n/g) ?? []).length;
    if (breaks !== nextBreaks) key = 'title-' + entry.id + '-' + performance.now();
    breaks = nextBreaks;
    const fit = result.measure(text);
    title.style.fontSize = fit.size + 'px';
    warning.hidden = !fit.overflow;
    edit(entry.id, { title: text }, key, false);
  };
  title.oninput = sync;
  title.onkeydown = event => {
    if (event.key === 'Enter' && !event.isComposing) {
      event.preventDefault();
      document.execCommand('insertLineBreak');
    }
  };
  title.onpaste = event => {
    event.preventDefault();
    document.execCommand('insertText', false, event.clipboardData.getData('text/plain').replace(/\r\n?/g, '\n'));
  };
  title.ondrop = event => { event.preventDefault(); event.stopPropagation(); };
}

function cropEditor(entry, result) {
  if (!entry.image?.src || !result.imageBox) return;
  const { width, height } = result.imageBox;
  const img = result.image.firstElementChild;
  const target = dom('div', 'crop');
  Object.assign(target.style, { inset: '0' });
  target.tabIndex = 0;
  target.setAttribute('role', 'group');
  target.setAttribute('aria-label', 'Image crop. Drag or use the arrow keys to move the image.');
  let drag;
  const move = (focus, dx, dy, key) => {
    if (!img.naturalWidth) return;
    const active = entries.get(entry.id);
    const zoom = active.image.zoom ?? 1;
    const cover = Math.max(width / img.naturalWidth, height / img.naturalHeight) * zoom;
    const axis = (start, delta, slack) => slack <= 0.5 ? start : Math.round(Math.max(0, Math.min(1, start - delta / slack)) * 1000) / 1000;
    const next = {
      x: axis(focus.x, dx, img.naturalWidth * cover - width),
      y: axis(focus.y, dy, img.naturalHeight * cover - height),
    };
    const image = { ...active.image, focus: next };
    updateFocus(img, image);
    edit(entry.id, { image }, key, false);
  };
  target.onpointerdown = event => {
    if (event.button !== 0) return;
    target.setPointerCapture(event.pointerId);
    target.focus();
    drag = { x: event.clientX, y: event.clientY, focus: entries.get(entry.id).image.focus, key: 'drag-' + performance.now() };
  };
  target.onpointermove = event => {
    if (!drag) return;
    const scale = target.getBoundingClientRect().width / width;
    move(drag.focus, (event.clientX - drag.x) / scale, (event.clientY - drag.y) / scale, drag.key);
  };
  target.onlostpointercapture = () => { drag = null; };
  target.onkeydown = event => {
    const delta = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[event.key];
    if (!delta) return;
    event.preventDefault();
    const amount = event.shiftKey ? 50 : 10;
    move(entries.get(entry.id).image.focus, delta[0] * amount, delta[1] * amount, 'nudge-' + entry.id);
  };
  result.image.append(target);
}

const videoLimit = 8 * 1024 ** 2;
const mb = size => (size / 1e6).toFixed(size < 100000 ? 2 : 1) + ' MB';

async function updateVideo(id, file) {
  if (videoBusy.has(id)) return;
  if (file && !files[id]?.image) return note(id, 'Save the page’s image first.');
  if (file && file.size > videoLimit) return note(id, 'Videos can be up to 8.4 MB. This one is ' + mb(file.size) + '.');
  videoBusy.add(id);
  if (file) note(id, 'Uploading the video…');
  if (view === id) render();
  let objectUrl;
  try {
    if (file) {
      const header = new Uint8Array(await file.slice(0, 12).arrayBuffer());
      if (new TextDecoder().decode(header.slice(4, 8)) !== 'ftyp') {
        throw new Error('That isn’t an MP4 video. Export it as MP4 (H.264) and try again.');
      }
      const clip = dom('video');
      clip.muted = true;
      clip.preload = 'metadata';
      objectUrl = URL.createObjectURL(file);
      await new Promise((resolve, reject) => {
        clip.onloadedmetadata = resolve;
        clip.onerror = () => reject(new Error('This browser can’t read that video.'));
        clip.src = objectUrl;
      });
      if (!clip.videoWidth || !clip.videoHeight) throw new Error('This video has no picture.');
      const query = new URLSearchParams({ id, width: clip.videoWidth, height: clip.videoHeight });
      const { video, bytes } = await api('/video?' + query, file, 'video/mp4');
      saved.set(id, { ...saved.get(id), video });
      files[id].video = bytes;
      note(id, '');
    } else {
      const { kept } = await api('/video', { id, remove: true });
      const previous = { ...saved.get(id) };
      delete previous.video;
      saved.set(id, previous);
      files[id].video = 0;
      note(id, kept ? 'Video removed. The file is still at ' + kept + '.' : '');
    }
  } catch (error) {
    note(id, error.message);
  } finally {
    if (objectUrl) URL.revokeObjectURL(objectUrl);
    videoBusy.delete(id);
    render();
  }
}

function videoControls(id, controls, workspace) {
  const video = saved.get(id)?.video;
  const input = fileInput('video/mp4', 'Video file', file => updateVideo(id, file));
  const add = button(video ? 'Replace video' : 'Add video', () => input.click(), 'quiet');
  add.disabled = videoBusy.has(id);
  controls.append(input, add);
  if (!video) return;
  const remove = button('Remove video', () => updateVideo(id), 'quiet');
  remove.disabled = videoBusy.has(id);
  controls.append(remove);
  const preview = dom('div', 'video-preview');
  const clip = dom('video');
  clip.src = toolPath + '/video-file?' + new URLSearchParams({ id, v: video.version ?? '' });
  clip.muted = clip.loop = clip.autoplay = clip.playsInline = true;
  clip.setAttribute('aria-label', 'Video preview');
  const info = dom('div');
  const sizes = files[id];
  info.append(dom('div', '', (sizes.video ? mb(sizes.video) : 'File missing: ' + video.src) + ', ' + video.width + '×' + video.height),
    dom('div', '', 'Plays in Messages. Other apps show the image.'));
  if (sizes.image + sizes.video > 10e6) {
    const warning = dom('div', '', 'The saved image and this video come to ' + mb(sizes.image + sizes.video) + ', over the 10 MB Messages loads for one link.');
    warning.setAttribute('role', 'alert');
    info.append(warning);
  }
  preview.append(clip, info);
  workspace.append(preview);
}

function pageView(entry) {
  const workspace = dom('div', 'workspace');
  const result = frame(entry, system, true);
  const box = scaled(result);
  const controls = dom('div', 'controls');
  const status = dom('div', 'status');
  const warning = dom('div', '', 'The title doesn’t fit, even at 40px. Shorten it or break it differently.');
  warning.setAttribute('role', 'alert');
  warning.hidden = !result.fit?.overflow;
  const message = dom('div', 'status', notes.get(entry.id) ?? '');
  message.setAttribute('role', 'status');
  message.dataset.note = '';
  status.append(warning, message);
  if (result.title) titleEditor(entry, result, warning);
  cropEditor(entry, result);
  const { uses } = templates[system.template];
  const layout = layoutOf(entry);
  if (uses.theme && layout !== 'image-only') {
    controls.append(segmented('Theme', [['light', 'Light'], ['dark', 'Dark']], entry.theme, theme => edit(entry.id, { theme })));
  }
  const layouts = [['type-only', 'Text'], ...(uses.image ? [['type-and-image', 'Text & Image']] : []), ['image-only', 'Image']];
  const sourcePicker = picker(entry);
  controls.append(segmented('Layout', layouts, !uses.image && layout === 'type-and-image' ? 'type-only' : layout, value => {
    const image = entry.image ?? originalSheets.get(entry.id) ?? (sources[0] && centered(sources[0].src));
    if (value !== 'type-only' && !image) {
      if (!controls.contains(sourcePicker.wrap)) controls.append(sourcePicker.wrap);
      sourcePicker.open();
      return;
    }
    edit(entry.id, { layout: value, image: image ?? null });
  }));
  if (layout !== 'type-only' && (uses.image || layout === 'image-only')) controls.append(sourcePicker.wrap);
  const acceptsImage = uses.image || layout === 'image-only';
  box.ondragover = event => {
    if (!event.dataTransfer.types.includes('Files')) return;
    event.preventDefault();
    box.classList.add('dropping');
  };
  box.ondragleave = event => { if (!box.contains(event.relatedTarget)) box.classList.remove('dropping'); };
  box.ondrop = event => {
    event.preventDefault();
    box.classList.remove('dropping');
    const file = event.dataTransfer.files[0];
    if (!file) return;
    if (file.type.startsWith('video/') || /\.(mp4|m4v|mov|webm)$/i.test(file.name)) updateVideo(entry.id, file);
    else if (acceptsImage && (/^image\/(png|jpeg|webp)$/.test(file.type) || /\.(png|jpe?g|webp)$/i.test(file.name))) upload(entry.id, file);
    else note(entry.id, acceptsImage ? 'Drop a PNG, JPEG or WebP image, or an MP4 video.' : 'Drop an MP4 video.');
  };
  workspace.append(box, controls, status);
  if (saved.has(entry.id)) videoControls(entry.id, controls, workspace);
  else if (layout === 'type-only' && uses.image) {
    const input = fileInput('image/png,image/jpeg,image/webp', 'Image file', file => upload(entry.id, file));
    controls.append(input, button('Upload', () => input.click(), 'quiet'));
  }
  return workspace;
}

function render() {
  const entry = current();
  heading.textContent = entry?.path ?? (view === 'template' ? 'Template' : 'All');
  closePicker();
  resize.disconnect();
  const active = document.activeElement;
  content.replaceChildren(entry ? pageView(entry) : view === 'template' ? templateView() : allView());
  if (entry && active?.matches('[contenteditable]')) {
    const next = content.querySelector('[contenteditable]');
    if (next) {
      next.focus({ preventScroll: true });
      document.getSelection().selectAllChildren(next);
      document.getSelection().collapseToEnd();
    }
  }
  refreshStatus();
}

function stamp(entry, result) {
  const { width, height, version, savedHash } = result;
  const apply = (map) => {
    const prior = map.get(entry.id);
    if (!prior) return map;
    const stamped = { ...prior, width, height, version, savedHash };
    delete stamped.edited;
    return new Map(map).set(entry.id, stamped);
  };
  const latest = entries.get(entry.id);
  if (latest === entry) entries = new Map(entries).set(entry.id, result);
  else entries = apply(entries);
  for (const step of [...undo, ...redo]) {
    step.before.entries = apply(step.before.entries);
    step.after.entries = apply(step.after.entries);
  }
}

async function saveAll() {
  if (batch) return;
  const previously = view;
  const candidates = (current() ? [current()] : [...groupEntries().values()].flat()).filter(entry => status(entry) !== 'Saved');
  if (!candidates.length) return;
  const settings = system;
  batch = { total: candidates.length, index: 0 };
  batchNote = '';
  const errors = [];
  for (const entry of candidates) {
    batch.index++;
    refreshStatus();
    try {
      const png = await capture(entry, settings);
      const result = await api('/save', { entry, png, template: settings.template, color: settings.color });
      saved.set(entry.id, result.entry);
      files[entry.id] = { ...files[entry.id], image: result.bytes };
      stamp(entry, result.entry);
      failures.delete(entry.id);
    } catch (error) {
      failures.set(entry.id, error.message);
      errors.push(error.message);
    }
  }
  batch = null;
  if (errors.length && ['all', 'template'].includes(previously)) {
    batchNote = errors.length + ' of ' + candidates.length + ' couldn’t be saved: ' + errors[0];
  }
  if (current()) refreshStatus();
  else render();
}
saveButton.onclick = saveAll;

try {
  const data = await api('/state');
  ({ files, sources, system } = data);
  if (!Object.hasOwn(templates, system.template)) system.template = 'plate';
  entries = new Map(data.entries.map(entry => [entry.id, entry]));
  for (const entry of data.entries) {
    saved.set(entry.id, entry);
    if (entry.image?.sheet) originalSheets.set(entry.id, entry.image);
  }
  await loadFonts(system);
  render();
} catch (error) {
  content.textContent = 'Could not open Link Previews. ' + error.message;
}
