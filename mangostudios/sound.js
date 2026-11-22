function createMangoAudio() {
  const clips = `
    back_001 back_002 back_003 back_004
    bong_001
    click_001 click_002 click_003 click_004 click_005
    close_001 close_002 close_003 close_004
    confirmation_001 confirmation_002 confirmation_003 confirmation_004
    drop_001 drop_002 drop_003 drop_004
    error_001 error_002 error_003 error_004 error_005 error_006 error_007 error_008
    glass_001 glass_002 glass_003 glass_004 glass_005 glass_006
    glitch_001 glitch_002 glitch_003 glitch_004
    maximize_001 maximize_002 maximize_003 maximize_004 maximize_005 maximize_006 maximize_007 maximize_008 maximize_009
    minimize_001 minimize_002 minimize_003 minimize_004 minimize_005 minimize_006 minimize_007 minimize_008 minimize_009
    open_001 open_002 open_003 open_004
    pluck_001 pluck_002
    question_001 question_002 question_003 question_004
    scratch_001 scratch_002 scratch_003 scratch_004 scratch_005
    scroll_001 scroll_002 scroll_003 scroll_004 scroll_005
    select_001 select_002 select_003 select_004 select_005 select_006 select_007 select_008
    switch_001 switch_002 switch_003 switch_004 switch_005 switch_006 switch_007
    tick_001 tick_002 tick_004
    toggle_001 toggle_002 toggle_003 toggle_004
  `.trim().split(/\s+/);

  // Volumes are percentages. Minimum intervals keep a ripple or a long drag from chattering.
  const cues = {
    press:       { clip: 'bong_001',     volume: 20, interval: 45 },
    drag:        { clip: 'maximize_006', volume: 7,  interval: 190 },
    release:     { clip: 'bong_001',     volume: 20, interval: 60 },
    bounce:      { clip: 'glass_001',    volume: 2,  interval: 170 },
    collision:   { clip: 'bong_001',     volume: 10, interval: 100 },
    brush:       { clip: 'bong_001',     volume: 26, interval: 140 },
    colorChange: { clip: 'maximize_008', volume: 85, interval: 60 }
  };
  const storageKey = 'mango-studios-audio-v1';
  const defaultVolume = 77;
  let mix;
  let context;
  let master;
  let previewId = 0;
  let audition;
  const buffers = new Map();
  const lastPlayed = new Map();
  const voices = new Map();

  function updateMaster() {
    if (master) master.gain.value = mix.mute ? 0 : mix.masterVolume / 100;
  }

  // The standalone page reads the same saved DialKit mix without mounting its UI.
  function readMix() {
    let values;
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey));
      if (saved?.version === 1) values = saved.values;
    } catch { /* Storage may be disabled. */ }
    const volume = (value, fallback) => Number.isFinite(value) ? Math.max(0, Math.min(100, value)) : fallback;
    mix = { mute: values?.mute === true, masterVolume: volume(values?.masterVolume, defaultVolume) };
    for (const [name, cue] of Object.entries(cues)) {
      const clip = values?.[name + '.clip'];
      mix[name] = {
        clip: clip === 'off' || clips.includes(clip) ? clip : cue.clip,
        volume: volume(values?.[name + '.volume'], cue.volume)
      };
    }
    updateMaster();
  }
  readMix();
  window.addEventListener('storage', event => {
    if (event.key === storageKey || event.key === null) readMix();
  });

  function unlock() {
    if (!context) {
      const Audio = window.AudioContext || window.webkitAudioContext;
      if (!Audio) return;
      context = new Audio();
      master = context.createGain();
      master.connect(context.destination);
      updateMaster();
    }
    if (context.state !== 'running') context.resume().catch(() => {});
  }
  for (const type of ['pointerdown', 'pointerup', 'keydown', 'click']) {
    window.addEventListener(type, unlock, { capture: true, passive: true });
  }

  function load(clip) {
    if (!buffers.has(clip)) {
      const url = new URL('./sounds/' + clip + '.wav', document.baseURI);
      const buffer = fetch(url).then(response => {
        if (!response.ok) throw new Error('Missing sound: ' + clip);
        return response.arrayBuffer();
      }).then(bytes => context.decodeAudioData(bytes)).catch(error => {
        buffers.delete(clip);
        throw error;
      });
      buffers.set(clip, buffer);
    }
    return buffers.get(clip);
  }

  async function play(name, strength = 1, preview = false) {
    const { clip, volume } = mix[name];
    const now = performance.now();
    if (preview) {
      previewId++;
      audition?.stop();
      audition = null;
    }
    if (!context || mix.mute || !volume || !mix.masterVolume || clip === 'off') return;
    if (!preview && now - (lastPlayed.get(name) ?? -Infinity) < cues[name].interval) return;
    lastPlayed.set(name, now);
    const ticket = previewId;
    let buffer;
    try { buffer = await load(clip); }
    catch { return; }
    if (mix.mute || mix[name].clip !== clip || document.hidden) return;
    if (preview && ticket !== previewId) return;
    if (!preview) {
      if (performance.now() - now > 900 || voices.size >= 5) return;
      if (name === 'drag' && [...voices.values()].includes(name)) return;
    }
    // A suspended mobile context can queue the initial press until touch-up.
    if (context.state !== 'running' && !preview && name !== 'press') return;
    const source = context.createBufferSource();
    const gain = context.createGain();
    gain.gain.value = strength * mix[name].volume / 100;
    source.buffer = buffer;
    source.connect(gain).connect(master);
    voices.set(source, name);
    if (preview) audition = source;
    source.onended = () => {
      voices.delete(source);
      if (audition === source) audition = null;
      source.disconnect();
      gain.disconnect();
    };
    source.start();
  }

  function mountTuner(createDialKit) {
    const options = [{ label: 'None', value: 'off' }, ...clips.map(clip => ({
      label: clip[0].toUpperCase() + clip.slice(1).replace('_', ' '), value: clip
    }))];
    const config = { mute: false, masterVolume: [defaultVolume, 0, 100, 1] };
    for (const [name, cue] of Object.entries(cues)) {
      config[name] = {
        _collapsed: name !== 'press',
        clip: { type: 'select', options, default: cue.clip },
        volume: [cue.volume, 0, 100, 1],
        preview: { type: 'action', label: 'Preview sound' }
      };
    }
    config.restoreDefaults = { type: 'action' };
    const kit = createDialKit('Mango Sounds', config, {
      id: storageKey, persist: { key: storageKey },
      onAction(action) {
        if (action === 'restoreDefaults') kit.resetValues();
        else if (action.endsWith('.preview')) play(action.split('.')[0], 1, true);
      }
    });
    kit.subscribe(values => {
      const previous = mix;
      mix = values;
      updateMaster();
      const changed = Object.keys(cues).filter(key => previous[key].clip !== mix[key].clip);
      if (changed.length === 1) play(changed[0], 1, true);
    });
  }
  return { play, mountTuner };
}
