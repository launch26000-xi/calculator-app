/* Colorado No2 — Stage 1 app. Plain JavaScript, no build step. */
import {
  CATEGORIES, VERIFY, MEMBERS, LISTINGS, NEGOTIATION_TIPS, DEAL_STEPS,
  LIBRARY, NOT_ADVICE, NEWSLETTER_ISSUE, CONTEST, IDEAS, LADDER,
} from './data.js';

const $ = (sel, root = document) => root.querySelector(sel);
const main = $('#main');
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const money = (n) => '$' + Number(n).toLocaleString('en-US');

/* ---------- Saved on this phone only (safe if storage is blocked) ---------- */
const store = {
  get(k, d) { try { const v = localStorage.getItem('no2.' + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem('no2.' + k, JSON.stringify(v)); } catch { /* ignore */ } },
  del(k) { try { localStorage.removeItem('no2.' + k); } catch { /* ignore */ } },
};

/* ---------- Device detection ---------- */
const ua = navigator.userAgent || '';
const isIOS = /iphone|ipad|ipod/i.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
const isAndroid = /android/i.test(ua);
const isChromeOS = /CrOS/.test(ua);
const isStandalone = () => window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;

/* ---------- Logo: "No2" stenciled on a wooden crate, "Colorado" underneath ---------- */
let logoN = 0;
function logoSVG(cls = 'logo') {
  const i = ++logoN;
  return `<svg class="${cls}" viewBox="0 0 320 220" role="img" aria-label="Colorado No2 logo: No2 stenciled on a wooden crate">
  <defs>
    <linearGradient id="wd${i}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#D2A777"/><stop offset="1" stop-color="#B0814F"/></linearGradient>
    <filter id="rough${i}"><feTurbulence type="fractalNoise" baseFrequency=".5" numOctaves="2" seed="${i + 3}"/><feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -2.4 2.15"/><feComposite in="SourceGraphic" operator="in"/></filter>
  </defs>
  <rect x="6" y="6" width="308" height="208" rx="6" fill="url(#wd${i})" stroke="#6E4826" stroke-width="4"/>
  <g stroke="#7E5631" stroke-width="2.5" opacity=".75"><path d="M10 58H310M10 110H310M10 162H310"/></g>
  <g stroke="#9A6E43" stroke-width="1" opacity=".5" fill="none"><path d="M20 30 C90 26 160 36 300 28M24 86 C120 80 200 94 296 84M18 136 C110 132 210 142 300 134M22 190 C100 186 220 196 298 188"/></g>
  <g fill="#8A5E35"><rect x="6" y="6" width="22" height="208"/><rect x="292" y="6" width="22" height="208"/></g>
  <g fill="#4A3018"><circle cx="17" cy="20" r="3"/><circle cx="17" cy="200" r="3"/><circle cx="303" cy="20" r="3"/><circle cx="303" cy="200" r="3"/><circle cx="17" cy="110" r="3"/><circle cx="303" cy="110" r="3"/></g>
  <g filter="url(#rough${i})">
    <text x="160" y="138" text-anchor="middle" font-family="'No2 Stencil', Impact, sans-serif" font-weight="700" font-size="128" fill="#C8102E" transform="rotate(-4 160 110)" letter-spacing="2">No2</text>
    <text x="160" y="196" text-anchor="middle" font-family="'No2 Stencil', Impact, sans-serif" font-weight="700" font-size="34" fill="#0B2545" letter-spacing="8">COLORADO</text>
  </g>
</svg>`;
}

/* ---------- Simple picture for each category ---------- */
const GLYPH = {
  handguns: '<path d="M6 16h30v8H22l-3 14h-8l3-14H6z"/><path d="M22 24v5h-5"/>',
  'long-guns': '<path d="M2 20h30l4-3h8v8H34l-6 4H16l-4 6H6l4-8H2z"/>',
  shotguns: '<path d="M2 18h32l10-2v8l-12 2-6 8H8l4-8H2z"/><path d="M2 21h32"/>',
  hunting: '<path d="M2 24h28l4-3h10v7H32l-6 4H16l-4 6H6l4-8H2z"/><rect x="12" y="14" width="16" height="5" rx="2"/><path d="M16 19v5M24 19v5"/>',
  slingshots: '<path d="M24 44V28M24 28L12 8M24 28L36 8"/><path d="M12 8c4 6 20 6 24 0"/>',
  'bear-mace': '<rect x="16" y="14" width="16" height="30" rx="4"/><path d="M19 14V8h10v6M29 8h6"/><path d="M20 26h8M20 31h8"/>',
  'self-defense': '<path d="M24 4l16 6v12c0 11-8 18-16 22C16 40 8 33 8 22V10z"/><path d="M17 24l5 5 9-10"/>',
  bows: '<path d="M14 4c16 8 16 32 0 40"/><path d="M14 4v40"/><path d="M6 24h36M36 20l6 4-6 4"/>',
  accessories: '<circle cx="24" cy="24" r="14"/><circle cx="24" cy="24" r="4"/><path d="M24 4v10M24 34v10M4 24h10M34 24h10"/>',
  knives: '<path d="M4 30L32 10c6 0 10 2 10 6L20 32z"/><path d="M20 32l-4 4-6-2"/><path d="M4 30l6 4"/>',
  collectors: '<circle cx="24" cy="26" r="14"/><path d="M24 16l3 6 6 1-4.5 4 1 6-5.5-3-5.5 3 1-6L15 23l6-1z"/><path d="M18 4l6 8 6-8"/>',
};
const glyph = (cat) => `<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${GLYPH[cat] || ''}</svg>`;

/* ---------- Helpers ---------- */
const catOf = (id) => CATEGORIES.find((c) => c.id === id);
const memberOf = (id) => MEMBERS.find((m) => m.id === id);
const listingOf = (id) => LISTINGS.find((l) => l.id === id);
const avg = (arr) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0);
/* "Use Caution" when a member has 3 or more ratings of 2 stars or less */
const needsCaution = (m) => m.ratings.filter((r) => r <= 2).length >= 3;
const distance = (mi) => `about ${mi} mile${mi === 1 ? '' : 's'} away`;
const RADII = [{ mi: 10, label: '10 miles' }, { mi: 50, label: '50 miles' }, { mi: Infinity, label: 'Whole state' }];

function verifyTag(m) {
  const v = VERIFY[m.verify];
  const cls = m.verify === 'none' ? 'gray' : m.verify === 'photoid' ? 'green' : 'navy';
  const icon = m.verify === 'none' ? '○' : '✓';
  return `<span class="tag ${cls}" title="${esc(v.label)}">${icon} ${esc(v.short)}</span>`;
}
const cautionTag = (m) => (needsCaution(m) ? '<span class="tag caution">⚠ Use Caution</span>' : '');
function starText(n) { const r = Math.round(n); return '★'.repeat(r) + '☆'.repeat(5 - r); }

/* ---------- Router ---------- */
const ROUTES = {
  trade: { art: 'stars', render: renderTrade, tab: 'trade' },
  listing: { art: 'eagle', render: renderListing, tab: 'trade' },
  member: { art: 'bell', render: renderMember, tab: 'trade' },
  library: { art: 'quill', render: renderLibrary, tab: 'library' },
  messages: { art: 'bell', render: renderMessages, tab: 'messages' },
  newsletter: { art: 'eagle', render: renderNewsletter, tab: 'newsletter' },
  suggest: { art: 'flag', render: renderSuggest, tab: 'suggest' },
  settings: { art: 'stars2', render: renderSettings, tab: null },
};

function route() {
  const raw = location.hash.replace(/^#\/?/, '') || 'trade';
  const [path, query = ''] = raw.split('?');
  const [name, param] = path.split('/');
  const r = ROUTES[name] || ROUTES.trade;
  document.body.dataset.art = r.art;
  document.querySelectorAll('.tabbar a').forEach((a) => {
    if (a.dataset.tab === r.tab) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
  });
  r.render(param ? decodeURIComponent(param) : null, new URLSearchParams(query));
  if (route.started) { window.scrollTo(0, 0); main.focus({ preventScroll: true }); }
  route.started = true;
}
window.addEventListener('hashchange', route);

/* ---------- Install (Android / Chromebook) ---------- */
let deferredPrompt = null;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  document.querySelectorAll('[data-install]').forEach((b) => { b.hidden = false; b.disabled = false; });
  document.querySelectorAll('[data-install-wait]').forEach((b) => { b.hidden = true; });
});
window.addEventListener('appinstalled', () => {
  deferredPrompt = null;
  document.querySelectorAll('[data-install]').forEach((b) => { b.hidden = true; });
  toast('No2 is on your home screen. Look for the crate icon.');
});
async function doInstall() {
  if (!deferredPrompt) { location.hash = '#/settings'; return; }
  deferredPrompt.prompt();
  await deferredPrompt.userChoice.catch(() => null);
  deferredPrompt = null;
}
document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-install]');
  if (b) doInstall();
});

function toast(msg) {
  let t = $('#toast');
  if (!t) {
    t = document.createElement('div'); t.id = 'toast'; t.setAttribute('role', 'status');
    t.style.cssText = 'position:fixed;left:50%;transform:translateX(-50%);bottom:calc(var(--nav-h) + 16px);background:#0B2545;color:#fff;padding:12px 16px;border-radius:10px;z-index:50;max-width:90vw;box-shadow:0 6px 20px rgba(0,0,0,.3);border-left:5px solid #C8102E';
    document.body.appendChild(t);
  }
  t.textContent = msg; t.hidden = false;
  clearTimeout(toast.t); toast.t = setTimeout(() => { t.hidden = true; }, 3500);
}

/* =====================================================================
   TRADING POST (home)
   ===================================================================== */
function renderTrade(_p, qs) {
  const cat = qs.get('cat') || store.get('cat', 'all');
  const rIdx = Number(store.get('radius', 2));
  const radius = RADII[rIdx] || RADII[2];
  const inRange = LISTINGS.filter((l) => l.miles <= radius.mi);
  const shown = inRange.filter((l) => cat === 'all' || l.cat === cat);
  const count = (id) => inRange.filter((l) => l.cat === id).length;

  let installBanner = '';
  if (!isStandalone() && !store.get('hideInstallBanner', false)) {
    if (isIOS) {
      installBanner = `<div class="banner" role="region" aria-label="Put No2 on your home screen">
        <div><p><strong>Put No2 on your iPhone home screen.</strong> Tap the Share button, then “Add to Home Screen.”</p>
        <div class="btn-row"><a class="btn small" href="#/settings">Show me with pictures</a></div></div>
        <button class="icon-btn x" style="color:var(--navy);border-color:var(--line)" data-hide-banner aria-label="Hide this message">✕</button></div>`;
    } else {
      installBanner = `<div class="banner" role="region" aria-label="Install No2">
        <div><p><strong>Put No2 on your home screen.</strong> It opens like a real app. No app store needed.</p>
        <div class="btn-row"><button class="btn red small" data-install hidden>Install No2</button><a class="btn ghost small" href="#/settings">How it works</a></div></div>
        <button class="icon-btn x" style="color:var(--navy);border-color:var(--line)" data-hide-banner aria-label="Hide this message">✕</button></div>`;
    }
  }

  main.innerHTML = `
  <section class="hero">${logoSVG()}<div>
    <p class="slogan">The Right Rite</p>
    <h1 style="margin-top:10px">Trading Post</h1>
    <p class="lede">Trade, buy and sell with fellow Coloradans. No money moves through No2, and we never show anyone’s address.</p>
  </div></section>
  ${installBanner}
  <div class="filters">
    <div class="radius">
      <div class="radius-head"><label for="radius">How far will you go?</label><output id="radius-out" for="radius">${radius.label}</output></div>
      <input id="radius" type="range" min="0" max="2" step="1" value="${rIdx}" aria-valuetext="${radius.label}">
      <div class="ticks" aria-hidden="true"><span>10 miles</span><span>50 miles</span><span>Whole state</span></div>
      <p class="note" style="margin:6px 0 0">Colorado only. Distances are rough on purpose to protect privacy.</p>
    </div>
    <div>
      <h2 class="sr-only">Categories</h2>
      <div class="chips" role="group" aria-label="Pick a category">
        <button class="chip" data-cat="all" aria-pressed="${cat === 'all'}">All <span class="count">${inRange.length}</span></button>
        ${CATEGORIES.map((c) => `<button class="chip" data-cat="${c.id}" aria-pressed="${cat === c.id}">${esc(c.name)} <span class="count">${count(c.id)}</span></button>`).join('')}
      </div>
    </div>
  </div>
  <h2 id="results-h">${cat === 'all' ? 'Everything' : esc(catOf(cat).name)} <span class="note">· ${shown.length} listing${shown.length === 1 ? '' : 's'} within ${radius.label.toLowerCase()}</span></h2>
  <div class="listings" aria-labelledby="results-h">
    ${shown.length ? shown.map(listingCard).join('') : `<div class="card empty"><p><strong>Nothing here yet within ${radius.label.toLowerCase()}.</strong></p><p>Try a bigger distance or another category.</p></div>`}
  </div>
  <p class="note" style="margin-top:16px">Listings shown are samples for testing. Real members and listings arrive in Stage 2.</p>`;

  $('#radius').addEventListener('input', (e) => {
    const r = RADII[Number(e.target.value)];
    $('#radius-out').textContent = r.label;
    e.target.setAttribute('aria-valuetext', r.label);
  });
  $('#radius').addEventListener('change', (e) => { store.set('radius', Number(e.target.value)); renderTrade(null, new URLSearchParams()); $('#radius').focus(); });
  main.querySelectorAll('[data-cat]').forEach((b) => b.addEventListener('click', () => {
    store.set('cat', b.dataset.cat); renderTrade(null, new URLSearchParams());
    const again = main.querySelector(`[data-cat="${b.dataset.cat}"]`); again.focus(); again.scrollIntoView({ block: 'nearest', inline: 'center' });
  }));
  const hide = main.querySelector('[data-hide-banner]');
  if (hide) hide.addEventListener('click', () => { store.set('hideInstallBanner', true); hide.closest('.banner').remove(); });
  if (deferredPrompt) main.querySelectorAll('[data-install]').forEach((b) => { b.hidden = false; });
}

function listingCard(l) {
  const m = memberOf(l.seller);
  return `<a class="listing" href="#/listing/${l.id}">
    <div class="crate-thumb">${glyph(l.cat)}</div>
    <div>
      <h3>${esc(l.title)}</h3>
      <div class="meta"><span class="price">${l.price ? money(l.price) : 'Trade'}</span><span class="tag red">${esc(l.deal)}</span></div>
      <div class="meta">📍 ${distance(l.miles)} · ${esc(l.posted)}</div>
      <div class="meta">${esc(m.nick)} ${verifyTag(m)} ${cautionTag(m)}</div>
    </div></a>`;
}

/* =====================================================================
   LISTING + DEAL PROCEDURE
   ===================================================================== */
function renderListing(id) {
  const l = listingOf(id);
  if (!l) { location.hash = '#/trade'; return; }
  const m = memberOf(l.seller);
  const c = catOf(l.cat);
  main.innerHTML = `
  <p><a href="#/trade">← Back to Trading Post</a></p>
  <div class="detail-head">
    <div class="crate-thumb">${glyph(l.cat)}</div>
    <div>
      <span class="tag navy">${esc(c.name)}</span>
      <h1>${esc(l.title)}</h1>
      <div class="meta" style="font-size:1rem"><span class="price" style="font-size:1.6rem">${l.price ? money(l.price) : 'Trade only'}</span><span class="tag red">${esc(l.deal)}</span></div>
      <div class="meta">📍 ${distance(l.miles)} · Condition: ${esc(l.cond)} · Posted ${esc(l.posted)}</div>
      <p>${esc(l.desc)}</p>
      <a class="card" style="display:flex;gap:12px;align-items:center;text-decoration:none;padding:10px 12px" href="#/member/${m.id}">
        <span class="avatar" style="width:48px;height:48px;font-size:1.1rem;border-width:3px" aria-hidden="true">${esc(m.nick[0])}</span>
        <span><strong style="color:var(--navy)">${esc(m.nick)}</strong><br>${verifyTag(m)} ${cautionTag(m)}
        <span class="note">${m.ratings.length ? `${starText(avg(m.ratings))} ${avg(m.ratings).toFixed(1)} (${m.ratings.length})` : 'No ratings yet'}</span></span>
      </a>
      ${needsCaution(m) ? '<p class="legal"><strong>Use Caution:</strong> this member has several low ratings. Read their reviews before you deal.</p>' : ''}
    </div>
  </div>
  ${c.firearm ? `<p class="legal" style="margin-top:14px"><strong>Colorado law for gun deals:</strong> a private gun sale or trade must go through a licensed gun dealer for a background check. The buyer must be 21 or older, and there is a 3-day waiting period. Some semiautomatic guns need extra steps. <a href="#/library?q=background%20check">Learn more in the Library</a>.</p>` : ''}
  <div class="two-col" style="margin-top:14px">
    <section class="card" aria-labelledby="deal-h" id="deal"></section>
    <section class="card" aria-labelledby="tips-h">
      <h2 id="tips-h" style="margin-top:0">5 tips for a good deal</h2>
      <ol class="tips">${NEGOTIATION_TIPS.map((t) => `<li><span><b>${esc(t.t)}.</b> ${esc(t.d)}</span></li>`).join('')}</ol>
      <div class="divider" role="presentation"></div>
      <p class="note"><strong>No money moves through No2.</strong> You settle up in person. Never pay before you meet and inspect.</p>
    </section>
  </div>`;
  renderDeal(l);
}

const newDeal = () => ({ offers: [], agreed: null, lockYou: false, lockThem: false, locked: null, metYou: false, metThem: false, doneYou: false, doneThem: false, rated: 0 });
function dealStage(d) {
  if (!d.offers.length) return 0;
  if (!d.agreed) return 1;
  if (!d.locked) return 2;
  if (!(d.metYou && d.metThem)) return 3;
  if (!(d.doneYou && d.doneThem)) return 4;
  return 5;
}
const parseAmount = (t) => { const m = String(t).replace(/,/g, '').match(/\d+(\.\d+)?/); return m ? Math.round(Number(m[0])) : null; };

function renderDeal(l, focus = false) {
  const box = $('#deal');
  const key = 'deal.' + l.id;
  const d = Object.assign(newDeal(), store.get(key, {}));
  const save = () => { store.set(key, d); renderDeal(l, true); };
  const stage = dealStage(d);
  const them = memberOf(l.seller).nick;
  const c = catOf(l.cat);

  const stepper = `<ol class="steps" aria-label="Deal steps">${DEAL_STEPS.map((s, i) =>
    `<li class="${i < stage ? 'done' : i === stage ? 'now' : ''}" ${i === stage ? 'aria-current="step"' : ''}>${esc(s.name)}</li>`).join('')}</ol>`;
  const bubbles = d.offers.length ? `<div class="bubbles" aria-label="Offers so far">${d.offers.map((o) =>
    `<div class="bubble ${o.by}"><small>${o.by === 'you' ? 'You' : esc(them) + (o.sample ? ' (sample reply)' : '')}</small>${esc(o.text)}</div>`).join('')}</div>` : '';
  const party = (ok, who, yes, no) => `<div class="party ${ok ? 'ok' : ''}"><strong>${who}</strong>${ok ? '✓ ' + yes : no}</div>`;
  const demoBtn = (attr, label) => `<button class="btn ghost small" ${attr}>${label}</button><span class="demo">Demo: plays the other member</span>`;

  let body = '';
  if (stage === 0) {
    body = `<p>Step 1. Make an offer. Type dollars, a trade, or both.</p>
      <form id="offer-form"><label for="offer">Your offer</label>
      <input id="offer" type="text" inputmode="text" autocomplete="off" placeholder="${l.price ? 'Example: $' + Math.round(l.price * 0.9) : 'Example: my Buck knife + $20'}" required>
      <div class="btn-row"><button class="btn red" type="submit">Send Offer</button></div></form>`;
  } else if (stage === 1) {
    const last = d.offers[d.offers.length - 1];
    body = `${bubbles}<p>Step 2. ${last.by === 'them' ? `${esc(them)} countered. Accept it, or counter back.` : 'Waiting for an answer.'}</p>
      ${last.by === 'them' ? `<div class="btn-row"><button class="btn red" data-accept>Accept ${esc(last.text.replace(/^How about |\?$/g, ''))}</button></div>
      <form id="counter-form" style="margin-top:12px"><label for="counter">Or counter back</label>
      <input id="counter" type="text" autocomplete="off" placeholder="Your counter" required>
      <div class="btn-row"><button class="btn" type="submit">Send Counter</button><button class="btn ghost" type="button" data-walk>Walk away</button></div></form>` : ''}`;
  } else if (stage === 2) {
    body = `${bubbles}<p>Step 3. <strong>Lock It In.</strong> When you both tap, the price, the item and the time freeze. Nobody can change them.</p>
      <p><strong>Agreed:</strong> ${esc(d.agreed)} for “${esc(l.title)}”</p>
      <div class="both">${party(d.lockYou, 'You', 'Locked', 'Not yet')}${party(d.lockThem, esc(them), 'Locked', 'Waiting')}</div>
      <div class="btn-row">${d.lockYou ? '' : '<button class="btn red" data-lock>Lock It In</button>'}
      ${d.lockThem ? '' : demoBtn('data-lock-them', `${esc(them)} taps Lock It In`)}</div>`;
  } else {
    const ticket = `<div class="ticket" aria-label="Locked deal ticket"><dl>
      <dt>Item</dt><dd>${esc(d.locked.item)}</dd><dt>Price</dt><dd>${esc(d.locked.price)}</dd>
      <dt>Locked</dt><dd>${esc(d.locked.time)}</dd><dt>Between</dt><dd>You and ${esc(them)}</dd></dl></div>`;
    if (stage === 3) {
      body = `${ticket}<p>Step 4. <strong>Meet and Inspect.</strong></p>
        <ul class="checklist">
          ${c.firearm ? '<li><strong>Meet at a licensed gun shop</strong> so the dealer can run the background check the law requires.</li>' : '<li>Meet in a busy public place, like a police station “safe exchange” spot.</li>'}
          <li>Go in daylight. Bring a friend if you can.</li>
          <li>Look the item over carefully before any money changes hands.</li>
          <li>Never share your home address.</li>
        </ul>
        <div class="both">${party(d.metYou, 'You', 'Inspected', 'Not yet')}${party(d.metThem, esc(them), 'Inspected', 'Waiting')}</div>
        <div class="btn-row">${d.metYou ? '' : '<button class="btn red" data-met>We met. I inspected it.</button>'}
        ${d.metThem ? '' : demoBtn('data-met-them', `${esc(them)} confirms the meet`)}</div>`;
    } else if (stage === 4) {
      body = `${ticket}<p>Step 5. <strong>Deal Done.</strong> Both of you confirm the deal is finished.</p>
        <div class="both">${party(d.doneYou, 'You', 'Done', 'Not yet')}${party(d.doneThem, esc(them), 'Done', 'Waiting')}</div>
        <div class="btn-row">${d.doneYou ? '' : '<button class="btn red" data-done>Confirm Deal Done</button>'}
        ${d.doneThem ? '' : demoBtn('data-done-them', `${esc(them)} confirms`)}</div>`;
    } else if (!d.rated) {
      body = `${ticket}<p><strong>Deal done!</strong> Now rate ${esc(them)} from 1 to 5 stars. They will rate you too.</p>
        <form id="rate-form"><fieldset class="stars"><legend class="sr-only">Rate ${esc(them)}</legend>
        ${[1, 2, 3, 4, 5].map((n) => `<input type="radio" name="stars" id="s${n}" value="${n}" ${n === 5 ? 'required' : ''}><label for="s${n}" data-n="${n}" aria-label="${n} star${n > 1 ? 's' : ''}">★</label>`).join('')}
        </fieldset><div class="btn-row"><button class="btn red" type="submit">Send Rating</button></div></form>`;
    } else {
      body = `${ticket}<div class="banner"><p><strong>All finished.</strong> You gave ${esc(them)} ${starText(d.rated)}. ${esc(them)} gave you ★★★★★ <span class="note">(sample)</span>. Thank you for trading the No2 way.</p></div>`;
    }
  }

  box.innerHTML = `<h2 id="deal-h" style="margin-top:0" tabindex="-1">Make a deal</h2>${stepper}${body}
    ${stage > 0 ? '<div class="btn-row"><button class="btn ghost small" data-reset>Start this deal over</button></div>' : ''}
    <p class="note" style="margin-bottom:0">This is a practice deal. In Stage 2 the other member will be a real person.</p>`;
  if (focus) $('#deal-h').focus();

  const on = (sel, fn) => { const el = box.querySelector(sel); if (el) el.addEventListener(el.tagName === 'FORM' ? 'submit' : 'click', (e) => { e.preventDefault(); fn(); }); };
  on('#offer-form', () => {
    const text = $('#offer').value.trim(); if (!text) return;
    const amt = parseAmount(text);
    d.offers.push({ by: 'you', text });
    if (l.price && amt) {
      if (amt >= l.price) { d.offers.push({ by: 'them', text: `Deal at ${money(amt)}.`, sample: true }); d.agreed = money(amt); }
      else { const x = Math.round((amt + l.price) / 2 / 5) * 5; d.offers.push({ by: 'them', text: `How about ${money(x)}?`, sample: true }); }
    } else {
      d.offers.push({ by: 'them', text: `How about ${text} plus you bring the cleaning kit?`, sample: true });
    }
    save();
  });
  on('[data-accept]', () => { const last = d.offers[d.offers.length - 1]; d.agreed = last.text.replace(/^How about |\?$/g, ''); save(); });
  on('#counter-form', () => { const text = $('#counter').value.trim(); if (!text) return; d.offers.push({ by: 'you', text }); d.offers.push({ by: 'them', text: `Okay, ${text} works for me.`, sample: true }); d.agreed = text; save(); });
  on('[data-walk]', () => { store.del(key); toast('You walked away politely. No hard feelings.'); renderDeal(l, true); });
  const tryLock = () => { if (d.lockYou && d.lockThem && !d.locked) d.locked = { item: l.title, price: d.agreed, time: new Date().toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }) }; save(); };
  on('[data-lock]', () => { d.lockYou = true; tryLock(); });
  on('[data-lock-them]', () => { d.lockThem = true; tryLock(); });
  on('[data-met]', () => { d.metYou = true; save(); });
  on('[data-met-them]', () => { d.metThem = true; save(); });
  on('[data-done]', () => { d.doneYou = true; save(); });
  on('[data-done-them]', () => { d.doneThem = true; save(); });
  on('[data-reset]', () => { store.del(key); renderDeal(l, true); });
  const rf = box.querySelector('#rate-form');
  if (rf) {
    const paint = (n) => rf.querySelectorAll('label[data-n]').forEach((lb) => lb.classList.toggle('on', Number(lb.dataset.n) <= n));
    rf.addEventListener('change', () => paint(Number(new FormData(rf).get('stars'))));
    on('#rate-form', () => { const n = Number(new FormData(rf).get('stars')); if (!n) return; d.rated = n; save(); });
  }
}

/* =====================================================================
   MEMBER PROFILE
   ===================================================================== */
function renderMember(id) {
  const m = memberOf(id);
  if (!m) { location.hash = '#/trade'; return; }
  const a = avg(m.ratings);
  const theirs = LISTINGS.filter((l) => l.seller === m.id);
  main.innerHTML = `
  <p><a href="#/trade">← Back to Trading Post</a></p>
  <div class="card">
    <div class="profile-head"><span class="avatar" aria-hidden="true">${esc(m.nick[0])}</span>
      <div><h1 style="margin:0">${esc(m.nick)}</h1><div class="meta">${verifyTag(m)} ${cautionTag(m)} <span>Member since ${esc(m.since)}</span></div></div></div>
    <div class="divider" role="presentation"></div>
    <p>${m.ratings.length ? `<span class="rating-big" aria-hidden="true">${starText(a)}</span> <strong>${a.toFixed(1)} out of 5</strong> from ${m.ratings.length} deal${m.ratings.length === 1 ? '' : 's'}` : '<strong>No ratings yet.</strong> This member is new.'}</p>
    ${needsCaution(m) ? '<p class="legal"><strong>⚠ Use Caution.</strong> This member has 3 or more ratings of 2 stars or less. Be extra careful, meet only in public, and inspect everything.</p>' : ''}
    <h2>How ${esc(m.nick)} verified</h2>
    <p>${verifyExplain(m.verify)}</p>
    ${m.reviews.length ? `<h2>What others said</h2><ul>${m.reviews.map((r) => `<li>“${esc(r)}”</li>`).join('')}</ul>` : ''}
  </div>
  <h2>Listings from ${esc(m.nick)}</h2>
  <div class="listings">${theirs.length ? theirs.map(listingCard).join('') : '<p>No listings right now.</p>'}</div>
  <div class="card" style="margin-top:16px"><h2 style="margin-top:0">What the labels mean</h2>
    <ul>${Object.values(VERIFY).map((v) => `<li><strong>${esc(v.label)}</strong></li>`).join('')}</ul>
    <p class="note">Photo ID is the strongest. “Not Verified” means we could not confirm who they are yet.</p></div>`;
}
function verifyExplain(v) {
  return {
    photoid: 'Showed a government photo ID that matched their face. This is the strongest check.',
    picture: 'Took a live selfie that matched their profile picture.',
    phone: 'Confirmed a real phone number with a text code.',
    none: 'Has not verified yet. Be extra careful.',
  }[v];
}

function ladderHTML() {
  const L = LADDER;
  const rungs = L.steps.map((t, i) => `<li><span class="rung-n" aria-hidden="true">${i + 1}</span><span>${t}</span></li>`).join(''); // fixed text from data.js, no user input
  return `<section class="ladder" aria-labelledby="ladder-h">
    <span class="source" style="color:#E6D9B8">★ ${esc(L.sub)} ★</span>
    <h2 id="ladder-h">${esc(L.title)}</h2>
    <p class="ladder-top">The Constitution is the supreme law of the land.</p>
    <ol class="rungs">${rungs}</ol>
    <p class="ladder-credit">— ${esc(L.credit)}</p></section>`;
}

/* =====================================================================
   NO2'S LIBRARY
   ===================================================================== */
const STOP = new Set('a an and are be can do does for from how i if in is it me my of on or the to what when where who why with you your colorado gun guns'.split(' '));
function searchLibrary(q) {
  const words = q.toLowerCase().replace(/[^a-z0-9\- ]/g, ' ').split(/\s+/).filter((w) => w && !STOP.has(w));
  let best = null; let bestScore = 0;
  for (const e of LIBRARY) {
    let s = 0;
    for (const w of words) {
      if (e.keys.includes(w)) s += 2;
      else if (e.keys.some((k) => k.length > 3 && (k.startsWith(w) || w.startsWith(k)))) s += 1;
      if (e.q.toLowerCase().includes(w)) s += 1;
    }
    if (s > bestScore) { bestScore = s; best = e; }
  }
  return bestScore >= 2 ? best : null;
}
function answerCard(e) {
  const web = e.source === 'web';
  return `<article class="card answer ${web ? 'web' : ''}" aria-labelledby="ans-h">
    <span class="source">${web ? '🌐 Web answer · from an official website' : '📖 No2’s Library'}</span>
    <h2 id="ans-h" style="margin-top:6px">${esc(e.q)}</h2>
    ${e.a.map((p) => `<p>${esc(p)}</p>`).join('')}
    ${e.constitutional ? '<div class="const-view"><strong>Constitutional view:</strong> this reflects the Constitution, but current law may differ, and police and courts enforce current law.</div>' : ''}
    <p class="cite">Source: ${esc(e.cite)}</p>
    ${e.link ? `<p><a href="${esc(e.link.url)}" target="_blank" rel="noopener">${web ? 'Read the official source' : 'Double-check at the official source'}: ${esc(e.link.label)} ↗</a></p>` : ''}
    <p class="disclaimer">${NOT_ADVICE}</p>
  </article>`;
}
function renderLibrary(_p, qs) {
  const q = qs.get('q') || '';
  const hit = q ? searchLibrary(q) : null;
  main.innerHTML = `
  <div class="page-title"><h1>No2’s Library</h1><span class="stamp">ASK</span></div>
  <p class="lede">Ask a question about Colorado gun laws, carry, knives, hunting, or the Constitution.</p>
  ${ladderHTML()}
  <blockquote class="card" style="margin:0 0 14px;font-family:var(--serif);font-style:italic;color:var(--navy)">
    “This Constitution … shall be the supreme Law of the Land.” <span class="note" style="font-style:normal">— U.S. Constitution, Article VI</span></blockquote>
  <form class="ask" id="ask-form" role="search">
    <label for="ask" class="sr-only">Your question</label>
    <input id="ask" type="search" placeholder="Example: Do I need a background check?" value="${esc(q)}" autocomplete="off">
    <button class="btn red" type="submit">Ask</button>
  </form>
  <div id="answer" aria-live="polite" style="margin-top:14px">
    ${q ? (hit ? answerCard(hit) : `<div class="card"><p><strong>We don’t have an answer for that yet.</strong> Try different words, or pick a question below.</p><p class="disclaimer">${NOT_ADVICE}</p></div>`) : ''}
  </div>
  <h2>Popular questions</h2>
  <ul class="q-list">${LIBRARY.map((e, i) => `<li><button data-q="${i}">${esc(e.q)}${e.source === 'web' ? ' <span class="tag red">Web</span>' : ''}</button></li>`).join('')}</ul>
  <p class="note" style="margin-top:14px">Answers marked “No2’s Library” come from our own content. Answers marked “Web answer” come from an official website and link to it. Laws change, so always double-check the official source.</p>`;

  $('#ask-form').addEventListener('submit', (e) => { e.preventDefault(); const v = $('#ask').value.trim(); location.hash = '#/library' + (v ? '?q=' + encodeURIComponent(v) : ''); });
  main.querySelectorAll('[data-q]').forEach((b) => b.addEventListener('click', () => {
    const e = LIBRARY[Number(b.dataset.q)];
    $('#answer').innerHTML = answerCard(e);
    $('#ask').value = e.q;
    $('#answer').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }));
}

/* =====================================================================
   PLACEHOLDER SCREENS
   ===================================================================== */
function comingSoon(stage = 'Stage 2') { return `<span class="tag red">Coming in ${stage}</span>`; }

function renderMessages() {
  main.innerHTML = `
  <div class="page-title"><h1>Messages</h1>${comingSoon()}</div>
  <p class="lede">Private, locked-down messages between members are coming next. Until then, here’s how to stay safe.</p>
  <div class="card"><h2 style="margin-top:0">Stay safe when you talk to members</h2>
    <ol class="tips">
      <li><span><b>Use a nickname.</b> Don’t use your full real name on No2.</span></li>
      <li><span><b>Never share your home address.</b> Meet at a gun shop or a police “safe exchange” spot instead.</span></li>
      <li><span><b>Strip location data from photos.</b> Phones can hide your location inside a picture. On Android: open the Camera app, tap Settings, and turn off “Location tags.” In Google Photos, choose “Remove location” before you share.</span></li>
      <li><span><b>Keep the talk on No2.</b> Be careful if someone rushes you to text or email instead.</span></li>
      <li><span><b>Trust your gut.</b> If something feels wrong, walk away.</span></li>
    </ol></div>`;
}

function renderNewsletter() {
  const n = NEWSLETTER_ISSUE;
  main.innerHTML = `
  <div class="page-title"><h1>The No2 Newsletter</h1><span class="stamp">No. ${n.no}</span></div>
  <p class="note" style="margin-top:0">${esc(n.date)}</p>
  <p class="lede">${esc(n.intro)}</p>
  <nav class="chips" aria-label="Newsletter sections">${n.sections.map((s) => `<button class="chip" data-jump="${s.id}">${esc(s.t)}</button>`).join('')}</nav>
  ${n.sections.map((s) => `
  <section class="card news" id="news-${s.id}" aria-labelledby="h-${s.id}" style="margin-top:14px">
    <div class="news-head"><img src="art/${s.art}.svg" alt="" width="56" height="56"><div>
      <h2 id="h-${s.id}" style="margin:0">${esc(s.t)}</h2><p class="note" style="margin:0">${esc(s.d)}</p></div></div>
    ${s.stories.map((st) => `<article class="story"><h3>${esc(st.h)}</h3>${st.p.map((p) => `<p>${esc(p)}</p>`).join('')}${st.ladder ? ladderHTML().replace(/id="ladder-h"/, '').replace('aria-labelledby="ladder-h"', 'aria-label="The Constitutional Ladder"') : ''}
      ${st.link ? `<p><a href="${esc(st.link.url)}" target="_blank" rel="noopener">Read the official source: ${esc(st.link.label)} ↗</a></p>` : ''}</article>`).join('')}
    ${s.law ? `<div class="const-view"><strong>Constitutional view:</strong> this reflects the Constitution, but current law may differ, and police and courts enforce current law.</div><p class="disclaimer">${NOT_ADVICE}</p>` : ''}
  </section>`).join('')}
  <div class="card" style="margin-top:14px"><h2 style="margin-top:0">Get it every month</h2>
    <p>In Stage 2, members get each new issue right in the app, with a phone alert when it comes out.</p>
    <a class="btn red" href="#/suggest">Enter this month’s contest</a></div>`;
  main.querySelectorAll('[data-jump]').forEach((b) => b.addEventListener('click', () => {
    const el = $('#news-' + b.dataset.jump); el.scrollIntoView({ behavior: 'smooth', block: 'start' }); $('#h-' + b.dataset.jump).setAttribute('tabindex', '-1'); $('#h-' + b.dataset.jump).focus({ preventScroll: true });
  }));
}

function renderSuggest() {
  const draft = store.get('suggestDraft', '');
  const STATUS = { done: ['green', '✓ Built'], planned: ['navy', 'Coming next'] };
  const entries = CONTEST.entries;
  main.innerHTML = `
  <h1>Suggestion Box</h1>
  <section class="card" aria-labelledby="contest-h">
    <span class="source" style="color:var(--red-dark)">★ Member contest · ${esc(CONTEST.month)}</span>
    <h2 id="contest-h" style="margin-top:6px">The Best Thing Worth Saying</h2>
    <ul class="checklist">${CONTEST.rules.map((r) => `<li>${esc(r)}</li>`).join('')}</ul>
    <p class="note">Entries close ${esc(CONTEST.closes)}.</p>
    ${entries.length ? '' : '<div class="banner"><p><strong>No entries yet.</strong> Be the first to write the Best Thing Worth Saying.</p></div>'}
    <form id="sug-form" style="margin-top:6px"><label for="sug">Your entry</label>
      <textarea id="sug" rows="3" maxlength="280" placeholder="280 letters or less.">${esc(draft)}</textarea>
      <p class="note" id="sug-count" aria-live="polite" style="margin:4px 0 0">${draft.length} of 280 letters</p>
      <div class="btn-row"><button class="btn red" type="submit">Save my entry</button></div>
      <p class="note">Your entry is saved on this phone. It goes to the contest as soon as member sign-in is turned on.</p></form>
  </section>
  <section class="card" aria-labelledby="ideas-h">
    <h2 id="ideas-h" style="margin-top:0">The No2 Plan</h2>
    <p>What is built and what comes next.</p>
    <ul class="ideas">${IDEAS.map((d) => { const [c, l] = STATUS[d.status];
      return `<li><strong>${esc(d.t)}</strong><span class="tag ${c}">${l}</span></li>`; }).join('')}</ul>
  </section>`;
  $('#sug').addEventListener('input', (e) => { $('#sug-count').textContent = `${e.target.value.length} of 280 letters`; });
  $('#sug-form').addEventListener('submit', (e) => { e.preventDefault(); store.set('suggestDraft', $('#sug').value); toast('Saved on this phone.'); });
}

/* =====================================================================
   SETTINGS + INSTALL
   ===================================================================== */
const IOS_PICS = {
  share: `<svg viewBox="0 0 320 170" role="img" aria-label="Picture: the bottom of Safari with the Share button circled">
    <rect x="10" y="10" width="300" height="150" rx="18" fill="#fff" stroke="#0B2545" stroke-width="3"/>
    <rect x="30" y="30" width="260" height="60" rx="8" fill="#F4ECD8"/><text x="160" y="66" text-anchor="middle" font-size="16" fill="#0B2545" font-family="sans-serif">Colorado No2</text>
    <rect x="10" y="104" width="300" height="56" fill="#F2F2F7"/><path d="M10 104h300" stroke="#ccc"/>
    <g fill="none" stroke="#0A84FF" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
      <path d="M40 132l-8-8 8-8M62 116l8 8-8 8"/>
      <path d="M150 128v12h20v-12M160 136v-22M152 120l8-8 8 8"/>
      <path d="M220 120c0-4 3-6 7-6h6v24h-6c-4 0-7-2-7-6zM233 114c5 0 8 2 8 6v12"/>
      <rect x="262" y="118" width="18" height="18" rx="3"/><rect x="268" y="112" width="18" height="18" rx="3"/></g>
    <circle cx="160" cy="126" r="26" fill="none" stroke="#C8102E" stroke-width="4"/>
    <path d="M200 78 L176 106" stroke="#C8102E" stroke-width="4" stroke-linecap="round"/><path d="M174 96 L176 106 L186 103" fill="none" stroke="#C8102E" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
    <text x="204" y="74" font-size="15" font-weight="700" fill="#C8102E" font-family="sans-serif">Tap Share</text></svg>`,
  add: `<svg viewBox="0 0 320 170" role="img" aria-label="Picture: the Share menu with Add to Home Screen circled">
    <rect x="10" y="10" width="300" height="150" rx="18" fill="#F2F2F7" stroke="#0B2545" stroke-width="3"/>
    <g font-family="sans-serif" font-size="15" fill="#111">
      <rect x="26" y="24" width="268" height="36" rx="8" fill="#fff"/><text x="40" y="47">Copy</text>
      <rect x="26" y="66" width="268" height="36" rx="8" fill="#fff"/><text x="40" y="89">Add to Favorites</text>
      <rect x="26" y="108" width="268" height="36" rx="8" fill="#fff"/><text x="40" y="131" font-weight="700">Add to Home Screen</text></g>
    <g fill="none" stroke="#111" stroke-width="2"><rect x="262" y="116" width="20" height="20" rx="4"/><path d="M272 120v12M266 126h12"/></g>
    <rect x="22" y="104" width="276" height="44" rx="10" fill="none" stroke="#C8102E" stroke-width="4"/></svg>`,
  confirm: `<svg viewBox="0 0 320 170" role="img" aria-label="Picture: the Add button at the top right, and the No2 icon on the home screen">
    <rect x="10" y="10" width="300" height="150" rx="18" fill="#fff" stroke="#0B2545" stroke-width="3"/>
    <g font-family="sans-serif" font-size="15"><text x="30" y="42" fill="#0A84FF">Cancel</text><text x="160" y="42" text-anchor="middle" font-weight="700">Add to Home Screen</text><text x="290" y="42" text-anchor="end" fill="#0A84FF" font-weight="700">Add</text></g>
    <circle cx="272" cy="37" r="22" fill="none" stroke="#C8102E" stroke-width="4"/>
    <rect x="30" y="66" width="64" height="64" rx="14" fill="#0B2545"/><rect x="38" y="80" width="48" height="36" rx="3" fill="#C49A6C"/>
    <text x="62" y="106" text-anchor="middle" font-family="Impact, sans-serif" font-size="20" fill="#C8102E">No2</text>
    <text x="110" y="96" font-family="sans-serif" font-size="16" fill="#111">No2</text>
    <text x="110" y="118" font-family="sans-serif" font-size="12" fill="#666">Opens like a real app</text></svg>`,
};

function renderSettings() {
  const device = isIOS ? 'an iPhone or iPad' : isAndroid ? 'an Android phone' : isChromeOS ? 'a Chromebook' : 'a computer';
  const installed = isStandalone();
  const android = `<section class="card" aria-labelledby="and-h">
    <h3 id="and-h" style="margin-top:0">Android phone or Chromebook (Chrome)</h3>
    ${installed ? '<p><strong>✓ No2 is already installed.</strong> You are using the app right now.</p>' : `
    <p>Tap the red button. When Chrome asks, tap <strong>Install</strong>.</p>
    <div class="btn-row"><button class="btn red" data-install ${deferredPrompt ? '' : 'hidden'}>Install No2</button>
      <span class="note" data-install-wait ${deferredPrompt ? 'hidden' : ''}>No button? Tap Chrome’s menu (the <strong>⋮ three dots</strong> at the top right), then tap <strong>Add to Home screen</strong> or <strong>Install app</strong>.</span></div>`}
  </section>`;
  const iphone = `<section class="card" aria-labelledby="ios-h">
    <h3 id="ios-h" style="margin-top:0">iPhone or iPad (Safari)</h3>
    <p>Open this page in <strong>Safari</strong>, then follow these 3 steps.</p>
    <ol class="guide">
      <li><p>Tap the <strong>Share</strong> button at the bottom of Safari (a square with an arrow pointing up). On newer iPhones it may be inside the <strong>⋯</strong> button.</p>${IOS_PICS.share}</li>
      <li><p>Scroll down and tap <strong>Add to Home Screen</strong>.</p>${IOS_PICS.add}</li>
      <li><p>Tap <strong>Add</strong> at the top right. The No2 crate icon is now on your home screen.</p>${IOS_PICS.confirm}</li>
    </ol>
  </section>`;

  main.innerHTML = `
  <h1>Settings</h1>
  <h2 id="install">Install No2</h2>
  <p class="lede">No2 is a website that installs like an app. <strong>No Google Play Store. No Apple App Store.</strong> Same No2 on every phone.</p>
  <p class="note">You are on ${device}.</p>
  <div class="grid">${isIOS ? iphone + android : android + iphone}</div>
  <h2>Your Trading Post</h2>
  <div class="card">
    <p>How far you’ll travel is set on the Trading Post screen with the slider.</p>
    <div class="btn-row"><button class="btn ghost" data-clear>Reset practice deals and choices</button></div>
  </div>
  <h2>About</h2>
  <div class="card"><p><strong>Colorado No2</strong> · “The Right Rite” · Stage 1</p>
    <p class="note">Works offline for pages you’ve already opened. No money moves through No2. Colorado members only.</p></div>
  <footer class="foot">Made in Colorado ★ No app store required</footer>`;

  const clear = main.querySelector('[data-clear]');
  clear.addEventListener('click', () => {
    try { Object.keys(localStorage).filter((k) => k.startsWith('no2.')).forEach((k) => localStorage.removeItem(k)); } catch { /* ignore */ }
    toast('Practice deals and choices were reset.');
  });
}

/* ---------- Start ---------- */
$('#mini-logo').innerHTML = logoSVG('mini');
document.querySelector('.topbar .brand svg').removeAttribute('role');
route();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => { navigator.serviceWorker.register('sw.js').catch(() => {}); });
}
