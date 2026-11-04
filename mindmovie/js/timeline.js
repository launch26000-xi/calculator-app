// Multi-track timeline: ruler, tracks, clips (move / trim / cross-track), pinch-zoom, reorder, keyframe lanes.
import { h, icon, prompt, confirmBox, dialog, chooseList } from './ui.js';
import { state, on, emit, commit, select, findTrack, snapT } from './store.js';
import { TRACK_TYPES, propDef, PROPS } from './model.js';
import { fmt, frameOf, timing, kfValue } from './core.js';
import * as engine from './engine.js';
import { moveTrack, duplicateTrack, deleteTrack, setTrack, addClip } from './actions.js';

const TRACK_H = 58, KF_H = 44;
let root, scroller, content, rulerCv, playheadEl, cornerTime;
let renderQueued = false;
let dragging = false;
let touchTarget = null;
let gesture = false; // while a pinch is active, keep old DOM attached so touch events keep flowing

const HW = () => (window.innerWidth >= 900 ? 210 : 136);
const minZoom = () => 2;
const maxZoom = () => 80 * timing.hz; // one frame = 80 px
const msToX = (ms) => (ms / 1000) * state.zoom;
const xToMs = (x) => (x / state.zoom) * 1000;

export function mountTimeline(el) {
  root = el;
  root.classList.add('tl');
  scroller = h('div', { class: 'tl-scroll' });
  root.append(scroller);
  on('change', queueRender);
  on('project', () => { fitZoom(); queueRender(); });
  on('select', updateSelection);
  on('time', updatePlayhead);
  on('beats', queueRender);
  scroller.addEventListener('scroll', () => drawRuler(), { passive: true });
  window.addEventListener('resize', queueRender);
  setupPinch();
  scroller.addEventListener('wheel', (e) => {
    if (e.ctrlKey || e.metaKey) { e.preventDefault(); zoomAround(state.zoom * Math.exp(-e.deltaY * 0.01), e.clientX); }
  }, { passive: false });
  fitZoom();
  render();
}

export function fitZoom() {
  if (!scroller || !state.project) return;
  const w = (scroller.clientWidth || window.innerWidth) - HW() - 20;
  const dur = Math.max(10000, state.project.duration + 2000);
  state.zoom = Math.max(minZoom(), Math.min(maxZoom(), (w / dur) * 1000));
  emit('zoom');
}
export function setZoom(z, anchorClientX) { zoomAround(z, anchorClientX); }
function zoomAround(z, clientX) {
  z = Math.max(minZoom(), Math.min(maxZoom(), z));
  const rect = scroller.getBoundingClientRect();
  const px = clientX !== undefined ? clientX - rect.left - HW() : (msToX(state.playhead) - scroller.scrollLeft);
  const tAnchor = xToMs(scroller.scrollLeft + px);
  state.zoom = z;
  render();
  scroller.scrollLeft = Math.max(0, msToX(tAnchor) - px);
  drawRuler();
  emit('zoom');
}

function setupPinch() {
  let d0 = 0, z0 = 0, mid = 0;
  const dist = (t) => Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);
  scroller.addEventListener('touchstart', (e) => {
    if (e.touches.length === 2) { d0 = dist(e.touches); z0 = state.zoom; mid = (e.touches[0].clientX + e.touches[1].clientX) / 2; gesture = true; touchTarget = e.target; }
  }, { passive: true });
  scroller.addEventListener('touchmove', (e) => {
    if (e.touches.length === 2 && d0) {
      e.preventDefault();
      zoomAround(z0 * (dist(e.touches) / d0), mid);
    }
  }, { passive: false });
  const endPinch = (e) => {
    if (e.touches.length >= 2) return;
    d0 = 0;
    if (gesture) { gesture = false; touchTarget = null; scroller.querySelectorAll('.tl-content.stale').forEach((n) => n.remove()); }
  };
  scroller.addEventListener('touchend', endPinch);
  scroller.addEventListener('touchcancel', endPinch);
}

function queueRender() {
  if (renderQueued || dragging) return;
  renderQueued = true;
  requestAnimationFrame(() => { renderQueued = false; if (!dragging) render(); });
}

function contentWidth() {
  const dur = Math.max(state.project.duration + 10000, xToMs(scroller.clientWidth || 800) + 1000);
  return Math.ceil(msToX(dur));
}

function kfKeys(track) {
  const keys = new Set();
  for (const c of track.clips) for (const [k, list] of Object.entries(c.kf || {})) if (list.length) keys.add(k);
  return [...keys];
}

export function render() {
  if (!scroller || !state.project) return;
  const p = state.project;
  const hw = HW();
  const cw = contentWidth();
  const sl = scroller.scrollLeft, st = scroller.scrollTop;
  root.style.setProperty('--hw', hw + 'px');
  cornerTime = h('div', { class: 'tl-corner-time' });
  rulerCv = h('canvas', { class: 'tl-ruler-cv', height: 28 });
  rulerCv.addEventListener('pointerdown', rulerScrub);
  const ruler = h('div', { class: 'tl-ruler', style: { width: hw + cw + 'px' } },
    h('div', { class: 'tl-corner' }, cornerTime), rulerCv);
  const rows = [];
  p.tracks.forEach((t, i) => {
    rows.push(trackRow(t, i, cw));
    if (t.kfOpen) {
      const keys = kfKeys(t);
      if (!keys.length) rows.push(h('div', { class: 'tl-row kf-row', style: { height: KF_H + 'px' } }, h('div', { class: 'tl-head kf-head' }, h('small', {}, 'No keyframes yet')), h('div', { class: 'tl-lane kf-lane', style: { width: cw + 'px' } }, h('span', { class: 'kf-empty' }, 'Select a clip, then tap ◇ next to any slider to set a keyframe at the playhead.'))));
      for (const k of keys) rows.push(kfRow(t, k, cw));
    }
  });
  if (!p.tracks.length) {
    rows.push(h('div', { class: 'tl-empty' }, h('p', {}, 'No tracks yet.'), h('p', { class: 'muted' }, 'Tap “+ Track” above, or add photos, voice, music and affirmations from the Library tab.')));
  }
  playheadEl = h('div', { class: 'tl-playhead' }, h('i'));
  content = h('div', { class: 'tl-content', style: { width: hw + cw + 'px' } }, ruler, h('div', { class: 'tl-tracks' }, rows), playheadEl);
  if (gesture) {
    // hide (don't detach) the old content so the finger's touch target stays in the document
    for (const old of scroller.children) if (!old.classList.contains('stale')) { old.classList.add('stale'); old.style.display = 'none'; }
    scroller.querySelectorAll('.tl-content.stale').forEach((n) => { if (!n.contains(touchTarget)) n.remove(); });
    scroller.append(content);
  } else scroller.replaceChildren(content);
  scroller.scrollLeft = sl; scroller.scrollTop = st;
  drawRuler();
  updatePlayhead();
  updateSelection();
}

// ---------- ruler ----------
const STEPS = [1, 10, 50, 100, 250, 500, 1000, 2000, 5000, 10000, 30000, 60000, 120000, 300000];
function drawRuler() {
  if (!rulerCv) return;
  const hw = HW();
  const w = Math.max(10, scroller.clientWidth - hw);
  const dpr = window.devicePixelRatio || 1;
  if (rulerCv.width !== Math.round(w * dpr)) { rulerCv.width = Math.round(w * dpr); rulerCv.height = 28 * dpr; rulerCv.style.width = w + 'px'; rulerCv.style.height = '28px'; }
  const ctx = rulerCv.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, 28);
  const frameMs = timing.frameMs;
  const steps = [frameMs, ...STEPS.filter((s) => s > frameMs)];
  const major = steps.find((s) => msToX(s) >= 90) || 300000;
  const minor = [...steps].reverse().find((s) => s < major && msToX(s) >= 10) || major;
  const t0 = xToMs(scroller.scrollLeft), t1 = t0 + xToMs(w);
  ctx.strokeStyle = 'rgba(232,194,106,.35)'; ctx.fillStyle = '#c9cdf2'; ctx.font = '11px system-ui, sans-serif'; ctx.textBaseline = 'top';
  ctx.beginPath();
  for (let t = Math.floor(t0 / minor) * minor; t <= t1; t += minor) {
    const x = Math.round(msToX(t) - scroller.scrollLeft) + 0.5;
    const isMajor = Math.abs(t / major - Math.round(t / major)) < 1e-6;
    ctx.moveTo(x, isMajor ? 12 : 20); ctx.lineTo(x, 28);
  }
  ctx.stroke();
  for (let t = Math.floor(t0 / major) * major; t <= t1; t += major) {
    const x = msToX(t) - scroller.scrollLeft;
    let label;
    if (major < 1000) label = major <= frameMs + 0.01 ? 'f' + frameOf(t + 0.01) : fmt(t).slice(3);
    else label = fmt(t).slice(0, 5);
    ctx.fillText(label, x + 3, 1);
  }
  if (cornerTime) cornerTime.textContent = fmt(state.playhead);
}

function rulerScrub(e) {
  e.preventDefault();
  const r = rulerCv.getBoundingClientRect();
  const go = (ev) => engine.seek(snapT(xToMs(ev.clientX - r.left + scroller.scrollLeft)));
  go(e);
  rulerCv.setPointerCapture(e.pointerId);
  const mv = (ev) => go(ev);
  const up = () => { rulerCv.removeEventListener('pointermove', mv); rulerCv.removeEventListener('pointerup', up); rulerCv.removeEventListener('pointercancel', up); };
  rulerCv.addEventListener('pointermove', mv); rulerCv.addEventListener('pointerup', up); rulerCv.addEventListener('pointercancel', up);
}

function updatePlayhead() {
  if (!playheadEl) return;
  const x = HW() + msToX(state.playhead);
  playheadEl.style.transform = `translateX(${x}px)`;
  if (cornerTime) cornerTime.textContent = fmt(state.playhead);
  if (state.playing) {
    const vx = msToX(state.playhead) - scroller.scrollLeft;
    const w = scroller.clientWidth - HW();
    if (vx > w * 0.85 || vx < 0) { scroller.scrollLeft = Math.max(0, msToX(state.playhead) - w * 0.15); drawRuler(); }
  }
}

function updateSelection() {
  if (!content) return;
  content.querySelectorAll('.clip.sel').forEach((c) => c.classList.remove('sel'));
  content.querySelectorAll('.tl-row.sel').forEach((c) => c.classList.remove('sel'));
  if (state.sel.clipId) content.querySelector(`.clip[data-id="${state.sel.clipId}"]`)?.classList.add('sel');
  if (state.sel.trackId) content.querySelector(`.tl-row[data-track="${state.sel.trackId}"]`)?.classList.add('sel');
}

// ---------- tracks ----------
function tbtn(label, ic, active, onclick, cls = '') {
  return h('button', { class: 'tb ' + cls + (active ? ' on' : ''), 'aria-label': label, 'aria-pressed': String(!!active), title: label, onclick: (e) => { e.stopPropagation(); onclick(); } }, typeof ic === 'string' && ic.length <= 2 ? ic : icon(ic));
}

function trackRow(t, index, cw) {
  const type = TRACK_TYPES[t.type];
  const isAudio = type.kind === 'audio';
  const grip = h('span', { class: 'grip', title: 'Drag to change layer order', 'aria-label': 'Drag to reorder track' }, icon('grip'));
  grip.addEventListener('pointerdown', (e) => reorderStart(e, t, index));
  const head = h('div', { class: 'tl-head', style: { '--tc': t.color } , onclick: () => select(t.id, null) },
    h('div', { class: 'th-top' }, grip,
      h('span', { class: 'th-type', title: type.label }, type.icon),
      h('button', { class: 'th-name', title: 'Rename track', onclick: async (e) => { e.stopPropagation(); const n = await prompt('Rename track', t.name); if (n && n.trim()) setTrack(t.id, { name: n.trim() }); } }, t.name)),
    h('div', { class: 'th-btns' },
      tbtn(t.mute ? 'Unmute track' : 'Mute track', t.mute ? 'mute' : 'speaker', t.mute, () => setTrack(t.id, { mute: !t.mute }), isAudio || t.type === 'video' ? '' : 'dim'),
      tbtn(t.solo ? 'Unsolo track' : 'Solo track', 'S', t.solo, () => setTrack(t.id, { solo: !t.solo }), 'solo'),
      tbtn(t.lock ? 'Unlock track' : 'Lock track', t.lock ? 'lock' : 'unlock', t.lock, () => setTrack(t.id, { lock: !t.lock })),
      tbtn(t.hidden ? 'Show track' : 'Hide track', t.hidden ? 'eyeoff' : 'eye', t.hidden, () => setTrack(t.id, { hidden: !t.hidden }), isAudio ? 'dim' : ''),
      tbtn('Keyframe lanes', 'diamond', t.kfOpen, () => setTrack(t.id, { kfOpen: !t.kfOpen })),
      tbtn('Track menu', 'dots', false, () => trackMenu(t))));
  const lane = h('div', { class: 'tl-lane', style: { width: cw + 'px' } });
  lane.addEventListener('pointerdown', (e) => laneTap(e, t));
  // grid lines for snapping visual
  for (const c of t.clips) lane.append(clipEl(t, c));
  // beat ticks for analysed music
  if (t.type === 'music') {
    const info = engine.getBeats(t, { start: 0 });
    if (info && msToX(60000 / (info.bpm || 120)) > 6) {
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('class', 'beat-ticks'); svg.setAttribute('width', cw); svg.setAttribute('height', 8);
      let d = '';
      for (const b of info.beats) d += `M${msToX(b).toFixed(1)} 0v8`;
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path'); path.setAttribute('d', d);
      svg.append(path); lane.append(svg);
    }
  }
  return h('div', { class: 'tl-row' + (t.hidden ? ' is-hidden' : '') + (t.lock ? ' is-locked' : '') + (t.mute ? ' is-muted' : ''), 'data-track': t.id, style: { height: TRACK_H + 'px', '--tc': t.color } }, head, lane);
}

async function trackMenu(t) {
  const colors = ['#e8c26a', '#ff9f5a', '#ff7aa8', '#c58cff', '#6c8cff', '#5ad1ff', '#4fc3a1', '#7be07b', '#ffd36e', '#9aa7ff'];
  const v = await chooseList(t.name, [
    { value: 'add', label: 'Add a clip to this track', desc: 'At the playhead', icon: '+' },
    { value: 'rename', label: 'Rename', icon: '✎' },
    { value: 'color', label: 'Color tag', icon: '●', color: t.color },
    { value: 'kf', label: t.kfOpen ? 'Hide keyframe lanes' : 'Show keyframe lanes', icon: '◇' },
    { value: 'up', label: 'Move layer up (in front)', icon: '↑' },
    { value: 'down', label: 'Move layer down (behind)', icon: '↓' },
    { value: 'dup', label: 'Duplicate track', icon: '⧉' },
    { value: 'del', label: 'Delete track', icon: '🗑' },
  ], TRACK_TYPES[t.type].label + ' track · ' + t.clips.length + ' clip(s)');
  const idx = state.project.tracks.findIndex((x) => x.id === t.id);
  if (v === 'add') { select(t.id, null); if (TRACK_TYPES[t.type].media) { emit('need-media', t); } else addClip(t.type, {}); }
  if (v === 'rename') { const n = await prompt('Rename track', t.name); if (n && n.trim()) setTrack(t.id, { name: n.trim() }); }
  if (v === 'color') {
    const c = await chooseList('Color tag', colors.map((c) => ({ value: c, label: c, icon: '●', color: c })));
    if (c) setTrack(t.id, { color: c });
  }
  if (v === 'kf') setTrack(t.id, { kfOpen: !t.kfOpen });
  if (v === 'up') moveTrack(t.id, idx - 1);
  if (v === 'down') moveTrack(t.id, idx + 1);
  if (v === 'dup') duplicateTrack(t.id);
  if (v === 'del' && await confirmBox('Delete track “' + t.name + '”?', 'This removes the track and its ' + t.clips.length + ' clip(s). You can undo this.', 'Delete', true)) deleteTrack(t.id);
}

function reorderStart(e, t, index) {
  e.preventDefault(); e.stopPropagation();
  const grip = e.currentTarget;
  grip.setPointerCapture(e.pointerId);
  const rowsEls = [...content.querySelectorAll('.tl-row[data-track]')];
  const ind = h('div', { class: 'reorder-ind' });
  content.append(ind);
  let target = index;
  const mv = (ev) => {
    let best = rowsEls.length;
    for (let i = 0; i < rowsEls.length; i++) { const r = rowsEls[i].getBoundingClientRect(); if (ev.clientY < r.top + r.height / 2) { best = i; break; } }
    target = best;
    const ref = rowsEls[Math.min(best, rowsEls.length - 1)].getBoundingClientRect();
    const cr = content.getBoundingClientRect();
    ind.style.top = (best < rowsEls.length ? ref.top : ref.bottom) - cr.top + 'px';
  };
  const up = () => {
    grip.removeEventListener('pointermove', mv); grip.removeEventListener('pointerup', up); grip.removeEventListener('pointercancel', up);
    ind.remove();
    const to = target > index ? target - 1 : target;
    if (to !== index) moveTrack(t.id, to);
  };
  grip.addEventListener('pointermove', mv); grip.addEventListener('pointerup', up); grip.addEventListener('pointercancel', up);
}

function laneTap(e, t) {
  if (e.target.closest('.clip')) return;
  const x0 = e.clientX, y0 = e.clientY;
  const lane = e.currentTarget;
  const up = (ev) => {
    lane.removeEventListener('pointerup', up);
    if (Math.hypot(ev.clientX - x0, ev.clientY - y0) > 8) return;
    const r = lane.getBoundingClientRect();
    select(t.id, null);
    engine.seek(snapT(xToMs(ev.clientX - r.left)));
  };
  lane.addEventListener('pointerup', up);
  lane.addEventListener('pointercancel', () => lane.removeEventListener('pointerup', up), { once: true });
}

function clipLabel(t, c) {
  if (c.mediaId) return state.media.get(c.mediaId)?.name || '(missing media)';
  if (t.type === 'binaural') return `${c.props.baseHz} Hz · beat ${c.props.beatHz} Hz`;
  if (t.type === 'pattern') return (c.props.patternType || 'pattern') + ' · ' + c.props.opacity + '%';
  if (t.type === 'color') return 'Color ' + c.props.ccolor;
  return c.text || (t.type === 'text' ? '(empty text)' : '(cycles affirmations)');
}

function clipEl(t, c) {
  const el = h('div', { class: 'clip', 'data-id': c.id, role: 'button', tabindex: '0', 'aria-label': `${TRACK_TYPES[t.type].short} clip ${fmt(c.start)} to ${fmt(c.start + c.dur)}`,
    style: { left: msToX(c.start) + 'px', width: Math.max(4, msToX(c.dur)) + 'px', '--cc': t.color } },
  h('span', { class: 'h-l', 'aria-hidden': 'true' }), h('span', { class: 'clip-label' }, clipLabel(t, c)), h('span', { class: 'h-r', 'aria-hidden': 'true' }));
  const m = c.mediaId && state.media.get(c.mediaId);
  if (m && m.thumb) el.style.setProperty('--thumb', `url(${m.thumb})`), el.classList.add('has-thumb');
  if (c.follow) el.classList.add('following');
  // keyframe ticks
  for (const list of Object.values(c.kf || {})) for (const k of list) el.append(h('i', { class: 'kf-tick', style: { left: msToX(k.t) + 'px' } }));
  el.addEventListener('pointerdown', (e) => clipPointer(e, t, c, el));
  el.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); select(t.id, c.id); }
  });
  return el;
}

function clipPointer(e, t, c, el) {
  e.stopPropagation();
  if (e.button > 0) return;
  select(t.id, c.id);
  if (t.lock) return;
  const mode = e.target.classList.contains('h-l') ? 'l' : e.target.classList.contains('h-r') ? 'r' : 'move';
  const x0 = e.clientX;
  const s0 = c.start, d0 = c.dur, src0 = c.srcIn || 0;
  const minDur = Math.max(1, Math.round(timing.frameMs));
  let active = false, targetTrack = t;
  const tip = h('div', { class: 'drag-tip' });
  el.setPointerCapture(e.pointerId);
  const others = (tr) => tr.clips.filter((x) => x.id !== c.id);
  const mv = (ev) => {
    const dx = ev.clientX - x0;
    if (!active && Math.abs(dx) < 5 && Math.abs(ev.clientY - e.clientY) < 8) return;
    if (!active) {
      active = true; dragging = true;
      commit(() => {}, { merge: 'drag-' + c.id + '-' + performance.now(), silent: true });
      document.body.append(tip);
    }
    const dms = xToMs(dx);
    if (mode === 'move') {
      c.start = Math.max(0, snapT(s0 + dms));
      // cross-track move to a track of the same type
      const under = document.elementFromPoint(ev.clientX, ev.clientY)?.closest('.tl-row[data-track]');
      const tt = under && findTrack(under.dataset.track);
      targetTrack = tt && tt.type === t.type && !tt.lock ? tt : targetTrack;
      content.querySelectorAll('.tl-row.drop').forEach((r) => r.classList.remove('drop'));
      if (targetTrack !== t) content.querySelector(`.tl-row[data-track="${targetTrack.id}"]`)?.classList.add('drop');
    } else if (mode === 'l') {
      let ns = Math.max(0, snapT(s0 + dms));
      ns = Math.min(ns, s0 + d0 - minDur);
      const delta = ns - s0;
      const sp = c.props.speed || 1;
      if (c.mediaId && src0 + delta * sp < 0) ns = s0 - src0 / sp;
      c.start = Math.round(ns); c.dur = Math.round(s0 + d0 - c.start);
      if (c.mediaId) c.srcIn = Math.max(0, Math.round(src0 + (c.start - s0) * sp));
    } else {
      const ne = Math.max(s0 + minDur, snapT(s0 + d0 + dms));
      c.dur = Math.round(ne - s0);
    }
    el.style.left = msToX(c.start) + 'px';
    el.style.width = Math.max(4, msToX(c.dur)) + 'px';
    tip.textContent = mode === 'move' ? `Start ${fmt(c.start)} · f${frameOf(c.start)}` : `${fmt(c.start)} → ${fmt(c.start + c.dur)} · ${fmt(c.dur)}`;
    tip.style.left = ev.clientX + 'px'; tip.style.top = (ev.clientY - 44) + 'px';
    emit('clip-live', c);
  };
  const up = () => {
    el.removeEventListener('pointermove', mv); el.removeEventListener('pointerup', up); el.removeEventListener('pointercancel', up);
    tip.remove();
    if (!active) return;
    dragging = false;
    commit((p) => {
      const from = p.tracks.find((x) => x.id === t.id);
      let dest = p.tracks.find((x) => x.id === targetTrack.id) || from;
      if (dest !== from) { from.clips = from.clips.filter((x) => x.id !== c.id); dest.clips.push(c); }
      // resolve overlap: if dropped on another clip, push to its end
      let moved = true, guard = 0;
      while (moved && guard++ < 100) { moved = false; for (const o of others(dest)) if (c.start < o.start + o.dur && c.start + c.dur > o.start) { if (mode === 'r') c.dur = Math.max(minDur, o.start - c.start); else c.start = o.start + o.dur; moved = true; } }
      dest.clips.sort((a, b) => a.start - b.start);
      if (dest !== from) state.sel.trackId = dest.id;
    }, { snapshot: false });
  };
  el.addEventListener('pointermove', mv); el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
}

// ---------- keyframe lanes ----------
function kfRow(t, key, cw) {
  const def = propDef(t.type, key) || { label: key, min: 0, max: 1 };
  const lane = h('div', { class: 'tl-lane kf-lane', style: { width: cw + 'px' } });
  const H = KF_H - 8;
  for (const c of t.clips) {
    const list = c.kf && c.kf[key];
    if (!list || !list.length) continue;
    const w = Math.max(4, msToX(c.dur));
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'kf-curve'); svg.setAttribute('width', w); svg.setAttribute('height', KF_H);
    svg.style.left = msToX(c.start) + 'px';
    const N = Math.min(400, Math.max(20, Math.round(w / 3)));
    let d = '';
    const yOf = (v) => 4 + H - ((v - def.min) / ((def.max - def.min) || 1)) * H;
    for (let i = 0; i <= N; i++) { const tt = (i / N) * c.dur; d += (i ? 'L' : 'M') + ((i / N) * w).toFixed(1) + ' ' + yOf(kfValue(list, tt)).toFixed(1); }
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path'); path.setAttribute('d', d);
    svg.append(path); lane.append(svg);
    list.forEach((k, i) => {
      const dm = h('button', { class: 'kf-dot', title: `${def.label}: ${round(k.v)} ${def.unit || ''} at ${fmt(c.start + k.t)}`, 'aria-label': `Keyframe ${def.label} ${round(k.v)} at ${fmt(c.start + k.t)}`,
        style: { left: msToX(c.start + k.t) + 'px', top: yOf(k.v) + 'px' } });
      dm.addEventListener('pointerdown', (e) => kfDrag(e, t, c, key, i, dm));
      lane.append(dm);
    });
  }
  return h('div', { class: 'tl-row kf-row', style: { height: KF_H + 'px', '--tc': t.color } },
    h('div', { class: 'tl-head kf-head' }, h('small', {}, '◇ ' + def.label)), lane);
}
const round = (v) => Math.round(v * 100) / 100;

function kfDrag(e, t, c, key, i, dm) {
  e.stopPropagation(); e.preventDefault();
  if (t.lock) return;
  dm.setPointerCapture(e.pointerId);
  const x0 = e.clientX; const k = c.kf[key][i]; const t0 = k.t; let active = false;
  const mv = (ev) => {
    const dx = ev.clientX - x0;
    if (!active && Math.abs(dx) < 5) return;
    if (!active) { active = true; dragging = true; commit(() => {}, { merge: 'kfd' + performance.now(), silent: true }); }
    k.t = Math.max(0, Math.min(c.dur, snapT(c.start + t0 + xToMs(dx)) - c.start));
    dm.style.left = msToX(c.start + k.t) + 'px';
    dm.title = fmt(c.start + k.t);
  };
  const up = async () => {
    dm.removeEventListener('pointermove', mv); dm.removeEventListener('pointerup', up);
    if (active) { dragging = false; commit(() => { c.kf[key].sort((a, b) => a.t - b.t); }, { snapshot: false }); return; }
    kfEdit(t, c, key, k);
  };
  dm.addEventListener('pointermove', mv); dm.addEventListener('pointerup', up);
}

async function kfEdit(t, c, key, k) {
  const def = propDef(t.type, key);
  const valIn = h('input', { type: 'number', step: def.step, min: def.min, max: def.max, value: round(k.v) });
  const timeIn = h('input', { type: 'text', value: fmt(c.start + k.t) });
  const easeSel = h('select', {}, [['linear', 'Linear'], ['ease', 'Ease in / out'], ['step', 'Step (hold)']].map(([v, l]) => h('option', { value: v, selected: k.e === v }, l)));
  const body = h('div', { class: 'form' },
    h('label', {}, def.label + ' (' + (def.unit || 'value') + ')', valIn),
    h('label', {}, 'Time (mm:ss.mmm)', timeIn),
    h('label', {}, 'Interpolation to the next keyframe', easeSel));
  const r = await dialog({ title: 'Keyframe', body, buttons: [{ label: 'Delete', value: 'del', danger: true }, { label: 'Go to', value: 'go' }, { label: 'Save', value: 'save', primary: true }] });
  const { parseTime } = await import('./core.js');
  if (r === 'del') commit(() => { c.kf[key] = c.kf[key].filter((x) => x !== k); if (!c.kf[key].length) delete c.kf[key]; });
  if (r === 'go') engine.seek(c.start + k.t);
  if (r === 'save') commit(() => {
    const v = parseFloat(valIn.value); if (!isNaN(v)) k.v = Math.max(def.min, Math.min(def.max, v));
    const tt = parseTime(timeIn.value); if (!isNaN(tt)) k.t = Math.max(0, Math.min(c.dur, tt - c.start));
    k.e = easeSel.value;
    c.kf[key].sort((a, b) => a.t - b.t);
  });
}

export function scrollToPlayhead() {
  if (!scroller) return;
  const w = scroller.clientWidth - HW();
  scroller.scrollLeft = Math.max(0, msToX(state.playhead) - w * 0.3);
  drawRuler();
}
export { PROPS };
