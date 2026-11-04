// Library tab: photos, videos, voice recordings, music and affirmations.
import { h, icon, toast, dialog, confirmBox, prompt, chooseList } from './ui.js';
import { state, on, putMedia, deleteMedia, mediaUrl, commit, revokeUrl } from './store.js';
import { uid } from './db.js';
import { addClip } from './actions.js';
import { fmt } from './core.js';
import { dropImage, resetMedia } from './engine.js';

let root;
export function mountLibrary(el) {
  root = el;
  render();
  on('media', render);
  on('project', render);
  on('history', render);
}

function pickFiles(accept, { capture, multiple = true } = {}) {
  return new Promise((resolve) => {
    const inp = h('input', { type: 'file', accept, multiple, capture, style: { display: 'none' } });
    inp.addEventListener('change', () => { resolve([...inp.files]); inp.remove(); });
    document.body.append(inp);
    inp.click();
  });
}

export function mediaDuration(blob, kind) {
  return new Promise((resolve) => {
    const el = document.createElement(kind === 'video' ? 'video' : 'audio');
    el.preload = 'metadata';
    const url = URL.createObjectURL(blob);
    let done = false;
    const finish = (d) => { if (done) return; done = true; URL.revokeObjectURL(url); resolve(isFinite(d) && d > 0 ? Math.round(d * 1000) : 0); };
    el.onloadedmetadata = () => {
      if (isFinite(el.duration) && el.duration > 0) finish(el.duration);
      else { el.ondurationchange = () => { if (isFinite(el.duration) && el.duration > 0) finish(el.duration); }; el.currentTime = 1e7; }
    };
    el.onerror = () => finish(0);
    setTimeout(() => finish(el.duration), 8000);
    el.src = url;
  });
}

function thumbFromImage(blob) {
  return new Promise((resolve) => {
    const im = new Image();
    const url = URL.createObjectURL(blob);
    im.onload = () => {
      const k = 200 / Math.max(im.naturalWidth, im.naturalHeight);
      const cv = h('canvas', { width: Math.round(im.naturalWidth * k), height: Math.round(im.naturalHeight * k) });
      cv.getContext('2d').drawImage(im, 0, 0, cv.width, cv.height);
      URL.revokeObjectURL(url);
      resolve({ thumb: cv.toDataURL('image/jpeg', 0.7), w: im.naturalWidth, h: im.naturalHeight });
    };
    im.onerror = () => { URL.revokeObjectURL(url); resolve({ thumb: null }); };
    im.src = url;
  });
}
function thumbFromVideo(blob) {
  return new Promise((resolve) => {
    const v = document.createElement('video');
    v.muted = true; v.playsInline = true; v.preload = 'auto';
    const url = URL.createObjectURL(blob);
    let done = false;
    const fin = (r) => { if (done) return; done = true; URL.revokeObjectURL(url); resolve(r); };
    v.onloadeddata = () => { try { v.currentTime = Math.min(0.5, (v.duration || 1) / 2); } catch (e) { fin({ thumb: null }); } };
    v.onseeked = () => {
      const k = 200 / Math.max(v.videoWidth || 1, v.videoHeight || 1);
      const cv = h('canvas', { width: Math.max(1, Math.round(v.videoWidth * k)), height: Math.max(1, Math.round(v.videoHeight * k)) });
      cv.getContext('2d').drawImage(v, 0, 0, cv.width, cv.height);
      fin({ thumb: cv.toDataURL('image/jpeg', 0.7), w: v.videoWidth, h: v.videoHeight });
    };
    v.onerror = () => fin({ thumb: null });
    setTimeout(() => fin({ thumb: null }), 8000);
    v.src = url;
  });
}

export async function ingest(file, sub, { name, duration } = {}) {
  const mime = file.type || '';
  const kind = mime.startsWith('image') ? 'image' : mime.startsWith('video') ? 'video' : 'audio';
  if (!sub) sub = kind === 'image' ? 'photo' : kind === 'video' ? 'clip' : 'music';
  const rec = { id: uid('m'), kind, sub, name: name || (file.name || sub).replace(/\.[^.]+$/, ''), mime, size: file.size, created: Date.now(), blob: file, duration: 0 };
  if (kind === 'image') Object.assign(rec, await thumbFromImage(file));
  if (kind === 'video') Object.assign(rec, await thumbFromVideo(file));
  if (kind !== 'image') rec.duration = duration || (await mediaDuration(file, kind));
  await putMedia(rec);
  return rec;
}

async function uploadVisual(capture) {
  const accept = capture === 'photo' ? 'image/*' : capture === 'video' ? 'video/*' : 'image/*,video/*';
  const files = await pickFiles(accept, { capture: capture ? 'environment' : undefined, multiple: !capture });
  if (!files.length) return;
  toast(`Adding ${files.length} file${files.length > 1 ? 's' : ''}…`);
  for (const f of files) await ingest(f);
  toast(`Added ${files.length} to your library`);
}
async function uploadMusic() {
  const files = await pickFiles('audio/*,.mp3,.m4a,.wav,.aac,.ogg');
  if (!files.length) return;
  for (const f of files) await ingest(f, 'music');
  toast(`Added ${files.length} music file${files.length > 1 ? 's' : ''}`);
}

// ---------- live camera ----------
export async function liveCamera() {
  let facing = 'environment';
  let stream = null, rec = null, chunks = [], recStart = 0, timer = null;
  const video = h('video', { autoplay: true, playsinline: true, muted: true, class: 'cam-view' });
  video.muted = true;
  const status = h('div', { class: 'cam-status' }, 'Starting camera…');
  const recBtn = h('button', { class: 'btn', onclick: toggleRec }, icon('film'), ' Record clip');
  const snapBtn = h('button', { class: 'btn primary', onclick: snap }, icon('cam'), ' Take photo');
  const flipBtn = h('button', { class: 'btn', onclick: flip }, '⟲ Flip camera');
  const body = h('div', { class: 'cam' }, video, status, h('div', { class: 'row wrap' }, snapBtn, recBtn, flipBtn));
  async function start() {
    stop();
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: facing, width: { ideal: 1920 }, height: { ideal: 1080 } }, audio: true });
    } catch (e) {
      try { stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false }); } catch (e2) { status.textContent = 'Camera not available: ' + (e2.message || e2.name) + '. Check that camera permission is allowed for this site.'; return; }
    }
    video.srcObject = stream;
    await new Promise((r) => { if (video.readyState >= 2) r(); else { video.onloadeddata = r; setTimeout(r, 4000); } });
    video.play().catch(() => {});
    status.textContent = 'Camera ready.';
  }
  function stop() { if (stream) stream.getTracks().forEach((t) => t.stop()); stream = null; }
  async function snap() {
    if (!stream) return toast('Camera is not ready yet');
    if (!video.videoWidth) await new Promise((r) => { video.addEventListener('loadeddata', r, { once: true }); setTimeout(r, 3000); });
    if (!video.videoWidth) return toast('Camera is not ready yet');
    const cv = h('canvas', { width: video.videoWidth, height: video.videoHeight });
    cv.getContext('2d').drawImage(video, 0, 0);
    const blob = await new Promise((r) => cv.toBlob(r, 'image/jpeg', 0.9));
    const n = [...state.media.values()].filter((m) => m.kind === 'image').length + 1;
    await ingest(new File([blob], `Photo ${n}.jpg`, { type: 'image/jpeg' }), 'photo');
    status.textContent = 'Photo saved to your library.';
    toast('Photo saved');
  }
  function toggleRec() {
    if (!stream) return;
    if (rec && rec.state === 'recording') { rec.stop(); return; }
    chunks = [];
    const mime = ['video/mp4;codecs=avc1,mp4a.40.2', 'video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'].find((m) => window.MediaRecorder && MediaRecorder.isTypeSupported(m)) || '';
    rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
    rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    rec.onstop = async () => {
      clearInterval(timer);
      const type = (rec.mimeType || 'video/webm').split(';')[0];
      const blob = new Blob(chunks, { type });
      const n = [...state.media.values()].filter((m) => m.kind === 'video').length + 1;
      await ingest(new File([blob], `Clip ${n}.${type.includes('mp4') ? 'mp4' : 'webm'}`, { type }), 'clip', { duration: Date.now() - recStart });
      recBtn.replaceChildren(icon('film'), ' Record clip'); recBtn.classList.remove('danger');
      status.textContent = 'Clip saved to your library.';
      toast('Video clip saved');
    };
    rec.start(250); recStart = Date.now();
    recBtn.replaceChildren('■ Stop recording'); recBtn.classList.add('danger');
    timer = setInterval(() => { status.textContent = 'Recording ' + fmt(Date.now() - recStart); }, 100);
  }
  function flip() { facing = facing === 'environment' ? 'user' : 'environment'; start(); }
  start();
  await dialog({ title: 'Camera', body, buttons: [{ label: 'Done', value: true, primary: true }], cls: 'wide' });
  if (rec && rec.state === 'recording') rec.stop();
  setTimeout(stop, 300);
}

// ---------- voice recorder ----------
export async function recordVoice(replaceRec) {
  let stream = null, rec = null, chunks = [], t0 = 0, timer = null, blob = null, dur = 0, raf = 0;
  const status = h('div', { class: 'rec-time' }, '00:00.000');
  const meter = h('div', { class: 'meter' }, h('i'));
  const audio = h('audio', { controls: true, class: 'hidden' });
  const recBtn = h('button', { class: 'btn primary big', onclick: toggle }, icon('mic'), ' Start recording');
  const hint = h('p', { class: 'muted' }, 'Tip: speak in first person, present tense — "I am…", "I have…".');
  const body = h('div', { class: 'recorder' }, hint, status, meter, recBtn, audio);
  async function toggle() {
    if (rec && rec.state === 'recording') { rec.stop(); return; }
    try { stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } }); }
    catch (e) { status.textContent = 'Microphone not available'; toast('Microphone blocked: allow it in the site settings'); return; }
    const ac = new (window.AudioContext || window.webkitAudioContext)();
    const an = ac.createAnalyser(); an.fftSize = 512;
    ac.createMediaStreamSource(stream).connect(an);
    const buf = new Uint8Array(an.fftSize);
    const tick = () => { an.getByteTimeDomainData(buf); let m = 0; for (const v of buf) m = Math.max(m, Math.abs(v - 128)); meter.firstChild.style.width = Math.min(100, m / 1.28) + '%'; raf = requestAnimationFrame(tick); };
    tick();
    chunks = [];
    const mime = ['audio/webm;codecs=opus', 'audio/mp4', 'audio/ogg;codecs=opus', 'audio/webm'].find((m) => MediaRecorder.isTypeSupported(m)) || '';
    rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
    rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    rec.onstop = () => {
      dur = Date.now() - t0;
      clearInterval(timer); cancelAnimationFrame(raf); ac.close();
      stream.getTracks().forEach((t) => t.stop());
      blob = new Blob(chunks, { type: (rec.mimeType || 'audio/webm').split(';')[0] });
      audio.src = URL.createObjectURL(blob);
      audio.classList.remove('hidden');
      recBtn.replaceChildren(icon('mic'), ' Re-record');
      recBtn.classList.remove('danger');
      saveBtn.disabled = false;
    };
    rec.start(200); t0 = Date.now();
    saveBtn.disabled = true;
    recBtn.replaceChildren('■ Stop'); recBtn.classList.add('danger');
    timer = setInterval(() => { status.textContent = fmt(Date.now() - t0); }, 50);
  }
  let saveBtn;
  const p = dialog({ title: replaceRec ? 'Re-record: ' + replaceRec.name : 'Record a voice affirmation', body, buttons: [{ label: 'Cancel', value: false }, { label: 'Save', value: true, primary: true }] });
  saveBtn = [...document.querySelectorAll('.dialog-btns .btn.primary')].pop();
  saveBtn.disabled = true;
  const ok = await p;
  if (rec && rec.state === 'recording') { rec.onstop = null; rec.stop(); stream.getTracks().forEach((t) => t.stop()); clearInterval(timer); cancelAnimationFrame(raf); }
  if (!ok || !blob) return null;
  const ext = blob.type.includes('mp4') ? 'm4a' : 'webm';
  if (replaceRec) {
    replaceRec.blob = blob; replaceRec.mime = blob.type; replaceRec.size = blob.size; replaceRec.duration = dur; delete replaceRec.beats;
    revokeUrl(replaceRec.id); resetMedia();
    await putMedia(replaceRec);
    toast('Recording replaced');
    return replaceRec;
  }
  const n = [...state.media.values()].filter((m) => m.sub === 'voice').length + 1;
  const name = (await prompt('Name this recording', `Voice affirmation ${n}`)) || `Voice affirmation ${n}`;
  const r = await ingest(new File([blob], name + '.' + ext, { type: blob.type }), 'voice', { name, duration: dur });
  toast('Recording saved');
  return r;
}

// ---------- adding to the movie ----------
export async function addMediaToMovie(m) {
  if (m.kind === 'image') addClip('photo', { mediaId: m.id, trackName: 'Photos' });
  else if (m.kind === 'video') addClip('video', { mediaId: m.id, dur: m.duration || 5000, trackName: 'Video' });
  else {
    const type = await chooseList('Add “' + m.name + '” as…', [
      { value: 'voice', label: 'Voice track', desc: 'Affirmations, layered copies, speed-up', icon: '🎙' },
      { value: 'music', label: 'Music track', desc: 'Background music, loop to fill, beat detection', icon: '♫' },
    ]);
    if (!type) return;
    addClip(type, { mediaId: m.id, dur: m.duration || 5000, trackName: type === 'voice' ? 'Voice' : 'Music' });
  }
  toast('Added to the timeline at ' + fmt(state.playhead) + ' — open Edit to see it');
}

async function addAffirmation(a) {
  const type = await chooseList('Add this line as…', [
    { value: 'text', label: 'Text clip', desc: 'Calm on-screen words with fades', icon: 'T' },
    { value: 'flash', label: 'Flash text', desc: 'Brief flashes (default 50 ms), optional mask', icon: '⚡' },
    { value: 'scroll', label: 'Speed-scroll text', desc: 'Streams across or down the screen', icon: '⇢' },
  ], '“' + a.text + '”');
  if (!type) return;
  addClip(type, { text: a.text });
  toast('Added to the timeline');
}

function previewMedia(m) {
  const url = mediaUrl(m.id);
  const el = m.kind === 'image' ? h('img', { src: url, class: 'preview-media', alt: m.name })
    : h(m.kind, { src: url, controls: true, autoplay: true, playsinline: true, class: 'preview-media' });
  dialog({ title: m.name, body: el, buttons: [{ label: 'Close', value: true, primary: true }], cls: 'wide' }).then(() => { if (el.pause) el.pause(); });
}

function usedIn(id) {
  let n = 0;
  for (const t of state.project.tracks) for (const c of t.clips) if (c.mediaId === id) n++;
  return n;
}

async function removeMedia(m) {
  const n = usedIn(m.id);
  const ok = await confirmBox('Delete “' + m.name + '”?', n ? `It is used in ${n} clip${n > 1 ? 's' : ''} of this movie. Those clips will be removed too.` : 'This removes it from your phone’s app storage.', 'Delete', true);
  if (!ok) return;
  if (n) commit((p) => { for (const t of p.tracks) t.clips = t.clips.filter((c) => c.mediaId !== m.id); });
  dropImage(m.id);
  await deleteMedia(m.id);
  toast('Deleted');
}

let playing = null;
function mediaCard(m) {
  const isAudio = m.kind === 'audio';
  const thumb = m.thumb ? h('img', { src: m.thumb, alt: '' }) : h('span', { class: 'thumb-ic' }, isAudio ? (m.sub === 'voice' ? '🎙' : '♫') : '▶');
  const playBtn = h('button', { class: 'btn sm', 'aria-label': 'Play ' + m.name, onclick: () => {
    if (!isAudio) return previewMedia(m);
    if (playing && playing.id === m.id) { playing.el.pause(); playing = null; playBtn.replaceChildren(icon('play'), ' Play'); return; }
    if (playing) playing.el.pause(), playing.btn.replaceChildren(icon('play'), ' Play');
    const el = new Audio(mediaUrl(m.id));
    el.onended = () => { playBtn.replaceChildren(icon('play'), ' Play'); playing = null; };
    el.play();
    playing = { id: m.id, el, btn: playBtn };
    playBtn.replaceChildren(icon('pause'), ' Stop');
  } }, icon(isAudio ? 'play' : 'eye'), isAudio ? ' Play' : ' View');
  return h('div', { class: 'media-card', 'data-id': m.id },
    h('div', { class: 'thumb' + (m.kind === 'video' ? ' is-video' : '') }, thumb),
    h('div', { class: 'mc-info' },
      h('strong', { class: 'mc-name' }, m.name),
      h('small', {}, [m.kind === 'image' ? 'Photo' : m.kind === 'video' ? 'Video' : m.sub === 'voice' ? 'Voice' : 'Music', m.duration ? fmt(m.duration) : null, (m.size / 1048576).toFixed(1) + ' MB'].filter(Boolean).join(' · '))),
    h('div', { class: 'mc-actions' },
      h('button', { class: 'btn sm primary', onclick: () => addMediaToMovie(m) }, icon('plus'), ' Add to movie'),
      playBtn,
      m.sub === 'voice' ? h('button', { class: 'btn sm', onclick: () => recordVoice(m) }, icon('mic'), ' Re-record') : null,
      h('button', { class: 'btn sm', onclick: async () => { const n = await prompt('Rename', m.name); if (n && n.trim()) { m.name = n.trim(); await putMedia(m); } } }, 'Rename'),
      h('button', { class: 'btn sm ghost', 'aria-label': 'Delete ' + m.name, onclick: () => removeMedia(m) }, icon('trash'))));
}

function affirmationList() {
  const p = state.project;
  const input = h('input', { type: 'text', placeholder: 'I am… / I have… (first person, present tense)', 'aria-label': 'New affirmation' });
  const add = () => {
    const v = input.value.trim(); if (!v) { toast('Type an affirmation first, e.g. “I am…”'); input.focus(); return; }
    commit((pr) => pr.affirmations.push({ id: uid('a'), text: v }));
    input.value = ''; render(); setTimeout(() => root.querySelector('#aff-input')?.focus(), 0);
  };
  input.id = 'aff-input';
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') add(); });
  const hintFor = (t) => (/^\s*i\s+(am|have|feel|choose|attract|create|enjoy|love|deserve|live|earn|give|receive)\b/i.test(t) ? null : h('small', { class: 'warn-hint' }, 'Hint: start with “I am…” or “I have…”'));
  return h('section', { class: 'card' },
    h('div', { class: 'sec-head' }, h('h2', {}, 'Affirmations'), h('span', { class: 'muted' }, p.affirmations.length + ' lines')),
    h('p', { class: 'muted' }, 'Write each line in first person, present tense. Each line can go on the timeline as its own clip. Flash and scroll clips with no text of their own cycle through all these lines.'),
    h('ol', { class: 'aff-list' }, p.affirmations.map((a, i) => h('li', { class: 'aff' },
      h('div', { class: 'aff-text' }, h('span', {}, a.text), hintFor(a.text)),
      h('div', { class: 'aff-actions' },
        h('button', { class: 'btn sm ghost', 'aria-label': 'Move up', disabled: i === 0, onclick: () => { commit((pr) => { const x = pr.affirmations.splice(i, 1)[0]; pr.affirmations.splice(i - 1, 0, x); }); render(); } }, icon('chevup')),
        h('button', { class: 'btn sm ghost', 'aria-label': 'Move down', disabled: i === p.affirmations.length - 1, onclick: () => { commit((pr) => { const x = pr.affirmations.splice(i, 1)[0]; pr.affirmations.splice(i + 1, 0, x); }); render(); } }, icon('chevdown')),
        h('button', { class: 'btn sm', onclick: async () => { const v = await prompt('Edit affirmation', a.text); if (v && v.trim()) { commit((pr) => { pr.affirmations.find((x) => x.id === a.id).text = v.trim(); }); render(); } } }, 'Edit'),
        h('button', { class: 'btn sm primary', onclick: () => addAffirmation(a) }, icon('plus'), ' Timeline'),
        h('button', { class: 'btn sm ghost', 'aria-label': 'Delete affirmation', onclick: async () => { if (await confirmBox('Delete this line?', a.text, 'Delete', true)) { commit((pr) => { pr.affirmations = pr.affirmations.filter((x) => x.id !== a.id); }); render(); } } }, icon('trash')))))),
    h('div', { class: 'row' }, input, h('button', { class: 'btn primary', onclick: add }, icon('plus'), ' Add')));
}

function render() {
  if (!root || !state.project) return;
  const all = [...state.media.values()];
  const visual = all.filter((m) => m.kind !== 'audio');
  const voice = all.filter((m) => m.kind === 'audio' && m.sub === 'voice');
  const music = all.filter((m) => m.kind === 'audio' && m.sub !== 'voice');
  const scrollY = root.scrollTop;
  root.replaceChildren(
    h('div', { class: 'lib' },
      h('section', { class: 'card hero' },
        h('h1', {}, 'Your library'),
        h('p', { class: 'muted' }, 'Everything stays on this device, and works offline.'),
        h('div', { class: 'action-grid' },
          h('button', { class: 'tile', onclick: () => uploadVisual() }, icon('upload'), h('span', {}, 'Upload photos & videos')),
          h('button', { class: 'tile', onclick: () => uploadVisual('photo') }, icon('cam'), h('span', {}, 'Take a photo')),
          h('button', { class: 'tile', onclick: () => uploadVisual('video') }, icon('film'), h('span', {}, 'Film a video')),
          h('button', { class: 'tile', onclick: () => liveCamera() }, icon('eye'), h('span', {}, 'Live camera')),
          h('button', { class: 'tile gold', onclick: () => recordVoice() }, icon('mic'), h('span', {}, 'Record my voice')),
          h('button', { class: 'tile', onclick: () => uploadMusic() }, icon('music'), h('span', {}, 'Upload music')))),
      affirmationList(),
      section('Photos & videos', visual, 'No photos yet. Tap “Upload photos & videos” or “Take a photo”.'),
      section('Voice recordings', voice, 'No recordings yet. Tap “Record my voice”.'),
      section('Music', music, 'No music yet. Tap “Upload music” (mp3, m4a or wav).')));
  root.scrollTop = scrollY;
}
function section(title, items, empty) {
  return h('section', { class: 'card' },
    h('div', { class: 'sec-head' }, h('h2', {}, title), h('span', { class: 'muted' }, items.length + '')),
    items.length ? h('div', { class: 'media-list' }, items.map(mediaCard)) : h('p', { class: 'empty' }, empty));
}
