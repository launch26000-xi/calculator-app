# Colorado No2 — The Right Rite

A Progressive Web App (installable website) for Colorado's Second Amendment community.
No Google Play Store or Apple App Store involved: Android and iPhone use the same site.

**Live address (after GitHub Pages is turned on):** https://launch26000-xi.github.io/calculator-app/

## Stage 1 (built)
- Trading Post home with 11 categories, sample listings, rough distances only, radius slider (10 mi / 50 mi / whole state)
- Deal steps: Offer → Counter → Lock It In → Meet and Inspect → Deal Done → 1–5 star ratings; 5 negotiation tips; no money moves through the app
- Member profiles with verification labels (Photo ID / Picture / Phone / Not Verified) and "Use Caution" (3+ ratings of ≤2 stars)
- No2's Library Q&A with "not legal advice" notice, Constitutional view note, source labels and official links
- Messages / Newsletter / Suggestion Box placeholders, Settings with Install No2 (Android prompt + iPhone picture guide)
- Manifest, icons (48–512 + maskable), service worker (offline + offline page)

## Files
- `index.html`, `css/app.css`, `js/app.js`, `js/data.js` — the app (plain HTML/CSS/JS, no build step)
- `manifest.webmanifest`, `sw.js`, `offline.html` — PWA parts
- `art/`, `icons/`, `fonts/` — artwork, app icons, self-hosted fonts
- `tools/` — scripts that regenerate art, icons and the PDFs
- `for-jason/` — the plan and the one-page "Check My Work" PDFs

## Run locally
Any static server works, e.g. `npx http-server -p 8080` then open http://localhost:8080/

## Test results (Lighthouse 13, mobile)
Performance 97–99 · Accessibility 100 · Best Practices 100 · SEO 100.
Chrome installability check: no errors. Offline: works for visited pages; unknown pages show `offline.html`.
(Lighthouse 12+ no longer has a separate "PWA" score, so installability was checked with Chrome's own install check.)

When updating app files, bump `VERSION` in `sw.js` so phones pick up the new version.
