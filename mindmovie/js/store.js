// App state, undo/redo (100 steps), autosave, media cache.
import { db } from './db.js';
import { newProject, projectEnd } from './model.js';
import { timing } from './core.js';

const listeners = new Map();
export function on(ev, fn) { if (!listeners.has(ev)) listeners.set(ev, new Set()); listeners.get(ev).add(fn); return () => listeners.get(ev).delete(fn); }
export function emit(ev, data) { (listeners.get(ev) || []).forEach((fn) => { try { fn(data); } catch (e) { console.error(e); } }); }

export const state = {
  project: null,
  sel: { trackId: null, clipId: null },
  playhead: 0,
  playing: false,
  zoom: 60,          // pixels per second on the timeline
  snap: true,
  grid: 100,         // ms; 'frame' handled by gridMs()
  gridFrame: false,
  safe: true,
  media: new Map(),  // id -> record (with blob)
  presets: [],
  undo: [],
  redo: [],
  tab: 'library',
};

const MAX_UNDO = 100;
let lastMerge = null, lastMergeAt = 0;

export function snapshot() { return JSON.stringify(state.project); }

export function commit(fn, { merge = null, silent = false, snapshot: snap = true } = {}) {
  const now = performance.now();
  const mergeable = merge && merge === lastMerge && now - lastMergeAt < 1200;
  if (!mergeable && snap) {
    state.undo.push(snapshot());
    if (state.undo.length > MAX_UNDO) state.undo.shift();
    state.redo.length = 0;
  }
  lastMerge = merge; lastMergeAt = now;
  fn(state.project);
  state.project.updated = Date.now();
  state.project.duration = projectEnd(state.project);
  scheduleSave();
  if (!silent) emit('change');
}

export function undo() {
  if (!state.undo.length) return false;
  state.redo.push(snapshot());
  state.project = JSON.parse(state.undo.pop());
  lastMerge = null;
  afterHistory();
  return true;
}
export function redo() {
  if (!state.redo.length) return false;
  state.undo.push(snapshot());
  state.project = JSON.parse(state.redo.pop());
  lastMerge = null;
  afterHistory();
  return true;
}
function afterHistory() {
  state.project.duration = projectEnd(state.project);
  const { trackId, clipId } = state.sel;
  if (trackId && !findTrack(trackId)) state.sel = { trackId: null, clipId: null };
  else if (clipId && !findClip(clipId)) state.sel.clipId = null;
  scheduleSave();
  emit('change'); emit('history');
}

let saveTimer = null;
export function scheduleSave() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(saveNow, 500);
  emit('saving');
}
export async function saveNow() {
  clearTimeout(saveTimer);
  if (!state.project) return;
  await db.put('projects', JSON.parse(snapshot()));
  await db.kvSet('currentProject', state.project.id);
  emit('saved');
}

export async function loadProject(id) {
  let p = id ? await db.get('projects', id) : null;
  if (!p) {
    const all = await db.all('projects');
    p = all.sort((a, b) => b.updated - a.updated)[0];
  }
  if (!p) { p = newProject(); await db.put('projects', p); }
  setProject(p);
}
export function setProject(p) {
  state.project = p;
  state.project.duration = projectEnd(p);
  state.undo = []; state.redo = [];
  state.sel = { trackId: null, clipId: null };
  state.playhead = 0;
  db.kvSet('currentProject', p.id);
  emit('project'); emit('change'); emit('history');
}

export function findTrack(id) { return state.project.tracks.find((t) => t.id === id); }
export function findClip(id) {
  for (const t of state.project.tracks) { const c = t.clips.find((x) => x.id === id); if (c) return { track: t, clip: c }; }
  return null;
}
export function selected() {
  if (!state.sel.clipId) return null;
  return findClip(state.sel.clipId);
}
export function select(trackId, clipId = null) {
  state.sel = { trackId, clipId };
  emit('select');
}

export function gridMs() {
  if (state.gridFrame) return timing.frameMs;
  return state.grid;
}
export function snapT(ms) {
  if (!state.snap) return Math.round(ms);
  const g = gridMs();
  return Math.round(Math.round(ms / g) * g);
}

// ----- media cache -----
const urlCache = new Map();
export function mediaUrl(id) {
  const m = state.media.get(id);
  if (!m) return null;
  if (!urlCache.has(id)) urlCache.set(id, URL.createObjectURL(m.blob));
  return urlCache.get(id);
}
export async function loadMedia() {
  const all = await db.all('media');
  state.media = new Map(all.sort((a, b) => a.created - b.created).map((m) => [m.id, m]));
  emit('media');
}
export async function putMedia(rec) {
  await db.put('media', rec);
  state.media.set(rec.id, rec);
  emit('media');
}
export async function deleteMedia(id) {
  await db.del('media', id);
  state.media.delete(id);
  if (urlCache.has(id)) { URL.revokeObjectURL(urlCache.get(id)); urlCache.delete(id); }
  emit('media');
}
export function revokeUrl(id) { if (urlCache.has(id)) { URL.revokeObjectURL(urlCache.get(id)); urlCache.delete(id); } }
