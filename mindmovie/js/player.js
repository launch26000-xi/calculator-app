// Play tab: full-screen playback with scrub bar and exact time readout; marks the day watched.
import { h, icon, toast } from './ui.js';
import { state, on } from './store.js';
import { fmt, frameOf } from './core.js';
import * as engine from './engine.js';
import { beforePlay } from './safety.js';
import { markWatched, streak } from './progress.js';

let root, canvas, scrub, timeEl, playBtn, wrap, loopBtn, warnEl;
let watchedMs = 0, lastT = null;

export function mountPlayer(el) {
  root = el;
  canvas = h('canvas', { class: 'player-cv', 'aria-label': 'Movie' });
  scrub = h('input', { type: 'range', min: 0, max: 1000, step: 1, value: 0, class: 'scrub', 'aria-label': 'Scrub' });
  timeEl = h('output', { class: 'p-time' }, '00:00.000');
  playBtn = h('button', { class: 'btn primary round', 'aria-label': 'Play', onclick: toggle }, icon('play'));
  loopBtn = h('button', { class: 'btn ghost', 'aria-pressed': 'false', onclick: () => { const v = loopBtn.getAttribute('aria-pressed') !== 'true'; loopBtn.setAttribute('aria-pressed', String(v)); loopBtn.classList.toggle('on', v); engine.setLoop(v); toast(v ? 'Loop on' : 'Loop off'); } }, '↻ Loop');
  warnEl = h('div', { class: 'p-warn' });
  const fsBtn = h('button', { class: 'btn ghost', 'aria-label': 'Full screen', onclick: fullscreen }, icon('full'), ' Full screen');
  const back = h('button', { class: 'btn ghost', 'aria-label': 'Back 5 seconds', onclick: () => engine.seek(state.playhead - 5000) }, '−5s');
  const fwd = h('button', { class: 'btn ghost', 'aria-label': 'Forward 5 seconds', onclick: () => engine.seek(state.playhead + 5000) }, '+5s');
  const restart = h('button', { class: 'btn ghost', 'aria-label': 'Restart', onclick: () => engine.seek(0) }, '⇤');
  scrub.addEventListener('input', () => engine.seek((+scrub.value / 1000) * state.project.duration));
  canvas.addEventListener('click', toggle);
  wrap = h('div', { class: 'player' },
    h('div', { class: 'stage' }, canvas, warnEl),
    h('div', { class: 'p-controls' },
      h('div', { class: 'row tight' }, scrub),
      h('div', { class: 'row p-row' }, restart, back, playBtn, fwd, timeEl),
      h('div', { class: 'row p-row' }, loopBtn, fsBtn, h('span', { class: 'muted small p-streak' }))));
  root.append(wrap);
  on('time', update); on('play', update); on('pause', update); on('change', update);
  on('ended', () => { if (state.tab === 'play') finishWatch(true); });
  on('progress', update);
  document.addEventListener('fullscreenchange', () => wrap.classList.toggle('fs', !!document.fullscreenElement));
}

export function show() { engine.addTarget(canvas); update(); }
export function hide() { engine.removeTarget(canvas); if (document.fullscreenElement) document.exitFullscreen().catch(() => {}); }

async function toggle() {
  if (engine.isPlaying()) { engine.pause(); return; }
  if (!state.project.duration) return toast('Your movie is empty — add clips in the Edit tab');
  if (!(await beforePlay(state.project))) return;
  lastT = null;
  engine.play();
}

function finishWatch(ended) {
  const dur = state.project.duration;
  if (dur > 0 && (ended && watchedMs >= dur * 0.6)) { markWatched(); }
  watchedMs = 0;
}

function update() {
  if (!state.project) return;
  const t = state.playhead, dur = state.project.duration;
  if (state.playing && lastT !== null && t > lastT && t - lastT < 1000) watchedMs += t - lastT;
  lastT = state.playing ? t : null;
  if (document.activeElement !== scrub) scrub.value = dur ? Math.round((t / dur) * 1000) : 0;
  timeEl.textContent = `${fmt(t)} / ${fmt(dur)} · f${frameOf(t)}`;
  playBtn.replaceChildren(icon(state.playing ? 'pause' : 'play'));
  playBtn.setAttribute('aria-label', state.playing ? 'Pause' : 'Play');
  const s = streak();
  const st = wrap.querySelector('.p-streak'); if (st) st.textContent = `🔥 ${s.current}-day streak${s.today ? ' · watched today' : ''}`;
  const f = engine.lastFlags || {};
  warnEl.textContent = state.playing && f.capped ? `Safe Mode: flashing limited to 3 per second` : state.playing && f.redBlocked ? 'Safe Mode: red flashing softened' : '';
}

async function fullscreen() {
  try {
    if (document.fullscreenElement) { await document.exitFullscreen(); return; }
    await wrap.requestFullscreen({ navigationUI: 'hide' });
    if (state.project.aspect === '16:9' && screen.orientation?.lock) screen.orientation.lock('landscape').catch(() => {});
    if (state.project.aspect === '9:16' && screen.orientation?.lock) screen.orientation.lock('portrait').catch(() => {});
  } catch (e) { toast('Full screen is not available here'); }
}
