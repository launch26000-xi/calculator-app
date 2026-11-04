# Mind Movie

A personal vision-board video maker (installable PWA) with a multi-track timeline, affirmations,
voice recording, music, binaural tones, flash/scroll/pattern layers, keyframes, presets, video export
and a daily streak tracker. Everything is stored on the device (IndexedDB); no account.

**Live:** https://launch26000-xi.github.io/no.2/mindmovie/ (GitHub Pages)

## Round 2 features
- **Guide me** tour (11 spotlight steps), **?** Help center, ⓘ how-to buttons on every section (`js/help.js`, `js/guide.js`)
- **Templates** that build a looping movie from your own material: Golden Morning, Deep Subconscious, Energy & Excitement,
  Gratitude Glow, Sleep Wind-Down, Build-As-You-Go (`js/templates.js`)
- **Live loop + Quick Add**: add words, photos, voice, flashes and sparkles at the playhead while it plays
- Uplifting built-in visuals: sunrise, starfield, aurora, golden bokeh, rising hearts
- ✨ Affirmation idea packs, `{name}` personalization, Feel-it-first breathing, feeling check-in, evidence journal,
  milestone celebrations (`js/joy.js`)

## Files
- `index.html`, `manifest.webmanifest`, `sw.js` (offline + daily reminder), `css/app.css`, `icons/`
- `js/main.js` app shell, Edit screen, settings, timing info, projects
- `js/model.js` track types, every clip property (min/max/units), starter presets
- `js/core.js` timing math: mm:ss.mmm, frames, keyframes, speed, pulse/flash patterns, Safe Mode caps
- `js/renderer.js` draws all visual tracks on one canvas per frame
- `js/engine.js` clock + requestAnimationFrame loop, video/audio sync, Web Audio mix, binaural, beat detection
- `js/timeline.js` multi-track timeline (drag, trim, snap, pinch zoom, reorder, keyframe lanes)
- `js/inspector.js` property sliders + number boxes + keyframe diamonds (bottom sheet on phones)
- `js/library.js` uploads, camera, voice recorder, affirmations; `js/player.js`; `js/progress.js`; `js/exporter.js`; `js/safety.js`
- No build step: plain ES modules. Bump `VERSION` in `sw.js` when changing files.

## Tests
```
sh tests/make_media.sh /tmp/mm-media
python3 -m http.server 8765 &      # from the repo root
NODE_PATH=$(npm root -g) node mindmovie/tests/e2e.cjs   /tmp/mm-media /tmp/mm-out   # 138 checks
NODE_PATH=$(npm root -g) node mindmovie/tests/round2.cjs /tmp/mm-media /tmp/mm-out   # 34 checks: tour, templates, live loop, feelings
NODE_PATH=$(npm root -g) node mindmovie/tests/sweep.cjs /tmp/mm-media /tmp/mm-out   # taps every control on a Pixel 7
```
