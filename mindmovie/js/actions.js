// Editing operations shared by the Library and the Edit screen.
import { state, commit, findTrack, findClip, select, emit } from './store.js';
import { newTrack, newClip, TRACK_TYPES, STARTER_PRESETS } from './model.js';
import { db, uid } from './db.js';

function clone(o) { return JSON.parse(JSON.stringify(o)); }

export function addTrack(type, name) {
  const t = newTrack(type, name);
  commit((p) => { p.tracks.unshift(t); });
  select(t.id, null);
  return t;
}

// Puts a clip on the selected track (if same type) at the playhead, or after its last clip if overlapping; otherwise a new track.
export function addClip(type, opts = {}) {
  const p = state.project;
  let track = state.sel.trackId ? findTrack(state.sel.trackId) : null;
  if (!track || track.type !== type || track.lock) track = null;
  const clip = newClip(type, { start: opts.start ?? state.playhead, dur: opts.dur, mediaId: opts.mediaId, text: opts.text || '' });
  if (opts.props) Object.assign(clip.props, opts.props);
  if (type === 'voice' && opts.dur) clip.dur = opts.dur;
  commit((proj) => {
    let tr = track ? proj.tracks.find((t) => t.id === track.id) : null;
    if (!tr) {
      tr = newTrack(type, opts.trackName || TRACK_TYPES[type].label);
      proj.tracks.unshift(tr);
    }
    // avoid overlap on the same track: push to the end of overlapping clip
    let moved = true;
    while (moved) {
      moved = false;
      for (const c of tr.clips) {
        if (clip.start < c.start + c.dur && clip.start + clip.dur > c.start) { clip.start = c.start + c.dur; moved = true; }
      }
    }
    tr.clips.push(clip);
    tr.clips.sort((a, b) => a.start - b.start);
    track = tr;
  });
  select(track.id, clip.id);
  void p;
  return clip;
}

export function deleteClip(clipId) {
  commit((p) => { for (const t of p.tracks) t.clips = t.clips.filter((c) => c.id !== clipId); });
  if (state.sel.clipId === clipId) select(state.sel.trackId, null);
}

export function duplicateClip(clipId) {
  const f = findClip(clipId); if (!f) return;
  const c = clone(f.clip); c.id = uid('c'); c.start = f.clip.start + f.clip.dur;
  commit((p) => {
    const t = p.tracks.find((x) => x.id === f.track.id);
    let moved = true;
    while (moved) { moved = false; for (const o of t.clips) if (c.start < o.start + o.dur && c.start + c.dur > o.start) { c.start = o.start + o.dur; moved = true; } }
    t.clips.push(c); t.clips.sort((a, b) => a.start - b.start);
  });
  select(f.track.id, c.id);
}

export function splitClip(clipId, at) {
  const f = findClip(clipId); if (!f) return false;
  const c = f.clip;
  if (at <= c.start + 1 || at >= c.start + c.dur - 1) return false;
  commit((p) => {
    const t = p.tracks.find((x) => x.id === f.track.id);
    const a = t.clips.find((x) => x.id === clipId);
    const b = clone(a); b.id = uid('c');
    const cut = at - a.start;
    const sp = a.props.speed || 1;
    a.dur = cut;
    b.start = at; b.dur = c.dur - cut; b.srcIn = (a.srcIn || 0) + cut * sp;
    // keyframes: shift
    for (const k of Object.keys(b.kf || {})) b.kf[k] = b.kf[k].map((x) => ({ ...x, t: x.t - cut })).filter((x) => x.t >= 0);
    for (const k of Object.keys(a.kf || {})) a.kf[k] = a.kf[k].filter((x) => x.t <= cut);
    t.clips.push(b); t.clips.sort((x, y) => x.start - y.start);
  });
  return true;
}

export function moveTrack(trackId, toIndex) {
  commit((p) => {
    const i = p.tracks.findIndex((t) => t.id === trackId);
    if (i < 0) return;
    const [t] = p.tracks.splice(i, 1);
    p.tracks.splice(Math.max(0, Math.min(p.tracks.length, toIndex)), 0, t);
  });
}

export function duplicateTrack(trackId) {
  const t = findTrack(trackId); if (!t) return;
  const c = clone(t); c.id = uid('t'); c.name = t.name + ' copy';
  c.clips.forEach((x) => { x.id = uid('c'); });
  commit((p) => { const i = p.tracks.findIndex((x) => x.id === trackId); p.tracks.splice(i, 0, c); });
  select(c.id, null);
}

export function deleteTrack(trackId) {
  commit((p) => {
    p.tracks = p.tracks.filter((t) => t.id !== trackId);
    for (const t of p.tracks) for (const c of t.clips) if (c.follow && c.follow.trackId === trackId) c.follow = null;
  });
  if (state.sel.trackId === trackId) select(null, null);
}

export function setTrack(trackId, changes, merge) {
  commit((p) => { const t = p.tracks.find((x) => x.id === trackId); Object.assign(t, changes); }, { merge });
}

export function setClip(clipId, fn, merge) {
  commit((p) => { for (const t of p.tracks) { const c = t.clips.find((x) => x.id === clipId); if (c) { fn(c, t); return; } } }, { merge });
}

// ----- presets -----
export async function loadPresets() {
  const user = await db.all('presets');
  state.presets = [...STARTER_PRESETS.map((p) => ({ ...p, starter: true })), ...user.sort((a, b) => a.created - b.created)];
  emit('presets');
}
export async function savePreset(name, clip, type) {
  const rec = { id: uid('pr'), name, type, props: clone(clip.props), kf: clone(clip.kf || {}), created: Date.now() };
  await db.put('presets', rec);
  await loadPresets();
  return rec;
}
export async function deletePreset(id) { await db.del('presets', id); await loadPresets(); }
export function applyPreset(clipId, preset) {
  setClip(clipId, (c) => {
    Object.assign(c.props, clone(preset.props));
    if (preset.kf && Object.keys(preset.kf).length) c.kf = { ...c.kf, ...clone(preset.kf) };
  });
}
