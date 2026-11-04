// Playback engine: master clock, rAF render loop, video sync, Web Audio mix, binaural tones, beat analysis.
import { state, emit, mediaUrl } from './store.js';
import { TRACK_TYPES } from './model.js';
import { val, internalTime, fadeEnv, dbToGain, timing } from './core.js';
import { draw, activeTracks, ASPECTS } from './renderer.js';

let actx = null, master = null, streamDest = null;
export function audioCtx() {
  if (!actx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    actx = new AC({ latencyHint: 'interactive' });
    master = actx.createGain();
    master.connect(actx.destination);
    streamDest = actx.createMediaStreamDestination();
    master.connect(streamDest);
  }
  if (actx.state === 'suspended') actx.resume();
  return actx;
}
export function exportAudioStream() { audioCtx(); return streamDest.stream; }

// ---------- clock ----------
const clock = { playing: false, t0: 0, perf0: 0, loop: false, end: null };
export function now() { return clock.playing ? clock.t0 + (performance.now() - clock.perf0) : state.playhead; }
export function play(from) {
  audioCtx();
  if (from !== undefined) state.playhead = from;
  const dur = state.project.duration;
  if (state.playhead >= dur - 5) state.playhead = 0;
  clock.t0 = state.playhead; clock.perf0 = performance.now(); clock.playing = true;
  state.playing = true;
  emit('play');
}
export function pause() {
  if (!clock.playing) return;
  state.playhead = now();
  clock.playing = false; state.playing = false;
  syncMedia(state.playhead, false);
  emit('pause');
}
export function seek(t) {
  t = Math.max(0, Math.min(t, Math.max(state.project.duration, 0)));
  state.playhead = t;
  if (clock.playing) { clock.t0 = t; clock.perf0 = performance.now(); }
  syncMedia(t, clock.playing, true);
  emit('time', t);
}
export function isPlaying() { return clock.playing; }

// ---------- render targets ----------
const targets = new Set();
export function addTarget(canvas) { targets.add(canvas); }
export function removeTarget(canvas) { targets.delete(canvas); }
export function canvasSize() { return ASPECTS[state.project.aspect] || ASPECTS['16:9']; }
export let lastFlags = {};

const images = new Map();
function getImage(id) {
  if (!id) return null;
  let im = images.get(id);
  if (!im) { im = new Image(); im.src = mediaUrl(id) || ''; images.set(id, im); }
  return im;
}

let frameCount = 0, lastFrameT = 0;
export const frameStats = { fps: 0, last: [] };
function loop(ts) {
  requestAnimationFrame(loop);
  if (!state.project) return;
  if (lastFrameT) { const d = ts - lastFrameT; frameStats.last.push(d); if (frameStats.last.length > 60) frameStats.last.shift(); }
  lastFrameT = ts;
  let t = now();
  if (clock.playing) {
    const dur = state.project.duration;
    if (t >= dur) {
      if (clock.loop && dur > 0) { clock.t0 = 0; clock.perf0 = performance.now(); t = 0; }
      else { state.playhead = dur; clock.playing = false; state.playing = false; syncMedia(dur, false); emit('pause'); emit('ended'); t = dur; }
    }
    state.playhead = t;
    emit('time', t);
  }
  syncMedia(t, clock.playing);
  if (!targets.size) return;
  const [W, H] = canvasSize();
  for (const cv of targets) {
    if (!cv.isConnected && !cv.__offscreenOK) continue;
    if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; }
    lastFlags = draw(cv.getContext('2d'), W, H, state.project, t, { safe: state.safe, getImage, getVideo, getBeats });
  }
  frameCount++;
}
requestAnimationFrame(loop);
export function setLoop(v) { clock.loop = v; }

// ---------- media sync ----------
const videos = new Map();   // clipId -> { el, mediaId, node }
const audios = new Map();   // clipId:copy -> { el, mediaId, gain, pan, node }
const tones = new Map();    // clipId -> { l, r, gain }

function getVideo(clip) { const v = videos.get(clip.id); return v ? v.el : null; }

function mkMedia(tag, mediaId) {
  const el = document.createElement(tag);
  el.src = mediaUrl(mediaId) || '';
  el.preload = 'auto';
  el.playsInline = true;
  el.setAttribute('playsinline', '');
  el.crossOrigin = 'anonymous';
  return el;
}
function routeThroughAudio(entry) {
  if (!actx || entry.gain) return;
  try {
    entry.node = actx.createMediaElementSource(entry.el);
    entry.pan = actx.createStereoPanner();
    entry.gain = actx.createGain();
    entry.node.connect(entry.pan).connect(entry.gain).connect(master);
    entry.el.volume = 1;
  } catch (e) { console.warn('route', e); }
}

function audible(track, anySolo) { return !track.mute && (!anySolo || track.solo); }

function syncEl(entry, srcSec, rate, playing, gain, pan, pitch, force) {
  const el = entry.el;
  routeThroughAudio(entry);
  if (Math.abs(el.playbackRate - rate) > 0.001) el.playbackRate = Math.min(16, Math.max(0.0625, rate));
  if ('preservesPitch' in el) el.preservesPitch = pitch; else if ('webkitPreservesPitch' in el) el.webkitPreservesPitch = pitch;
  if (entry.gain) { entry.gain.gain.setTargetAtTime(gain, actx.currentTime, 0.01); entry.pan.pan.setTargetAtTime(Math.max(-1, Math.min(1, pan)), actx.currentTime, 0.01); }
  else el.volume = Math.max(0, Math.min(1, gain));
  const tol = playing ? 0.12 * Math.max(1, rate) : 0.02;
  if (el.readyState >= 1 && (force || Math.abs(el.currentTime - srcSec) > tol)) {
    try { el.currentTime = Math.max(0, srcSec); } catch (e) { /* not seekable yet */ }
  }
  if (playing && el.paused) el.play().catch(() => {});
  if (!playing && !el.paused) el.pause();
}

export function syncMedia(t, playing, force = false) {
  const p = state.project; if (!p) return;
  const anySolo = p.tracks.some((tr) => tr.solo);
  const seenV = new Set(), seenA = new Set(), seenT = new Set();
  for (const tr of p.tracks) {
    const kind = TRACK_TYPES[tr.type];
    for (const c of tr.clips) {
      const tl = t - c.start;
      const active = tl >= 0 && tl < c.dur;
      const soon = tl >= -3000 && tl < c.dur;
      if (tr.type === 'video' && c.mediaId) {
        if (!soon) continue;
        let e = videos.get(c.id);
        if (!e || e.mediaId !== c.mediaId) { if (e) e.el.pause(); e = { el: mkMedia('video', c.mediaId), mediaId: c.mediaId }; e.el.muted = false; videos.set(c.id, e); }
        seenV.add(c.id);
        const visible = !tr.hidden && (!anySolo || tr.solo);
        const run = active && visible;
        const src = (c.srcIn + internalTime(c, Math.max(0, tl))) / 1000;
        const g = run && audible(tr, anySolo) ? dbToGain(val(c, 'volume', tl)) * fadeEnv(c, tl) : 0;
        syncEl(e, src, val(c, 'speed', tl) || 1, playing && run, g, (val(c, 'pan', tl) || 0) / 100, c.props.pitch !== false, force);
      } else if ((tr.type === 'music' || tr.type === 'voice') && c.mediaId) {
        const copies = tr.type === 'voice' ? Math.max(1, c.props.copies || 1) : 1;
        const m = state.media.get(c.mediaId);
        const mdur = (m && m.duration) || 0;
        for (let k = 0; k < copies; k++) {
          const key = c.id + ':' + k;
          const tk = tl - k * (c.props.copyOffset || 0);
          const act = tk >= 0 && tl < c.dur;
          if (!(tk >= -3000 && tl < c.dur)) continue;
          let e = audios.get(key);
          if (!e || e.mediaId !== c.mediaId) { if (e) e.el.pause(); e = { el: mkMedia('audio', c.mediaId), mediaId: c.mediaId }; audios.set(key, e); }
          seenA.add(key);
          let src = (c.srcIn + internalTime(c, Math.max(0, tk))) / 1000;
          let run = act && audible(tr, anySolo);
          if (mdur > 0 && src >= mdur / 1000) {
            if (c.props.loop) src = (src % (mdur / 1000)); else run = false;
          }
          const spread = copies > 1 ? ((c.props.spread || 0) / 100) * (k % 2 ? -1 : 1) * Math.ceil(k / 2) / Math.ceil((copies - 1) / 2 || 1) : 0;
          const g = run ? dbToGain(val(c, 'volume', tl)) * fadeEnv(c, tl) : 0;
          syncEl(e, src, val(c, 'speed', tl) || 1, playing && run, g, (val(c, 'pan', tl) || 0) / 100 + spread, c.props.pitch !== false, force);
        }
      } else if (tr.type === 'binaural') {
        if (!active || !actx) continue;
        seenT.add(c.id);
        let e = tones.get(c.id);
        if (!e) {
          const l = actx.createOscillator(), r = actx.createOscillator();
          const merger = actx.createChannelMerger(2);
          const gain = actx.createGain(); gain.gain.value = 0;
          l.connect(merger, 0, 0); r.connect(merger, 0, 1);
          merger.connect(gain).connect(master);
          l.start(); r.start();
          e = { l, r, gain, merger }; tones.set(c.id, e);
        }
        const base = val(c, 'baseHz', tl), beat = val(c, 'beatHz', tl);
        e.l.frequency.setTargetAtTime(base, actx.currentTime, 0.02);
        e.r.frequency.setTargetAtTime(base + beat, actx.currentTime, 0.02);
        const g = playing && audible(tr, anySolo) ? dbToGain(val(c, 'volume', tl)) * fadeEnv(c, tl) : 0;
        e.gain.gain.setTargetAtTime(g, actx.currentTime, 0.03);
      }
      void kind;
    }
  }
  for (const [k, e] of videos) if (!seenV.has(k)) { e.el.pause(); if (e.gain) { e.node.disconnect(); } e.el.removeAttribute('src'); e.el.load(); videos.delete(k); }
  for (const [k, e] of audios) if (!seenA.has(k)) { e.el.pause(); if (e.gain) { e.node.disconnect(); } e.el.removeAttribute('src'); e.el.load(); audios.delete(k); }
  for (const [k, e] of tones) if (!seenT.has(k)) { try { e.l.stop(); e.r.stop(); e.gain.disconnect(); } catch (er) { /* */ } tones.delete(k); }
}

export function resetMedia() {
  images.clear();
  for (const e of videos.values()) e.el.pause();
  for (const e of audios.values()) e.el.pause();
  videos.clear(); audios.clear();
}
export function dropImage(id) { images.delete(id); }

// ---------- beat detection ----------
const beatCache = new Map(); // mediaId -> {beats, bpm, firstBeat} | 'pending'
export async function analyzeBeats(mediaId) {
  if (beatCache.has(mediaId) && beatCache.get(mediaId) !== 'pending') return beatCache.get(mediaId);
  const m = state.media.get(mediaId);
  if (!m) return null;
  if (m.beats) { beatCache.set(mediaId, m.beats); return m.beats; }
  beatCache.set(mediaId, 'pending');
  const buf = await m.blob.arrayBuffer();
  const ctx = audioCtx();
  const audio = await new Promise((res, rej) => ctx.decodeAudioData(buf, res, rej));
  const info = detectBeats(audio);
  beatCache.set(mediaId, info);
  m.beats = info;
  const { putMedia } = await import('./store.js');
  await putMedia(m);
  emit('beats', mediaId);
  return info;
}

export function detectBeats(audio) {
  const sr = audio.sampleRate;
  const ch = audio.numberOfChannels;
  const n = audio.length;
  const hop = 512;
  const frames = Math.floor(n / hop);
  const env = new Float32Array(frames);
  const data = []; for (let c = 0; c < ch; c++) data.push(audio.getChannelData(c));
  // low-pass (~150 Hz) energy emphasises kick drums; plus some full-band energy
  let lp = 0; const a = Math.exp(-2 * Math.PI * 150 / sr);
  for (let f = 0; f < frames; f++) {
    let e = 0, eFull = 0;
    for (let i = f * hop; i < (f + 1) * hop; i++) {
      let s = 0; for (let c = 0; c < ch; c++) s += data[c][i]; s /= ch;
      lp = (1 - a) * s + a * lp;
      e += lp * lp; eFull += s * s;
    }
    env[f] = Math.sqrt(e / hop) * 2 + Math.sqrt(eFull / hop) * 0.5;
  }
  const onset = new Float32Array(frames);
  for (let f = 1; f < frames; f++) onset[f] = Math.max(0, env[f] - env[f - 1]);
  const fps = sr / hop;
  let best = 0, bestLag = Math.round(fps * 0.5);
  for (let bpm = 60; bpm <= 180; bpm += 0.5) {
    const lag = (60 / bpm) * fps;
    let s = 0;
    for (let f = 0; f + lag * 4 < frames; f += 2) {
      const l1 = Math.round(f + lag), l2 = Math.round(f + lag * 2);
      s += onset[f] * (onset[l1] + 0.5 * onset[l2]);
    }
    s *= 1 + 0.15 * Math.exp(-((bpm - 120) ** 2) / 1800); // mild preference near 120
    if (s > best) { best = s; bestLag = lag; }
  }
  // phase
  let bestPh = 0, bestSum = -1;
  for (let ph = 0; ph < bestLag; ph++) {
    let s = 0; for (let f = ph; f < frames; f += bestLag) s += onset[Math.round(f)] || 0;
    if (s > bestSum) { bestSum = s; bestPh = ph; }
  }
  const beats = [];
  const win = Math.max(1, Math.round(bestLag * 0.1));
  for (let f = bestPh; f < frames; f += bestLag) {
    let pk = Math.round(f), pv = -1;
    for (let j = Math.round(f) - win; j <= Math.round(f) + win; j++) if (j >= 0 && j < frames && onset[j] > pv) { pv = onset[j]; pk = j; }
    beats.push(Math.round((pk / fps) * 1000));
  }
  const bpm = Math.round((60 * fps / bestLag) * 10) / 10;
  return { bpm, beats, firstBeat: beats[0] || 0 };
}

// Beat times (clip-local ms of the follower clip) from the music clips on `track`.
export function getBeats(track, follower) {
  const out = []; let bpm = 0;
  for (const c of track.clips) {
    if (!c.mediaId) continue;
    const info = beatCache.get(c.mediaId);
    if (!info || info === 'pending') { analyzeBeats(c.mediaId).catch(() => {}); continue; }
    bpm = info.bpm;
    const sp = c.props.speed || 1;
    const m = state.media.get(c.mediaId);
    const mdur = (m && m.duration) || 0;
    const reps = c.props.loop && mdur ? Math.ceil((c.dur * sp) / mdur) + 1 : 1;
    for (let r = 0; r < reps; r++) for (const b of info.beats) {
      const src = b + r * mdur - c.srcIn;
      if (src < 0) continue;
      const pt = c.start + src / sp;
      if (pt > c.start + c.dur) break;
      out.push(pt - follower.start);
    }
  }
  if (!out.length) return null;
  out.sort((a, b) => a - b);
  return { beats: out, bpm: bpm * ((track.clips[0]?.props.speed) || 1), firstBeat: out[0] };
}
export function beatInfo(mediaId) { const b = beatCache.get(mediaId); return b === 'pending' ? null : b; }

export function liveFrameRate() {
  const l = frameStats.last; if (!l.length) return 0;
  const s = [...l].sort((a, b) => a - b);
  return 1000 / s[Math.floor(s.length / 2)];
}
export function framesDrawn() { return frameCount; }
export { activeTracks, timing };
