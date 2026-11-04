// App shell: tabs, Edit screen, menus, settings, timing info, projects, install.
import { h, icon, toast, dialog, prompt, confirmBox, chooseList } from './ui.js';
import { state, on, emit, undo, redo, loadProject, loadMedia, setProject, select, selected, commit, saveNow, findTrack } from './store.js';
import { db, uid } from './db.js';
import { TRACK_TYPES, TRACK_ORDER, newProject } from './model.js';
import { fmt, frameOf, measureRefresh, timing } from './core.js';
import * as engine from './engine.js';
import { mountLibrary, ingest } from './library.js';
import { mountTimeline, fitZoom, setZoom, scrollToPlayhead } from './timeline.js';
import { mountInspector } from './inspector.js';
import { mountPlayer, show as showPlayer, hide as hidePlayer } from './player.js';
import { mountProgress, loadProgress } from './progress.js';
import { firstLaunch, beforePlay, setSafeMode, loadSafeMode, toneWarning, trackNeedsToneWarning } from './safety.js';
import { addTrack, addClip, deleteClip, splitClip, loadPresets } from './actions.js';
import { exportVideo, saveProjectFile, openProjectFile } from './exporter.js';
import { helpCenter, helpBtn, showHelp } from './help.js';
import { initGuide, startTour } from './guide.js';
import { primeEnabled, setPrime } from './joy.js';
import { recordVoice } from './library.js';

const TABS = [
  ['library', 'Library', 'lib'],
  ['edit', 'Edit', 'edit'],
  ['play', 'Play', 'play'],
  ['progress', 'Progress', 'star'],
];
const views = {};
let loopBtn, previewCv, tTime, tDur, playBtn, snapBtn, gridSel, zoomRange, undoBtn, redoBtn, savedEl, projName;
let deferredInstall = null;

async function boot() {
  buildShell();
  await Promise.all([loadMedia(), loadSafeMode(), loadPresets(), loadProgress()]);
  await loadProject(await db.kvGet('currentProject', null));
  mountLibrary(views.library);
  buildEdit();
  mountPlayer(views.play);
  mountProgress(views.progress);
  const startTab = (location.hash.slice(1) || (await db.kvGet('lastTab', 'library')));
  go(TABS.some((t) => t[0] === startTab) ? startTab : 'library');
  measureRefresh().then(() => emit('timing'));
  state.userName = await db.kvGet('userName', '');
  initGuide(go);
  on('start-tour', () => startTour());
  on('show-templates', () => { go('library'); setTimeout(() => document.getElementById('templates')?.scrollIntoView({ block: 'start', behavior: 'smooth' }), 100); });
  on('template-built', async () => { go('edit'); engine.setLoop(true); fitZoom(); emit('change'); engine.seek(0); await togglePlay(); });
  on('project', () => engine.setLoop(!!state.project.loop));
  engine.setLoop(!!state.project.loop);
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch((e) => console.warn('sw', e));
  navigator.storage?.persist?.().catch(() => {});
  window.__mm = { state, engine, emit, commit, select, addTrack, addClip, ingest, undo, redo, setProject };
  document.body.classList.add('ready');
  await firstLaunch();
  if (!(await db.kvGet('toured', false)) && !(await db.kvGet('tourOffered', false))) {
    await db.kvSet('tourOffered', true);
    const yes = await dialog({ title: '✨ Welcome to Mind Movie', body: h('p', {}, 'Would you like a one-minute guided tour? You can open it any time with the ? button at the top.'), buttons: [{ label: 'Not now', value: false }, { label: '🧭 Guide me', value: true, primary: true }] });
    if (yes) startTour();
  }
}

function buildShell() {
  projName = h('button', { class: 'proj-name', onclick: projectsDialog, 'aria-label': 'Projects' }, '…');
  savedEl = h('span', { class: 'saved', 'aria-live': 'polite' }, '');
  const header = h('header', { class: 'topbar' },
    h('div', { class: 'brand' }, h('img', { src: 'icons/icon-96.png', alt: '', width: 28, height: 28 }), h('span', {}, 'Mind Movie')),
    projName, savedEl, h('span', { class: 'spacer' }),
    h('button', { class: 'icon-btn help-top', 'aria-label': 'Help and guided tour', title: 'Help & guided tour', onclick: helpCenter }, h('span', { class: 'q' }, '?')),
    h('button', { class: 'icon-btn', 'aria-label': 'Timing info', title: 'Timing info', onclick: timingInfo }, icon('clock')),
    h('button', { class: 'icon-btn', 'aria-label': 'Settings', title: 'Settings', onclick: settings }, icon('gear')));
  const main = h('main', { id: 'main' });
  for (const [id] of TABS) { views[id] = h('div', { class: 'view', id: 'view-' + id, hidden: true }); main.append(views[id]); }
  const nav = h('nav', { class: 'tabbar', 'aria-label': 'Main' }, TABS.map(([id, label, ic]) => h('button', { class: 'tab', 'data-tab': id, onclick: () => go(id) }, icon(ic), h('span', {}, label))));
  document.body.append(header, main, nav);
  on('saving', () => { savedEl.textContent = 'Saving…'; });
  on('saved', () => { savedEl.textContent = 'Saved'; });
  on('project', () => { projName.textContent = state.project.name; });
  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferredInstall = e; emit('installable'); });
  window.addEventListener('appinstalled', () => { deferredInstall = null; toast('Installed! Find Mind Movie on your home screen.'); });
  document.addEventListener('keydown', keys);
  document.addEventListener('visibilitychange', () => { if (document.hidden) { saveNow(); if (engine.isPlaying()) engine.pause(); } });
}

function go(id) {
  if (state.tab === 'play' && id !== 'play') hidePlayer();
  if (engine.isPlaying() && id !== state.tab) engine.pause();
  state.tab = id;
  for (const [t] of TABS) views[t].hidden = t !== id;
  document.querySelectorAll('.tab').forEach((b) => { b.classList.toggle('on', b.dataset.tab === id); b.setAttribute('aria-current', b.dataset.tab === id ? 'page' : 'false'); });
  document.body.dataset.tab = id;
  if (id === 'edit') { engine.addTarget(previewCv); requestAnimationFrame(() => { emit('change'); }); } else engine.removeTarget(previewCv);
  if (id === 'play') showPlayer();
  db.kvSet('lastTab', id);
  history.replaceState(null, '', '#' + id);
}

// ---------- Edit screen ----------
function buildEdit() {
  const v = views.edit;
  previewCv = h('canvas', { class: 'preview-cv', 'aria-label': 'Preview' });
  previewCv.addEventListener('click', togglePlay);
  tTime = h('output', { class: 't-time' }, '00:00.000');
  tDur = h('span', { class: 't-dur muted' });
  playBtn = h('button', { class: 'btn primary round', 'aria-label': 'Play', onclick: togglePlay }, icon('play'));
  const step = (n) => engine.seek(Math.round((frameOf(state.playhead + 0.01) + n) * timing.frameMs));
  const transport = h('div', { class: 'transport' },
    h('button', { class: 'btn ghost sm', 'aria-label': 'Go to start', onclick: () => engine.seek(0) }, '⇤'),
    h('button', { class: 'btn ghost sm', 'aria-label': 'Back one frame', onclick: () => step(-1) }, '−1f'),
    playBtn,
    h('button', { class: 'btn ghost sm', 'aria-label': 'Forward one frame', onclick: () => step(1) }, '+1f'),
    h('button', { class: 'btn ghost sm', 'aria-label': 'Go to end', onclick: () => engine.seek(state.project.duration) }, '⇥'),
    loopBtn = h('button', { class: 'btn ghost sm loop-btn', 'aria-label': 'Loop', 'aria-pressed': 'false', title: 'Loop: keep playing round and round', onclick: () => { const v = !engine.isLooping(); engine.setLoop(v); commit((p) => { p.loop = v; }); toast(v ? 'Loop on — add things while it plays' : 'Loop off'); } }, '↻ Loop'),
    h('div', { class: 't-read' }, tTime, tDur));
  undoBtn = h('button', { class: 'btn sm', 'aria-label': 'Undo', title: 'Undo (Ctrl+Z)', onclick: () => { if (!undo()) toast('Nothing to undo'); } }, icon('undo'));
  redoBtn = h('button', { class: 'btn sm', 'aria-label': 'Redo', title: 'Redo (Ctrl+Shift+Z)', onclick: () => { if (!redo()) toast('Nothing to redo'); } }, icon('redo'));
  snapBtn = h('button', { class: 'btn sm toggle-btn', 'aria-pressed': String(state.snap), onclick: () => { state.snap = !state.snap; syncToolbar(); toast(state.snap ? 'Snap to grid on' : 'Snap off'); } }, '⌗ Snap');
  gridSel = h('select', { class: 'sm', 'aria-label': 'Grid size' },
    h('option', { value: 'frame' }, '1 frame'), h('option', { value: '10' }, '10 ms'), h('option', { value: '100' }, '100 ms'), h('option', { value: '1000' }, '1 s'));
  gridSel.value = String(state.grid);
  gridSel.addEventListener('change', () => { state.gridFrame = gridSel.value === 'frame'; if (!state.gridFrame) state.grid = +gridSel.value; db.kvSet('grid', gridSel.value); });
  zoomRange = h('input', { type: 'range', min: 0, max: 1000, step: 1, class: 'zoom', 'aria-label': 'Timeline zoom' });
  const zMin = () => Math.log(2), zMax = () => Math.log(80 * timing.hz);
  zoomRange.addEventListener('input', () => setZoom(Math.exp(zMin() + (+zoomRange.value / 1000) * (zMax() - zMin()))));
  on('zoom', () => { zoomRange.value = Math.round(((Math.log(state.zoom) - zMin()) / (zMax() - zMin())) * 1000); });
  const toolbar = h('div', { class: 'toolbar' },
    h('button', { class: 'btn sm primary', onclick: addTrackDialog }, icon('plus'), ' Track'),
    undoBtn, redoBtn,
    h('button', { class: 'btn sm', 'aria-label': 'Split clip at playhead', title: 'Split selected clip at playhead (S)', onclick: () => { const f = selected(); if (!f) return toast('Select a clip first'); if (!splitClip(f.clip.id, state.playhead)) toast('Put the playhead inside the clip'); } }, icon('scissors')),
    snapBtn, gridSel,
    h('div', { class: 'zoomgrp' },
      h('button', { class: 'btn sm ghost', 'aria-label': 'Zoom out', onclick: () => setZoom(state.zoom / 1.6) }, icon('zoomout')),
      zoomRange,
      h('button', { class: 'btn sm ghost', 'aria-label': 'Zoom in', onclick: () => setZoom(state.zoom * 1.6) }, icon('zoomin')),
      h('button', { class: 'btn sm ghost', 'aria-label': 'Fit whole movie', onclick: () => { fitZoom(); emit('change'); } }, 'Fit'),
      h('button', { class: 'btn sm ghost', 'aria-label': 'Zoom to single frames', onclick: () => { setZoom(80 * timing.hz); scrollToPlayhead(); } }, '1f')),
    h('button', { class: 'btn sm', onclick: projectsDialog }, icon('folder'), ' Project'),
    h('button', { class: 'btn sm gold', onclick: exportVideo }, icon('film'), ' Export'));
  const tl = h('div', { class: 'timeline' });
  const insp = h('aside', { class: 'inspector', 'aria-label': 'Clip properties' });
  v.append(h('div', { class: 'edit' },
    h('div', { class: 'ed-stage' }, h('div', { class: 'preview-wrap' }, previewCv), transport),
    toolbar, quickAddBar(), tl, insp));
  on('loop', (v) => { loopBtn.setAttribute('aria-pressed', String(v)); loopBtn.classList.toggle('on', v); });
  loopBtn.classList.toggle('on', engine.isLooping()); loopBtn.setAttribute('aria-pressed', String(engine.isLooping()));
  mountTimeline(tl);
  mountInspector(insp);
  on('time', syncTransport); on('play', syncTransport); on('pause', syncTransport); on('change', syncTransport); on('history', syncToolbar); on('change', syncToolbar);
  on('need-media', (t) => addToTrack(t)); on('add-to-track', (t) => addToTrack(t));
  on('sheet', () => document.body.classList.toggle('sheet-open', !!document.querySelector('.inspector.open')));
  db.kvGet('grid', '100').then((g) => { gridSel.value = g; state.gridFrame = g === 'frame'; if (g !== 'frame') state.grid = +g; });
  syncToolbar(); syncTransport();
}

function syncTransport() {
  if (!tTime) return;
  tTime.textContent = fmt(state.playhead) + '  f' + frameOf(state.playhead);
  tDur.textContent = ' / ' + fmt(state.project.duration);
  playBtn.replaceChildren(icon(state.playing ? 'pause' : 'play'));
  playBtn.setAttribute('aria-label', state.playing ? 'Pause' : 'Play');
}
function syncToolbar() {
  if (!undoBtn) return;
  undoBtn.disabled = !state.undo.length; redoBtn.disabled = !state.redo.length;
  snapBtn.setAttribute('aria-pressed', String(state.snap)); snapBtn.classList.toggle('on', state.snap);
  gridSel.disabled = !state.snap;
}

async function togglePlay() {
  if (engine.isPlaying()) return engine.pause();
  if (!state.project.duration) return toast('Add a clip first');
  if (!(await beforePlay(state.project))) return;
  engine.play();
}

const TYPE_DESC = {
  video: 'Video clips from your library', photo: 'Photos with zoom, rotation, fades', text: 'Calm on-screen words',
  flash: 'Brief flashes (17 ms and up) with optional mask', scroll: 'Affirmations streaming across the screen',
  pattern: 'Spirals, rings, mandala — default 15% opacity', color: 'Color pulse or white/black flash frames',
  music: 'Background music (beat detection)', voice: 'Your recorded voice, layered and sped up', binaural: 'Headphone tone: 4, 6, 10 Hz or custom',
};
async function addTrackDialog() {
  const type = await chooseList('Add a track', TRACK_ORDER.map((t) => ({ value: t, label: TRACK_TYPES[t].label, desc: TYPE_DESC[t], icon: TRACK_TYPES[t].icon, color: TRACK_TYPES[t].color })));
  if (!type) return;
  if (trackNeedsToneWarning(type) && !(await toneWarning())) return;
  const t = addTrack(type);
  await addToTrack(t, true);
}

async function addToTrack(t, fresh = false) {
  select(t.id, null);
  const media = TRACK_TYPES[t.type].media;
  if (media) {
    const id = await pickMedia(t.type, media);
    if (!id) { if (fresh) toast('Empty track added. Use its ⋯ menu to add a clip later.'); return; }
    const m = state.media.get(id);
    addClip(t.type, { mediaId: id, dur: m.kind === 'image' ? undefined : (m.duration || 5000) });
  } else {
    const aff = state.project.affirmations[0];
    addClip(t.type, { text: t.type === 'text' && aff ? aff.text : '' });
  }
}

async function pickMedia(type, kind) {
  const items = [...state.media.values()].filter((m) => m.kind === kind && (type !== 'voice' || true));
  const upload = { value: '__upload', label: 'Upload a new file…', icon: '⤒' };
  const pick = await chooseList('Choose from your library', [upload, ...items.map((m) => ({ value: m.id, label: m.name, desc: (m.duration ? fmt(m.duration) + ' · ' : '') + (m.sub || m.kind), icon: kind === 'image' ? '▣' : kind === 'video' ? '▶' : (m.sub === 'voice' ? '🎙' : '♫') }))],
    items.length ? null : 'Nothing of this kind in your library yet.');
  if (pick !== '__upload') return pick;
  const accept = kind === 'image' ? 'image/*' : kind === 'video' ? 'video/*' : 'audio/*,.mp3,.m4a,.wav';
  const f = await new Promise((resolve) => { const inp = h('input', { type: 'file', accept, style: { display: 'none' } }); inp.addEventListener('change', () => { resolve(inp.files[0]); inp.remove(); }); document.body.append(inp); inp.click(); });
  if (!f) return null;
  const rec = await ingest(f, type === 'voice' ? 'voice' : type === 'music' ? 'music' : undefined);
  return rec.id;
}

function keys(e) {
  if (e.target.matches('input, textarea, select') && !(e.target.type === 'range')) return;
  const mod = e.ctrlKey || e.metaKey;
  if (mod && e.key.toLowerCase() === 'z') { e.preventDefault(); e.shiftKey ? redo() : undo(); return; }
  if (mod && e.key.toLowerCase() === 'y') { e.preventDefault(); redo(); return; }
  if (state.tab !== 'edit' && state.tab !== 'play') return;
  if (e.key === ' ' && e.target.type !== 'range') { e.preventDefault(); state.tab === 'edit' ? togglePlay() : views.play.querySelector('.btn.round').click(); }
  if (state.tab !== 'edit') return;
  if (e.key === 'ArrowRight' && e.target.type !== 'range') { e.preventDefault(); engine.seek(Math.round((frameOf(state.playhead + 0.01) + (e.shiftKey ? 10 : 1)) * timing.frameMs)); }
  if (e.key === 'ArrowLeft' && e.target.type !== 'range') { e.preventDefault(); engine.seek(Math.round((frameOf(state.playhead + 0.01) - (e.shiftKey ? 10 : 1)) * timing.frameMs)); }
  if ((e.key === 'Delete' || e.key === 'Backspace') && state.sel.clipId) { const f = selected(); if (f && !f.track.lock) { e.preventDefault(); deleteClip(f.clip.id); } }
  if (e.key.toLowerCase() === 's' && !mod && state.sel.clipId) splitClip(state.sel.clipId, state.playhead);
}

// ---------- Quick Add: build the movie while it loops ----------
function freeTrack(type, start, dur) {
  return state.project.tracks.find((t) => t.type === type && !t.lock && !t.clips.some((c) => start < c.start + c.dur && start + dur > c.start));
}
function quickPlace(dur) {
  let start = Math.round(state.playhead);
  const D = state.project.duration;
  if (D > dur && start + dur > D) start = Math.max(0, D - dur); // keep it inside the loop
  return start;
}
function quickAdd(type, opts) {
  const start = quickPlace(opts.dur);
  const t = freeTrack(type, start, opts.dur);
  select(t ? t.id : null, null);
  const c = addClip(type, { ...opts, start });
  select(null, null); // keep the panel closed so the loop stays in view
  return c;
}
function quickAddBar() {
  const words = async () => {
    const affs = state.project.affirmations;
    const pick = await chooseList('+ Words at ' + fmt(state.playhead), [{ value: '__new', label: 'Type new words…', icon: '✍️' }, ...affs.map((a) => ({ value: a.text, label: a.text, icon: '“' }))]);
    if (!pick) return;
    let text = pick;
    if (pick === '__new') { text = await prompt('Your words', '', { placeholder: 'I am…' }); if (!text || !text.trim()) return; text = text.trim(); commit((p) => p.affirmations.push({ id: uid('a'), text })); }
    quickAdd('text', { text, dur: 4000, props: { fadeIn: 700, fadeOut: 700, glow: 22, glowColor: '#5a3fa0', fontSize: 60, color: '#ffffff', outline: 2, outlineColor: '#1a1040' } });
    toast('Words added ✨');
  };
  const photo = async () => {
    const id = await pickMedia('photo', 'image'); if (!id) return;
    const c = quickAdd('photo', { mediaId: id, dur: 5000, props: { fadeIn: 800, fadeOut: 800, opacity: 90 } });
    commit((p) => { for (const t of p.tracks) { const x = t.clips.find((k) => k.id === c.id); if (x) x.kf = { scale: [{ t: 0, v: 100, e: 'ease' }, { t: 5000, v: 112, e: 'linear' }] }; } });
    toast('Photo added with a slow zoom');
  };
  const voice = async () => {
    const voices = [...state.media.values()].filter((m) => m.kind === 'audio' && m.sub === 'voice');
    const pick = await chooseList('+ Voice', [{ value: '__rec', label: 'Record now…', icon: '🎙' }, ...voices.map((m) => ({ value: m.id, label: m.name, desc: fmt(m.duration || 0), icon: '🎙' }))]);
    if (!pick) return;
    let m = pick === '__rec' ? await recordVoice() : state.media.get(pick);
    if (!m) return;
    quickAdd('voice', { mediaId: m.id, dur: Math.max(1000, m.duration || 4000), props: { volume: -10 } });
    toast('Voice added');
  };
  const flash = () => { quickAdd('flash', { dur: 8000, props: { onMs: 50, offMs: 950, mask: true, maskMs: 50, opacity: 70 } }); toast('Flash words added (1 per second, Safe Mode on)'); };
  const sparkle = async () => {
    const kind = await chooseList('+ Sparkle', [['bokeh', 'Golden bokeh lights', '✨'], ['hearts', 'Rising hearts', '💗'], ['starfield', 'Flying through stars', '🌌'], ['sunrise', 'Golden sunrise', '🌅'], ['aurora', 'Aurora ribbons', '🌈'], ['spiral', 'Spiral 15%', '🌀']].map(([v, l, i]) => ({ value: v, label: l, icon: i })));
    if (!kind) return;
    const bg = ['starfield', 'sunrise', 'aurora'].includes(kind);
    quickAdd('pattern', { dur: 8000, props: { patternType: kind, opacity: bg ? 60 : kind === 'spiral' ? 15 : 40, rotSpeed: kind === 'spiral' ? 25 : 0, fadeIn: 1200, fadeOut: 1200 } });
    toast('Sparkle added');
  };
  return h('div', { class: 'quickadd', role: 'toolbar', 'aria-label': 'Quick add at the playhead' },
    h('span', { class: 'qa-label' }, 'Quick add'),
    h('button', { class: 'qa', onclick: words }, '✍️ Words'),
    h('button', { class: 'qa', onclick: photo }, '📸 Photo'),
    h('button', { class: 'qa', onclick: voice }, '🎙 Voice'),
    h('button', { class: 'qa', onclick: flash }, '⚡ Flash'),
    h('button', { class: 'qa', onclick: sparkle }, '✨ Sparkle'),
    helpBtn('templates', 'Quick add help'));
}

// ---------- dialogs ----------
async function settings() {
  const safeCb = h('input', { type: 'checkbox', checked: state.safe });
  safeCb.addEventListener('change', async () => { const ok = await setSafeMode(safeCb.checked); if (!ok) safeCb.checked = state.safe; toast(state.safe ? 'Safe Mode ON' : 'Safe Mode OFF'); });
  const nameBox = h('input', { type: 'text', value: state.userName || '', placeholder: 'e.g. Jason' });
  nameBox.addEventListener('change', async () => { state.userName = nameBox.value.trim(); await db.kvSet('userName', state.userName); toast(state.userName ? 'Hello, ' + state.userName + '! {name} in your affirmations now says your name' : 'Name cleared'); });
  const nameIn = h('label', {}, 'Your first name (replaces {name} in affirmations)', nameBox);
  const primeCb = h('input', { type: 'checkbox', checked: await primeEnabled() });
  primeCb.addEventListener('change', () => { setPrime(primeCb.checked); toast(primeCb.checked ? 'Feel-it-first breathing on' : 'Breathing intro off'); });
  const primeTog = h('label', { class: 'prop toggle' }, primeCb, h('span', { class: 'sw' }), h('span', {}, h('strong', {}, 'Feel-it-first breathing'), h('br'), h('small', { class: 'muted' }, 'Three slow breaths before your movie plays in the Play tab.')));
  const asp = h('select', {}, ['16:9', '9:16', '1:1'].map((a) => h('option', { value: a, selected: state.project.aspect === a }, a === '16:9' ? 'Wide 16:9 (TV, laptop)' : a === '9:16' ? 'Tall 9:16 (phone upright)' : 'Square 1:1')));
  asp.addEventListener('change', () => { commit((p) => { p.aspect = asp.value; }); toast('Movie shape: ' + asp.value); });
  const est = h('p', { class: 'muted small' }, 'Checking storage…');
  navigator.storage?.estimate?.().then((e) => { est.textContent = `Storage used: ${(e.usage / 1048576).toFixed(1)} MB of about ${(e.quota / 1073741824).toFixed(1)} GB available.`; });
  const installBtn = h('button', { class: 'btn primary', disabled: !deferredInstall, onclick: async () => { if (!deferredInstall) return; deferredInstall.prompt(); await deferredInstall.userChoice; deferredInstall = null; installBtn.disabled = true; } }, 'Install Mind Movie');
  const standalone = matchMedia('(display-mode: standalone)').matches;
  await dialog({ title: 'Settings', body: h('div', { class: 'form' },
    h('label', { class: 'prop toggle' }, safeCb, h('span', { class: 'sw' }), h('span', {}, h('strong', {}, 'Safe Mode'), h('br'), h('small', { class: 'muted' }, 'Caps flashing at 3 per second and blocks fast saturated-red flashing (WCAG).'))),
    h('label', {}, 'Movie shape', asp),
    nameIn,
    primeTog,
    h('div', {}, h('h3', {}, 'Install'), standalone ? h('p', {}, '✓ Running as an installed app.') : h('div', {}, installBtn, h('p', { class: 'muted small' }, deferredInstall ? 'Adds Mind Movie to your home screen; works offline.' : 'If the button is grey: in Chrome tap ⋮ (top right) → “Add to Home screen” or “Install app”.'))),
    h('button', { class: 'btn', onclick: timingInfo }, icon('clock'), ' Timing info'),
    est,
    h('p', { class: 'muted small' }, 'Mind Movie v1 · everything is stored only on this device. Not medical advice.')),
  buttons: [{ label: 'Close', value: true, primary: true }] });
}

async function timingInfo() {
  const out = h('div', { class: 'timing-info' });
  const fill = () => {
    const live = engine.liveFrameRate();
    out.replaceChildren(
      row('Measured refresh rate', timing.hz + ' Hz'),
      row('One frame lasts', timing.frameMs.toFixed(3) + ' ms'),
      row('Frame-time jitter', (timing.jitter || 0).toFixed(2) + ' ms'),
      row('Live drawing rate', live ? live.toFixed(1) + ' fps' : '—'),
      row('Shortest possible flash', timing.frameMs.toFixed(1) + ' ms (1 frame)'),
      row('Safe Mode', state.safe ? 'ON — max 3 flashes/s' : 'OFF'),
      row('Video export formats', (window.MediaRecorder ? ['video/mp4', 'video/webm'].filter((m) => MediaRecorder.isTypeSupported(m)).join(', ') : 'none') || 'none'),
      row('Pitch-preserve', 'preservesPitch' in HTMLMediaElement.prototype ? 'supported' : 'not supported'),
      row('Frames drawn', String(engine.framesDrawn())));
  };
  const row = (a, b) => h('div', { class: 'ti-row' }, h('span', {}, a), h('strong', {}, b));
  fill();
  const iv = setInterval(fill, 500);
  const remeasure = h('button', { class: 'btn', onclick: async () => { remeasure.disabled = true; remeasure.textContent = 'Measuring…'; await measureRefresh(120); emit('timing'); emit('change'); fill(); remeasure.disabled = false; remeasure.textContent = 'Measure again'; } }, 'Measure again');
  await dialog({ title: 'Timing info', body: h('div', {}, h('p', { class: 'muted small' }, 'All visual tracks are drawn on one canvas, once per screen refresh (requestAnimationFrame). Flash on/off times are rounded to whole frames of this screen.'), out, remeasure), buttons: [{ label: 'Close', value: true, primary: true }] });
  clearInterval(iv);
}

async function projectsDialog() {
  await saveNow();
  const list = (await db.all('projects')).sort((a, b) => b.updated - a.updated);
  const body = h('div', { class: 'proj-list' },
    h('div', { class: 'row wrap' },
      h('button', { class: 'btn primary sm', onclick: async () => { const n = await prompt('Name your new movie', 'My Mind Movie ' + (list.length + 1)); if (!n) return; const p = newProject(n.trim() || 'My Mind Movie'); await db.put('projects', p); setProject(p); close(); toast('New project'); } }, icon('plus'), ' New'),
      h('button', { class: 'btn sm', onclick: () => { close(); openProjectFile(); } }, icon('folder'), ' Open project file'),
      h('button', { class: 'btn sm', onclick: () => { close(); saveProjectFile(); } }, icon('save'), ' Save project file'),
      h('button', { class: 'btn sm gold', onclick: () => { close(); exportVideo(); } }, icon('film'), ' Export video')),
    list.map((p) => h('div', { class: 'proj' + (p.id === state.project.id ? ' cur' : '') },
      h('div', {}, h('strong', {}, p.name), h('small', { class: 'muted' }, ` ${p.tracks.length} tracks · ${fmt(p.duration || 0)} · ${new Date(p.updated).toLocaleString()}`)),
      h('div', { class: 'row tight' },
        p.id === state.project.id ? h('span', { class: 'chip on' }, 'Open') : h('button', { class: 'btn sm primary', onclick: async () => { setProject(await db.get('projects', p.id)); close(); toast('Opened ' + p.name); } }, 'Open'),
        h('button', { class: 'btn sm', onclick: async () => { const n = await prompt('Rename project', p.name); if (!n || !n.trim()) return; if (p.id === state.project.id) { commit((x) => { x.name = n.trim(); }); emit('project'); } else { p.name = n.trim(); await db.put('projects', p); } close(); projectsDialog(); } }, 'Rename'),
        h('button', { class: 'btn sm', onclick: async () => { const c = JSON.parse(JSON.stringify(p)); c.id = uid('p'); c.name += ' copy'; c.updated = Date.now(); await db.put('projects', c); close(); projectsDialog(); } }, 'Duplicate'),
        h('button', { class: 'btn sm ghost', 'aria-label': 'Delete ' + p.name, onclick: async () => {
          if (!(await confirmBox('Delete “' + p.name + '”?', 'This cannot be undone. Your library media stays.', 'Delete', true))) return;
          await db.del('projects', p.id);
          if (p.id === state.project.id) await loadProject(null);
          close(); projectsDialog();
        } }, icon('trash'))))));
  let closeFn;
  const close = () => closeFn && closeFn();
  const pr = dialog({ title: 'Projects', body, buttons: [{ label: 'Close', value: true, primary: true }], cls: 'wide' });
  closeFn = () => body.closest('.scrim')?.remove();
  await pr;
}

boot().catch((e) => { console.error(e); document.body.append(h('pre', { class: 'fatal' }, 'Mind Movie could not start: ' + (e && e.message))); });
export { findTrack };
