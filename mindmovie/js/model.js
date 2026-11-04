// Track types, clip properties, defaults and starter presets.
import { uid } from './db.js';

export const TRACK_TYPES = {
  video:    { label: 'Video',            short: 'Video',  icon: '▶', color: '#6c8cff', kind: 'visual', media: 'video' },
  photo:    { label: 'Photo',            short: 'Photo',  icon: '▣', color: '#4fc3a1', kind: 'visual', media: 'image' },
  text:     { label: 'Text',             short: 'Text',   icon: 'T', color: '#e8c26a', kind: 'visual' },
  flash:    { label: 'Flash Text',       short: 'Flash',  icon: '⚡', color: '#ff9f5a', kind: 'visual', pulse: true },
  scroll:   { label: 'Speed-Scroll Text',short: 'Scroll', icon: '⇢', color: '#c58cff', kind: 'visual' },
  pattern:  { label: 'Pattern',          short: 'Pattern',icon: '✺', color: '#5ad1ff', kind: 'visual', pulse: true },
  color:    { label: 'Color / Flash',    short: 'Color',  icon: '◐', color: '#ff7aa8', kind: 'visual', pulse: true },
  music:    { label: 'Audio – Music',    short: 'Music',  icon: '♫', color: '#7be07b', kind: 'audio', media: 'audio' },
  voice:    { label: 'Audio – Voice',    short: 'Voice',  icon: '🎙', color: '#ffd36e', kind: 'audio', media: 'audio' },
  binaural: { label: 'Binaural Tone',    short: 'Tone',   icon: '∿', color: '#9aa7ff', kind: 'audio' },
};
export const TRACK_ORDER = Object.keys(TRACK_TYPES);

export const FONTS = [
  ['Georgia, serif', 'Georgia (serif)'],
  ['"Trebuchet MS", sans-serif', 'Trebuchet'],
  ['system-ui, sans-serif', 'Clean sans'],
  ['"Palatino Linotype", Palatino, serif', 'Palatino'],
  ['"Courier New", monospace', 'Typewriter'],
  ['Impact, "Arial Black", sans-serif', 'Bold poster'],
  ['"Brush Script MT", cursive', 'Script'],
];

const P = (key, label, min, max, step, unit, dflt, extra = {}) => ({ key, label, min, max, step, unit, dflt, kf: true, ...extra });

// Property groups
const SPEED = [P('speed', 'Speed', 0.25, 8, 0.05, 'x', 1)];
const VISUAL = [
  P('opacity', 'Opacity', 0, 100, 1, '%', 100),
  P('fadeIn', 'Fade in', 0, 10000, 10, 'ms', 300, { kf: false }),
  P('fadeOut', 'Fade out', 0, 10000, 10, 'ms', 300, { kf: false }),
  P('rotation', 'Rotation', -360, 360, 1, '°', 0),
  P('rotSpeed', 'Rotation speed', -720, 720, 1, '°/s', 0),
  P('scale', 'Scale / zoom', 10, 500, 1, '%', 100),
  P('x', 'X position', -100, 100, 0.5, '%', 0),
  P('y', 'Y position', -100, 100, 0.5, '%', 0),
  P('blur', 'Blur', 0, 50, 0.5, 'px', 0),
  P('brightness', 'Brightness', 0, 200, 1, '%', 100),
  P('contrast', 'Contrast', 0, 200, 1, '%', 100),
  P('hue', 'Hue', -180, 180, 1, '°', 0),
];
const TEXT = [
  { key: 'font', label: 'Font', type: 'select', options: FONTS, dflt: FONTS[0][0] },
  P('fontSize', 'Size', 8, 300, 1, 'px', 56),
  { key: 'color', label: 'Color', type: 'color', dflt: '#f5dfa0' },
  P('letterSpacing', 'Letter spacing', -10, 60, 0.5, 'px', 0),
  P('outline', 'Outline', 0, 20, 0.5, 'px', 0),
  { key: 'outlineColor', label: 'Outline color', type: 'color', dflt: '#0b1030' },
  P('glow', 'Glow', 0, 80, 1, 'px', 12),
  { key: 'glowColor', label: 'Glow color', type: 'color', dflt: '#e8c26a' },
];
const AUDIO = [
  P('volume', 'Volume', -60, 12, 0.5, 'dB', 0),
  P('pan', 'Pan L / R', -100, 100, 1, '', 0),
  { key: 'pitch', label: 'Preserve pitch', type: 'bool', dflt: true },
  { key: 'loop', label: 'Loop to fill clip', type: 'bool', dflt: false },
  P('fadeIn', 'Fade in', 0, 10000, 10, 'ms', 200, { kf: false }),
  P('fadeOut', 'Fade out', 0, 10000, 10, 'ms', 400, { kf: false }),
];
export const WAVES = [['square', 'Square (hard on/off)'], ['sine', 'Sine (smooth breathing)'], ['saw', 'Sawtooth'], ['random', 'Random / jitter']];
const PULSE = [
  P('onMs', 'On time', 17, 10000, 1, 'ms', 50, { kf: false }),
  P('offMs', 'Off time', 0, 10000, 1, 'ms', 950, { kf: false }),
  { key: 'hz', label: 'Frequency', type: 'hz' },
  P('repeat', 'Repeat count (0 = whole clip)', 0, 1000, 1, '', 0, { kf: false }),
  { key: 'wave', label: 'Waveform', type: 'select', options: WAVES, dflt: 'square' },
  { key: 'mask', label: 'Mask frame after each flash', type: 'bool', dflt: false },
  P('maskMs', 'Mask duration', 17, 1000, 1, 'ms', 50, { kf: false }),
  { key: 'maskType', label: 'Mask style', type: 'select', options: [['scramble', 'Scramble'], ['pattern', 'Pattern'], ['black', 'Black frame']], dflt: 'scramble' },
];
export const PATTERNS = [['spiral', 'Spiral'], ['twirl', 'Twirl'], ['rings', 'Concentric rings'], ['mandala', 'Mandala'], ['geo', 'Geometric pulse']];

const FIT = { key: 'fit', label: 'Fit', type: 'select', options: [['cover', 'Fill screen (crop)'], ['contain', 'Show whole picture']], dflt: 'cover' };

function over(list, changes) {
  return list.map((p) => (changes[p.key] !== undefined ? { ...p, dflt: changes[p.key] } : p));
}

export const PROPS = {
  video: [...SPEED, FIT, ...VISUAL, ...over(AUDIO.filter((p) => p.key !== 'loop'), { volume: -6 })],
  photo: [...SPEED, FIT, ...VISUAL],
  text: [...SPEED, ...VISUAL, ...TEXT],
  flash: [...SPEED, ...over(VISUAL, { fadeIn: 0, fadeOut: 0 }), ...over(TEXT, { fontSize: 72, color: '#ffffff' }), ...PULSE],
  scroll: [...SPEED, P('scrollSpeed', 'Scroll speed', 10, 3000, 5, 'px/s', 220),
    { key: 'direction', label: 'Direction', type: 'select', options: [['left', 'Across (right → left)'], ['right', 'Across (left → right)'], ['up', 'Up the screen'], ['down', 'Down the screen']], dflt: 'left' },
    P('gap', 'Gap between lines', 0, 800, 5, 'px', 120, { kf: false }),
    ...over(VISUAL, { fadeIn: 500, fadeOut: 500 }), ...over(TEXT, { fontSize: 44 })],
  pattern: [...SPEED, { key: 'patternType', label: 'Pattern', type: 'select', options: PATTERNS, dflt: 'spiral' },
    { key: 'pcolor', label: 'Pattern color', type: 'color', dflt: '#e8c26a' },
    { key: 'pcolor2', label: 'Second color', type: 'color', dflt: '#5a4bd6' },
    P('density', 'Density', 1, 40, 1, '', 10),
    P('lineWidth', 'Line width', 1, 60, 0.5, 'px', 6),
    { key: 'pulseOn', label: 'Pulse on/off pattern', type: 'bool', dflt: false },
    ...over(VISUAL, { opacity: 15, rotSpeed: 20, fadeIn: 1000, fadeOut: 1000 }),
    ...over(PULSE, { onMs: 2000, offMs: 2000, wave: 'sine' })],
  color: [...SPEED, { key: 'ccolor', label: 'Color', type: 'color', dflt: '#ffffff' },
    { key: 'blend', label: 'Blend', type: 'select', options: [['source-over', 'Normal'], ['screen', 'Glow (screen)'], ['multiply', 'Darken (multiply)'], ['overlay', 'Overlay']], dflt: 'source-over' },
    P('opacity', 'Opacity', 0, 100, 1, '%', 100), P('fadeIn', 'Fade in', 0, 10000, 10, 'ms', 0, { kf: false }), P('fadeOut', 'Fade out', 0, 10000, 10, 'ms', 0, { kf: false }),
    ...over(PULSE, { onMs: 33, offMs: 967 })],
  music: [...SPEED, ...over(AUDIO, { loop: true, fadeIn: 1000, fadeOut: 2000 })],
  voice: [...SPEED, ...over(AUDIO, { volume: -6 }),
    P('copies', 'Layered copies', 1, 8, 1, '', 1, { kf: false }),
    P('copyOffset', 'Offset between copies', 0, 8000, 10, 'ms', 700, { kf: false }),
    P('spread', 'Copy stereo spread', 0, 100, 1, '%', 60, { kf: false })],
  binaural: [P('baseHz', 'Carrier tone', 60, 600, 1, 'Hz', 200),
    P('beatHz', 'Beat (left/right offset)', 0.5, 40, 0.1, 'Hz', 6),
    P('volume', 'Volume', -60, 0, 0.5, 'dB', -24),
    P('fadeIn', 'Fade in', 0, 20000, 10, 'ms', 3000, { kf: false }), P('fadeOut', 'Fade out', 0, 20000, 10, 'ms', 3000, { kf: false })],
};

export function propDef(type, key) { return PROPS[type].find((p) => p.key === key); }

export function defaultProps(type) {
  const o = {};
  for (const p of PROPS[type]) if (p.dflt !== undefined) o[p.key] = p.dflt;
  return o;
}

const DEFAULT_DUR = { photo: 4000, text: 4000, flash: 10000, scroll: 15000, pattern: 30000, color: 10000, binaural: 60000, video: 5000, music: 30000, voice: 5000 };

export function newClip(type, { start = 0, dur, mediaId = null, text = '' } = {}) {
  return { id: uid('c'), start: Math.round(start), dur: Math.round(dur || DEFAULT_DUR[type]), srcIn: 0, mediaId, text, props: defaultProps(type), kf: {}, follow: null };
}

export function newTrack(type, name) {
  const t = TRACK_TYPES[type];
  return { id: uid('t'), type, name: name || t.label, color: t.color, mute: false, solo: false, lock: false, hidden: false, kfOpen: false, clips: [] };
}

export function newProject(name = 'My Mind Movie') {
  return { id: uid('p'), name, created: Date.now(), updated: Date.now(), aspect: '16:9', duration: 0, tracks: [], affirmations: [
    { id: uid('a'), text: 'I am calm, focused and grateful.' },
    { id: uid('a'), text: 'I have everything I need to succeed.' },
    { id: uid('a'), text: 'I am healthy, strong and full of energy.' },
  ] };
}

export function projectEnd(p) {
  let end = 0;
  for (const t of p.tracks) for (const c of t.clips) end = Math.max(end, c.start + c.dur);
  return end;
}

export const STARTER_PRESETS = [
  { id: 'sp1', name: 'Gentle Fade Affirmation', type: 'text', props: { fadeIn: 1200, fadeOut: 1200, fontSize: 64, color: '#f5dfa0', glow: 24, glowColor: '#e8c26a' } },
  { id: 'sp2', name: 'Fast Scroll', type: 'scroll', props: { scrollSpeed: 700, fontSize: 48, direction: 'left', gap: 80, opacity: 80 } },
  { id: 'sp3', name: 'Spiral 15 percent', type: 'pattern', props: { patternType: 'spiral', opacity: 15, rotSpeed: 30, density: 10 } },
  { id: 'sp4', name: 'Voice Under Music', type: 'voice', props: { volume: -18, copies: 2, copyOffset: 750, spread: 70, loop: true } },
  { id: 'sp5', name: 'Breathing Gold Pulse', type: 'color', props: { ccolor: '#e8c26a', wave: 'sine', onMs: 2000, offMs: 2000, opacity: 22, blend: 'screen' } },
  { id: 'sp6', name: 'Flash + Mask 50 ms', type: 'flash', props: { onMs: 50, offMs: 1950, mask: true, maskMs: 50, maskType: 'scramble' } },
  { id: 'sp7', name: 'Speed-Up Voice 2x', type: 'voice', props: { speed: 2, pitch: true, volume: -10 } },
  { id: 'sp8', name: 'Whisper Flash 1 frame', type: 'flash', props: { onMs: 17, offMs: 983, opacity: 35, fontSize: 60, glow: 0 } },
  { id: 'sp9', name: 'Mandala Glow 20 percent', type: 'pattern', props: { patternType: 'mandala', opacity: 20, rotSpeed: 8, density: 12, pcolor: '#f5dfa0' } },
  { id: 'sp10', name: 'Slow Zoom Photo', type: 'photo', props: { fadeIn: 800, fadeOut: 800 }, kf: { scale: [{ t: 0, v: 100, e: 'ease' }, { t: 4000, v: 118, e: 'linear' }] } },
  { id: 'sp11', name: 'Alpha Tone 10 Hz', type: 'binaural', props: { baseHz: 200, beatHz: 10, volume: -24 } },
  { id: 'sp12', name: 'Theta Tone 6 Hz', type: 'binaural', props: { baseHz: 180, beatHz: 6, volume: -24 } },
];
