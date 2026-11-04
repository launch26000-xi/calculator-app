// Tests for: guided tour, help, ideas, {name}, templates (all 6), live loop + Quick Add while playing,
// breathing primer, check-in, evidence journal, milestone celebration, new uplifting visuals.
//   NODE_PATH=$(npm root -g) node mindmovie/tests/round2.cjs <media-dir> <out-dir>
const { chromium, devices } = require('playwright');
const path = require('path');
const MEDIA = process.argv[2];
const OUT = process.argv[3] || '.';
const URL = process.env.MM_URL || 'http://localhost:8765/mindmovie/';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let fails = 0, total = 0;
const ok = (n, c, i = '') => { total++; if (!c) fails++; console.log((c ? 'PASS ' : 'FAIL ') + n + (i ? '  — ' + i : '')); };

(async () => {
  const browser = await chromium.launch({ args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', '--autoplay-policy=no-user-gesture-required'] });
  const ctx = await browser.newContext({ ...devices['Pixel 7'], permissions: ['camera', 'microphone', 'notifications'] });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => { errors.push(e.message); console.log('PAGEERROR', e.message); });
  const mm = (fn, a) => page.evaluate(fn, a);
  const dlg = (label) => page.locator('.scrim .dialog-btns button', { hasText: label }).last().tap();
  const shot = (n) => page.screenshot({ path: path.join(OUT, n + '.png') });
  await page.goto(URL);
  await page.waitForSelector('body.ready');
  await dlg('I understand');
  await page.locator('.dialog h2', { hasText: 'Welcome' }).waitFor();
  await shot('r2-01-welcome');

  // ---- guided tour ----
  await dlg('Guide me');
  await page.locator('.tour-bubble').waitFor();
  const seenTabs = new Set();
  for (let i = 0; i < 11; i++) {
    await sleep(350);
    const t = await page.locator('.tour-count').textContent();
    const spot = await page.locator('.tour-spot').boundingBox();
    seenTabs.add(await mm(() => document.body.dataset.tab));
    if (i === 3) await shot('r2-02-tour-templates');
    if (i === 5) await shot('r2-03-tour-quickadd');
    if (!spot || spot.width < 20 || spot.height < 20) ok('tour step ' + (i + 1) + ' spotlights something', false, t);
    await page.locator('.tour-next').tap();
  }
  ok('tour walks all 11 steps across all 4 tabs', seenTabs.size === 4 && !(await page.locator('.tour').count()), [...seenTabs].join(','));
  ok('tour remembered as done', await mm(() => import('./js/db.js').then((m) => m.db.kvGet('toured'))));
  await page.locator('.tab[data-tab="library"]').tap();
  await page.locator('.start-card button', { hasText: 'Guide me' }).tap();
  await page.locator('.tour-next').tap(); await sleep(300);
  await page.locator('.tour-bubble button', { hasText: 'Back' }).tap(); await sleep(300);
  ok('tour back button', (await page.locator('.tour-count').textContent()).startsWith('Step 1'));
  await page.locator('.tour-bubble button', { hasText: 'Skip tour' }).tap();
  ok('skip tour closes it', !(await page.locator('.tour').count()));

  // ---- help ----
  await page.locator('button[aria-label="Help and guided tour"]').tap();
  ok('help center opens with topics', (await page.locator('.help-card').count()) >= 10);
  await shot('r2-04-help');
  await page.locator('.help-card', { hasText: 'Subconscious layers' }).tap();
  ok('help topic shows steps', (await page.locator('.help-steps li').count()) >= 5);
  await dlg('Got it'); await dlg('Close');
  await page.locator('.aff-card .help-i').tap();
  ok('ⓘ button opens how-to', await page.locator('.dialog h2', { hasText: 'affirmations' }).isVisible());
  await dlg('Got it');

  // ---- ideas + name ----
  const n0 = await mm(() => window.__mm.state.project.affirmations.length);
  await page.locator('button', { hasText: 'Ideas' }).tap();
  await page.locator('summary', { hasText: 'Confidence' }).tap();
  await page.locator('.idea', { hasText: 'I am confident, capable and calm.' }).tap();
  await page.locator('.idea', { hasText: '{name}, you can do this' }).tap();
  await dlg('Add selected'); await sleep(200);
  ok('ideas add 2 affirmations', (await mm(() => window.__mm.state.project.affirmations.length)) === n0 + 2);
  await page.locator('button[aria-label="Settings"]').tap();
  await page.locator('.dialog input[placeholder="e.g. Jason"]').fill('Jason');
  await page.locator('.dialog input[placeholder="e.g. Jason"]').press('Tab');
  await dlg('Close');
  ok('name saved', (await mm(() => window.__mm.state.userName)) === 'Jason');
  ok('{name} becomes Jason in the movie', (await mm(() => import('./js/renderer.js').then((r) => r.personal('{name}, you can do this', { name: window.__mm.state.userName })))) === 'Jason, you can do this');

  // ---- new visuals render ----
  const vis = await mm(async () => {
    const R = await import('./js/renderer.js'); const M = await import('./js/model.js');
    const out = {};
    for (const pt of ['sunrise', 'starfield', 'aurora', 'bokeh', 'hearts']) {
      const c = M.newClip('pattern', { start: 0, dur: 10000 }); Object.assign(c.props, { patternType: pt, opacity: 100, fadeIn: 0, fadeOut: 0 });
      const proj = { aspect: '16:9', affirmations: [], tracks: [{ ...M.newTrack('pattern'), clips: [c] }] };
      const cv = document.createElement('canvas'); cv.width = 320; cv.height = 180; const g = cv.getContext('2d');
      R.draw(g, 320, 180, proj, 3000, { safe: true });
      const d = g.getImageData(0, 0, 320, 180).data; let lit = 0; for (let i = 0; i < d.length; i += 4) if (d[i] + d[i + 1] + d[i + 2] > 60) lit++;
      out[pt] = lit;
    }
    return out;
  });
  ok('5 new uplifting visuals draw', Object.values(vis).every((v) => v > 100), JSON.stringify(vis));

  // ---- add a photo so templates can use it ----
  const [fc] = await Promise.all([page.waitForEvent('filechooser'), page.locator('button', { hasText: 'Upload photos & videos' }).tap()]);
  await fc.setFiles([path.join(MEDIA, 'photo1.jpg'), path.join(MEDIA, 'photo2.jpg')]);
  await page.waitForFunction(() => window.__mm.state.media.size >= 2);
  const [fc2] = await Promise.all([page.waitForEvent('filechooser'), page.locator('button', { hasText: 'Upload music' }).tap()]);
  await fc2.setFiles(path.join(MEDIA, 'music120.mp3'));
  await page.waitForFunction(() => window.__mm.state.media.size >= 3);

  // ---- all templates build (programmatic check) ----
  const built = await mm(async () => {
    const T = await import('./js/templates.js');
    const st = window.__mm.state;
    const res = {};
    for (const t of T.TEMPLATES) {
      const p = T.buildTemplate(t.id, { affirmations: st.project.affirmations, media: [...st.media.values()] });
      const end = Math.max(...p.tracks.flatMap((tr) => tr.clips.map((c) => c.start + c.dur)));
      const empty = T.buildTemplate(t.id, { affirmations: [], media: [] });
      res[t.id] = { tracks: p.tracks.length, end, len: t.len, loop: p.loop, emptyTracks: empty.tracks.length, types: [...new Set(p.tracks.map((x) => x.type))].join('+') };
    }
    return res;
  });
  for (const [id, r] of Object.entries(built)) ok(`template ${id}: ${r.tracks} tracks, ${r.len / 1000}s loop`, r.loop && r.end === r.len && r.tracks >= 2 && r.emptyTracks >= 2, r.types);
  ok('energy template flashes follow the music beat', await mm(async () => { const T = await import('./js/templates.js'); const p = T.buildTemplate('energy', { affirmations: [], media: [...window.__mm.state.media.values()] }); return !!p.tracks.find((t) => t.type === 'flash').clips[0].follow; }));

  // ---- create via UI + live loop ----
  await page.locator('.tab[data-tab="library"]').tap();
  await shot('r2-05-start-and-templates');
  await page.locator('.tpl', { hasText: 'Build-As-You-Go' }).tap();
  await dlg('Create & play');
  await page.waitForFunction(() => document.body.dataset.tab === 'edit');
  await sleep(500);
  ok('template opens in Edit and plays', await mm(() => window.__mm.state.playing));
  ok('loop is on', await page.locator('.loop-btn.on').count() === 1);
  await mm(() => window.__mm.engine.seek(29600));
  await sleep(900);
  const wrapped = await mm(() => [window.__mm.state.playhead, window.__mm.state.playing]);
  ok('loop wraps to the start and keeps playing', wrapped[1] && wrapped[0] < 1500, JSON.stringify(wrapped));
  // quick add while playing
  const tc0 = await mm(() => window.__mm.state.project.tracks.reduce((a, t) => a + t.clips.length, 0));
  await page.locator('.qa', { hasText: 'Words' }).tap();
  await page.locator('.choose-item').nth(1).tap(); await sleep(200);
  await page.locator('.qa', { hasText: 'Sparkle' }).tap();
  await page.locator('.choose-item', { hasText: 'Golden bokeh' }).tap(); await sleep(200);
  await page.locator('.qa', { hasText: 'Flash' }).tap(); await sleep(200);
  await page.locator('.qa', { hasText: 'Photo' }).tap();
  await page.locator('.choose-item', { hasText: 'photo2' }).tap(); await sleep(200);
  await page.locator('.qa', { hasText: 'Voice' }).tap();
  await page.locator('.choose-item', { hasText: 'Record now' }).tap();
  await page.locator('.dialog button', { hasText: 'Start recording' }).tap(); await sleep(1300);
  await page.locator('.dialog button', { hasText: 'Stop' }).tap(); await page.waitForSelector('.recorder audio:not(.hidden)');
  await dlg('Save'); await page.locator('.dialog input').fill('Loop voice'); await dlg('Save'); await sleep(400);
  const tc1 = await mm(() => window.__mm.state.project.tracks.reduce((a, t) => a + t.clips.length, 0));
  ok('Quick Add put 5 new clips in while playing', tc1 === tc0 + 5, `${tc0} -> ${tc1}`);
  ok('still playing after all that adding', await mm(() => window.__mm.state.playing));
  ok('quick-added clips stay inside the loop', await mm(() => window.__mm.state.project.duration) <= 30000 + 50, String(await mm(() => window.__mm.state.project.duration)));
  await shot('r2-06-live-loop');
  await page.locator('.transport .loop-btn').tap();
  ok('loop toggle off', !(await mm(() => window.__mm.engine.isLooping())));
  await page.locator('.transport .loop-btn').tap();
  await mm(() => window.__mm.engine.pause());

  // ---- player: breathing primer, check-in, celebration ----
  await mm(async () => {
    const { db } = await import('./js/db.js');
    const k = (o) => { const d = new Date(); d.setDate(d.getDate() - o); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
    await db.kvSet('watched', [k(1), k(2)]);
    const P = await import('./js/progress.js'); await P.loadProgress();
  });
  await page.locator('.tab[data-tab="play"]').tap();
  await mm(() => window.__mm.engine.seek(0));
  await page.locator('.player button[aria-label="Play"]').tap();
  ok('flash warning before the movie (quick-added flash)', await page.locator('.dialog h2', { hasText: 'flashing' }).waitFor({ timeout: 3000 }).then(() => true, () => false));
  await dlg('Play');
  await page.locator('.prime').waitFor();
  await sleep(2500);
  await shot('r2-07-breathing');
  ok('breathing primer shows text + circle', (await page.locator('.prime-text').textContent()).length > 5);
  await page.locator('.prime button', { hasText: 'Skip' }).tap();
  await sleep(300);
  ok('movie plays after primer', await mm(() => window.__mm.state.playing));
  await mm(() => window.__mm.engine.seek(28500));
  await page.waitForFunction(() => document.querySelector('.p-streak')?.textContent.includes('watched today') || document.querySelector('.dialog h2')?.textContent.includes('streak'), null, { timeout: 40000 }).catch(() => {});
  // one full pass is needed: run quickly by watching the full loop
  await page.waitForFunction(() => document.querySelector('.dialog h2')?.textContent.includes('streak'), null, { timeout: 40000 }).catch(() => {});
  const cel = await page.locator('.dialog h2', { hasText: 'streak' }).count();
  ok('3-day milestone celebration', cel === 1);
  if (cel) { await shot('r2-08-celebration'); await dlg('Keep going'); }
  await page.locator('.player button[aria-label="Pause"]').tap().catch(() => {});
  await page.locator('.dialog h2', { hasText: 'How do you feel' }).waitFor({ timeout: 4000 }).catch(() => {});
  ok('check-in after a full loop pass + pause', await page.locator('.dialog h2', { hasText: 'How do you feel' }).count() === 1);
  await page.locator('.face').nth(6).tap();
  await page.locator('.dialog textarea').fill('Felt amazing and got good news today');
  await dlg('Save'); await sleep(300);
  await page.locator('.tab[data-tab="progress"]').tap(); await sleep(300);
  ok('streak shows 3', (await page.locator('.streak-num').textContent()) === '3');
  ok('feeling chart shows the check-in', (await page.locator('.fb').count()) === 1);
  await page.locator('button', { hasText: '+ Add evidence' }).tap();
  await page.locator('.dialog textarea').fill('A stranger complimented my work');
  await dlg('Save'); await sleep(300);
  ok('evidence journal lists 2 entries', (await page.locator('.journal li').count()) === 2);
  await shot('r2-09-progress');
  ok('no page errors', errors.length === 0, errors.join(' | '));
  console.log(`\n${total - fails}/${total} passed`);
  await browser.close();
  process.exit(fails ? 1 : 0);
})().catch((e) => { console.error('CRASH', e); process.exit(2); });
