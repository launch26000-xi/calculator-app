// Pure timing math: time formatting, keyframes, speed integration, pulse patterns, safety caps.
import { propDef } from './model.js';

export const timing = { hz: 60, frameMs: 1000 / 60, jitter: 0, measured: false, samples: 0 };

export function fmt(ms) {
  const neg = ms < 0; ms = Math.abs(Math.round(ms));
  const m = Math.floor(ms / 60000), s = Math.floor((ms % 60000) / 1000), r = ms % 1000;
  return (neg ? '-' : '') + String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0') + '.' + String(r).padStart(3, '0');
}
export function frameOf(ms) { return Math.floor((ms * timing.hz) / 1000 + 1e-6); }
export function frameToMs(f) { return (f * 1000) / timing.hz; }

// Accepts "mm:ss.mmm", "m:ss", "12.5" (seconds), "350ms", "f120" (frame number).
export function parseTime(str) {
  str = String(str).trim().toLowerCase();
  if (!str) return NaN;
  if (/^f\d+$/.test(str)) return Math.round(frameToMs(parseInt(str.slice(1), 10)));
  if (/^-?\d+(\.\d+)?\s*ms$/.test(str)) return Math.round(parseFloat(str));
  const parts = str.split(':');
  if (parts.length > 3 || parts.some((p) => p === '' || isNaN(Number(p)))) return NaN;
  let total = 0;
  for (const p of parts) total = total * 60 + Number(p);
  return Math.round(total * 1000);
}

const COMMON = [24, 30, 48, 50, 60, 72, 75, 90, 100, 120, 144, 165, 240];
export function measureRefresh(frames = 90) {
  return new Promise((resolve) => {
    const ts = [];
    function step(t) {
      ts.push(t);
      if (ts.length < frames) requestAnimationFrame(step);
      else {
        const d = [];
        for (let i = 1; i < ts.length; i++) d.push(ts[i] - ts[i - 1]);
        d.sort((a, b) => a - b);
        const med = d[Math.floor(d.length / 2)] || 16.667;
        let hz = 1000 / med;
        const near = COMMON.find((c) => Math.abs(c - hz) / c < 0.04);
        if (near) hz = near;
        const mean = d.reduce((a, b) => a + b, 0) / d.length;
        const jitter = Math.sqrt(d.reduce((a, b) => a + (b - mean) ** 2, 0) / d.length);
        Object.assign(timing, { hz: Math.round(hz * 100) / 100, frameMs: 1000 / hz, jitter, measured: true, samples: d.length, median: med });
        resolve(timing);
      }
    }
    requestAnimationFrame(step);
  });
}

// ---------- keyframes ----------
const ease = (x) => (x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2);
export function kfValue(list, t) {
  if (!list || !list.length) return undefined;
  if (t <= list[0].t) return list[0].v;
  const last = list[list.length - 1];
  if (t >= last.t) return last.v;
  for (let i = 0; i < list.length - 1; i++) {
    const a = list[i], b = list[i + 1];
    if (t >= a.t && t <= b.t) {
      const span = b.t - a.t || 1;
      let x = (t - a.t) / span;
      if (a.e === 'step') return a.v;
      if (a.e === 'ease') x = ease(x);
      return a.v + (b.v - a.v) * x;
    }
  }
  return last.v;
}

export function val(clip, key, tLocal) {
  const k = clip.kf && clip.kf[key];
  if (k && k.length) return kfValue(k, tLocal);
  return clip.props[key];
}

// Internal time (ms) after applying speed (keyframed speed is integrated).
export function internalTime(clip, tLocal) {
  const k = clip.kf && clip.kf.speed;
  if (!k || !k.length) return tLocal * (clip.props.speed ?? 1);
  const step = 20;
  let acc = 0, t = 0;
  while (t + step <= tLocal) { acc += step * (kfValue(k, t + step / 2)); t += step; }
  acc += (tLocal - t) * kfValue(k, (t + tLocal) / 2);
  return acc;
}

export function fadeEnv(clip, tLocal) {
  const fi = clip.props.fadeIn || 0, fo = clip.props.fadeOut || 0;
  let g = 1;
  if (fi > 0 && tLocal < fi) g = Math.min(g, tLocal / fi);
  if (fo > 0 && tLocal > clip.dur - fo) g = Math.min(g, (clip.dur - tLocal) / fo);
  return Math.max(0, Math.min(1, g));
}

// ---------- safety ----------
export const SAFE_HZ = 3;
export function hexToRgb(h) {
  h = (h || '#000').replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const n = parseInt(h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
export function isSaturatedRed(hex) {
  const [r, g, b] = hexToRgb(hex).map((x) => x / 255);
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
  if (mx === 0) return false;
  const sat = (mx - mn) / mx;
  let hue = 0;
  if (mx === r) hue = ((g - b) / (mx - mn || 1)) * 60;
  if (hue < 0) hue += 360;
  return mx === r && sat > 0.6 && mx > 0.45 && (hue < 25 || hue > 335);
}
export function desaturate(hex) {
  const [r, g, b] = hexToRgb(hex);
  const y = Math.round(0.3 * r + 0.59 * g + 0.11 * b);
  const mix = (c) => Math.round(c * 0.2 + y * 0.8);
  return '#' + [mix(r), mix(g), mix(b)].map((x) => x.toString(16).padStart(2, '0')).join('');
}

export function hzOf(on, off) { const p = on + off; return p > 0 ? 1000 / p : 0; }

// The timing actually used for playback, after Safe Mode caps.
export function effectivePulse(props, safe) {
  let on = Math.max(1, props.onMs), off = Math.max(0, props.offMs);
  const hz = hzOf(on, off);
  let capped = false;
  if (safe && hz > SAFE_HZ) {
    // keep the flash length, stretch the gap so there are at most 3 flashes per second
    off = 1000 / SAFE_HZ - on; capped = true;
  }
  return { on, off, hz, effHz: hzOf(on, off), capped };
}

// Pulse level 0..1 and mask flag at internal time ti. beats = sorted ms list (clip-local) when following music.
export function pulseAt(props, ti, safe, beats) {
  const { on, off } = effectivePulse(props, safe);
  const period = on + off;
  const wave = props.wave || 'square';
  const maskMs = props.mask ? props.maskMs : 0;
  if (beats) {
    // flash starts on each beat
    let lo = 0, hi = beats.length - 1, idx = -1;
    while (lo <= hi) { const m = (lo + hi) >> 1; if (beats[m] <= ti) { idx = m; lo = m + 1; } else hi = m - 1; }
    if (idx < 0) return { level: 0, mask: false, cycle: -1 };
    if (props.repeat > 0 && idx >= props.repeat) return { level: 0, mask: false, cycle: idx };
    const d = ti - beats[idx];
    if (d < on) return { level: wave === 'sine' ? Math.sin((Math.PI * d) / on) : 1, mask: false, cycle: idx };
    if (maskMs && d < on + maskMs) return { level: 0, mask: true, cycle: idx };
    return { level: 0, mask: false, cycle: idx };
  }
  if (period <= 0) return { level: 1, mask: false, cycle: 0 };
  const cycle = Math.floor(ti / period);
  if (props.repeat > 0 && cycle >= props.repeat) return { level: 0, mask: false, cycle };
  const ph = ti - cycle * period;
  let level;
  switch (wave) {
    case 'sine': level = 0.5 - 0.5 * Math.cos((2 * Math.PI * ph) / period); break;
    case 'saw': level = ph / period; break;
    case 'random': {
      const r = rand(cycle);
      level = ph < on * (0.4 + 1.2 * r) ? 0.4 + 0.6 * rand(cycle + 77) : 0; break;
    }
    default: level = ph < on ? 1 : 0;
  }
  const mask = !!maskMs && ph >= on && ph < on + maskMs && wave !== 'sine';
  return { level, mask, cycle };
}
// Safe-mode beat thinning: keep only beats at least 333 ms after the previously kept beat.
export function thinBeats(beats) {
  const out = []; let last = -1e9;
  for (const b of beats) if (b - last >= 1000 / SAFE_HZ) { out.push(b); last = b; }
  return out;
}
export function rand(n) { const x = Math.sin(n * 12.9898 + 78.233) * 43758.5453; return x - Math.floor(x); }

export function clampProp(type, key, v) {
  const d = propDef(type, key);
  if (!d || d.min === undefined) return v;
  return Math.min(d.max, Math.max(d.min, v));
}
export function dbToGain(db) { return db <= -60 ? 0 : Math.pow(10, db / 20); }
