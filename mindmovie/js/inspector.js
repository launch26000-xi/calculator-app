// Clip/track property panel: bottom sheet on phones, side panel on wide screens.
import { h, icon, toast, prompt, confirmBox, chooseList } from './ui.js';
import { state, on, emit, commit, findTrack, selected, select } from './store.js';
import { TRACK_TYPES, PROPS, propDef } from './model.js';
import { fmt, frameOf, parseTime, timing, val, hzOf, effectivePulse, SAFE_HZ, isSaturatedRed } from './core.js';
import { deleteClip, duplicateClip, splitClip, setTrack, applyPreset, savePreset, deletePreset, deleteTrack, duplicateTrack } from './actions.js';
import * as engine from './engine.js';
import { helpBtn } from './help.js';

let root, body, selfEdit = false, live = [];

export function mountInspector(el) {
  root = el;
  root.classList.add('insp');
  on('select', build);
  on('history', build);
  on('presets', build);
  on('change', () => { if (!selfEdit) build(); });
  on('time', refreshLive);
  on('clip-live', refreshLive);
  on('beats', build);
  build();
}

export function isOpen() { return root && root.classList.contains('open'); }
export function close() { select(state.sel.trackId, null); root.classList.remove('open'); emit('sheet'); }

function edit(fn, merge) {
  selfEdit = true;
  try { commit(fn, { merge }); } finally { selfEdit = false; }
  refreshLive();
}

function fmtVal(def, v) {
  if (v === undefined || v === null || isNaN(v)) return '—';
  if (def.unit === 'dB') return (v <= -60 ? '-∞' : (v > 0 ? '+' : '') + v.toFixed(1)) + ' dB';
  if (def.key === 'pan') return v === 0 ? 'Center' : (v < 0 ? 'L ' : 'R ') + Math.abs(Math.round(v));
  if (def.unit === 'x') return v.toFixed(2) + 'x';
  if (def.unit === 'ms') return Math.round(v) + ' ms · ' + (v / timing.frameMs).toFixed(1) + ' fr';
  const dec = def.step < 1 ? (def.step < 0.1 ? 2 : 1) : 0;
  return v.toFixed(dec) + (def.unit ? ' ' + def.unit : '');
}

function kfAt(clip, key) {
  const list = clip.kf && clip.kf[key];
  if (!list) return -1;
  const tl = state.playhead - clip.start;
  const tol = timing.frameMs / 2 + 0.5;
  return list.findIndex((k) => Math.abs(k.t - tl) <= tol);
}
function inClip(clip) { const tl = state.playhead - clip.start; return tl >= 0 && tl <= clip.dur; }

function setProp(clip, key, v) {
  edit(() => {
    const list = clip.kf && clip.kf[key];
    if (list && list.length && inClip(clip)) {
      const tl = Math.round(state.playhead - clip.start);
      const i = kfAt(clip, key);
      if (i >= 0) list[i].v = v; else { list.push({ t: tl, v, e: 'linear' }); list.sort((a, b) => a.t - b.t); }
    } else clip.props[key] = v;
  }, 'p:' + clip.id + ':' + key);
}

function toggleKf(clip, track, key) {
  if (track.lock) return toast('Track is locked');
  if (!inClip(clip)) { toast('Move the playhead inside this clip first'); return; }
  const i = kfAt(clip, key);
  edit(() => {
    clip.kf = clip.kf || {};
    if (i >= 0) { clip.kf[key].splice(i, 1); if (!clip.kf[key].length) delete clip.kf[key]; }
    else {
      const tl = Math.round(state.playhead - clip.start);
      const v = val(clip, key, tl);
      (clip.kf[key] = clip.kf[key] || []).push({ t: tl, v, e: 'linear' });
      clip.kf[key].sort((a, b) => a.t - b.t);
    }
  });
  if (i < 0 && !track.kfOpen) setTrack(track.id, { kfOpen: true });
  toast(i >= 0 ? 'Keyframe removed' : 'Keyframe set at ' + fmt(state.playhead));
  build();
}

function sliderRow(clip, track, def) {
  const tl = Math.max(0, Math.min(clip.dur, state.playhead - clip.start));
  const cur = () => val(clip, def.key, Math.max(0, Math.min(clip.dur, state.playhead - clip.start)));
  const range = h('input', { type: 'range', min: def.min, max: def.max, step: def.step, value: cur(), 'aria-label': def.label, disabled: track.lock });
  const num = h('input', { type: 'number', class: 'num', min: def.min, max: def.max, step: def.step, value: round(cur(), def.step), 'aria-label': def.label + ' value', inputmode: 'decimal', disabled: track.lock });
  const read = h('output', { class: 'readout' }, fmtVal(def, cur()));
  const hasKf = clip.kf && clip.kf[def.key] && clip.kf[def.key].length;
  const dia = def.kf ? h('button', { class: 'kf-btn' + (kfAt(clip, def.key) >= 0 ? ' at' : hasKf ? ' has' : ''), 'aria-label': 'Keyframe ' + def.label + ' at playhead', title: 'Set / remove keyframe at playhead', onclick: () => toggleKf(clip, track, def.key) }, icon('diamond')) : h('span', { class: 'kf-sp' });
  const apply = (v, fromNum) => {
    if (isNaN(v)) return;
    v = Math.max(def.min, Math.min(def.max, v));
    setProp(clip, def.key, v);
    if (!fromNum) num.value = round(v, def.step);
    range.value = v;
    read.textContent = fmtVal(def, v);
    afterPulseEdit(clip, def.key);
  };
  range.addEventListener('input', () => apply(parseFloat(range.value)));
  num.addEventListener('change', () => apply(parseFloat(num.value), false));
  num.addEventListener('keydown', (e) => { if (e.key === 'Enter') num.blur(); });
  live.push(() => { if (document.activeElement !== num && document.activeElement !== range) { const v = cur(); range.value = v; num.value = round(v, def.step); read.textContent = fmtVal(def, v); } dia.classList && dia.classList.toggle('at', kfAt(clip, def.key) >= 0); });
  void tl;
  return h('div', { class: 'prop', 'data-key': def.key },
    h('div', { class: 'prop-top' }, h('label', {}, def.label), read),
    h('div', { class: 'prop-ctl' }, range, num, dia));
}

function round(v, step) { const d = step < 1 ? (step < 0.1 ? 2 : 1) : 0; return Number(Number(v).toFixed(d)); }

function selectRow(clip, track, def) {
  const sel = h('select', { 'aria-label': def.label, disabled: track.lock, onchange: () => { edit(() => { clip.props[def.key] = sel.value; }); afterPulseEdit(clip, def.key); } },
    def.options.map(([v, l]) => h('option', { value: v, selected: clip.props[def.key] === v }, l)));
  return h('div', { class: 'prop' }, h('div', { class: 'prop-top' }, h('label', {}, def.label)), sel);
}
function boolRow(clip, track, def) {
  const cb = h('input', { type: 'checkbox', checked: !!clip.props[def.key], disabled: track.lock, onchange: () => { edit(() => { clip.props[def.key] = cb.checked; }); build(); } });
  return h('label', { class: 'prop toggle' }, cb, h('span', { class: 'sw' }), h('span', {}, def.label));
}
function colorRow(clip, track, def) {
  const inp = h('input', { type: 'color', value: clip.props[def.key] || '#ffffff', disabled: track.lock });
  const txt = h('output', { class: 'readout' }, inp.value);
  const warn = h('small', { class: 'warn-text hidden' }, 'Saturated red: Safe Mode will soften this color while it flashes.');
  const check = () => warn.classList.toggle('hidden', !(TRACK_TYPES[track.type].pulse && isSaturatedRed(inp.value) && clip.props.wave !== 'sine'));
  inp.addEventListener('input', () => { edit(() => { clip.props[def.key] = inp.value; }, 'c:' + clip.id + def.key); txt.textContent = inp.value; check(); });
  check();
  return h('div', { class: 'prop' }, h('div', { class: 'prop-top' }, h('label', {}, def.label), txt), h('div', { class: 'prop-ctl' }, inp), warn);
}

// ---- pulse / Hz ----
let hzBox = null, hzWarn = null, hzRead = null;
function hzRow(clip, track) {
  hzBox = h('input', { type: 'number', class: 'num wide', min: 0.01, max: 60, step: 0.01, inputmode: 'decimal', 'aria-label': 'Frequency in hertz', disabled: track.lock });
  hzRead = h('output', { class: 'readout' });
  hzWarn = h('div', { class: 'hz-warn' });
  hzBox.addEventListener('change', () => {
    let hz = parseFloat(hzBox.value); if (!(hz > 0)) return;
    const period = 1000 / hz;
    edit(() => {
      let on = clip.props.onMs;
      if (on >= period) on = Math.max(17, period / 2);
      clip.props.onMs = Math.round(on);
      clip.props.offMs = Math.max(0, Math.round(period - clip.props.onMs));
    });
    build();
  });
  updateHz(clip);
  return h('div', { class: 'prop hz' }, h('div', { class: 'prop-top' }, h('label', {}, 'Frequency (flashes per second)'), hzRead), h('div', { class: 'prop-ctl' }, hzBox, h('span', { class: 'unit' }, 'Hz')), hzWarn);
}
function updateHz(clip) {
  if (!hzBox) return;
  const p = clip.props;
  const hz = hzOf(p.onMs, p.offMs);
  const eff = effectivePulse(p, state.safe);
  if (document.activeElement !== hzBox) hzBox.value = hz.toFixed(2);
  hzRead.textContent = `${hz.toFixed(2)} Hz · period ${Math.round(p.onMs + p.offMs)} ms · duty ${Math.round((p.onMs / ((p.onMs + p.offMs) || 1)) * 100)}%`;
  const over = hz > SAFE_HZ && p.wave !== 'sine';
  hzBox.classList.toggle('danger', over);
  hzRead.classList.toggle('danger', over);
  hzWarn.className = 'hz-warn' + (over ? ' show' : '');
  hzWarn.textContent = over ? (state.safe
    ? `⚠ Above the ${SAFE_HZ} flashes-per-second safety cap. Safe Mode will play this at ${eff.effHz.toFixed(2)} Hz (on ${Math.round(eff.on)} ms / off ${Math.round(eff.off)} ms).`
    : `⚠ Safe Mode is OFF. ${hz.toFixed(2)} flashes per second can trigger seizures in people with photosensitive epilepsy.`) : '';
}
function afterPulseEdit(clip, key) {
  if (['onMs', 'offMs', 'wave'].includes(key)) {
    updateHz(clip);
    // keep slider boxes in sync with each other
    for (const k of ['onMs', 'offMs']) {
      const row = body.querySelector(`.prop[data-key="${k}"]`);
      if (row) { const v = clip.props[k]; row.querySelector('input[type=range]').value = v; row.querySelector('.num').value = v; row.querySelector('.readout').textContent = fmtVal(propDef(findTrack(state.sel.trackId).type, k), v); }
    }
  }
}

// ---- follow pattern ----
function followSection(clip, track) {
  const p = state.project;
  const targets = p.tracks.filter((t) => t.id !== track.id && (t.type === 'music' || t.type === 'voice' || TRACK_TYPES[t.type].pulse));
  const f = clip.follow || {};
  const tSel = h('select', { 'aria-label': 'Follow track', disabled: track.lock }, h('option', { value: '' }, 'Off — use my own on/off timing'), targets.map((t) => h('option', { value: t.id, selected: f.trackId === t.id }, `${TRACK_TYPES[t.type].icon} ${t.name}`)));
  const target = f.trackId && findTrack(f.trackId);
  const isAudio = target && TRACK_TYPES[target.type].kind === 'audio';
  const mSel = h('select', { 'aria-label': 'Follow mode', disabled: !isAudio || track.lock },
    h('option', { value: 'beat', selected: f.mode !== 'tempo' }, 'Flash on every detected beat'),
    h('option', { value: 'tempo', selected: f.mode === 'tempo' }, 'Match the tempo (steady beat grid)'));
  const offDef = { key: 'offset', label: 'Offset', min: -2000, max: 2000, step: 1, unit: 'ms' };
  const offR = h('input', { type: 'range', min: -2000, max: 2000, step: 1, value: f.offset || 0, disabled: !target || track.lock, 'aria-label': 'Follow offset' });
  const offN = h('input', { type: 'number', class: 'num', min: -2000, max: 2000, step: 1, value: f.offset || 0, disabled: !target || track.lock, 'aria-label': 'Follow offset value' });
  const offRead = h('output', { class: 'readout' }, fmtVal(offDef, f.offset || 0));
  const setOff = (v) => { v = Math.max(-2000, Math.min(2000, Math.round(v))); edit(() => { clip.follow.offset = v; }, 'fo' + clip.id); offR.value = v; offN.value = v; offRead.textContent = fmtVal(offDef, v); };
  offR.addEventListener('input', () => setOff(+offR.value));
  offN.addEventListener('change', () => setOff(+offN.value));
  tSel.addEventListener('change', () => {
    edit(() => { clip.follow = tSel.value ? { trackId: tSel.value, mode: 'beat', offset: 0 } : null; });
    const tt = tSel.value && findTrack(tSel.value);
    if (tt && TRACK_TYPES[tt.type].kind === 'audio') { for (const c of tt.clips) if (c.mediaId) engine.analyzeBeats(c.mediaId).then(() => build()).catch(() => toast('Could not analyze that audio')); toast('Detecting beats…'); }
    build();
  });
  mSel.addEventListener('change', () => { edit(() => { clip.follow.mode = mSel.value; }); build(); });
  let status = '';
  if (isAudio) {
    const mc = target.clips.find((c) => c.mediaId);
    const info = mc && engine.beatInfo(mc.mediaId);
    status = !mc ? 'That track has no audio clips yet.' : info ? `Detected ${info.bpm} BPM, ${info.beats.length} beats.` : 'Detecting beats…';
  } else if (target) status = 'Copies the on/off timing and waveform of “' + target.name + '”.';
  return h('div', { class: 'group' }, h('h3', {}, icon('link'), ' Follow pattern ', helpBtn('pulse')),
    h('p', { class: 'muted small' }, 'Link this clip’s pulse to another track — for example, flash on the beat of the music.'),
    h('div', { class: 'prop' }, h('label', {}, 'Follow track'), tSel),
    isAudio ? h('div', { class: 'prop' }, h('label', {}, 'Mode'), mSel) : null,
    target ? h('div', { class: 'prop' }, h('div', { class: 'prop-top' }, h('label', {}, 'Offset'), offRead), h('div', { class: 'prop-ctl' }, offR, offN, h('span', { class: 'kf-sp' }))) : null,
    status ? h('p', { class: 'muted small follow-status' }, status) : null);
}

// ---- presets ----
function presetSection(clip, track) {
  const list = state.presets.filter((p) => p.type === track.type);
  const sel = h('select', { 'aria-label': 'Preset', disabled: track.lock }, h('option', { value: '' }, list.length ? 'Choose a preset to apply…' : 'No presets for this type yet'), list.map((p) => h('option', { value: p.id }, p.name + (p.starter ? '' : ' (mine)'))));
  sel.addEventListener('change', () => { const p = list.find((x) => x.id === sel.value); if (!p) return; applyPreset(clip.id, p); toast('Applied “' + p.name + '” (Undo to go back)'); });
  return h('div', { class: 'group' }, h('h3', {}, icon('star'), ' Presets ', helpBtn('sliders')),
    h('div', { class: 'row' }, sel),
    h('div', { class: 'row' },
      h('button', { class: 'btn sm', onclick: async () => { const n = await prompt('Name this preset', TRACK_TYPES[track.type].short + ' preset'); if (n && n.trim()) { await savePreset(n.trim(), clip, track.type); toast('Preset saved'); } } }, icon('save'), ' Save my settings as a preset'),
      h('button', { class: 'btn sm ghost', onclick: async () => {
        const mine = state.presets.filter((p) => !p.starter);
        if (!mine.length) return toast('You have no saved presets yet');
        const id = await chooseList('Delete one of my presets', mine.map((p) => ({ value: p.id, label: p.name, desc: TRACK_TYPES[p.type].label })));
        if (id && await confirmBox('Delete preset?', mine.find((p) => p.id === id).name, 'Delete', true)) { await deletePreset(id); toast('Preset deleted'); }
      } }, 'Manage')));
}

// ---- timing ----
function timeField(label, getMs, setMs, track) {
  const inp = h('input', { type: 'text', class: 'time', value: fmt(getMs()), 'aria-label': label + ' (mm:ss.mmm)', inputmode: 'text', disabled: track.lock });
  const fr = h('input', { type: 'number', class: 'num frame', min: 0, step: 1, value: frameOf(getMs()), 'aria-label': label + ' frame number', disabled: track.lock });
  inp.addEventListener('change', () => { const v = parseTime(inp.value); if (isNaN(v)) { inp.value = fmt(getMs()); return toast('Type time as mm:ss.mmm, e.g. 00:04.250'); } setMs(v); });
  inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') inp.blur(); });
  fr.addEventListener('change', () => { const f = parseInt(fr.value, 10); if (!isNaN(f)) setMs(Math.round((f * 1000) / timing.hz)); });
  const nudge = (d) => setMs(getMs() + d * timing.frameMs);
  live.push(() => { if (document.activeElement !== inp) inp.value = fmt(getMs()); if (document.activeElement !== fr) fr.value = frameOf(getMs()); });
  return h('div', { class: 'tfield' }, h('label', {}, label),
    h('div', { class: 'row tight' }, h('button', { class: 'btn sm ghost', 'aria-label': label + ' minus one frame', disabled: track.lock, onclick: () => nudge(-1) }, '−1f'), inp,
      h('button', { class: 'btn sm ghost', 'aria-label': label + ' plus one frame', disabled: track.lock, onclick: () => nudge(1) }, '+1f')),
    h('div', { class: 'row tight fr-row' }, h('span', { class: 'muted small' }, 'frame'), fr, h('span', { class: 'muted small' }, '@ ' + timing.hz + ' Hz')));
}

function timingSection(clip, track) {
  const minDur = Math.max(1, Math.round(timing.frameMs));
  const setStart = (v) => edit(() => { clip.start = Math.max(0, Math.round(v)); });
  const setEnd = (v) => edit(() => { clip.dur = Math.max(minDur, Math.round(v - clip.start)); });
  const setDur = (v) => edit(() => { clip.dur = Math.max(minDur, Math.round(v)); });
  return h('div', { class: 'group' }, h('h3', {}, icon('clock'), ' Timing ', helpBtn('timeline')),
    h('div', { class: 'tgrid' },
      timeField('Start', () => clip.start, setStart, track),
      timeField('End', () => clip.start + clip.dur, setEnd, track),
      timeField('Duration', () => clip.dur, setDur, track)),
    clip.mediaId ? timeField('Source in-point (trim)', () => clip.srcIn || 0, (v) => edit(() => { clip.srcIn = Math.max(0, Math.round(v)); }), track) : null);
}

function textSection(clip, track) {
  const ta = h('textarea', { rows: track.type === 'scroll' ? 4 : 2, placeholder: track.type === 'text' ? 'Type your words…' : 'Leave empty to cycle through all your affirmations' + (track.type === 'scroll' ? ' (one per line)' : ''), disabled: track.lock });
  ta.value = clip.text || '';
  ta.addEventListener('input', () => edit(() => { clip.text = ta.value; }, 'tx' + clip.id));
  const pick = h('button', { class: 'btn sm', onclick: async () => {
    const a = await chooseList('Use an affirmation', state.project.affirmations.map((x) => ({ value: x.text, label: x.text })));
    if (a) { ta.value = a; edit(() => { clip.text = a; }); }
  } }, 'Use an affirmation');
  return h('div', { class: 'group' }, h('h3', {}, 'Words'), ta, h('div', { class: 'row' }, pick));
}

const GROUPS = {
  playback: ['speed', 'fit'],
  look: ['opacity', 'fadeIn', 'fadeOut', 'rotation', 'rotSpeed', 'scale', 'x', 'y', 'blur', 'brightness', 'contrast', 'hue', 'ccolor', 'blend'],
  text: ['font', 'fontSize', 'color', 'letterSpacing', 'outline', 'outlineColor', 'glow', 'glowColor', 'scrollSpeed', 'direction', 'gap'],
  pattern: ['patternType', 'pcolor', 'pcolor2', 'density', 'lineWidth', 'pulseOn'],
  pulse: ['onMs', 'offMs', 'hz', 'repeat', 'wave', 'mask', 'maskMs', 'maskType'],
  audio: ['volume', 'pan', 'pitch', 'loop', 'copies', 'copyOffset', 'spread', 'baseHz', 'beatHz'],
};
const GROUP_TITLES = { playback: 'Speed', look: 'Look', text: 'Text style', pattern: 'Pattern', pulse: 'Pattern & frequency', audio: 'Sound' };

function propRow(clip, track, def) {
  if (def.type === 'select') return selectRow(clip, track, def);
  if (def.type === 'bool') return boolRow(clip, track, def);
  if (def.type === 'color') return colorRow(clip, track, def);
  if (def.type === 'hz') return hzRow(clip, track);
  return sliderRow(clip, track, def);
}

function clipPanel(track, clip) {
  const type = TRACK_TYPES[track.type];
  const defs = PROPS[track.type];
  const sections = [];
  sections.push(timingSection(clip, track));
  if (['text', 'flash', 'scroll'].includes(track.type)) sections.push(textSection(clip, track));
  for (const [g, keys] of Object.entries(GROUPS)) {
    let rows = keys.map((k) => defs.find((d) => d.key === k)).filter(Boolean);
    if (track.type === 'pattern' && g === 'pulse' && !clip.props.pulseOn) rows = [];
    if (!rows.length) continue;
    const extra = [];
    if (g === 'audio' && track.type === 'binaural') {
      extra.push(h('div', { class: 'row chips' }, [4, 6, 10].map((hz) => h('button', { class: 'chip' + (clip.props.beatHz === hz ? ' on' : ''), disabled: track.lock, onclick: () => { edit(() => { clip.props.beatHz = hz; }); build(); } }, hz + ' Hz' + (hz === 4 ? ' theta/delta' : hz === 6 ? ' theta' : ' alpha'))), h('span', { class: 'muted small' }, 'or set a custom beat below')));
      extra.push(h('p', { class: 'warn-text' }, '🎧 Use headphones. Do not listen while driving or operating machinery.'));
    }
    if (g === 'audio' && (track.type === 'voice' || track.type === 'music' || track.type === 'video') && !('preservesPitch' in HTMLMediaElement.prototype)) extra.push(h('p', { class: 'muted small' }, 'Pitch-preserve is not supported on this browser.'));
    if (g === 'pulse' && track.type === 'flash') extra.push(h('p', { class: 'muted small' }, `Minimum flash is 17 ms (one frame at 60 Hz). Your screen runs at ${timing.hz} Hz, so one frame is ${timing.frameMs.toFixed(1)} ms; flashes are shown on whole frames.`));
    sections.push(h('div', { class: 'group' }, h('h3', {}, g === 'look' && type.kind === 'audio' ? 'Fades' : GROUP_TITLES[g], ' ', helpBtn({ pulse: 'pulse', pattern: 'layers', audio: 'layers' }[g] || 'sliders')), extra, rows.map((d) => propRow(clip, track, d))));
  }
  if (type.pulse) sections.push(followSection(clip, track));
  sections.push(presetSection(clip, track));
  const media = clip.mediaId && state.media.get(clip.mediaId);
  return [
    h('div', { class: 'insp-head' },
      h('span', { class: 'th-type', style: { color: track.color } }, type.icon),
      h('div', { class: 'ih-title' }, h('strong', {}, type.label + ' clip'), h('small', {}, track.name + (media ? ' · ' + media.name : '') + (track.lock ? ' · locked' : ''))),
      h('button', { class: 'icon-btn', 'aria-label': 'Close properties', onclick: close }, icon('close'))),
    h('div', { class: 'row clip-actions' },
      h('button', { class: 'btn sm', onclick: () => engine.seek(clip.start) }, '⇤ Go to start'),
      h('button', { class: 'btn sm', disabled: track.lock, onclick: () => { if (!splitClip(clip.id, state.playhead)) toast('Put the playhead inside the clip to split it'); else toast('Split at ' + fmt(state.playhead)); } }, icon('scissors'), ' Split'),
      h('button', { class: 'btn sm', disabled: track.lock, onclick: () => duplicateClip(clip.id) }, icon('copy'), ' Duplicate'),
      h('button', { class: 'btn sm danger', disabled: track.lock, onclick: () => deleteClip(clip.id) }, icon('trash'), ' Delete')),
    ...sections,
  ];
}

function trackPanel(track) {
  const type = TRACK_TYPES[track.type];
  const name = h('input', { type: 'text', value: track.name, 'aria-label': 'Track name' });
  name.addEventListener('change', () => { if (name.value.trim()) setTrack(track.id, { name: name.value.trim() }); });
  const color = h('input', { type: 'color', value: track.color, 'aria-label': 'Track color' });
  color.addEventListener('input', () => setTrack(track.id, { color: color.value }, 'tc' + track.id));
  const tog = (label, key) => { const cb = h('input', { type: 'checkbox', checked: track[key], onchange: () => setTrack(track.id, { [key]: cb.checked }) }); return h('label', { class: 'prop toggle' }, cb, h('span', { class: 'sw' }), h('span', {}, label)); };
  return [
    h('div', { class: 'insp-head' }, h('span', { class: 'th-type', style: { color: track.color } }, type.icon),
      h('div', { class: 'ih-title' }, h('strong', {}, type.label + ' track'), h('small', {}, track.clips.length + ' clip(s). Tap a clip to edit it.')),
      h('button', { class: 'icon-btn', 'aria-label': 'Close', onclick: () => { select(null, null); root.classList.remove('open'); emit('sheet'); } }, icon('close'))),
    h('div', { class: 'group' },
      h('div', { class: 'prop' }, h('label', {}, 'Name'), name),
      h('div', { class: 'prop' }, h('label', {}, 'Color tag'), color),
      tog('Mute', 'mute'), tog('Solo', 'solo'), tog('Lock (no edits)', 'lock'), tog('Hide (not drawn)', 'hidden'), tog('Show keyframe lanes', 'kfOpen'),
      h('div', { class: 'row' },
        h('button', { class: 'btn sm primary', disabled: track.lock, onclick: () => emit('add-to-track', track) }, icon('plus'), ' Add clip at playhead'),
        h('button', { class: 'btn sm', onclick: () => duplicateTrack(track.id) }, icon('copy'), ' Duplicate'),
        h('button', { class: 'btn sm danger', onclick: async () => { if (await confirmBox('Delete track?', track.name, 'Delete', true)) deleteTrack(track.id); } }, icon('trash'), ' Delete'))),
  ];
}

function build() {
  if (!root || !state.project) return;
  live = []; hzBox = null;
  const sc = body ? body.scrollTop : 0;
  const f = selected();
  const track = state.sel.trackId && findTrack(state.sel.trackId);
  let kids;
  if (f) kids = clipPanel(f.track, f.clip);
  else if (track) kids = trackPanel(track);
  else kids = [h('div', { class: 'insp-empty' }, h('p', {}, 'Tap a clip on the timeline to see its sliders here.'), h('p', { class: 'muted small' }, 'Every slider has a live readout, a number box you can type into, and a ◇ keyframe button.'))];
  const handle = h('button', { class: 'sheet-handle', 'aria-label': 'Expand or shrink the panel', onclick: () => root.classList.toggle('full') }, h('i'));
  body = h('div', { class: 'insp-body' }, kids);
  root.replaceChildren(handle, body);
  body.scrollTop = sc;
  const open = !!(f || track);
  root.classList.toggle('open', open);
  emit('sheet');
}

function refreshLive() {
  for (const fn of live) { try { fn(); } catch (e) { /* stale */ } }
  const f = selected();
  if (f && hzBox) updateHz(f.clip);
}
export function rebuild() { build(); }
