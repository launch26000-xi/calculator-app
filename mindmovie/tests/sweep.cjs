// "Tap every button" sweep on a phone (Pixel 7 emulation, real touch events) + touch drag + pinch-zoom.
// Builds a project via the app's own functions, then taps every visible control on every tab and checks
// each one does something observable (DOM change, dialog, state change, file picker or download) without errors.
const { chromium, devices } = require('playwright');
const path = require('path');
const MEDIA = process.argv[2];
const OUT = process.argv[3] || '.';
const URL = process.env.MM_URL || 'http://localhost:8765/mindmovie/';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let fails = 0;
const ok = (n, c, i = '') => { if (!c) fails++; console.log((c ? 'PASS ' : 'FAIL ') + n + (i ? '  — ' + i : '')); };

(async () => {
  const browser = await chromium.launch({ args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', '--autoplay-policy=no-user-gesture-required'] });
  const ctx = await browser.newContext({ ...devices['Pixel 7'], permissions: ['camera', 'microphone', 'notifications'], acceptDownloads: true });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  let pickers = 0, downloads = 0;
  page.on('filechooser', async (fc) => { pickers++; });
  page.on('download', () => { downloads++; });
  await page.goto(URL);
  await page.waitForSelector('body.ready');
  await page.locator('.dialog button', { hasText: 'I understand' }).tap();
  await page.locator('.dialog button', { hasText: 'Not now' }).tap();
  // seed media + a 12-track project through the UI functions
  const fs = require('fs');
  const files = ['photo1.jpg', 'clip.webm', 'music120.mp3'].map((f) => ({ name: f, b64: fs.readFileSync(path.join(MEDIA, f)).toString('base64') }));
  await page.evaluate(async (files) => {
    const mm = window.__mm;
    const ids = {};
    for (const f of files) {
      const bin = Uint8Array.from(atob(f.b64), (c) => c.charCodeAt(0));
      const type = f.name.endsWith('jpg') ? 'image/jpeg' : f.name.endsWith('webm') ? 'video/webm' : 'audio/mpeg';
      const r = await mm.ingest(new File([bin], f.name, { type }));
      ids[f.name] = r;
    }
    const add = (type, o = {}) => { mm.select(null, null); mm.state.playhead = 0; return mm.addClip(type, { start: 0, ...o }); };
    add('music', { mediaId: ids['music120.mp3'].id, dur: 12000 });
    add('voice', { mediaId: ids['music120.mp3'].id, dur: 6000 });
    add('binaural', { dur: 12000 });
    add('video', { mediaId: ids['clip.webm'].id, dur: 4000 });
    add('photo', { mediaId: ids['photo1.jpg'].id, dur: 12000 });
    add('pattern', { dur: 12000 });
    add('color', { dur: 12000 });
    add('text', { text: 'I am calm', dur: 6000 });
    add('flash', { dur: 12000 });
    add('scroll', { dur: 12000 });
    add('text', { text: 'I have enough', start: 6000, dur: 6000 });
    mm.select(null, null);
  }, files);
  ok('seeded 10+ tracks', (await page.evaluate(() => window.__mm.state.project.tracks.length)) >= 10);

  // ---- touch drag + pinch on the timeline ----
  await page.locator('.tab[data-tab="edit"]').tap(); await sleep(400);
  const cdp = await ctx.newCDPSession(page);
  const touch = async (type, pts) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts.map(([x, y], i) => ({ x, y, id: i })) });
  const photoId = await page.evaluate(() => window.__mm.state.project.tracks.find((t) => t.type === 'photo').id);
  await page.evaluate(() => { window.__mm.state.snap = false; });
  const clip = page.locator(`.tl-row[data-track="${photoId}"] .clip`);
  await clip.scrollIntoViewIfNeeded();
  await page.evaluate(() => { document.querySelector('.tl-scroll').scrollLeft = 0; });
  let b = await clip.boundingBox();
  const start0 = await page.evaluate((id) => window.__mm.state.project.tracks.find((t) => t.id === id).clips[0].start, photoId);
  const z = await page.evaluate(() => window.__mm.state.zoom);
  const y = b.y + b.height / 2, x = Math.max(b.x, (await page.locator('.tl-scroll').boundingBox()).x + 140) + 30;
  await touch('touchStart', [[x, y]]);
  for (let i = 1; i <= 8; i++) await touch('touchMove', [[x + (z / 8) * i, y]]);
  await touch('touchEnd', []);
  await sleep(200);
  const start1 = await page.evaluate((id) => window.__mm.state.project.tracks.find((t) => t.id === id).clips[0].start, photoId);
  ok('touch drag moves a clip ~1 s', Math.abs(start1 - start0 - 1000) < 60, `${start0} -> ${start1}`);
  await page.evaluate(() => { window.__mm.state.snap = true; });
  const tl = await page.locator('.tl-scroll').boundingBox();
  const z0 = await page.evaluate(() => window.__mm.state.zoom);
  const cy = tl.y + 20, cx = tl.x + tl.width / 2 + 40;
  await touch('touchStart', [[cx - 30, cy], [cx + 30, cy]]);
  for (let i = 1; i <= 10; i++) await touch('touchMove', [[cx - 30 - i * 10, cy], [cx + 30 + i * 10, cy]]);
  await touch('touchEnd', []);
  await sleep(200);
  const z1 = await page.evaluate(() => window.__mm.state.zoom);
  ok('pinch-out zooms timeline in', z1 > z0 * 2, `${z0.toFixed(1)} -> ${z1.toFixed(1)} px/s`);
  for (let k = 0; k < 6; k++) {
    await touch('touchStart', [[cx - 150, cy], [cx + 150, cy]]);
    for (let i = 1; i <= 10; i++) await touch('touchMove', [[cx - 150 + i * 13, cy], [cx + 150 - i * 13, cy]]);
    await touch('touchEnd', []);
  }
  ok('pinch-in zooms out', (await page.evaluate(() => window.__mm.state.zoom)) < z1);
  await page.screenshot({ path: path.join(OUT, 'm1-edit-phone.png') });

  // ---- sweep ----
  async function closeDialogs() {
    for (let i = 0; i < 5 && (await page.locator('.scrim').count()); i++) {
      const btn = page.locator('.scrim').last().locator('.dialog-btns button', { hasText: /^(Cancel|Close|Done|Keep Safe Mode on)$/ });
      if (await btn.count()) await btn.first().tap().catch(() => {}); else await page.keyboard.press('Escape');
      await sleep(120);
    }
    await page.evaluate(() => document.querySelectorAll('.scrim').forEach((s) => s.remove()));
    await page.evaluate(() => document.fullscreenElement && document.exitFullscreen()).catch(() => {});
    if (await page.locator('.tour').count()) await page.locator('.tour-bubble button', { hasText: 'Skip tour' }).tap();
  }
  const dead = [], tested = new Set();
  const QUERY = (scope) => [...document.querySelectorAll(scope + ' button, ' + scope + ' input[type=checkbox], ' + scope + ' select')]
    .filter((b) => b.offsetParent && !b.disabled && !b.closest('[hidden]'));
  async function sweep(tabName, scope, setup) {
    await page.locator(`.tab[data-tab="${tabName}"]`).tap(); await sleep(300);
    if (setup) await setup();
    const n = await page.evaluate(`(${QUERY.toString()})(${JSON.stringify(scope)}).length`);
    for (let i = 0; i < n; i++) {
      if (setup) await setup();
      const info = await page.evaluate(([q, scope, i]) => { const list = eval(q)(scope); const b = list[i]; if (!b) return null; b.dataset.sweep = 'x' + Math.random(); return { key: b.dataset.sweep, label: (b.getAttribute('aria-label') || b.textContent || b.tagName).trim().slice(0, 40) }; }, [`(${QUERY.toString()})`, scope, i]);
      if (!info) continue;
      const { key, label } = info;
      if (/^(Delete|Delete affirmation)$/.test(label) || /^Delete /.test(label)) continue; // destructive ones are covered in e2e
      const el = page.locator(`[data-sweep="${key}"]`);
      if (!(await el.isVisible().catch(() => false))) continue;
      const before = await page.evaluate(() => ({ s: JSON.stringify(window.__mm.state.project) + window.__mm.state.playhead + window.__mm.state.zoom + window.__mm.state.snap + window.__mm.state.playing + JSON.stringify(window.__mm.state.sel), mut: (window.__mut = 0) }));
      await page.evaluate(() => { window.__obs?.disconnect(); window.__obs = new MutationObserver((m) => { window.__mut += m.length; }); window.__obs.observe(document.body, { subtree: true, childList: true, attributes: true, characterData: true }); });
      const p0 = pickers, d0 = downloads;
      const tag = await el.evaluate((e) => e.tagName);
      try {
        if (tag === 'SELECT') { const opts = await el.evaluate((s) => [...s.options].map((o) => o.value)); const cur = await el.inputValue(); const nv = opts.find((o) => o !== cur); if (nv !== undefined) await el.selectOption(nv); }
        else if (tag === 'INPUT') await el.evaluate((e) => e.closest('label')).then(() => page.locator(`label:has([data-sweep="${key}"])`).tap({ timeout: 3000 }));
        else await el.tap({ timeout: 3000 });
      } catch (e) { dead.push(label + ' (not tappable: ' + e.message.split('\n')[0] + ')'); continue; }
      await sleep(250);
      const after = await page.evaluate(() => ({ s: JSON.stringify(window.__mm.state.project) + window.__mm.state.playhead + window.__mm.state.zoom + window.__mm.state.snap + window.__mm.state.playing + JSON.stringify(window.__mm.state.sel), mut: window.__mut }));
      const did = after.s !== before.s || after.mut > 0 || pickers > p0 || downloads > d0 || (await page.locator('.scrim').count()) > 0;
      if (!did) dead.push(tabName + ':' + label);
      tested.add(tabName + ':' + label);
      count++;
      if (await page.evaluate(() => window.__mm.state.playing)) await page.evaluate(() => window.__mm.engine.pause());
      await closeDialogs();
      if ((await page.evaluate(() => document.body.dataset.tab)) !== tabName) { await page.locator(`.tab[data-tab="${tabName}"]`).tap(); await sleep(200); }
    }
  }
  let count = 0;
  await sweep('library', '#view-library');
  await sweep('edit', '#view-edit .toolbar');
  await sweep('edit', '#view-edit .transport');
  await sweep('edit', '#view-edit .tl-head');
  // select each track type's clip and sweep its inspector
  const trackIds = await page.evaluate(() => window.__mm.state.project.tracks.map((t) => [t.id, t.type]));
  const seen = new Set();
  for (const [id, type] of trackIds) {
    if (seen.has(type)) continue; seen.add(type);
    const setup = async () => {
      const ok = await page.evaluate((id) => { const t = window.__mm.state.project.tracks.find((x) => x.id === id); if (!t || !t.clips[0]) return false; if (window.__mm.state.sel.clipId !== t.clips[0].id) { window.__mm.select(t.id, t.clips[0].id); window.__mm.engine.seek(t.clips[0].start + 500); return 'sel'; } return true; }, id);
      if (ok === 'sel') await sleep(200);
    };
    await sweep('edit', '#view-edit .inspector', setup);
  }
  await sweep('play', '#view-play');
  await sweep('progress', '#view-progress');
  await sweep('progress', '.topbar');
  console.log('tapped', count, 'controls,', tested.size, 'distinct:', [...tested].join(' ; '));
  ok('every control responds (none dead)', dead.length === 0, dead.join(' | '));
  ok('no page errors during sweep', errors.length === 0, errors.slice(0, 5).join(' | '));
  await page.locator('.tab[data-tab="play"]').tap(); await sleep(300);
  await page.screenshot({ path: path.join(OUT, 'm2-play-phone.png') });
  await browser.close();
  process.exit(fails ? 1 : 0);
})().catch((e) => { console.error('CRASH', e); process.exit(2); });
