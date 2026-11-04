// End-to-end test for Mind Movie. Run from repo root with a static server on :8765:
//   python3 -m http.server 8765 &   NODE_PATH=$(npm root -g) node mindmovie/tests/e2e.cjs <media-dir> <out-dir>
// media-dir needs photo1.jpg photo2.jpg photo3.jpg clip.webm music120.mp3 (see tests/make_media.sh)
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const MEDIA = process.argv[2];
const OUT = process.argv[3] || '.';
const URL = process.env.MM_URL || 'http://localhost:8765/mindmovie/';
const results = [];
let page, ctx;
const errors = [];

function ok(name, cond, info = '') { results.push({ name, pass: !!cond, info }); console.log((cond ? 'PASS ' : 'FAIL ') + name + (info ? '  — ' + info : '')); }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const mm = (fn, arg) => page.evaluate(fn, arg);
async function shot(n) { await page.screenshot({ path: path.join(OUT, n + '.png') }); }
async function dlgBtn(label) { await page.locator('.scrim .dialog-btns button', { hasText: label }).last().click(); }
async function choose(label) { await page.locator('.scrim .choose-item', { hasText: label }).first().click(); }
async function noDialog() { return (await page.locator('.scrim').count()) === 0; }
async function tab(name) { await page.locator(`.tab[data-tab="${name}"]`).click(); await sleep(250); }
async function upload(buttonText, files) {
  const [fc] = await Promise.all([page.waitForEvent('filechooser'), page.locator('button', { hasText: buttonText }).first().click()]);
  await fc.setFiles(files.map((f) => path.join(MEDIA, f)));
}
const trackCount = () => mm(() => window.__mm.state.project.tracks.length);
const sel = () => mm(() => { const s = window.__mm.state.sel; const p = window.__mm.state.project; for (const t of p.tracks) { const c = t.clips.find((x) => x.id === s.clipId); if (c) return { t: t.type, c: JSON.parse(JSON.stringify(c)) }; } return null; });

(async () => {
  const browser = await chromium.launch({ args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', '--autoplay-policy=no-user-gesture-required'] });
  ctx = await browser.newContext({ viewport: { width: 412, height: 880 }, deviceScaleFactor: 1, hasTouch: false, acceptDownloads: true, permissions: ['camera', 'microphone', 'notifications'] });
  page = await ctx.newPage();
  page.on('pageerror', (e) => { errors.push(e.message); console.log('PAGEERROR', e.message); });
  page.on('console', (m) => { if (m.type() === 'error') { errors.push(m.text()); console.log('CONSOLE', m.text()); } });
  await page.goto(URL);
  await page.waitForSelector('body.ready');

  // 1. first-launch warning
  ok('seizure warning on first launch', await page.locator('.dialog h2', { hasText: 'Before you begin' }).isVisible());
  await dlgBtn('I understand');
  ok('tour offered after warning', await page.locator('.dialog h2', { hasText: 'Welcome to Mind Movie' }).waitFor({ timeout: 3000 }).then(() => true, () => false));
  await dlgBtn('Not now');
  ok('warning dismissed', await noDialog());

  // 2. uploads
  await upload('Upload photos & videos', ['photo1.jpg', 'photo2.jpg', 'clip.webm']);
  await page.waitForFunction(() => window.__mm.state.media.size >= 3, null, { timeout: 15000 });
  await upload('Upload music', ['music120.mp3']);
  await page.waitForFunction(() => [...window.__mm.state.media.values()].some((m) => m.sub === 'music'), null, { timeout: 15000 });
  const media = await mm(() => [...window.__mm.state.media.values()].map((m) => ({ kind: m.kind, sub: m.sub, dur: m.duration, thumb: !!m.thumb })));
  ok('upload photos+video+music', media.length === 4, JSON.stringify(media));
  ok('video has duration and thumbnail', media.some((m) => m.kind === 'video' && m.dur > 3500 && m.thumb));
  ok('music duration ~12s', media.some((m) => m.sub === 'music' && Math.abs(m.dur - 12000) < 400));

  // take-photo input uses capture attribute
  const [fcCap] = await Promise.all([page.waitForEvent('filechooser'), page.locator('button', { hasText: 'Take a photo' }).click()]);
  const capAttr = await fcCap.element().getAttribute('capture');
  ok('Take a photo uses camera capture input', capAttr === 'environment', capAttr);
  await fcCap.setFiles(path.join(MEDIA, 'photo3.jpg'));
  await page.waitForFunction(() => window.__mm.state.media.size >= 5);
  const [fcVid] = await Promise.all([page.waitForEvent('filechooser'), page.locator('button', { hasText: 'Film a video' }).click()]);
  ok('Film a video uses capture input with video accept', (await fcVid.element().getAttribute('accept')) === 'video/*');
  await fcVid.setFiles([]);

  // 3. live camera (getUserMedia)
  await page.locator('button', { hasText: 'Live camera' }).click();
  await page.waitForFunction(() => document.querySelector('.cam-status')?.textContent.includes('ready'), null, { timeout: 10000 });
  ok('live camera starts', true);
  const imgs0 = await mm(() => [...window.__mm.state.media.values()].filter((m) => m.kind === 'image').length);
  await page.locator('.dialog button', { hasText: 'Take photo' }).click();
  await page.waitForFunction((n) => [...window.__mm.state.media.values()].filter((m) => m.kind === 'image').length > n, imgs0, { timeout: 10000 });
  ok('camera snapshot saved', true);
  await page.locator('.dialog button', { hasText: 'Record clip' }).click();
  await sleep(1600);
  await page.locator('.dialog button', { hasText: 'Stop recording' }).click();
  await page.waitForFunction(() => [...window.__mm.state.media.values()].filter((m) => m.kind === 'video').length >= 2, null, { timeout: 10000 });
  const camClip = await mm(() => [...window.__mm.state.media.values()].filter((m) => m.kind === 'video').pop());
  ok('camera video clip recorded', camClip.duration > 1000, 'dur ' + camClip.duration + ' ' + camClip.mime);
  await page.locator('.dialog button', { hasText: 'Flip camera' }).click();
  await sleep(500);
  await dlgBtn('Done');

  // 4. voice recording
  await page.locator('button', { hasText: 'Record my voice' }).click();
  ok('Save disabled before recording', await page.locator('.dialog-btns .btn.primary').isDisabled());
  await page.locator('.dialog button', { hasText: 'Start recording' }).click();
  await sleep(1500);
  await page.locator('.dialog button', { hasText: 'Stop' }).click();
  await page.waitForSelector('.recorder audio:not(.hidden)');
  ok('voice playback element appears', true);
  await dlgBtn('Save');
  await page.waitForSelector('.dialog input');
  await page.locator('.dialog input').fill('My voice 1');
  await dlgBtn('Save');
  await page.waitForFunction(() => [...window.__mm.state.media.values()].some((m) => m.sub === 'voice'));
  const voice = await mm(() => [...window.__mm.state.media.values()].find((m) => m.sub === 'voice'));
  ok('voice recorded + named', voice.name === 'My voice 1' && voice.duration > 1000, voice.duration + 'ms ' + voice.mime);
  // play / rename / re-record
  const vcard = page.locator('.media-card', { hasText: 'My voice 1' });
  await vcard.locator('button', { hasText: 'Play' }).click(); await sleep(300);
  ok('voice play toggles to Stop', await vcard.locator('button', { hasText: 'Stop' }).isVisible());
  await vcard.locator('button', { hasText: 'Stop' }).click();
  await vcard.locator('button', { hasText: 'Rename' }).click();
  await page.locator('.dialog input').fill('Morning voice');
  await dlgBtn('Save');
  await page.waitForSelector('.media-card:has-text("Morning voice")');
  ok('rename voice', true);
  await page.locator('.media-card', { hasText: 'Morning voice' }).locator('button', { hasText: 'Re-record' }).click();
  await page.locator('.dialog button', { hasText: 'Start recording' }).click(); await sleep(2200);
  await page.locator('.dialog button', { hasText: 'Stop' }).click(); await page.waitForSelector('.recorder audio:not(.hidden)');
  await dlgBtn('Save'); await sleep(400);
  const v2 = await mm(() => [...window.__mm.state.media.values()].find((m) => m.sub === 'voice'));
  ok('re-record replaces audio', v2.duration > 1900 && v2.id === voice.id, v2.duration);
  // view photo
  await page.locator('.media-card', { hasText: 'photo1' }).locator('button', { hasText: 'View' }).click();
  ok('photo preview opens', await page.locator('.dialog img.preview-media').waitFor({ timeout: 3000 }).then(() => true, () => false));
  await dlgBtn('Close');

  // 5. affirmations
  await page.locator('#aff-input').fill('I have abundant energy every day.');
  await page.locator('#aff-input').press('Enter');
  let affs = await mm(() => window.__mm.state.project.affirmations.map((a) => a.text));
  ok('add affirmation', affs.length === 4 && affs[3].startsWith('I have abundant'));
  await page.locator('#aff-input').fill('Money comes easily');
  await page.locator('button', { hasText: /^ ?Add$/ }).click();
  ok('non first-person hint shown', await page.locator('.warn-hint').first().isVisible());
  await page.locator('.aff').nth(4).locator('button[aria-label="Move up"]').click();
  affs = await mm(() => window.__mm.state.project.affirmations.map((a) => a.text));
  ok('reorder affirmation up', affs[3] === 'Money comes easily');
  await page.locator('.aff').nth(3).locator('button[aria-label="Move down"]').click();
  await page.locator('.aff').nth(4).locator('button', { hasText: 'Edit' }).click();
  await page.locator('.dialog input').fill('I receive money easily.');
  await dlgBtn('Save');
  affs = await mm(() => window.__mm.state.project.affirmations.map((a) => a.text));
  ok('edit affirmation', affs[4] === 'I receive money easily.');
  await page.locator('.aff').nth(4).locator('button[aria-label="Delete affirmation"]').click();
  await dlgBtn('Delete');
  ok('delete affirmation', (await mm(() => window.__mm.state.project.affirmations.length)) === 4);

  // 6. add to movie from library
  await page.locator('.media-card', { hasText: 'photo1' }).locator('button', { hasText: 'Add to movie' }).click();
  await page.locator('.media-card', { hasText: 'music120' }).locator('button', { hasText: 'Add to movie' }).click();
  await choose('Music track');
  await mm(() => window.__mm.select(null, null));
  await page.locator('.media-card', { hasText: 'Morning voice' }).locator('button', { hasText: 'Add to movie' }).click();
  await choose('Voice track');
  await page.locator('.aff').nth(0).locator('button', { hasText: 'Timeline' }).click(); await choose('Text clip');
  await page.locator('.aff').nth(1).locator('button', { hasText: 'Timeline' }).click(); await choose('Flash text');
  await page.locator('.aff').nth(2).locator('button', { hasText: 'Timeline' }).click(); await choose('Speed-scroll text');
  ok('library adds 6 tracks', (await trackCount()) === 6, String(await trackCount()));
  await shot('01-library');

  // 7. Edit tab: add remaining track types
  await tab('edit');
  async function addTrackUI(label, pickLabel) {
    await page.locator('.toolbar button', { hasText: 'Track' }).click();
    await choose(label);
    if (label === 'Binaural Tone') { await dlgBtn('I understand'); }
    if (pickLabel) await choose(pickLabel);
    await sleep(150);
  }
  await addTrackUI('Pattern');
  await addTrackUI('Color / Flash');
  await addTrackUI('Binaural Tone');
  await addTrackUI('Video', 'clip');
  await addTrackUI('Photo', 'photo2');
  await addTrackUI('Text');
  await addTrackUI('Flash Text');
  const tc = await trackCount();
  ok('10+ tracks via UI', tc >= 13, String(tc));
  const types = await mm(() => [...new Set(window.__mm.state.project.tracks.map((t) => t.type))]);
  ok('all 10 track types present', types.length === 10, types.join(','));
  await shot('02-edit-many-tracks');

  // 8. slider <-> number box <-> readout
  const textClip = await mm(() => { const t = window.__mm.state.project.tracks.find((x) => x.type === 'text'); window.__mm.select(t.id, t.clips[0].id); return t.clips[0].id; });
  await sleep(200);
  const opRow = page.locator('.prop[data-key="opacity"]');
  await opRow.locator('.num').fill('42'); await opRow.locator('.num').press('Enter'); await sleep(100);
  ok('number box sets value', (await sel()).c.props.opacity === 42);
  ok('slider follows number box', (await opRow.locator('input[type=range]').inputValue()) === '42');
  ok('readout follows number box', (await opRow.locator('.readout').textContent()).startsWith('42'));
  await opRow.locator('input[type=range]').evaluate((el) => { el.value = '77'; el.dispatchEvent(new Event('input', { bubbles: true })); });
  ok('slider sets value + number box', (await sel()).c.props.opacity === 77 && (await opRow.locator('.num').inputValue()) === '77');
  await opRow.locator('.num').fill('500'); await opRow.locator('.num').press('Enter');
  ok('number box clamps to max', (await sel()).c.props.opacity === 100);
  const spRow = page.locator('.prop[data-key="speed"]');
  await spRow.locator('.num').fill('2.5'); await spRow.locator('.num').press('Enter');
  ok('speed readout', (await spRow.locator('.readout').textContent()) === '2.50x');
  for (const [k, v] of [['rotation', -45], ['rotSpeed', 90], ['scale', 120], ['x', 10], ['y', -10], ['blur', 2], ['brightness', 110], ['contrast', 120], ['hue', 30], ['fontSize', 70], ['letterSpacing', 2], ['outline', 1.5], ['glow', 20]]) {
    const r = page.locator(`.prop[data-key="${k}"]`);
    await r.locator('.num').fill(String(v)); await r.locator('.num').press('Enter');
  }
  const tp = (await sel()).c.props;
  ok('all visual/text sliders apply', tp.rotation === -45 && tp.rotSpeed === 90 && tp.scale === 120 && tp.hue === 30 && tp.glow === 20 && tp.outline === 1.5, JSON.stringify(tp));
  // timing fields
  const startIn = page.locator('.tfield', { hasText: 'Start' }).first().locator('input.time');
  await startIn.fill('00:01.500'); await startIn.press('Enter'); await sleep(50);
  ok('start time field', (await sel()).c.start === 1500);
  const durIn = page.locator('.tfield', { hasText: 'Duration' }).locator('input.time');
  await durIn.fill('3.25'); await durIn.press('Enter'); await sleep(50);
  ok('duration field (seconds)', (await sel()).c.dur === 3250);
  const endIn = page.locator('.tfield', { hasText: 'End' }).locator('input.time');
  ok('end field shows start+dur', (await endIn.inputValue()) === '00:04.750');
  const frIn = page.locator('.tfield', { hasText: 'Start' }).first().locator('input.frame');
  ok('frame number shown', (await frIn.inputValue()) === String(Math.floor(1500 * (await mm(() => window.__mm.engine.timing.hz)) / 1000)));
  await page.locator('.tfield', { hasText: 'Start' }).first().locator('button', { hasText: '+1f' }).click();
  const fms = await mm(() => window.__mm.engine.timing.frameMs);
  ok('+1 frame nudge', Math.abs((await sel()).c.start - (1500 + fms)) <= 1, String((await sel()).c.start));

  // 9. keyframes
  await mm(() => window.__mm.engine.seek(1600));
  await sleep(100);
  const kfBtn = page.locator('.prop[data-key="opacity"] .kf-btn');
  await kfBtn.click();
  await mm(() => window.__mm.engine.seek(4000)); await sleep(150);
  await kfBtn.click();
  const om = page.locator('.prop[data-key="opacity"] .num');
  await om.fill('10'); await om.press('Enter');
  let c = (await sel()).c;
  ok('two keyframes on opacity', c.kf.opacity && c.kf.opacity.length === 2, JSON.stringify(c.kf));
  const mid = await mm((id) => import('./js/core.js').then((core) => { const p = window.__mm.state.project; for (const t of p.tracks) { const c = t.clips.find((x) => x.id === id); if (c) { const a = c.kf.opacity[0], b = c.kf.opacity[1]; return { v: core.val(c, 'opacity', (a.t + b.t) / 2), a: a.v, b: b.v }; } } }), textClip);
  ok('linear interpolation midpoint', Math.abs(mid.v - (mid.a + mid.b) / 2) < 0.6, JSON.stringify(mid));
  await mm(() => window.__mm.engine.seek(2800)); await sleep(150);
  const readMid = await page.locator('.prop[data-key="opacity"] .num').inputValue();
  ok('slider shows interpolated value at playhead', Math.abs(+readMid - (100 + 10) / 2) < 15, readMid);
  ok('keyframe lane opened', (await page.locator('.kf-row').count()) > 0);
  await shot('03-keyframes');
  await page.locator('.kf-dot').first().click();
  await page.locator('.dialog select').selectOption('ease');
  await dlgBtn('Save');
  ok('keyframe interpolation set to ease', (await sel()).c.kf.opacity[0].e === 'ease');

  // 10. flash Hz sync + safety
  await mm(() => { const t = window.__mm.state.project.tracks.find((x) => x.type === 'flash'); window.__mm.select(t.id, t.clips[0].id); });
  await sleep(200);
  const on = page.locator('.prop[data-key="onMs"] .num'), off = page.locator('.prop[data-key="offMs"] .num'), hz = page.locator('.prop.hz .num');
  await on.fill('50'); await on.press('Enter'); await off.fill('100'); await off.press('Enter'); await sleep(50);
  ok('Hz computed from on/off', (await hz.inputValue()) === '6.67', await hz.inputValue());
  ok('Hz over cap turns red + warning', (await hz.getAttribute('class')).includes('danger') && await page.locator('.hz-warn.show').isVisible());
  await hz.fill('2'); await hz.press('Enter'); await sleep(100);
  c = (await sel()).c;
  ok('changing Hz updates off-time', c.props.onMs === 50 && c.props.offMs === 450, JSON.stringify([c.props.onMs, c.props.offMs]));
  ok('warning clears at 2 Hz', !(await page.locator('.hz-warn.show').count()));
  await page.locator('.prop:has(> .prop-top > label:text("Waveform")) select').selectOption('sine');
  await page.locator('.prop.toggle', { hasText: 'Mask frame' }).click();
  ok('mask toggle', (await sel()).c.props.mask === true);
  await page.locator('.prop:has(> .prop-top > label:text("Mask style")) select').selectOption('pattern');
  ok('mask style', (await sel()).c.props.maskType === 'pattern');
  const rep = page.locator('.prop[data-key="repeat"] .num'); await rep.fill('5'); await rep.press('Enter');
  ok('repeat count', (await sel()).c.props.repeat === 5);
  await page.locator('.prop:has(> .prop-top > label:text("Waveform")) select').selectOption('square');

  // 11. render timing check (pixel-level) — flash on 50 ms / off 950 ms
  const timingCheck = await mm(async () => {
    const R = await import('./js/renderer.js'); const M = await import('./js/model.js');
    const proj = { aspect: '16:9', affirmations: [{ text: 'I am' }], tracks: [{ ...M.newTrack('color'), clips: [Object.assign(M.newClip('color', { start: 0, dur: 5000 }), {})] }] };
    const c = proj.tracks[0].clips[0]; Object.assign(c.props, { onMs: 50, offMs: 950, ccolor: '#ffffff', opacity: 100, fadeIn: 0, fadeOut: 0 });
    const cv = document.createElement('canvas'); cv.width = 64; cv.height = 36; const g = cv.getContext('2d');
    const lum = (t, safe) => { R.draw(g, 64, 36, proj, t, { safe }); return g.getImageData(32, 18, 1, 1).data[0]; };
    const out = { on0: lum(0, true), on49: lum(49, true), off50: lum(50, true), off999: lum(999, true), on1000: lum(1000, true), on1049: lum(1049, true), off1051: lum(1051, true) };
    // 10 Hz request (50/50) with Safe Mode → period becomes 333 ms
    Object.assign(c.props, { onMs: 50, offMs: 50 });
    out.safe_on_110 = lum(110, true); out.unsafe_on_110 = lum(110, false); out.safe_on_340 = lum(340, true); out.safe_off_390 = lum(390, true);
    // red flash in safe mode gets desaturated
    Object.assign(c.props, { onMs: 100, offMs: 300, ccolor: '#ff0000' });
    R.draw(g, 64, 36, proj, 10, { safe: true }); const d = g.getImageData(32, 18, 1, 1).data; out.redSafe = [d[0], d[1], d[2]];
    R.draw(g, 64, 36, proj, 10, { safe: false }); const d2 = g.getImageData(32, 18, 1, 1).data; out.redUnsafe = [d2[0], d2[1], d2[2]];
    return out;
  });
  ok('flash ON exactly 0–49 ms', timingCheck.on0 > 200 && timingCheck.on49 > 200, JSON.stringify(timingCheck));
  ok('flash OFF at 50 ms and until 999 ms', timingCheck.off50 < 20 && timingCheck.off999 < 20);
  ok('next flash at 1000 ms, off after 1050', timingCheck.on1000 > 200 && timingCheck.on1049 > 200 && timingCheck.off1051 < 20);
  ok('Safe Mode caps 10 Hz to 3 Hz', timingCheck.safe_on_110 < 20 && timingCheck.unsafe_on_110 > 200 && timingCheck.safe_on_340 > 200 && timingCheck.safe_off_390 < 20);
  ok('Safe Mode softens saturated red flashing', timingCheck.redSafe[1] > 55 && timingCheck.redUnsafe[1] < 10, JSON.stringify([timingCheck.redSafe, timingCheck.redUnsafe]));

  // 12. follow pattern (beat detection)
  const fsel = page.locator('.group:has(h3:text("Follow pattern")) select').first();
  const musicTrackId = await mm(() => window.__mm.state.project.tracks.find((t) => t.type === 'music').id);
  await fsel.selectOption(musicTrackId);
  await page.waitForFunction(() => document.querySelector('.follow-status')?.textContent.includes('BPM'), null, { timeout: 20000 });
  const bpmText = await page.locator('.follow-status').textContent();
  const bpm = parseFloat(bpmText.match(/([\d.]+) BPM/)[1]);
  ok('beat detection ~120 BPM', Math.abs(bpm - 120) < 3 || Math.abs(bpm - 60) < 2 || Math.abs(bpm - 240) < 4, bpmText);
  const offR = page.locator('.group:has(h3:text("Follow pattern")) .num'); await offR.fill('-20'); await offR.press('Enter');
  ok('follow offset', (await sel()).c.follow.offset === -20);
  await page.locator('.group:has(h3:text("Follow pattern")) select').nth(1).selectOption('tempo');
  ok('follow tempo mode', (await sel()).c.follow.mode === 'tempo');

  // 13. presets
  await mm(() => { const t = window.__mm.state.project.tracks.find((x) => x.type === 'pattern'); window.__mm.select(t.id, t.clips[0].id); }); await sleep(150);
  ok('pattern default opacity 15%', (await sel()).c.props.opacity === 15);
  await page.locator('.group:has(h3:text("Presets")) select').selectOption({ label: 'Mandala Glow 20 percent' });
  ok('apply starter preset', (await sel()).c.props.patternType === 'mandala' && (await sel()).c.props.opacity === 20);
  await page.locator('.group:has(h3:text("Presets")) button', { hasText: 'Save my settings' }).click();
  await page.locator('.dialog input').fill('My mandala'); await dlgBtn('Save'); await page.waitForFunction(() => window.__mm.state.presets.some((p) => p.name === 'My mandala'), null, { timeout: 5000 }).catch(() => {});
  ok('save preset', await mm(() => window.__mm.state.presets.some((p) => p.name === 'My mandala')), await mm(() => window.__mm.state.presets.map((p) => p.name).join(',') + ' | dialogs:' + document.querySelectorAll('.scrim').length));
  ok('10+ starter presets', await mm(() => window.__mm.state.presets.filter((p) => p.starter).length >= 10));
  await page.locator('.prop.toggle', { hasText: 'Pulse on/off' }).click();
  ok('pattern pulse toggle shows pulse controls', await page.locator('.prop[data-key="onMs"]').isVisible());

  // binaural presets
  await mm(() => { const t = window.__mm.state.project.tracks.find((x) => x.type === 'binaural'); window.__mm.select(t.id, t.clips[0].id); }); await sleep(150);
  await page.locator('.chip', { hasText: '10 Hz' }).click();
  ok('binaural 10 Hz preset', (await sel()).c.props.beatHz === 10);
  const bh = page.locator('.prop[data-key="beatHz"] .num'); await bh.fill('7.5'); await bh.press('Enter');
  ok('binaural custom beat', (await sel()).c.props.beatHz === 7.5);
  // voice audio props
  await mm(() => { const t = window.__mm.state.project.tracks.find((x) => x.type === 'voice'); window.__mm.select(t.id, t.clips[0].id); }); await sleep(150);
  const vol = page.locator('.prop[data-key="volume"]'); await vol.locator('.num').fill('-12'); await vol.locator('.num').press('Enter');
  ok('volume dB readout', (await vol.locator('.readout').textContent()) === '-12.0 dB');
  const pan = page.locator('.prop[data-key="pan"]'); await pan.locator('.num').fill('-30'); await pan.locator('.num').press('Enter');
  ok('pan readout', (await pan.locator('.readout').textContent()) === 'L 30');
  const cop = page.locator('.prop[data-key="copies"] .num'); await cop.fill('3'); await cop.press('Enter');
  ok('voice copies', (await sel()).c.props.copies === 3);
  await page.locator('.prop.toggle', { hasText: 'Preserve pitch' }).click();
  ok('pitch toggle', (await sel()).c.props.pitch === false);
  await page.locator('.prop.toggle', { hasText: 'Preserve pitch' }).click();

  // 14. undo / redo
  const before = await mm(() => window.__mm.state.undo.length);
  await page.locator('button[aria-label="Undo"]').click();
  ok('undo restores pitch toggle', (await sel()).c.props.pitch === false);
  await page.locator('button[aria-label="Redo"]').click();
  ok('redo', (await sel()).c.props.pitch === true);
  for (let i = 0; i < 60; i++) await mm((i) => window.__mm.commit((p) => { p.name = 'Test ' + i; }), i);
  ok('undo history keeps 50+ steps', (await mm(() => window.__mm.state.undo.length)) >= 50, String(before));
  for (let i = 0; i < 55; i++) await mm(() => window.__mm.undo());
  ok('55 undos work', (await mm(() => window.__mm.state.project.name)) === 'Test 4');
  await page.keyboard.press('Control+Shift+Z');
  ok('keyboard redo', (await mm(() => window.__mm.state.project.name)) === 'Test 5');
  await mm(() => window.__mm.commit((p) => { p.name = 'Jason Test Movie'; }));

  // 15. drag / trim on timeline
  await mm(() => { window.__mm.state.snap = true; window.__mm.state.grid = 100; window.__mm.state.gridFrame = false; });
  const photoTrack = await mm(() => window.__mm.state.project.tracks.find((t) => t.type === 'photo' && t.clips.length).id);
  const clipLoc = page.locator(`.tl-row[data-track="${photoTrack}"] .clip`).first();
  await clipLoc.scrollIntoViewIfNeeded();
  const s0 = await mm((id) => window.__mm.state.project.tracks.find((t) => t.id === id).clips[0].start, photoTrack);
  const box = await clipLoc.boundingBox();
  const z = await mm(() => window.__mm.state.zoom);
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down(); await page.mouse.move(box.x + box.width / 2 + z * 0.5, box.y + box.height / 2, { steps: 6 }); await page.mouse.up();
  await sleep(150);
  const s1 = await mm((id) => window.__mm.state.project.tracks.find((t) => t.id === id).clips[0].start, photoTrack);
  ok('drag moves clip ~0.5 s and snaps to 100 ms', Math.abs(s1 - s0 - 500) <= 100 && s1 % 100 === 0, `${s0} -> ${s1}`);
  await page.locator('button[aria-label="Undo"]').click();
  ok('undo drag (single step)', (await mm((id) => window.__mm.state.project.tracks.find((t) => t.id === id).clips[0].start, photoTrack)) === s0);
  await clipLoc.click(); await sleep(100);
  const b2 = await page.locator(`.tl-row[data-track="${photoTrack}"] .clip`).first().boundingBox();
  const d0 = await mm((id) => window.__mm.state.project.tracks.find((t) => t.id === id).clips[0].dur, photoTrack);
  await page.mouse.move(b2.x + b2.width - 4, b2.y + b2.height / 2); await page.mouse.down();
  await page.mouse.move(b2.x + b2.width - 4 + z, b2.y + b2.height / 2, { steps: 6 }); await page.mouse.up(); await sleep(150);
  const d1 = await mm((id) => window.__mm.state.project.tracks.find((t) => t.id === id).clips[0].dur, photoTrack);
  ok('trim right edge stretches ~1 s', Math.abs(d1 - d0 - 1000) <= 100, `${d0} -> ${d1}`);
  const b3 = await page.locator(`.tl-row[data-track="${photoTrack}"] .clip`).first().boundingBox();
  await page.mouse.move(b3.x + 4, b3.y + b3.height / 2); await page.mouse.down();
  await page.mouse.move(b3.x + 4 + z * 0.3, b3.y + b3.height / 2, { steps: 6 }); await page.mouse.up(); await sleep(150);
  const cl = await mm((id) => window.__mm.state.project.tracks.find((t) => t.id === id).clips[0], photoTrack);
  ok('trim left edge', cl.start > s0 && Math.abs(cl.start + cl.dur - (s0 + d1)) <= 1, JSON.stringify([cl.start, cl.dur]));
  // grid 1 frame snap
  await page.locator('select[aria-label="Grid size"]').selectOption('frame');
  ok('grid: 1 frame', await mm(() => window.__mm.state.gridFrame));
  await page.locator('select[aria-label="Grid size"]').selectOption('10');
  ok('grid: 10 ms', await mm(() => window.__mm.state.grid === 10 && !window.__mm.state.gridFrame));
  await page.locator('button', { hasText: 'Snap' }).click();
  ok('snap toggle off', !(await mm(() => window.__mm.state.snap)));
  await page.locator('button', { hasText: 'Snap' }).click();

  // split / duplicate / delete clip buttons
  await mm((id) => { const t = window.__mm.state.project.tracks.find((x) => x.id === id); window.__mm.select(t.id, t.clips[0].id); window.__mm.engine.seek(t.clips[0].start + 1000); }, photoTrack); await sleep(150);
  await page.locator('.clip-actions button', { hasText: 'Split' }).click();
  ok('split clip', (await mm((id) => window.__mm.state.project.tracks.find((t) => t.id === id).clips.length, photoTrack)) === 2);
  await page.locator('.clip-actions button', { hasText: 'Duplicate' }).click();
  ok('duplicate clip', (await mm((id) => window.__mm.state.project.tracks.find((t) => t.id === id).clips.length, photoTrack)) === 3);
  await page.locator('.clip-actions button', { hasText: 'Delete' }).click();
  ok('delete clip', (await mm((id) => window.__mm.state.project.tracks.find((t) => t.id === id).clips.length, photoTrack)) === 2);
  await page.locator('.clip-actions button', { hasText: 'Go to start' }).count() && null;

  // 16. track controls
  await page.locator('.insp-head button[aria-label="Close properties"]').click().catch(() => {});
  const row0 = page.locator('.tl-row[data-track]').first();
  const t0id = await row0.getAttribute('data-track');
  for (const [lbl, key] of [['Mute track', 'mute'], ['Solo track', 'solo'], ['Lock track', 'lock'], ['Hide track', 'hidden']]) {
    await page.locator(`.tl-row[data-track="${t0id}"] .tb[aria-label="${lbl}"]`).click(); await sleep(60);
    ok('track ' + key + ' on', await mm(([id, k]) => window.__mm.state.project.tracks.find((t) => t.id === id)[k], [t0id, key]));
  }
  for (const lbl of ['Unmute track', 'Unsolo track', 'Unlock track', 'Show track']) await page.locator(`.tl-row[data-track="${t0id}"] .tb[aria-label="${lbl}"]`).click();
  ok('track toggles off again', await mm((id) => { const t = window.__mm.state.project.tracks.find((x) => x.id === id); return !t.mute && !t.solo && !t.lock && !t.hidden; }, t0id));
  await page.locator(`.tl-row[data-track="${t0id}"] .th-name`).click();
  await page.locator('.dialog input').fill('Top layer'); await dlgBtn('Save');
  ok('rename track', (await mm((id) => window.__mm.state.project.tracks.find((t) => t.id === id).name, t0id)) === 'Top layer');
  await page.locator(`.tl-row[data-track="${t0id}"] .tb[aria-label="Track menu"]`).click(); await choose('Color tag'); await choose('#7be07b');
  ok('track color tag', (await mm((id) => window.__mm.state.project.tracks.find((t) => t.id === id).color, t0id)) === '#7be07b');
  const nBefore = await trackCount();
  await page.locator(`.tl-row[data-track="${t0id}"] .tb[aria-label="Track menu"]`).click(); await choose('Duplicate track');
  ok('duplicate track', (await trackCount()) === nBefore + 1);
  const dupId = await mm(() => window.__mm.state.sel.trackId);
  await page.locator(`.tl-row[data-track="${dupId}"] .tb[aria-label="Track menu"]`).click(); await choose('Delete track'); await dlgBtn('Delete');
  ok('delete track', (await trackCount()) === nBefore);
  await page.locator(`.tl-row[data-track="${t0id}"] .tb[aria-label="Track menu"]`).click(); await choose('Move layer down');
  ok('move layer down via menu', (await mm((id) => window.__mm.state.project.tracks.findIndex((t) => t.id === id), t0id)) === 1);
  // drag grip to reorder back to top
  const grip = page.locator(`.tl-row[data-track="${t0id}"] .grip`);
  await page.evaluate(() => { document.querySelector('.tl-scroll').scrollTop = 0; }); await sleep(100);
  const gb = await grip.boundingBox(); const firstRow = await page.locator('.tl-row[data-track]').first().boundingBox();
  await page.mouse.move(gb.x + gb.width / 2, gb.y + gb.height / 2); await page.mouse.down();
  await page.mouse.move(gb.x + gb.width / 2, firstRow.y + 4, { steps: 8 }); await page.mouse.up(); await sleep(150);
  ok('drag handle reorders layer', (await mm((id) => window.__mm.state.project.tracks.findIndex((t) => t.id === id), t0id)) === 0);
  // add clip via track menu
  const flashT = await mm(() => window.__mm.state.project.tracks.find((t) => t.type === 'flash').id);
  const nc = await mm((id) => window.__mm.state.project.tracks.find((t) => t.id === id).clips.length, flashT);
  await page.locator(`.tl-row[data-track="${flashT}"] .tb[aria-label="Track menu"]`).click(); await choose('Add a clip');
  ok('add clip via track menu', (await mm((id) => window.__mm.state.project.tracks.find((t) => t.id === id).clips.length, flashT)) === nc + 1);

  // 17. zoom
  const zA = await mm(() => window.__mm.state.zoom);
  await page.locator('button[aria-label="Zoom in"]').click();
  ok('zoom in', (await mm(() => window.__mm.state.zoom)) > zA);
  await page.locator('button[aria-label="Zoom to single frames"]').click();
  ok('zoom to single frames (80 px/frame)', Math.abs((await mm(() => window.__mm.state.zoom * window.__mm.engine.timing.frameMs / 1000)) - 80) < 1);
  await shot('04-frame-zoom');
  await page.locator('button[aria-label="Fit whole movie"]').click();
  ok('fit zoom', (await mm(() => window.__mm.state.zoom)) < 200);
  await page.locator('button[aria-label="Zoom out"]').click();
  const tlb = await page.locator('.tl-scroll').boundingBox();
  const zB = await mm(() => window.__mm.state.zoom);
  await page.mouse.move(tlb.x + 250, tlb.y + 60); await page.keyboard.down('Control'); await page.mouse.wheel(0, -300); await page.keyboard.up('Control'); await sleep(100);
  ok('ctrl+wheel zoom (Chromebook pinch)', (await mm(() => window.__mm.state.zoom)) > zB);

  // 18. ruler scrub + transport
  const rb = await page.locator('.tl-ruler-cv').boundingBox();
  await page.mouse.click(rb.x + 100, rb.y + 10);
  ok('ruler tap seeks', (await mm(() => window.__mm.state.playhead)) > 0);
  await page.locator('button[aria-label="Go to start"]').click();
  await page.locator('button[aria-label="Forward one frame"]').click();
  ok('+1 frame step', Math.abs((await mm(() => window.__mm.state.playhead)) - fms) < 1.5);
  await page.locator('button[aria-label="Back one frame"]').click();
  ok('-1 frame step', (await mm(() => window.__mm.state.playhead)) === 0);

  // 19. playback with 13+ tracks
  await page.locator('.transport button[aria-label="Play"]').click();
  ok('flash warning before playing', await page.locator('.dialog h2', { hasText: 'flashing' }).isVisible());
  await dlgBtn('Play');
  await sleep(2000);
  const ph = await mm(() => window.__mm.state.playhead);
  ok('multi-track playback advances', ph > 1500 && ph < 2600, String(ph));
  const fr = await mm(() => window.__mm.engine.liveFrameRate());
  ok('render loop keeps frame rate', fr > 20, fr.toFixed(1) + ' fps');
  await shot('05-playing');
  await page.locator('.transport button[aria-label="Pause"]').click();
  ok('pause', !(await mm(() => window.__mm.state.playing)));
  await page.keyboard.press('Space'); await sleep(300);
  ok('space plays', await mm(() => window.__mm.state.playing));
  await page.keyboard.press('Space');

  // 20. timing info + settings
  await page.locator('button[aria-label="Timing info"]').click();
  const ti = await page.locator('.timing-info').textContent();
  ok('timing info shows refresh rate', /Measured refresh rate\s*[\d.]+ Hz/.test(ti), ti.slice(0, 80));
  await page.locator('.dialog button', { hasText: 'Measure again' }).click(); await sleep(2500);
  await dlgBtn('Close');
  await page.locator('button[aria-label="Settings"]').click();
  await page.locator('.dialog .toggle', { hasText: 'Safe Mode' }).click();
  ok('safe mode off asks confirmation', await page.locator('.dialog h2', { hasText: 'Turn Safe Mode off?' }).isVisible());
  await dlgBtn('Keep Safe Mode on');
  ok('safe mode stays on when declined', await mm(() => window.__mm.state.safe));
  await page.locator('.dialog .toggle', { hasText: 'Safe Mode' }).click(); await dlgBtn('Turn it off');
  ok('safe mode off after confirm', !(await mm(() => window.__mm.state.safe)));
  await page.locator('.dialog .toggle', { hasText: 'Safe Mode' }).click(); await sleep(100);
  ok('safe mode back on', await mm(() => window.__mm.state.safe));
  await page.locator('.dialog select').selectOption('9:16');
  ok('aspect 9:16', (await mm(() => window.__mm.state.project.aspect)) === '9:16');
  await page.locator('.dialog select').selectOption('16:9');
  await dlgBtn('Close');

  // 21. save / open project file
  const [dl] = await Promise.all([page.waitForEvent('download'), (async () => { await page.locator('.toolbar button', { hasText: 'Project' }).click(); await page.locator('.dialog button', { hasText: 'Save project file' }).click(); })()]);
  const projPath = path.join(OUT, 'test.mindmovie'); await dl.saveAs(projPath);
  const pj = JSON.parse(fs.readFileSync(projPath, 'utf8'));
  ok('project file saved with media', pj.format === 'mindmovie' && pj.media.length >= 4 && pj.project.tracks.length >= 13, `${pj.media.length} media, ${(fs.statSync(projPath).size / 1e6).toFixed(1)} MB`);
  await page.locator('.toolbar button', { hasText: 'Project' }).click();
  const [fc2] = await Promise.all([page.waitForEvent('filechooser'), page.locator('.dialog button', { hasText: 'Open project file' }).click()]);
  await fc2.setFiles(projPath); await sleep(1500);
  ok('open project file', (await mm(() => window.__mm.state.project.name)).includes('(opened)') && (await trackCount()) >= 13);
  await page.locator('.toolbar button', { hasText: 'Project' }).click();
  await page.waitForSelector('.proj');
  ok('projects list shows 2', (await page.locator('.proj').count()) === 2, String(await page.locator('.proj').count()));
  await page.locator('.proj', { hasText: '(opened)' }).locator('button[aria-label^="Delete"]').click(); await dlgBtn('Delete'); await sleep(500);
  ok('delete project', (await page.locator('.proj').count()) === 1);
  await page.locator('.proj button', { hasText: 'Duplicate' }).click(); await sleep(300);
  ok('duplicate project', (await page.locator('.proj').count()) === 2);
  await page.locator('.proj', { hasText: 'copy' }).locator('button', { hasText: 'Rename' }).click(); await page.locator('.dialog input').last().fill('Copy B'); await dlgBtn('Save'); await sleep(300);
  ok('rename project', (await page.locator('.proj', { hasText: 'Copy B' }).count()) === 1);
  await page.locator('.proj', { hasText: 'Copy B' }).locator('button[aria-label^="Delete"]').click(); await dlgBtn('Delete'); await sleep(300);
  await page.locator('.dialog button', { hasText: 'New' }).click(); await page.locator('.dialog input').last().fill('Short Export Test'); await dlgBtn('Save'); await sleep(300);
  ok('new project', (await mm(() => window.__mm.state.project.name)) === 'Short Export Test');

  // 22. export a short movie
  await mm(() => {
    const st = window.__mm.state;
    const photo = [...st.media.values()].find((m) => m.kind === 'image'); const music = [...st.media.values()].find((m) => m.sub === 'music');
    window.__mm.select(null, null); st.playhead = 0;
    window.__mm.addClip('photo', { mediaId: photo.id, dur: 2500 });
    window.__mm.select(null, null);
    window.__mm.addClip('text', { text: 'I am calm', dur: 2500, start: 0 });
    window.__mm.select(null, null);
    window.__mm.addClip('music', { mediaId: music.id, dur: 2500, start: 0 });
  });
  await tab('edit');
  const [dl2] = await Promise.all([page.waitForEvent('download', { timeout: 30000 }), (async () => { await page.locator('.toolbar button', { hasText: 'Export' }).click(); await dlgBtn('Start export'); })()]);
  const vidPath = path.join(OUT, await dl2.suggestedFilename()); await dl2.saveAs(vidPath);
  const sz = fs.statSync(vidPath).size;
  ok('export video file', sz > 20000, path.basename(vidPath) + ' ' + (sz / 1e6).toFixed(2) + ' MB');

  // 23. player + streak
  await tab('play');
  await page.locator('.player button[aria-label="Play"]').click();
  ok('feel-it-first breathing shows before play', await page.locator('.prime').waitFor({ timeout: 3000 }).then(() => true, () => false));
  await page.locator('.prime button', { hasText: 'Skip' }).click();
  await page.waitForFunction(() => !window.__mm.state.playing && window.__mm.state.playhead >= window.__mm.state.project.duration - 5, null, { timeout: 10000 });
  await page.locator('.dialog h2', { hasText: 'How do you feel' }).waitFor({ timeout: 3000 });
  ok('feeling check-in after watching', true);
  await page.locator('.face').nth(5).click();
  await page.locator('.dialog textarea').fill('Got a call about the new job!');
  await dlgBtn('Save');
  await sleep(300);
  ok('watching to the end marks today', (await page.locator('.p-streak').textContent()).includes('watched today'));
  await page.locator('.player .scrub').evaluate((el) => { el.value = '500'; el.dispatchEvent(new Event('input', { bubbles: true })); });
  ok('scrub bar seeks', Math.abs((await mm(() => window.__mm.state.playhead)) - 1250) < 30);
  ok('player time readout', /00:01\.2\d\d \/ 00:02\.500/.test(await page.locator('.p-time').textContent()));
  await page.locator('.player button', { hasText: 'Loop' }).click();
  await page.locator('.player button[aria-label="Back 5 seconds"]').click();
  await page.locator('.player button[aria-label="Forward 5 seconds"]').click();
  await page.locator('.player button[aria-label="Restart"]').click();
  ok('player buttons', (await mm(() => window.__mm.state.playhead)) === 0);
  await page.locator('.player button', { hasText: 'Loop' }).click();
  await shot('06-player');
  await tab('progress');
  ok('streak shows 1', (await page.locator('.streak-num').textContent()) === '1');
  ok('calendar marks today', (await page.locator('.cal-cell.today.done').count()) === 1);
  await page.locator('button[aria-label="Previous month"]').click(); await page.locator('button[aria-label="Next month"]').click();
  const yest = await mm(() => { const d = new Date(); d.setDate(d.getDate() - 1); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; });
  if (await page.locator(`.cal-cell[aria-label^="${yest}"]`).count()) {
    await page.locator(`.cal-cell[aria-label^="${yest}"]`).click(); await dlgBtn('Mark watched'); await sleep(200);
    ok('manual day mark → streak 2', (await page.locator('.streak-num').textContent()) === '2');
  }
  await page.locator('.prop.toggle', { hasText: 'Remind me' }).click(); await sleep(300);
  ok('reminder toggle', await mm(() => import('./js/db.js').then((m) => m.db.kvGet('reminder')).then((r) => r.on)));
  await page.locator('button', { hasText: 'Send a test reminder' }).click();
  await shot('07-progress');

  // 24. installability + offline
  const cdp = await ctx.newCDPSession(page);
  const inst = await cdp.send('Page.getInstallabilityErrors');
  ok('Chrome installability check passes', inst.installabilityErrors.length === 0, JSON.stringify(inst.installabilityErrors));
  const man = await cdp.send('Page.getAppManifest');
  ok('manifest parsed without errors', man.errors.length === 0, JSON.stringify(man.errors));
  await page.waitForFunction(() => navigator.serviceWorker.controller || navigator.serviceWorker.ready.then(() => true), null, { timeout: 10000 });
  await page.reload(); await page.waitForSelector('body.ready');
  await ctx.setOffline(true);
  await page.reload(); await page.waitForSelector('body.ready', { timeout: 10000 }).catch(() => {});
  ok('works offline (reload while offline)', await page.locator('.tabbar').isVisible());
  ok('data persists offline', (await mm(() => window.__mm.state.media.size)) >= 6);
  await ctx.setOffline(false);

  // 25. wide layout (Chromebook)
  await page.setViewportSize({ width: 1366, height: 768 });
  await tab('edit');
  await mm(() => { const t = window.__mm.state.project.tracks.find((x) => x.type === 'text'); window.__mm.select(t.id, t.clips[0].id); });
  await sleep(300);
  const ib = await page.locator('.inspector').boundingBox();
  ok('Chromebook: side-by-side inspector', ib.x > 800 && ib.height > 500, JSON.stringify(ib));
  await shot('08-chromebook');

  ok('no page errors', errors.length === 0, errors.slice(0, 5).join(' | '));
  const failed = results.filter((r) => !r.pass);
  console.log(`\n${results.length - failed.length}/${results.length} passed`);
  fs.writeFileSync(path.join(OUT, 'results.json'), JSON.stringify(results, null, 2));
  await browser.close();
  process.exit(failed.length ? 1 : 0);
})().catch(async (e) => { console.error('CRASH', e); try { await page.screenshot({ path: path.join(OUT, 'crash.png') }); } catch (er) { /* */ } process.exit(2); });
