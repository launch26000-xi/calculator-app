/* Colorado No2 — app shell, education screens, newsletter and settings. Plain JavaScript, no build step. */
import { NOT_ADVICE, CONST_VIEW } from './data.js';
import { LESSONS } from './content/foundation.js';
import { LAW_WATCH, LIBRARY } from './content/law.js';
import { READING, TAC_CREDIT, TAC_HOME } from './content/reading.js';
import {
  $, main, esc, store, toast, fmtDate, todaysLesson, logoSVG, pyramidSVG, sourceLink,
} from './ui.js';
import * as live from './live.js';
import * as members from './members.js';

/* ---------- Device detection ---------- */
const ua = navigator.userAgent || '';
const isIOS = /iphone|ipad|ipod/i.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
const isAndroid = /android/i.test(ua);
const isChromeOS = /CrOS/.test(ua);
const isStandalone = () => window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;

/* ---------- Router ---------- */
const ROUTES = {
  foundation: { art: 'stars', render: renderFoundation, tab: 'learn' },
  lesson: { art: 'quill', render: renderLesson, tab: 'learn' },
  lawwatch: { art: 'bell', render: renderLawWatch, tab: 'learn' },
  reading: { art: 'quill', render: renderReading, tab: 'learn' },
  library: { art: 'quill', render: renderLibrary, tab: 'library' },
  trade: { art: 'stars2', render: live.renderTrade, tab: 'trade' },
  sell: { art: 'stars2', render: live.renderSell, tab: 'trade' },
  listing: { art: 'eagle', render: live.renderListing, tab: 'trade' },
  deal: { art: 'eagle', render: live.renderDeal, tab: 'trade' },
  member: { art: 'bell', render: live.renderMember, tab: 'trade' },
  messages: { art: 'bell', render: live.renderMessages, tab: 'messages' },
  chat: { art: 'bell', render: live.renderChat, tab: 'messages' },
  more: { art: 'flag', render: renderMore, tab: 'more' },
  newsletter: { art: 'eagle', render: renderNewsletter, tab: 'more' },
  suggest: { art: 'flag', render: live.renderSuggest, tab: 'more' },
  sponsors: { art: 'stars', render: live.renderSponsors, tab: 'more' },
  events: { art: 'eagle', render: live.renderEvents, tab: 'more' },
  account: { art: 'eagle', render: live.renderAccount, tab: 'more' },
  admin: { art: 'bell', render: live.renderAdmin, tab: 'more' },
  settings: { art: 'stars2', render: renderSettings, tab: 'more' },
};

let cleanup = null;
export function setCleanup(fn) { cleanup = fn; }
function route() {
  if (cleanup) { try { cleanup(); } catch { /* ignore */ } cleanup = null; }
  const raw = location.hash.replace(/^#\/?/, '') || 'foundation';
  const [path, query = ''] = raw.split('?');
  const [name, ...rest] = path.split('/');
  const r = ROUTES[name] || ROUTES.foundation;
  document.body.dataset.art = r.art;
  document.querySelectorAll('.tabbar a').forEach((a) => {
    if (a.dataset.tab === r.tab) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
  });
  r.render(rest.length ? decodeURIComponent(rest.join('/')) : null, new URLSearchParams(query), setCleanup);
  if (route.started) { window.scrollTo(0, 0); main.focus({ preventScroll: true }); }
  route.started = true;
}
window.addEventListener('hashchange', route);
/* Tapping the menu button for the screen you're on refreshes it */
document.querySelector('.tabbar').addEventListener('click', (e) => {
  const a = e.target.closest('a'); if (a && a.getAttribute('href') === location.hash) { e.preventDefault(); route(); }
});

/* ---------- Install (Android / Chromebook) ---------- */
let deferredPrompt = null;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault(); deferredPrompt = e;
  document.querySelectorAll('[data-install]').forEach((b) => { b.hidden = false; });
  document.querySelectorAll('[data-install-wait]').forEach((b) => { b.hidden = true; });
});
window.addEventListener('appinstalled', () => { deferredPrompt = null; document.querySelectorAll('[data-install]').forEach((b) => { b.hidden = true; }); toast('No2 is on your home screen. Look for the crate icon.'); });
document.addEventListener('click', async (e) => {
  if (!e.target.closest('[data-install]')) return;
  if (!deferredPrompt) { location.hash = '#/settings'; return; }
  deferredPrompt.prompt(); await deferredPrompt.userChoice.catch(() => null); deferredPrompt = null;
});

/* =====================================================================
   FOUNDATION (home): education first
   ===================================================================== */
function installBanner() {
  if (isStandalone() || store.get('hideInstallBanner', false)) return '';
  const body = isIOS
    ? '<p><strong>Put No2 on your iPhone home screen.</strong> Tap the Share button, then “Add to Home Screen.”</p><div class="btn-row"><a class="btn small" href="#/settings">Show me with pictures</a></div>'
    : `<p><strong>Put No2 on your home screen.</strong> It opens like a real app. No app store needed.</p><div class="btn-row"><button class="btn red small" data-install ${deferredPrompt ? '' : 'hidden'}>Install No2</button><a class="btn ghost small" href="#/settings">How it works</a></div>`;
  return `<div class="banner" role="region" aria-label="Install No2"><div>${body}</div><button class="icon-btn x light" data-hide-banner aria-label="Hide this message">✕</button></div>`;
}

function renderFoundation() {
  const today = todaysLesson();
  const list = [...LESSONS].reverse();
  main.innerHTML = `
  <section class="hero">${logoSVG()}<div>
    <p class="slogan">The Right Rite</p>
    <h1 style="margin-top:10px">Foundation</h1>
    <p class="lede">No2 exists to teach Coloradans about their rights. Start here, one lesson a day.</p>
  </div></section>
  ${installBanner()}
  <article class="card lesson-today" aria-labelledby="today-h">
    <span class="source">📜 Today’s lesson · ${esc(fmtDate(today.date))}</span>
    <h2 id="today-h" style="margin-top:6px">${esc(today.title)}</h2>
    <p>${esc(today.summary)}</p>
    <a class="btn red" href="#/lesson/${today.id}">Read today’s lesson</a>
  </article>
  <section class="card" aria-label="The Pyramid">${pyramidSVG()}</section>
  <h2>All Foundation lessons</h2>
  <ol class="lesson-list">${list.map((l) => `<li><a href="#/lesson/${l.id}"><span class="ll-date">${esc(fmtDate(l.date))}</span><span class="ll-title">${esc(l.title)}</span><span class="ll-sum">${esc(l.summary)}</span></a></li>`).join('')}</ol>
  <h2>Keep learning</h2>
  <div class="tiles">
    <a class="tile" href="#/lawwatch"><strong>Law Watch</strong><span>Current Colorado and federal gun laws, in plain words.</span></a>
    <a class="tile" href="#/library"><strong>No2’s Library</strong><span>25 questions and answers, each with an official source.</span></a>
    <a class="tile" href="#/reading"><strong>Recommended Reading</strong><span>From the Tenth Amendment Center, founded by Michael Boldin.</span></a>
    <a class="tile" href="#/newsletter"><strong>Newsletter</strong><span>This month’s issue.</span></a>
  </div>`;
  const hide = main.querySelector('[data-hide-banner]');
  if (hide) hide.addEventListener('click', () => { store.set('hideInstallBanner', true); hide.closest('.banner').remove(); });
}

function renderLesson(id) {
  const i = LESSONS.findIndex((l) => l.id === id);
  if (i < 0) { location.hash = '#/foundation'; return; }
  const l = LESSONS[i]; const prev = LESSONS[i - 1]; const next = LESSONS[i + 1];
  main.innerHTML = `
  <p><a href="#/foundation">← All lessons</a></p>
  <article class="card lesson" aria-labelledby="lesson-h">
    <span class="source">Foundation · ${esc(fmtDate(l.date))}</span>
    <h1 id="lesson-h" style="margin-top:6px">${esc(l.title)}</h1>
    <p class="lede"><strong>${esc(l.summary)}</strong></p>
    ${l.body.map((p) => `<p>${esc(p)}</p>`).join('')}
    ${l.constitutional ? `<div class="const-view">${esc(CONST_VIEW).replace('Constitutional view:', '<strong>Constitutional view:</strong>')}</div>` : ''}
    <h2>Sources</h2>
    <ul class="sources">${l.sources.map((s) => `<li><a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.label)} ↗</a></li>`).join('')}</ul>
    <p class="disclaimer">${NOT_ADVICE}</p>
  </article>
  <nav class="btn-row" aria-label="More lessons">
    ${prev ? `<a class="btn ghost" href="#/lesson/${prev.id}">← ${esc(prev.title)}</a>` : ''}
    ${next ? `<a class="btn" href="#/lesson/${next.id}">${esc(next.title)} →</a>` : ''}
  </nav>`;
}

function renderLawWatch(_p, qs) {
  const lvl = qs.get('level') || 'all';
  const items = LAW_WATCH.filter((x) => lvl === 'all' || x.level === lvl).sort((a, b) => b.year - a.year);
  main.innerHTML = `
  <div class="page-title"><h1>Law Watch</h1><span class="stamp">CURRENT</span></div>
  <p class="lede">Gun laws in force in Colorado and across the U.S., in plain words. Each one links to the official source.</p>
  <div class="chips" role="group" aria-label="Show laws from">
    ${['all', 'Colorado', 'Federal'].map((k) => `<a class="chip" href="#/lawwatch${k === 'all' ? '' : '?level=' + k}" ${lvl === k ? 'aria-current="page"' : ''}>${k === 'all' ? 'All' : k}</a>`).join('')}
  </div>
  <div class="grid">${items.map((x) => `
    <article class="card law">
      <div class="meta"><span class="tag ${x.level === 'Colorado' ? 'red' : 'navy'}">${esc(x.level)}</span><span>${x.year}</span><span class="tag green">${esc(x.status)}</span></div>
      <h2>${esc(x.title)}</h2>
      <p>${esc(x.summary)}</p>
      ${x.constitutional ? `<div class="const-view">${esc(CONST_VIEW).replace('Constitutional view:', '<strong>Constitutional view:</strong>')}</div>` : ''}
      ${sourceLink(x.link)}
    </article>`).join('')}</div>
  <p class="disclaimer" style="margin-top:14px">${NOT_ADVICE} Laws change. Always check the official source.</p>`;
}

function renderReading() {
  main.innerHTML = `
  <div class="page-title"><h1>Recommended Reading</h1></div>
  <p class="lede">Articles worth your time from the <a href="${TAC_HOME}" target="_blank" rel="noopener">Tenth Amendment Center ↗</a>, founded by Michael Boldin. The summaries are ours; read the full articles on their site.</p>
  <div class="grid">${READING.map((r) => `
    <article class="card reading">
      <h2>${esc(r.title)}</h2>
      <p class="meta">${esc(r.author)} · ${esc(fmtDate(r.date))}</p>
      <p>${esc(r.summary)}</p>
      <p class="credit">${esc(TAC_CREDIT)}.</p>
      <a class="src" href="${esc(r.url)}" target="_blank" rel="noopener">Read it at tenthamendmentcenter.com ↗</a>
    </article>`).join('')}</div>`;
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
  return `<article class="card answer" aria-labelledby="ans-h">
    <span class="source">📖 No2’s Library</span>
    <h2 id="ans-h" style="margin-top:6px">${esc(e.q)}</h2>
    ${e.a.map((p) => `<p>${esc(p)}</p>`).join('')}
    ${e.constitutional ? `<div class="const-view">${esc(CONST_VIEW).replace('Constitutional view:', '<strong>Constitutional view:</strong>')}</div>` : ''}
    <p>${sourceLink(e.link, 'Check the official source')}</p>
    <p class="disclaimer">${NOT_ADVICE}</p>
  </article>`;
}
function renderLibrary(_p, qs) {
  const q = qs.get('q') || '';
  const hit = q ? searchLibrary(q) : null;
  main.innerHTML = `
  <div class="page-title"><h1>No2’s Library</h1><span class="stamp">ASK</span></div>
  <p class="lede">Ask about Colorado and federal gun law. Every answer links to the official source.</p>
  <form class="ask" id="ask-form" role="search">
    <label for="ask" class="sr-only">Your question</label>
    <input id="ask" type="search" placeholder="Example: Do I need a background check?" value="${esc(q)}" autocomplete="off">
    <button class="btn red" type="submit">Ask</button>
  </form>
  <div id="answer" aria-live="polite" style="margin-top:14px">
    ${q ? (hit ? answerCard(hit) : `<div class="card"><p><strong>We don’t have an answer for that yet.</strong> Try different words, or pick a question below.</p><p class="disclaimer">${NOT_ADVICE}</p></div>`) : ''}
  </div>
  <h2>All ${LIBRARY.length} questions</h2>
  <ul class="q-list">${LIBRARY.map((e, i) => `<li><button data-q="${i}">${esc(e.q)}</button></li>`).join('')}</ul>
  <blockquote class="card quote-card">“This Constitution … shall be the supreme Law of the Land.” <span class="note">— U.S. Constitution, Article VI</span></blockquote>`;
  $('#ask-form').addEventListener('submit', (e) => { e.preventDefault(); const v = $('#ask').value.trim(); location.hash = '#/library' + (v ? '?q=' + encodeURIComponent(v) : ''); });
  main.querySelectorAll('[data-q]').forEach((b) => b.addEventListener('click', () => {
    const e = LIBRARY[Number(b.dataset.q)];
    $('#answer').innerHTML = answerCard(e); $('#ask').value = e.q;
    $('#answer').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }));
}

/* =====================================================================
   NEWSLETTER
   ===================================================================== */
function mastheadSVG(issue, date) {
  return `<svg class="masthead-svg" viewBox="0 0 640 170" role="img" aria-label="The No2 Newsletter masthead: a crate stamp reading No2, Colorado, The Right Rite">
    <rect x="2" y="2" width="636" height="166" rx="8" fill="#0B2545"/>
    <g transform="translate(18 18) scale(.6)">${logoSVG('inner').replace(/^<svg[^>]*>|<\/svg>$/g, '')}</g>
    <text x="236" y="58" font-family="'No2 Stencil', Impact, sans-serif" font-size="44" fill="#fff" letter-spacing="3">THE NO2</text>
    <text x="236" y="100" font-family="'No2 Stencil', Impact, sans-serif" font-size="34" fill="#fff" letter-spacing="3">NEWSLETTER</text>
    <text x="236" y="136" font-family="'No2 Serif', Georgia, serif" font-style="italic" font-size="19" fill="#E6D9B8">The Right Rite · Colorado</text>
    <text x="236" y="154" font-family="'No2 Serif', Georgia, serif" font-size="15" fill="#fff">${esc(issue)} · ${esc(date)}</text>
    <rect x="2" y="160" width="636" height="8" fill="#C8102E"/>
  </svg>`;
}
function renderNewsletter() {
  const now = new Date();
  const monthName = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const lessons = [...LESSONS].reverse().slice(0, 3);
  const laws = [...LAW_WATCH].sort((a, b) => b.year - a.year).slice(0, 4);
  const sections = [['foundation', 'Foundation'], ['law-watch', 'Law Watch'], ['reading', 'Recommended Reading'], ['trading-post', 'Trading Post'], ['gear', 'Gear and Skills'], ['art', 'Art Corner'], ['signoff', 'From Jason']];
  main.innerHTML = `
  <h1 class="sr-only">The No2 Newsletter</h1>
  <header class="masthead">${mastheadSVG('Issue No. 1', monthName)}</header>
  <nav class="chips" aria-label="Newsletter sections">${sections.map(([id, t]) => `<button class="chip" data-jump="${id}">${t}</button>`).join('')}</nav>

  <section class="card news" id="news-foundation" aria-labelledby="h-foundation">
    <h2 id="h-foundation" class="news-h">Foundation</h2>
    ${pyramidSVG()}
    <h3>This week’s lessons</h3>
    <ul class="news-links">${lessons.map((l) => `<li><a href="#/lesson/${l.id}"><strong>${esc(l.title)}</strong></a><br><span class="note">${esc(fmtDate(l.date))} · ${esc(l.summary)}</span></li>`).join('')}</ul>
  </section>

  <section class="card news" id="news-law-watch" aria-labelledby="h-law-watch">
    <h2 id="h-law-watch" class="news-h">Law Watch</h2>
    ${laws.map((x) => `<article class="story"><h3>${esc(x.title)} <span class="tag ${x.level === 'Colorado' ? 'red' : 'navy'}">${esc(x.level)} ${x.year}</span></h3><p>${esc(x.summary)}</p>${sourceLink(x.link)}</article>`).join('')}
    <div class="const-view">${esc(CONST_VIEW).replace('Constitutional view:', '<strong>Constitutional view:</strong>')}</div>
    <p class="disclaimer">${NOT_ADVICE}</p>
    <a class="btn ghost small" href="#/lawwatch">See all of Law Watch</a>
  </section>

  <section class="card news" id="news-reading" aria-labelledby="h-reading">
    <h2 id="h-reading" class="news-h">Recommended Reading</h2>
    ${READING.slice(0, 3).map((r) => `<article class="story"><h3><a href="${esc(r.url)}" target="_blank" rel="noopener">${esc(r.title)} ↗</a></h3><p>${esc(r.summary)}</p><p class="credit">${esc(TAC_CREDIT)}.</p></article>`).join('')}
  </section>

  <section class="card news" id="news-trading-post" aria-labelledby="h-trading-post">
    <h2 id="h-trading-post" class="news-h">Trading Post</h2>
    <div id="news-tp">${members.isConfigured() ? '<p class="note">Checking the Trading Post…</p>' : '<p><strong>Be the first to post.</strong> Member trading opens as soon as sign-up is switched on.</p>'}</div>
    <p>Remember: every gun deal on No2 includes a <strong>Meet at a gun shop</strong> step, because Colorado requires a background check through a licensed dealer on private gun sales.</p>
  </section>

  <section class="card news" id="news-gear" aria-labelledby="h-gear">
    <h2 id="h-gear" class="news-h">Gear and Skills</h2>
    <article class="story"><h3>Safe storage is also the law</h3><p>Colorado requires guns to be stored responsibly, such as in a locked safe or with a locking device, when a child or a person who can’t legally have guns could get to them.</p>${sourceLink({ label: 'HB21-1106', url: 'https://leg.colorado.gov/bills/hb21-1106' })}</article>
    <article class="story"><h3>Write down your serial numbers</h3><p>If a gun is lost or stolen, Colorado law says to report it to police within 5 days. Keep a photo and the serial number of each gun somewhere safe.</p>${sourceLink({ label: 'SB21-078', url: 'https://leg.colorado.gov/bills/sb21-078' })}</article>
    <article class="story"><h3>Check your bear spray</h3><p>Bear spray cans have an expiration date printed on them. Old cans can lose pressure. Replace yours before hiking season.</p></article>
    <article class="story"><h3>Transport rules for road trips</h3><p>Driving through other states? Federal law protects you when guns are unloaded and locked away out of reach, and legal where your trip starts and ends.</p>${sourceLink({ label: '18 U.S. Code § 926A', url: 'https://uscode.house.gov/view.xhtml?req=granuleid:USC-prelim-title18-section926A&num=0&edition=prelim' })}</article>
  </section>

  <section class="card news" id="news-art" aria-labelledby="h-art">
    <h2 id="h-art" class="news-h">Art Corner</h2>
    <article class="story"><h3>“Join, or Die” (1754)</h3><p>Benjamin Franklin printed a cartoon of a snake cut into pieces, one for each colony, with the words “Join, or Die.” It became one of the first symbols of the colonies standing together.</p>${sourceLink({ label: 'Library of Congress', url: 'https://www.loc.gov/item/2002695523/' }, 'See it at')}</article>
    <article class="story"><h3>The Best Thing Worth Saying</h3><p>This month’s member contest is open. Prizes: No2 merch, holsters and metal poster art. The winner is printed here next month.</p><a class="btn small" href="#/suggest">Enter or vote</a></article>
  </section>

  <section class="card news signoff" id="news-signoff" aria-labelledby="h-signoff">
    <h2 id="h-signoff" class="news-h">From Jason</h2>
    <p>Thank you for being part of Colorado No2. We built this place to learn our rights, teach them to our kids, and trade with neighbors the right way: honest, safe, and within the law.</p>
    <p>Read a lesson. Ask the Library a question. Tell a friend. A right that is understood is a right that lasts.</p>
    <p class="sig">— Jason<br><span class="note">Founder, Colorado No2</span></p>
  </section>`;
  main.querySelectorAll('[data-jump]').forEach((b) => b.addEventListener('click', () => {
    const h = $('#h-' + b.dataset.jump); h.setAttribute('tabindex', '-1');
    $('#news-' + b.dataset.jump).scrollIntoView({ behavior: 'smooth', block: 'start' }); h.focus({ preventScroll: true });
  }));
  live.fillNewsletterTradingPost($('#news-tp'));
}

/* =====================================================================
   MORE + SETTINGS
   ===================================================================== */
function renderMore() {
  const st = members.state();
  const links = [
    ['#/lawwatch', 'Law Watch', 'Current Colorado and federal gun laws.'],
    ['#/reading', 'Recommended Reading', 'From the Tenth Amendment Center.'],
    ['#/newsletter', 'Newsletter', 'This month’s issue.'],
    ['#/suggest', 'Suggestion Box', 'The Best Thing Worth Saying contest.'],
    ['#/events', 'Events and Ranges', 'Ranges, classes and events in Colorado.'],
    ['#/sponsors', 'Sponsors', 'Support No2. Three levels.'],
    ['#/account', 'My Account', 'Sign in, nickname, verification, your deals.'],
    ['#/settings', 'Settings and Install', 'Put No2 on your home screen.'],
    ['for-jason/No2-Explainer.pdf', 'What is No2? (one-page guide)', 'A short, plain guide to every screen. Opens a PDF.'],
  ];
  if (st.admin) links.push(['#/admin', 'No2 Staff', 'Verify members, read sponsor requests, add events and ranges.']);
  main.innerHTML = `<h1>More</h1><div class="tiles">${links.map(([h, t, d]) => `<a class="tile" href="${h}"><strong>${t}</strong><span>${d}</span></a>`).join('')}</div>`;
}

const IOS_PICS = {
  share: `<svg viewBox="0 0 320 170" role="img" aria-label="Picture: the bottom of Safari with the Share button circled">
    <rect x="10" y="10" width="300" height="150" rx="18" fill="#fff" stroke="#0B2545" stroke-width="3"/>
    <rect x="30" y="30" width="260" height="60" rx="8" fill="#F4ECD8"/><text x="160" y="66" text-anchor="middle" font-size="16" fill="#0B2545" font-family="sans-serif">Colorado No2</text>
    <rect x="10" y="104" width="300" height="56" fill="#F2F2F7"/><path d="M10 104h300" stroke="#ccc"/>
    <g fill="none" stroke="#0A84FF" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
      <path d="M40 132l-8-8 8-8M62 116l8 8-8 8"/><path d="M150 128v12h20v-12M160 136v-22M152 120l8-8 8 8"/>
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
  const android = `<section class="card" aria-labelledby="and-h">
    <h3 id="and-h" style="margin-top:0">Android phone or Chromebook (Chrome)</h3>
    ${isStandalone() ? '<p><strong>✓ No2 is already installed.</strong> You are using the app right now.</p>' : `
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
  <h2>This phone</h2>
  <div class="card"><div class="btn-row"><button class="btn ghost" data-clear>Clear saved choices on this phone</button></div></div>
  <h2>About</h2>
  <div class="card"><p><strong>Colorado No2</strong> · “The Right Rite”</p>
    <p><a href="for-jason/No2-Explainer.pdf" target="_blank" rel="noopener">What is No2? Read the one-page guide (PDF) ↗</a></p>
    <p class="note">Education first. Works offline for pages you’ve already opened. No money moves through No2. Colorado members only. Map data © OpenStreetMap contributors.</p></div>
  <footer class="foot">Made in Colorado ★ No app store required</footer>`;
  main.querySelector('[data-clear]').addEventListener('click', () => {
    try { Object.keys(localStorage).filter((k) => k.startsWith('no2.')).forEach((k) => localStorage.removeItem(k)); } catch { /* ignore */ }
    toast('Saved choices on this phone were cleared.');
  });
}

/* ---------- Start ---------- */
$('#mini-logo').innerHTML = logoSVG('mini');
route();
members.onChange(() => { const n = location.hash.replace(/^#\/?/, '').split(/[/?]/)[0]; if (n === 'more') renderMore(); });
if (members.isConfigured()) members.start().catch(() => {});
if ('serviceWorker' in navigator) window.addEventListener('load', () => { navigator.serviceWorker.register('sw.js').catch(() => {}); });
