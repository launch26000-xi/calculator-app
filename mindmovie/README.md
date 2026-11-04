# Mind Movie

A personal vision-board video maker (installable PWA) with a multi-track timeline, affirmations,
voice recording, music, binaural tones, flash/scroll/pattern layers, keyframes, presets, video export
and a daily streak tracker. Everything is stored on the device (IndexedDB); no account.

**Live:** https://launch26000-xi.github.io/no.2/mindmovie/ (GitHub Pages)

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
NODE_PATH=$(npm root -g) node mindmovie/tests/e2e.cjs   /tmp/mm-media /tmp/mm-out   # 135 checks
NODE_PATH=$(npm root -g) node mindmovie/tests/sweep.cjs /tmp/mm-media /tmp/mm-out   # taps every control on a Pixel 7
```
