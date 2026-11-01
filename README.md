# Colorado No2 — The Right Rite

A Progressive Web App (installable website) that teaches Coloradans about their rights.
Education comes first; the members' Trading Post is second. No Google Play Store or Apple App Store.

**Live:** https://launch26000-xi.github.io/calculator-app/ (GitHub Pages, deployed from this branch)

## What's in it
- **Foundation** (home): ten dated lessons with real sources, and The Pyramid graphic
- **Law Watch**: current Colorado and federal gun laws with official links and the Constitutional view note
- **No2's Library**: 25 questions and answers, each with an official source and "not legal advice"
- **Recommended Reading**: Tenth Amendment Center articles (real headlines and links, our own summaries, credited to Michael Boldin and the TAC)
- **Trading Post**: real member listings only, OpenStreetMap with fuzzy circles (about 7-mile squares, never exact spots), radius ring (10 mi / 50 mi / whole state), Colorado only
- **Deals**: Offer, Counter, Lock It In, Meet at a gun shop (gun listings), Meet and Inspect, Deal Done, 1–5 star ratings and reviews; "Use Caution" after 3+ ratings of 2 stars or less
- **Messages**: private member-to-member chat with safety tips
- **Suggestion Box**: "The Best Thing Worth Saying" contest; credit or anonymous; one vote per verified member; ranked by votes
- **Newsletter**, **Sponsors** ($50 / $150 / $300 and a request form), **Events and Ranges**, **My Account**, **No2 Staff** page

## Member service (Firebase)
Member features turn on when the Firebase web settings are pasted into `js/firebase-config.js`
and `firestore.rules` is published in the Firebase console. Staff are added by creating a document
in the `admins` collection whose ID is the member's user ID.

## Files
- `index.html`, `css/`, `js/app.js` (shell + education screens), `js/live.js` (member screens), `js/members.js` (database calls), `js/map.js`, `js/ui.js`
- `js/content/` — lessons, laws, Library, reading list, places
- `js/vendor/` — Firebase and Leaflet, bundled from npm by `tools/firebase-bundle` (`npm install && npm run build`)
- `firestore.rules` — database safety rules; `tests/` — rules tests and the end-to-end member flow test (run with the Firebase emulators)
- `manifest.webmanifest`, `sw.js`, `offline.html`, `icons/`, `art/`, `fonts/`
- `for-jason/No2-Check-My-Work.pdf`

When updating app files, bump `VERSION` in `sw.js` so phones pick up the new version.
