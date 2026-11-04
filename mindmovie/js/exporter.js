// Export: video file (canvas + mixed audio via MediaRecorder) and project files (.mindmovie).
import { h, dialog, toast, download } from './ui.js';
import { state, setProject, putMedia, saveNow } from './store.js';
import { db, uid } from './db.js';
import { fmt } from './core.js';
import * as engine from './engine.js';
import { beforePlay } from './safety.js';

export function videoFormats() {
  const list = [
    ['video/mp4;codecs=avc1.42E01E,mp4a.40.2', 'MP4 (H.264 + AAC)', 'mp4'],
    ['video/mp4;codecs=avc1,mp4a', 'MP4', 'mp4'],
    ['video/mp4', 'MP4', 'mp4'],
    ['video/webm;codecs=vp9,opus', 'WebM (VP9)', 'webm'],
    ['video/webm;codecs=vp8,opus', 'WebM (VP8)', 'webm'],
    ['video/webm', 'WebM', 'webm'],
  ];
  if (!window.MediaRecorder) return [];
  const seen = new Set();
  return list.filter(([m, , ext]) => { if (!MediaRecorder.isTypeSupported(m)) return false; const k = ext; if (seen.has(k)) return false; seen.add(k); return true; });
}

export async function exportVideo() {
  const p = state.project;
  if (!p.duration) return toast('Nothing to export yet — add some clips first');
  const fmts = videoFormats();
  if (!fmts.length) return toast('Video export is not supported on this browser');
  const fmtSel = h('select', {}, fmts.map(([m, l]) => h('option', { value: m }, l)));
  const fpsSel = h('select', {}, h('option', { value: '30' }, '30 frames per second (smaller file)'), h('option', { value: '60', selected: true }, '60 frames per second (keeps 1-frame flashes)'));
  const qSel = h('select', {}, h('option', { value: '4000000' }, 'Standard (4 Mbps)'), h('option', { value: '8000000', selected: true }, 'High (8 Mbps)'), h('option', { value: '16000000' }, 'Very high (16 Mbps)'));
  const ok = await dialog({ title: 'Export video', body: h('div', { class: 'form' },
    h('p', {}, `Your movie is ${fmt(p.duration)} long. Exporting plays it once in real time while recording, so keep this screen open.`),
    h('label', {}, 'Format', fmtSel), h('label', {}, 'Frame rate', fpsSel), h('label', {}, 'Quality', qSel),
    h('p', { class: 'muted small' }, 'Safe Mode settings are baked into the exported video.')),
  buttons: [{ label: 'Cancel', value: false }, { label: 'Start export', value: true, primary: true }] });
  if (!ok) return;
  if (!(await beforePlay(p))) return;
  return recordMovie({ mime: fmtSel.value, fps: +fpsSel.value, bps: +qSel.value });
}

export async function recordMovie({ mime, fps = 60, bps = 8000000, onDone } = {}) {
  const p = state.project;
  const [W, H] = engine.canvasSize();
  const cv = h('canvas', { width: W, height: H, class: 'export-cv' });
  document.body.append(cv);
  engine.addTarget(cv);
  const vstream = cv.captureStream(fps);
  const astream = engine.exportAudioStream();
  const stream = new MediaStream([...vstream.getVideoTracks(), ...astream.getAudioTracks()]);
  const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: bps, audioBitsPerSecond: 192000 });
  const chunks = [];
  rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
  const bar = h('progress', { max: 1000, value: 0 });
  const label = h('p', {}, 'Preparing…');
  let cancelled = false;
  const box = dialog({ title: 'Exporting…', body: h('div', { class: 'form' }, label, bar, h('p', { class: 'muted small' }, 'Keep this screen on until it finishes.')), dismissable: false, buttons: [{ label: 'Cancel export', value: 'cancel', danger: true }] });
  box.then((v) => { if (v === 'cancel') { cancelled = true; finish(); } });
  engine.pause(); engine.seek(0);
  await new Promise((r) => setTimeout(r, 400)); // let media elements seek
  const done = new Promise((resolve) => { rec.onstop = resolve; });
  rec.start(500);
  engine.setLoop(false);
  engine.play(0);
  const timer = setInterval(() => {
    bar.value = Math.round((state.playhead / p.duration) * 1000);
    label.textContent = `Recording ${fmt(state.playhead)} of ${fmt(p.duration)}`;
    if (!state.playing) finish();
  }, 100);
  let finished = false;
  function finish() {
    if (finished) return; finished = true;
    clearInterval(timer);
    engine.pause();
    setTimeout(() => { if (rec.state !== 'inactive') rec.stop(); }, 150);
  }
  await done;
  engine.removeTarget(cv); cv.remove();
  vstream.getTracks().forEach((t) => t.stop());
  document.querySelector('.scrim .dialog [data-value="cancel"]')?.closest('.scrim')?.remove();
  if (cancelled) { toast('Export cancelled'); return null; }
  const type = mime.split(';')[0];
  const blob = new Blob(chunks, { type });
  const ext = type.includes('mp4') ? 'mp4' : 'webm';
  const name = (p.name || 'mind-movie').replace(/[^\w\- ]+/g, '').trim().replace(/\s+/g, '-') + '.' + ext;
  if (onDone) onDone(blob); else {
    download(blob, name);
    toast(`Saved ${name} (${(blob.size / 1048576).toFixed(1)} MB)`, 4000);
  }
  return blob;
}

// ---------- project files ----------
function blobToDataURL(blob) { return new Promise((r) => { const fr = new FileReader(); fr.onload = () => r(fr.result); fr.readAsDataURL(blob); }); }
async function dataURLToBlob(u) { return (await fetch(u)).blob(); }

export async function saveProjectFile() {
  await saveNow();
  const p = state.project;
  const ids = new Set();
  for (const t of p.tracks) for (const c of t.clips) if (c.mediaId) ids.add(c.mediaId);
  toast('Packing project…');
  const media = [];
  for (const id of ids) {
    const m = state.media.get(id); if (!m) continue;
    const { blob, ...rest } = m;
    media.push({ ...rest, data: await blobToDataURL(blob) });
  }
  const file = { format: 'mindmovie', version: 1, saved: new Date().toISOString(), project: p, media };
  const blob = new Blob([JSON.stringify(file)], { type: 'application/json' });
  download(blob, (p.name || 'mind-movie').replace(/[^\w\- ]+/g, '').trim().replace(/\s+/g, '-') + '.mindmovie');
  toast(`Project saved (${(blob.size / 1048576).toFixed(1)} MB, ${media.length} media file${media.length === 1 ? '' : 's'})`, 3500);
}

export async function openProjectFile() {
  const file = await new Promise((resolve) => {
    const inp = h('input', { type: 'file', accept: '.mindmovie,.json,application/json', style: { display: 'none' } });
    inp.addEventListener('change', () => { resolve(inp.files[0]); inp.remove(); });
    document.body.append(inp); inp.click();
  });
  if (!file) return;
  let data;
  try { data = JSON.parse(await file.text()); } catch (e) { return toast('That file is not a Mind Movie project'); }
  if (data.format !== 'mindmovie' || !data.project) return toast('That file is not a Mind Movie project');
  await importProjectData(data);
}

export async function importProjectData(data) {
  const idMap = {};
  for (const m of data.media || []) {
    const exists = state.media.get(m.id);
    if (exists && exists.size === m.size) { idMap[m.id] = m.id; continue; }
    const { data: du, ...rest } = m;
    const nid = exists ? uid('m') : m.id;
    await putMedia({ ...rest, id: nid, blob: await dataURLToBlob(du) });
    idMap[m.id] = nid;
  }
  const p = data.project;
  for (const t of p.tracks) for (const c of t.clips) if (c.mediaId && idMap[c.mediaId]) c.mediaId = idMap[c.mediaId];
  if (await db.get('projects', p.id)) { p.id = uid('p'); p.name += ' (opened)'; }
  p.updated = Date.now();
  await db.put('projects', p);
  setProject(p);
  toast('Opened “' + p.name + '”');
}
