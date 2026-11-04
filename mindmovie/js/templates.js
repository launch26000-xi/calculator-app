// One-tap templates: build a complete looping Mind Movie from the user's affirmations, photos, voice and music.
// Every template works with an empty library too (built-in sunrise / stars / aurora visuals).
import { state, setProject, emit } from './store.js';
import { db, uid } from './db.js';
import { newProject, newTrack, newClip } from './model.js';

export const TEMPLATES = [
  { id: 'golden', icon: '🌅', name: 'Golden Morning', len: 60000, mood: 'Warm, hopeful start to the day',
    desc: 'Sunrise glow, your photos gently zooming, affirmations fading in gold, soft breathing pulse, music with your voice underneath.' },
  { id: 'deep', icon: '🌌', name: 'Deep Subconscious', len: 60000, mood: 'Calm, focused, layered',
    desc: 'Flying through stars, spiral at 15%, 1-per-second flash text with mask frames, three layered copies of your voice, 6 Hz theta tone.' },
  { id: 'energy', icon: '⚡', name: 'Energy & Excitement', len: 45000, mood: 'Upbeat, confident, alive',
    desc: 'Aurora ribbons, words that pop in, fast scrolling affirmations, flashes that follow the beat of your music, sped-up voice.' },
  { id: 'gratitude', icon: '💛', name: 'Gratitude Glow', len: 60000, mood: 'Thankful, loving, open-hearted',
    desc: 'Golden bokeh lights, rising hearts, “Thank you…” lines, a mandala at 12%, your photos and voice.' },
  { id: 'sleep', icon: '🌙', name: 'Sleep Wind-Down', len: 90000, mood: 'Slow, soft, drifting',
    desc: 'Slow stars, soft rings, long gentle fades, your voice low and layered, 4 Hz tone. No flashing.' },
  { id: 'blank', icon: '✨', name: 'Build-As-You-Go Loop', len: 30000, mood: 'Start small, add while it plays',
    desc: 'A 30-second sunrise loop with one affirmation. Press play and keep adding photos, words and voice while it runs.' },
];

const T = (type, name, clips, extra = {}) => { const t = newTrack(type, name); t.clips = clips; Object.assign(t, extra); return t; };
const C = (type, start, dur, props = {}, more = {}) => { const c = newClip(type, { start, dur, ...more }); Object.assign(c.props, props); return c; };

function every(len, seg, fn) { const out = []; let i = 0; for (let s = 0; s + 200 < len; s += seg, i++) out.push(fn(s, Math.min(seg, len - s), i)); return out; }

export function buildTemplate(id, { affirmations, media }) {
  const tpl = TEMPLATES.find((t) => t.id === id);
  const L = tpl.len;
  const photos = media.filter((m) => m.kind === 'image');
  const videos = media.filter((m) => m.kind === 'video');
  const music = media.filter((m) => m.kind === 'audio' && m.sub !== 'voice');
  const voices = media.filter((m) => m.kind === 'audio' && m.sub === 'voice');
  const affs = affirmations.length ? affirmations.map((a) => a.text) : ['I am living the life I love.'];
  const tracks = []; // listed top (front) → bottom (back)
  const zoomKf = (dur, from, to) => ({ scale: [{ t: 0, v: from, e: 'ease' }, { t: dur, v: to, e: 'linear' }] });
  const photoTrack = (seg, opacity, fadeMs, name = 'Photos') => {
    if (!photos.length && !videos.length) return null;
    const pool = [...photos.map((m) => ['photo', m]), ...videos.map((m) => ['video', m])];
    const ph = every(L, seg, (s, d, i) => { const [ty, m] = pool[i % pool.length]; if (ty !== 'photo') return null; const c = C('photo', s, d, { opacity, fadeIn: fadeMs, fadeOut: fadeMs }, { mediaId: m.id }); c.kf = zoomKf(d, 100 + (i % 2) * 6, 112 - (i % 2) * 6); return c; }).filter(Boolean);
    const vt = every(L, seg, (s, d, i) => { const [ty, m] = pool[i % pool.length]; if (ty !== 'video') return null; return C('video', s, d, { opacity, fadeIn: fadeMs, fadeOut: fadeMs, volume: -60 }, { mediaId: m.id }); }).filter(Boolean);
    return [ph.length ? T('photo', name, ph) : null, vt.length ? T('video', 'Video', vt) : null].filter(Boolean);
  };
  const textTrack = (seg, props, name = 'Affirmations', prefix = '') => T('text', name, every(L, seg, (s, d, i) => C('text', s, d, props, { text: prefix + affs[i % affs.length] })));
  const musicTrack = (props = {}) => music.length ? T('music', 'Music', [C('music', 0, L, { loop: true, fadeIn: 1500, fadeOut: 2500, ...props }, { mediaId: music[0].id })]) : null;
  const voiceTrack = (props = {}) => voices.length ? T('voice', 'My voice', voices.map((v, i) => C('voice', 0, L, { loop: true, ...props }, { mediaId: v.id }))
    .map((c, i, all) => { c.start = Math.round((L / all.length) * i); c.dur = L - c.start; return c; })) : null;
  const bg = (patternType, props = {}) => T('pattern', 'Background', [C('pattern', 0, L, { patternType, opacity: 100, rotSpeed: 0, fadeIn: 0, fadeOut: 0, ...props })]);

  switch (id) {
    case 'golden':
      tracks.push(
        textTrack(5000, { fadeIn: 1200, fadeOut: 1200, fontSize: 64, color: '#ffffff', outline: 2.5, outlineColor: '#4a2400', glow: 26, glowColor: '#7a3fa0' }),
        T('color', 'Breathing gold', [C('color', 0, L, { ccolor: '#e8c26a', wave: 'sine', onMs: 2000, offMs: 2000, opacity: 14, blend: 'screen', fadeIn: 2000, fadeOut: 2000 })]),
        ...(photoTrack(5000, 85, 900) || []),
        bg('sunrise', { pcolor: '#ffd27a', pcolor2: '#5a3fa0', density: 12 }),
        musicTrack(), voiceTrack({ volume: -16, copies: 2, copyOffset: 900, spread: 60 }));
      break;
    case 'deep':
      tracks.push(
        T('flash', 'Flash words', [C('flash', 0, L, { onMs: 50, offMs: 950, mask: true, maskMs: 50, maskType: 'scramble', opacity: 70 })]),
        textTrack(6000, { fadeIn: 1500, fadeOut: 1500, fontSize: 54, opacity: 85, glow: 18 }),
        T('pattern', 'Spiral 15%', [C('pattern', 0, L, { patternType: 'spiral', opacity: 15, rotSpeed: 25, density: 10, fadeIn: 3000, fadeOut: 3000 })]),
        ...(photoTrack(6000, 60, 1500) || []),
        bg('starfield', { density: 10, pcolor: '#e8c26a' }),
        musicTrack({ volume: -6 }), voiceTrack({ volume: -14, copies: 3, copyOffset: 700, spread: 80 }),
        T('binaural', 'Theta 6 Hz', [C('binaural', 0, L, { baseHz: 180, beatHz: 6, volume: -26 })]));
      break;
    case 'energy': {
      const flash = C('flash', 0, L, { onMs: 80, offMs: 420, opacity: 90, fontSize: 80, color: '#ffffff', glow: 30, glowColor: '#5ad1ff' });
      const ft = T('flash', 'Beat flashes', [flash]);
      tracks.push(
        ft,
        T('scroll', 'Fast scroll', [C('scroll', 0, L, { scrollSpeed: 520, fontSize: 40, opacity: 75, y: 70, direction: 'left', gap: 90 })]),
        T('text', 'Pop words', every(L, 3000, (s, d, i) => { const c = C('text', s, d, { fadeIn: 150, fadeOut: 250, fontSize: 72, color: '#fff6d8', glow: 26, glowColor: '#ff9f5a', y: -20 }, { text: affs[i % affs.length] }); c.kf = { scale: [{ t: 0, v: 70, e: 'ease' }, { t: 350, v: 108, e: 'ease' }, { t: 600, v: 100, e: 'linear' }] }; return c; })),
        T('pattern', 'Geo pulse', [C('pattern', 0, L, { patternType: 'geo', opacity: 18, rotSpeed: 40, density: 12, pcolor: '#5ad1ff', pcolor2: '#ff7aa8' })]),
        ...(photoTrack(3000, 80, 300) || []),
        bg('aurora', { density: 12, pcolor: '#4fe3a1', pcolor2: '#c58cff' }),
        musicTrack({ volume: -3 }), voiceTrack({ volume: -10, speed: 1.6, pitch: true }));
      const mt = tracks.find((t) => t && t.type === 'music');
      if (mt) flash.follow = { trackId: mt.id, mode: 'beat', offset: 0 };
      break;
    }
    case 'gratitude':
      tracks.push(
        textTrack(6000, { fadeIn: 1500, fadeOut: 1500, fontSize: 58, color: '#fff1f4', glow: 26, glowColor: '#ff9fb8' }, 'Gratitude', 'Thank you — '),
        T('pattern', 'Hearts', [C('pattern', 0, L, { patternType: 'hearts', opacity: 35, rotSpeed: 0, density: 8, pcolor: '#ff9fb8', pcolor2: '#e8c26a' })]),
        T('pattern', 'Mandala 12%', [C('pattern', 0, L, { patternType: 'mandala', opacity: 12, rotSpeed: 6, density: 12, pcolor: '#f5dfa0' })]),
        ...(photoTrack(6000, 80, 1200) || []),
        bg('bokeh', { density: 10, pcolor: '#e8c26a', pcolor2: '#ff9fb8' }),
        musicTrack(), voiceTrack({ volume: -14, copies: 2, copyOffset: 1200 }));
      break;
    case 'sleep':
      tracks.push(
        textTrack(10000, { fadeIn: 3500, fadeOut: 3500, fontSize: 48, opacity: 60, color: '#cfd3ff', glow: 14, glowColor: '#5a4bd6' }),
        T('pattern', 'Soft rings', [C('pattern', 0, L, { patternType: 'rings', opacity: 10, rotSpeed: 0, density: 8, pcolor: '#9aa7ff', pcolor2: '#3a3f8f', speed: 0.5 })]),
        ...(photoTrack(10000, 45, 3000) || []),
        bg('starfield', { density: 6, speed: 0.4, opacity: 80 }),
        musicTrack({ volume: -10 }), voiceTrack({ volume: -18, copies: 2, copyOffset: 2000, speed: 0.9 }),
        T('binaural', 'Delta/theta 4 Hz', [C('binaural', 0, L, { baseHz: 150, beatHz: 4, volume: -28, fadeIn: 8000, fadeOut: 8000 })]));
      break;
    default:
      tracks.push(
        T('text', 'Affirmations', [C('text', 0, L, { fadeIn: 1000, fadeOut: 1000, fontSize: 60, color: '#ffffff', outline: 2.5, outlineColor: '#4a2400', glow: 24, glowColor: '#7a3fa0' }, { text: affs[0] })]),
        bg('sunrise', { density: 10 }));
  }
  const p = newProject(tpl.icon + ' ' + tpl.name);
  p.affirmations = affirmations.length ? JSON.parse(JSON.stringify(affirmations)) : p.affirmations;
  p.tracks = tracks.filter(Boolean);
  p.loop = true;
  p.template = id;
  return p;
}

export async function createFromTemplate(id) {
  const p = buildTemplate(id, { affirmations: state.project ? state.project.affirmations : [], media: [...state.media.values()] });
  p.id = uid('p');
  await db.put('projects', p);
  setProject(p);
  emit('template-built', p);
  return p;
}
