/* Colorado No2 — member screens backed by the real member database.
   Nothing here is made up: when there's no real data yet, the screen says so. */
import { CATEGORIES, VERIFY, NEGOTIATION_TIPS, SAFETY_TIPS, CONTEST, SPONSOR_LEVELS, MEMBER_RULES, NOT_ADVICE } from './data.js';
import { TOWNS, RANGES, RANGE_DIRECTORIES, CLASS_DIRECTORIES, inColorado, gridCenter, milesBetween, roughDistance } from './content/places.js';
import {
  $, main, esc, money, store, toast, fmtTs, lessonStrip, glyph, catOf, verifyTag, cautionTag, cautionOf, avg, starText, emptyState,
} from './ui.js';
import * as m from './members.js';
import { drawMap } from './map.js';

const RADII = [{ mi: 10, label: '10 miles' }, { mi: 50, label: '50 miles' }, { mi: Infinity, label: 'Whole state' }];
const GOOGLE_G = '<svg viewBox="0 0 48 48" width="22" height="22" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.6 5.4 2.6 13.2l7.9 6.2C12.4 13.7 17.7 9.5 24 9.5z"/><path fill="#4285F4" d="M46.1 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.4c-.5 2.9-2.2 5.3-4.6 6.9l7.4 5.8c4.3-4 6.9-9.9 6.9-17.2z"/><path fill="#FBBC05" d="M10.5 28.6A14.5 14.5 0 0 1 9.5 24c0-1.6.3-3.2.8-4.6l-7.9-6.2A24 24 0 0 0 0 24c0 3.9.9 7.5 2.6 10.8l7.9-6.2z"/><path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.4-5.8c-2.1 1.4-4.8 2.3-8.5 2.3-6.3 0-11.6-4.2-13.5-10l-7.9 6.2C6.6 42.6 14.6 48 24 48z"/></svg>';
const here = (name) => location.hash.replace(/^#\/?/, '').split(/[/?]/)[0] === name;
const err = (e) => (e && e.message ? e.message : 'Something went wrong. Check your signal and try again.');

/* ---------- Member gate: shows the right message until the visitor can use a screen ---------- */
const NOT_READY = emptyState('Member features are almost ready', 'The owner of No2 is switching on member accounts. Until then you can read the Foundation lessons, Law Watch and the Library.', '<a class="btn" href="#/foundation">Go to Foundation</a>');
const JOIN = (what) => emptyState(`Join No2 to ${what}`, 'Membership is free for Coloradans. Sign in with Google, then pick a nickname.', '<a class="btn red" href="#/account">Join or sign in</a>');
const FINISH = emptyState('Finish joining', 'Pick your nickname to finish joining No2.', '<a class="btn red" href="#/account">Pick my nickname</a>');
/* Runs fn(state) when ready; otherwise fills `el` with the right message. */
async function gate(el, what, fn, { needMember = true } = {}) {
  if (!m.isConfigured()) { el.innerHTML = NOT_READY; return; }
  el.innerHTML = '<p class="note">Loading…</p>';
  let st;
  try { st = await m.start(); } catch (e) { console.error(e); el.innerHTML = emptyState('Could not reach No2’s member service', 'Check your signal and try again.'); return; }
  if (!document.body.contains(el)) return;   // the visitor already moved to another screen
  if (!st.user) { el.innerHTML = JOIN(what); return; }
  if (needMember && !st.member) { el.innerHTML = FINISH; return; }
  try { await fn(st); } catch (e) { if (!document.body.contains(el)) return; console.error(e); el.innerHTML = emptyState('Something went wrong', esc(err(e))); }
}

/* Seller details (verification + ratings), fetched once per screen */
async function sellerInfo(uids) {
  const out = {};
  await Promise.all([...new Set(uids)].map(async (u) => {
    const [mem, ratings] = await Promise.all([m.getMember(u).catch(() => null), m.ratingsFor(u).catch(() => [])]);
    out[u] = { member: mem, ratings };
  }));
  return out;
}
const areaOf = (st) => (st && st.member && st.member.gy != null ? gridCenter(st.member.gy, st.member.gx) : null);

/* =====================================================================
   TRADING POST
   ===================================================================== */
export function renderTrade(_p, qs) {
  const rIdx = Number(store.get('radius', 2));
  const radius = RADII[rIdx] || RADII[2];
  const cat = qs.get('cat') || store.get('cat', 'all');
  main.innerHTML = `
  ${lessonStrip()}
  <div class="page-title"><h1>Trading Post</h1></div>
  <p class="lede">Trade, buy and sell with fellow Coloradans. Rough distance only, never addresses. No money moves through No2.</p>
  <div class="radius">
    <div class="radius-head"><label for="radius">How far will you go?</label><output id="radius-out" for="radius">${radius.label}</output></div>
    <input id="radius" type="range" min="0" max="2" step="1" value="${rIdx}" aria-valuetext="${radius.label}">
    <div class="ticks" aria-hidden="true"><span>10 miles</span><span>50 miles</span><span>Whole state</span></div>
  </div>
  <div class="map-wrap"><div id="map" class="map" role="region" aria-label="Map of Colorado. Members appear as fuzzy circles over a rough area, never an exact spot."></div>
    <p class="note map-note">Fuzzy circles show roughly where items are, about 7 miles wide. Never an exact spot. The red ring is your distance.</p></div>
  <div id="area-box"></div>
  <div class="chips" role="group" aria-label="Pick a category">
    <button class="chip" data-cat="all" aria-pressed="${cat === 'all'}">All <span class="count" data-count="all"></span></button>
    ${CATEGORIES.map((c) => `<button class="chip" data-cat="${c.id}" aria-pressed="${cat === c.id}">${esc(c.name)} <span class="count" data-count="${c.id}"></span></button>`).join('')}
  </div>
  <div class="btn-row" style="margin:4px 0 10px"><a class="btn red" href="#/sell">+ Post an item</a></div>
  <div id="results"></div>`;

  const paintMap = (center, areas) => drawMap($('#map'), { center, radiusMi: center ? RADII[Number($('#radius').value)].mi : null, areas }).catch((e) => console.error(e));
  let state = { listings: [], info: {}, st: null };

  const paint = () => {
    const r = RADII[Number($('#radius').value)];
    const c = store.get('cat', 'all');
    const center = areaOf(state.st);
    const inRange = state.listings.map((l) => ({ ...l, mi: center ? milesBetween(center, gridCenter(l.gy, l.gx)) : null }))
      .filter((l) => !center || l.mi <= r.mi);
    const shown = inRange.filter((l) => c === 'all' || l.cat === c);
    main.querySelectorAll('[data-count]').forEach((s) => { const k = s.dataset.count; s.textContent = k === 'all' ? inRange.length : inRange.filter((l) => l.cat === k).length; });
    // fuzzy circles, one per rough area
    const cells = {};
    inRange.forEach((l) => { const k = `${l.gy}_${l.gx}`; (cells[k] = cells[k] || { ...gridCenter(l.gy, l.gx), items: [] }).items.push(l); });
    paintMap(center, Object.values(cells).map((cell) => ({ lat: cell.lat, lon: cell.lon,
      html: `<strong>${cell.items.length} item${cell.items.length > 1 ? 's' : ''} in this area</strong><br>${cell.items.slice(0, 5).map((l) => `<a href="#/listing/${l.id}">${esc(l.title)}</a>`).join('<br>')}` })));
    $('#results').innerHTML = shown.length
      ? `<h2 class="sr-only">Listings</h2><div class="listings">${shown.map((l) => listingCard(l, state.info[l.uid])).join('')}</div>`
      : emptyState('Be the first to post.', state.listings.length ? `Nothing in this category within ${esc(r.label.toLowerCase())}. Try a bigger distance or another category.` : 'No member has posted an item yet. Your listing could be the first one on the Trading Post.', '<a class="btn red" href="#/sell">Post an item</a>');
  };

  $('#radius').addEventListener('input', (e) => { const r = RADII[Number(e.target.value)]; $('#radius-out').textContent = r.label; e.target.setAttribute('aria-valuetext', r.label); });
  $('#radius').addEventListener('change', (e) => { store.set('radius', Number(e.target.value)); paint(); });
  main.querySelectorAll('[data-cat]').forEach((b) => b.addEventListener('click', () => {
    store.set('cat', b.dataset.cat);
    main.querySelectorAll('[data-cat]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    paint();
  }));
  paintMap(null, []);
  if (!m.isConfigured()) {
    $('#results').innerHTML = emptyState('Be the first to post.', 'No member has posted an item yet. Member sign-up opens soon. Then you can post the first item on the Trading Post.');
    return;
  }
  gate($('#results'), 'see and post items', async (st) => {
    state.st = st;
    areaBox($('#area-box'), st, () => { state.st = m.state(); paint(); });
    state.listings = await m.listOpenListings();
    state.info = await sellerInfo(state.listings.map((l) => l.uid));
    paint();
  });
}

/* "Your area" picker: nearest town, or the phone's location rounded to a 7-mile square */
function areaBox(el, st, onSet) {
  if (!st.member) { el.innerHTML = ''; return; }
  const set = st.member.gy != null;
  el.innerHTML = `<details class="card area" ${set ? '' : 'open'}>
    <summary><strong>${set ? 'Your area is set' : 'Set your area to see distances'}</strong> <span class="note">(rough, about 7 miles wide)</span></summary>
    <p class="note">No2 keeps only a rough square on the map, never your address or exact spot.</p>
    <label for="town">Nearest town</label>
    <div class="ask"><select id="town"><option value="">Pick a town…</option>${TOWNS.map((t, i) => `<option value="${i}">${esc(t.name)}</option>`).join('')}</select>
    <button class="btn" type="button" id="town-save">Save</button></div>
    <div class="btn-row"><button class="btn ghost small" type="button" id="geo">Use my phone’s location (rounded)</button></div></details>`;
  const save = async (lat, lon) => {
    if (!inColorado(lat, lon)) { toast('No2 is for Colorado only. That spot is outside Colorado.'); return; }
    try { await m.setArea(lat, lon); toast('Your area is saved (rough only).'); areaBox(el, m.state(), onSet); onSet(); } catch (e) { toast(err(e)); }
  };
  $('#town-save', el).addEventListener('click', () => { const t = TOWNS[Number($('#town', el).value)]; if (t) save(t.lat, t.lon); else toast('Pick a town first.'); });
  $('#geo', el).addEventListener('click', () => {
    if (!navigator.geolocation) { toast('This phone can’t share its location. Pick a town instead.'); return; }
    navigator.geolocation.getCurrentPosition((p) => save(p.coords.latitude, p.coords.longitude), () => toast('Location was not shared. Pick a town instead.'), { maximumAge: 600000, timeout: 15000 });
  });
}

function listingCard(l, info) {
  const mem = info && info.member; const ratings = (info && info.ratings) || [];
  return `<a class="listing" href="#/listing/${l.id}">
    <div class="crate-thumb">${glyph(l.cat)}</div>
    <div>
      <h3>${esc(l.title)}</h3>
      <div class="meta"><span class="price">${l.price != null ? money(l.price) : 'Trade'}</span><span class="tag red">${esc(l.deal)}</span></div>
      <div class="meta">${esc(catOf(l.cat).name)}${l.mi != null ? ` · 📍 ${roughDistance(l.mi)}` : ''}</div>
      <div class="meta">${esc(l.nick)} ${verifyTag(mem && mem.verify)} ${cautionTag(ratings)}</div>
    </div></a>`;
}

/* ---------- Post an item ---------- */
export function renderSell() {
  main.innerHTML = `${lessonStrip()}<h1>Post an item</h1><div id="sell"></div>`;
  gate($('#sell'), 'post an item', async (st) => {
    if (st.member.gy == null) { $('#sell').innerHTML = '<div id="area-box"></div>'; areaBox($('#area-box'), st, () => renderSell()); return; }
    $('#sell').innerHTML = `
    <form class="card" id="sell-form" novalidate>
      <label for="cat">Category</label>
      <select id="cat" required><option value="">Pick one…</option>${CATEGORIES.map((c) => `<option value="${c.id}">${esc(c.name)}</option>`).join('')}</select>
      <p class="legal" id="gun-note" hidden><strong>Gun listing:</strong> the deal will include a <strong>Meet at a gun shop</strong> step. Colorado requires a background check through a licensed dealer on private gun sales.</p>
      <label for="title">What is it?</label>
      <input id="title" type="text" maxlength="80" placeholder="Example: Remington 870, 12 gauge" required>
      <label for="desc">Describe it</label>
      <textarea id="desc" rows="4" maxlength="1000" placeholder="Condition, what comes with it, how much it was used."></textarea>
      <label for="deal">Trade or sell?</label>
      <select id="deal"><option>Sell</option><option>Trade</option><option>Trade or Sell</option></select>
      <label for="price">Asking price in dollars (leave empty for trade only)</label>
      <input id="price" type="text" inputmode="numeric" placeholder="Example: 300">
      <label for="cond">Condition</label>
      <select id="cond"><option>New</option><option>Like new</option><option>Very good</option><option selected>Good</option><option>Fair</option><option>Collector grade</option></select>
      <ul class="checklist note"><li>No illegal items, like magazines over 15 rounds.</li><li>Don’t put your address or phone number in the listing.</li><li>Only your rough area is shown, never your address.</li></ul>
      <p class="legal" id="sell-err" role="alert" hidden></p>
      <div class="btn-row"><button class="btn red" type="submit">Post it</button><a class="btn ghost" href="#/trade">Cancel</a></div>
    </form>`;
    $('#cat').addEventListener('change', () => { $('#gun-note').hidden = !catOf($('#cat').value).firearm; });
    $('#sell-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const fail = (t) => { $('#sell-err').textContent = t; $('#sell-err').hidden = false; };
      const cat = $('#cat').value; const title = $('#title').value.trim(); const desc = $('#desc').value.trim();
      const priceRaw = $('#price').value.replace(/[$,\s]/g, '');
      const price = priceRaw === '' ? null : Number(priceRaw);
      if (!cat) return fail('Pick a category.');
      if (title.length < 3) return fail('Tell members what it is (3 letters or more).');
      if (price != null && (!Number.isInteger(price) || price < 0)) return fail('Price must be a whole dollar amount, like 300.');
      if ($('#deal').value === 'Sell' && price == null) return fail('Add a price, or choose Trade.');
      const btn = e.submitter || $('#sell-form button[type=submit]'); btn.disabled = true;
      try { const id = await m.createListing({ cat, title, desc, price, deal: $('#deal').value, cond: $('#cond').value }); toast('Your item is posted.'); location.hash = `#/listing/${id}`; }
      catch (x) { fail(err(x)); btn.disabled = false; }
    });
  });
}

/* ---------- One listing ---------- */
export function renderListing(id) {
  main.innerHTML = `<p><a href="#/trade">← Back to Trading Post</a></p><div id="listing"></div>`;
  gate($('#listing'), 'see this item', async (st) => {
    const l = await m.getListing(id);
    if (!l) { $('#listing').innerHTML = emptyState('This item is gone', 'The member may have removed it.', '<a class="btn" href="#/trade">Back to Trading Post</a>'); return; }
    const info = (await sellerInfo([l.uid]))[l.uid];
    const c = catOf(l.cat); const mine = l.uid === st.user.uid; const center = areaOf(st);
    const ratings = info.ratings;
    $('#listing').innerHTML = `
    <div class="detail-head">
      <div class="crate-thumb">${glyph(l.cat)}</div>
      <div>
        <span class="tag navy">${esc(c.name)}</span> ${l.status === 'closed' ? '<span class="tag gray">Closed</span>' : ''}
        <h1>${esc(l.title)}</h1>
        <div class="meta big"><span class="price">${l.price != null ? money(l.price) : 'Trade only'}</span><span class="tag red">${esc(l.deal)}</span></div>
        <div class="meta">${center ? `📍 ${roughDistance(milesBetween(center, gridCenter(l.gy, l.gx)))} · ` : ''}Condition: ${esc(l.cond)} · Posted ${esc(fmtTs(l.createdAt))}</div>
        ${l.desc ? `<p>${esc(l.desc)}</p>` : ''}
        <a class="card seller" href="#/member/${l.uid}">
          <span class="avatar sm" aria-hidden="true">${esc(l.nick[0].toUpperCase())}</span>
          <span><strong>${esc(l.nick)}</strong><br>${verifyTag(info.member && info.member.verify)} ${cautionTag(ratings)}
          <span class="note">${ratings.length ? `${starText(avg(ratings.map((r) => r.stars)))} ${avg(ratings.map((r) => r.stars)).toFixed(1)} (${ratings.length})` : 'No ratings yet'}</span></span>
        </a>
        ${cautionOf(ratings) ? '<p class="legal"><strong>Use Caution:</strong> this member has several low ratings. Read their reviews before you deal.</p>' : ''}
      </div>
    </div>
    ${c.firearm ? '<p class="legal" style="margin-top:14px"><strong>Gun deal:</strong> Colorado requires a background check through a licensed gun dealer on private gun sales. The buyer must be 21, and there is a 3-day waiting period. This deal includes a <strong>Meet at a gun shop</strong> step. <a href="#/library?q=background%20check">Learn more</a>.</p>' : ''}
    <div class="two-col" style="margin-top:14px">
      <section class="card" id="deal-box" aria-labelledby="deal-h"></section>
      <section class="card" aria-labelledby="tips-h">
        <h2 id="tips-h" style="margin-top:0">5 tips for a good deal</h2>
        <ol class="tips">${NEGOTIATION_TIPS.map((t) => `<li><span><b>${esc(t.t)}.</b> ${esc(t.d)}</span></li>`).join('')}</ol>
        <p class="note"><strong>No money moves through No2.</strong> You settle up in person. Never pay before you meet and inspect.</p>
      </section>
    </div>`;
    const box = $('#deal-box');
    if (mine) {
      const deals = (await m.myDeals()).filter((d) => d.listingId === l.id);
      box.innerHTML = `<h2 id="deal-h" style="margin-top:0">Offers on your item</h2>
        ${deals.length ? `<ul class="plain">${deals.map((d) => `<li><a href="#/deal/${d.id}">${esc(d.offers[d.offers.length - 1].text)}</a> <span class="note">· ${esc(dealStageName(d))}</span></li>`).join('')}</ul>` : '<p>No offers yet.</p>'}
        <div class="btn-row"><button class="btn ghost" id="toggle">${l.status === 'open' ? 'Close this listing' : 'Reopen this listing'}</button></div>`;
      $('#toggle').addEventListener('click', async () => { try { await m.setListingStatus(l.id, l.status === 'open' ? 'closed' : 'open'); renderListing(id); } catch (e) { toast(err(e)); } });
      return;
    }
    const existing = await m.getDeal(m.dealId(l.id, st.user.uid)).catch(() => null);
    box.innerHTML = `<h2 id="deal-h" style="margin-top:0">Make a deal</h2>
      ${existing ? `<p>You already have a deal going on this item.</p><div class="btn-row"><a class="btn red" href="#/deal/${existing.id}">Continue your deal</a></div>`
        : l.status !== 'open' ? '<p>This listing is closed.</p>'
        : `<p>Step 1. Make an offer. Type dollars, a trade, or both.</p>
      <form id="offer-form"><label for="offer">Your offer</label>
        <input id="offer" type="text" maxlength="100" autocomplete="off" placeholder="${l.price != null ? 'Example: $' + Math.round(l.price * 0.9) : 'Example: my Buck knife + $20'}" required>
        <div class="btn-row"><button class="btn red" type="submit">Send Offer</button></div></form>`}
      <div class="btn-row"><button class="btn ghost" id="msg">Message ${esc(l.nick)}</button></div>`;
    const of = $('#offer-form');
    if (of) of.addEventListener('submit', async (e) => {
      e.preventDefault(); const text = $('#offer').value.trim(); if (!text) return;
      try { const did = await m.startDeal(l, text); location.hash = `#/deal/${did}`; } catch (x) { toast(err(x)); }
    });
    $('#msg').addEventListener('click', async () => { try { location.hash = `#/chat/${await m.openConvo(l.uid)}`; } catch (x) { toast(err(x)); } });
  });
}

/* ---------- Deal steps ---------- */
function dealSteps(d) {
  const s = ['Offer', 'Counter', 'Lock It In'];
  if (d.firearm) s.push('Meet at a gun shop');
  s.push('Meet and Inspect', 'Deal Done', 'Rate');
  return s;
}
function dealStage(d) {
  const names = dealSteps(d);
  let n;
  if (!d.agreed) n = d.offers.length > 1 ? 'Counter' : 'Offer';
  else if (!d.locked) n = 'Lock It In';
  else if (d.firearm && !(d.shopB && d.shopS)) n = 'Meet at a gun shop';
  else if (!(d.metB && d.metS)) n = 'Meet and Inspect';
  else if (!(d.doneB && d.doneS)) n = 'Deal Done';
  else n = 'Rate';
  return names.indexOf(n);
}
const dealStageName = (d) => dealSteps(d)[dealStage(d)];

export function renderDeal(id, _qs, setCleanup) {
  main.innerHTML = `<p><a href="#/messages">← Messages and deals</a></p><section class="card" id="deal" aria-labelledby="deal-h"></section>`;
  gate($('#deal'), 'make deals', async (st) => {
    const me = st.user.uid;
    let myRating = null; let unsub = null;
    let lastKey = '';
    const draw = async (d, force) => {
      if (!d) { $('#deal').innerHTML = emptyState('Deal not found', 'It may belong to other members.'); return; }
      // Only redraw when the deal itself changed (not when the server just confirms a time stamp).
      const key = JSON.stringify([d.offers, d.agreed, d.locked, d.lockB, d.lockS, d.shopB, d.shopS, d.metB, d.metS, d.doneB, d.doneS, !!d.lockedAt]);
      if (key === lastKey && !force) return;
      lastKey = key;
      const buyer = d.buyer === me; const other = buyer ? d.seller : d.buyer;
      const otherMem = draw.otherMem || (draw.otherMem = await m.getMember(other).catch(() => null));
      const otherNick = otherMem ? otherMem.nick : 'the other member';
      const stage = dealStage(d); const names = dealSteps(d); const cur = names[stage];
      const mineF = (k) => d[k + (buyer ? 'B' : 'S')]; const theirsF = (k) => d[k + (buyer ? 'S' : 'B')];
      const party = (ok, who, yes, no) => `<div class="party ${ok ? 'ok' : ''}"><strong>${esc(who)}</strong>${ok ? '✓ ' + yes : no}</div>`;
      const both = (k, yes) => `<div class="both">${party(mineF(k), 'You', yes, 'Not yet')}${party(theirsF(k), otherNick, yes, 'Waiting')}</div>`;
      const bubbles = `<div class="bubbles" aria-label="Offers so far">${d.offers.map((o) => `<div class="bubble ${o.by === me ? 'you' : 'them'}"><small>${o.by === me ? 'You' : esc(otherNick)}</small>${esc(o.text)}</div>`).join('')}</div>`;
      const ticket = d.locked ? `<div class="ticket" aria-label="Locked deal ticket"><dl><dt>Item</dt><dd>${esc(d.locked.item)}</dd><dt>Price</dt><dd>${esc(d.locked.price)}</dd><dt>Locked</dt><dd>${esc(fmtTs(d.lockedAt))}</dd><dt>Between</dt><dd>You and ${esc(otherNick)}</dd></dl></div>` : '';
      let body = '';
      if (cur === 'Offer' || cur === 'Counter') {
        const last = d.offers[d.offers.length - 1];
        body = `${bubbles}${last.by === me ? `<p>Waiting for ${esc(otherNick)} to answer.</p>` : `
          <p>${esc(otherNick)} ${d.offers.length > 1 ? 'countered' : 'made an offer'}. Accept it, or counter.</p>
          <div class="btn-row"><button class="btn red" data-act="accept">Accept ${esc(last.text)}</button></div>
          <form id="counter-form" style="margin-top:12px"><label for="counter">Or counter</label>
          <input id="counter" type="text" maxlength="100" autocomplete="off" placeholder="Your counter" required>
          <div class="btn-row"><button class="btn" type="submit">Send Counter</button></div></form>`}`;
      } else if (cur === 'Lock It In') {
        body = `${bubbles}<p><strong>Lock It In.</strong> When you both tap, the price, the item and the time freeze. Nobody can change them.</p>
          <p><strong>Agreed:</strong> ${esc(d.agreed)} for “${esc(d.title)}”</p>${both('lock', 'Locked')}
          ${mineF('lock') ? `<p class="note">Waiting for ${esc(otherNick)} to lock.</p>` : '<div class="btn-row"><button class="btn red" data-act="lock">Lock It In</button></div>'}`;
      } else if (cur === 'Meet at a gun shop') {
        body = `${ticket}<p><strong>Meet at a gun shop.</strong> Colorado requires a background check through a licensed gun dealer on private gun sales. Pick a gun shop together (use Messages), and plan to do the transfer there. The buyer must be 21, and there is a 3-day waiting period.</p>
          ${both('shop', 'Agreed')}
          ${mineF('shop') ? `<p class="note">Waiting for ${esc(otherNick)}.</p>` : '<div class="btn-row"><button class="btn red" data-act="shop">We’ll meet at a licensed gun shop</button></div>'}`;
      } else if (cur === 'Meet and Inspect') {
        body = `${ticket}<p><strong>Meet and Inspect.</strong></p><ul class="checklist">
          ${d.firearm ? '<li>Meet at the gun shop you agreed on, so the dealer can run the background check.</li>' : '<li>Meet in a busy public place, like a police “safe exchange” spot.</li>'}
          <li>Go in daylight. Bring a friend if you can.</li><li>Look the item over carefully before any money changes hands.</li><li>Never share your home address.</li></ul>
          ${both('met', 'Inspected')}
          ${mineF('met') ? `<p class="note">Waiting for ${esc(otherNick)}.</p>` : '<div class="btn-row"><button class="btn red" data-act="met">We met. I inspected it.</button></div>'}`;
      } else if (cur === 'Deal Done') {
        body = `${ticket}<p><strong>Deal Done.</strong> Both of you confirm the deal is finished.</p>${both('done', 'Done')}
          ${mineF('done') ? `<p class="note">Waiting for ${esc(otherNick)}.</p>` : '<div class="btn-row"><button class="btn red" data-act="done">Confirm Deal Done</button></div>'}`;
      } else {
        m.closeSoldListing(d);
        myRating = myRating || await m.myRatingFor(d.id).catch(() => null);
        body = `${ticket}${myRating ? `<div class="banner"><p><strong>All finished.</strong> You gave ${esc(otherNick)} ${starText(myRating.stars)}. Thank you for trading the No2 way.</p></div>` : `
          <p><strong>Deal done!</strong> Rate ${esc(otherNick)} from 1 to 5 stars and leave a short review.</p>
          <form id="rate-form"><fieldset class="stars"><legend class="sr-only">Rate ${esc(otherNick)}</legend>
          ${[1, 2, 3, 4, 5].map((n) => `<input type="radio" name="stars" id="s${n}" value="${n}" ${n === 5 ? 'required' : ''}><label for="s${n}" data-n="${n}" aria-label="${n} star${n > 1 ? 's' : ''}">★</label>`).join('')}
          </fieldset><label for="review">Review (optional)</label><textarea id="review" rows="3" maxlength="500" placeholder="Was the item as described? Were they on time?"></textarea>
          <div class="btn-row"><button class="btn red" type="submit">Send Rating</button></div></form>`}`;
      }
      $('#deal').innerHTML = `<h1 id="deal-h" tabindex="-1">Deal: ${esc(d.title)}</h1>
        <p class="note">With <a href="#/member/${other}">${esc(otherNick)}</a> · You are the ${buyer ? 'buyer' : 'seller'}</p>
        <ol class="steps" style="--n:${names.length}" aria-label="Deal steps">${names.map((s, i) => `<li class="${i < stage ? 'done' : i === stage ? 'now' : ''}" ${i === stage ? 'aria-current="step"' : ''}>${esc(s)}</li>`).join('')}</ol>
        ${body}
        <div class="btn-row"><button class="btn ghost small" id="deal-msg">Message ${esc(otherNick)}</button></div>
        <p class="note">No money moves through No2.</p>`;
      const act = async (a, text) => { try { await m.dealStep(d, a, text); } catch (e) { toast(err(e)); } };
      $('#deal').querySelectorAll('[data-act]').forEach((b) => b.addEventListener('click', () => { b.disabled = true; act(b.dataset.act); }));
      const cf = $('#counter-form');
      if (cf) cf.addEventListener('submit', (e) => { e.preventDefault(); const t = $('#counter').value.trim(); if (t) act('counter', t); });
      const rf = $('#rate-form');
      if (rf) {
        const paintStars = (n) => rf.querySelectorAll('label[data-n]').forEach((lb) => lb.classList.toggle('on', Number(lb.dataset.n) <= n));
        rf.addEventListener('change', () => paintStars(Number(new FormData(rf).get('stars'))));
        rf.addEventListener('submit', async (e) => {
          e.preventDefault(); const n = Number(new FormData(rf).get('stars')); if (!n) return;
          try { await m.rate(d, n, $('#review').value.trim()); myRating = { stars: n }; draw(d, true); toast('Thanks for rating.'); } catch (x) { toast(err(x)); }
        });
      }
      $('#deal-msg').addEventListener('click', async () => { try { location.hash = `#/chat/${await m.openConvo(other)}`; } catch (x) { toast(err(x)); } });
    };
    unsub = m.watchDeal(id, (d) => { if (here('deal')) draw(d); });
    setCleanup(() => unsub && unsub());
  });
}

/* ---------- Member profile ---------- */
export function renderMember(uid) {
  main.innerHTML = `<p><a href="#/trade">← Back to Trading Post</a></p><div id="member"></div>`;
  gate($('#member'), 'see member profiles', async (st) => {
    const [mem, ratings, listings] = await Promise.all([m.getMember(uid), m.ratingsFor(uid), m.listingsBy(uid)]);
    if (!mem) { $('#member').innerHTML = emptyState('Member not found', 'This member may have left No2.'); return; }
    const a = avg(ratings.map((r) => r.stars)); const v = VERIFY[mem.verify] || VERIFY.none;
    const open = listings.filter((l) => l.status === 'open');
    $('#member').innerHTML = `
    <div class="card">
      <div class="profile-head"><span class="avatar" aria-hidden="true">${esc(mem.nick[0].toUpperCase())}</span>
        <div><h1 style="margin:0">${esc(mem.nick)}</h1><div class="meta">${verifyTag(mem.verify)} ${cautionTag(ratings)} <span>Member since ${esc(fmtTs(mem.since).split(',').slice(0, 2).join(','))}</span></div></div></div>
      <div class="divider" role="presentation"></div>
      <p>${ratings.length ? `<span class="rating-big" aria-hidden="true">${starText(a)}</span> <strong>${a.toFixed(1)} out of 5</strong> from ${ratings.length} deal${ratings.length === 1 ? '' : 's'}` : '<strong>No ratings yet.</strong>'}</p>
      ${cautionOf(ratings) ? '<p class="legal"><strong>⚠ Use Caution.</strong> This member has 3 or more ratings of 2 stars or less. Be extra careful, meet only in public, and inspect everything.</p>' : ''}
      <h2>${esc(v.label)}</h2><p>${esc(v.how)}</p>
      <h2>Reviews</h2>
      ${ratings.filter((r) => r.review).length ? `<ul class="reviews">${ratings.filter((r) => r.review).map((r) => `<li><span aria-label="${r.stars} stars">${starText(r.stars)}</span> “${esc(r.review)}”</li>`).join('')}</ul>` : '<p>No written reviews yet.</p>'}
      ${uid !== st.user.uid ? '<div class="btn-row"><button class="btn" id="msg">Send a private message</button></div>' : ''}
    </div>
    <h2>Items from ${esc(mem.nick)}</h2>
    ${open.length ? `<div class="listings">${open.map((l) => listingCard(l, { member: mem, ratings })).join('')}</div>` : '<p>No open listings right now.</p>'}`;
    const mb = $('#msg');
    if (mb) mb.addEventListener('click', async () => { try { location.hash = `#/chat/${await m.openConvo(uid)}`; } catch (x) { toast(err(x)); } });
  });
}

/* =====================================================================
   MESSAGES
   ===================================================================== */
const safetyCard = (compact) => `<section class="card safety ${compact ? 'compact' : ''}" aria-labelledby="safety-h">
  <h2 id="safety-h" style="margin-top:0">Stay safe</h2>
  <ol class="tips">${SAFETY_TIPS.map((t) => `<li><span><b>${esc(t.t)}</b> ${compact ? '' : esc(t.d)}</span></li>`).join('')}</ol></section>`;

export function renderMessages() {
  main.innerHTML = `${lessonStrip()}<h1>Messages</h1>
    <p class="lede">Private messages between members. Only you and the other member can read them.</p>
    ${safetyCard(false)}<div id="inbox"></div>`;
  gate($('#inbox'), 'send private messages', async (st) => {
    const [convos, deals] = await Promise.all([m.myConvos(), m.myDeals()]);
    const me = st.user.uid;
    $('#inbox').innerHTML = `
      <h2>Conversations</h2>
      ${convos.length ? `<ul class="inbox">${convos.map((c) => { const other = c.parties.find((p) => p !== me); return `<li><a href="#/chat/${c.id}"><strong>${esc(c.nicks[other] || 'Member')}</strong><span class="note">${esc(c.last || 'No messages yet')}</span><span class="note">${esc(fmtTs(c.updatedAt))}</span></a></li>`; }).join('')}</ul>`
        : emptyState('No messages yet', 'Start one from any listing or member profile with “Message”.', '<a class="btn" href="#/trade">Go to Trading Post</a>')}
      <h2>Your deals</h2>
      ${deals.length ? `<ul class="inbox">${deals.map((d) => `<li><a href="#/deal/${d.id}"><strong>${esc(d.title)}</strong><span class="note">${d.buyer === me ? 'Buying' : 'Selling'} · Step: ${esc(dealStageName(d))}</span></a></li>`).join('')}</ul>` : '<p>No deals yet.</p>'}`;
  });
}

export function renderChat(id, _qs, setCleanup) {
  main.innerHTML = `<p><a href="#/messages">← Messages</a></p><div id="chat"></div>`;
  gate($('#chat'), 'send private messages', async (st) => {
    const c = await m.getConvo(id).catch(() => null);
    if (!c) { $('#chat').innerHTML = emptyState('Conversation not found', 'It may belong to other members.'); return; }
    const me = st.user.uid; const other = c.parties.find((p) => p !== me); const otherNick = c.nicks[other] || 'Member';
    $('#chat').innerHTML = `
      <h1>Chat with <a href="#/member/${other}">${esc(otherNick)}</a></h1>
      <p class="note">🔒 Private: only you and ${esc(otherNick)} can read this.</p>
      <div class="safety-strip" role="note"><strong>Safety:</strong> use a nickname · never share your home address · strip location data from photos</div>
      <div class="bubbles chat-log" id="log" aria-live="polite"><p class="note">Loading…</p></div>
      <form id="send" class="ask"><label for="msg-text" class="sr-only">Your message</label>
        <textarea id="msg-text" rows="2" maxlength="1000" placeholder="Write a message…" required></textarea>
        <button class="btn red" type="submit">Send</button></form>`;
    const unsub = m.watchMessages(id, (msgs) => {
      if (!$('#log')) return;
      $('#log').innerHTML = msgs.length ? msgs.map((x) => `<div class="bubble ${x.from === me ? 'you' : 'them'}"><small>${x.from === me ? 'You' : esc(otherNick)} · ${esc(fmtTs(x.createdAt))}</small>${esc(x.text)}</div>`).join('')
        : '<p class="note">No messages yet. Say hello.</p>';
      $('#log').scrollTop = $('#log').scrollHeight;
    });
    setCleanup(unsub);
    $('#send').addEventListener('submit', async (e) => {
      e.preventDefault(); const t = $('#msg-text').value.trim(); if (!t) return;
      if (/\b\d{1,6}\s+\w+\s+(st|street|ave|avenue|rd|road|dr|drive|ln|lane|ct|court|blvd|way)\b/i.test(t) && !confirm('That looks like a street address. No2 recommends never sharing your home address. Send anyway?')) return;
      $('#msg-text').value = '';
      try { await m.sendMessage(id, t); } catch (x) { toast(err(x)); $('#msg-text').value = t; }
    });
  });
}

/* =====================================================================
   SUGGESTION BOX: The Best Thing Worth Saying
   ===================================================================== */
export function renderSuggest() {
  main.innerHTML = `${lessonStrip()}<h1>Suggestion Box</h1>
  <section class="card" aria-labelledby="contest-h">
    <span class="source red-text">★ Member contest · ${esc(new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }))}</span>
    <h2 id="contest-h" style="margin-top:6px">${esc(CONTEST.name)}</h2>
    <ul class="checklist">${CONTEST.rules.map((r) => `<li>${esc(r)}</li>`).join('')}</ul>
    <p><strong>Prizes:</strong> ${CONTEST.prizes.map(esc).join(', ')}.</p>
  </section>
  <div id="contest"></div>`;
  gate($('#contest'), 'enter and vote', async (st) => {
    const [{ entries, myEntryId, myVote }, me] = await Promise.all([m.contestStatus(), m.refreshMember()]);
    const verified = !!(me && me.verify && me.verify !== 'none');
    $('#contest').innerHTML = `
    <section class="card" aria-labelledby="entries-h">
      <h2 id="entries-h" style="margin-top:0">This month’s entries, ranked by votes</h2>
      ${entries.length ? `<ol class="entries">${entries.map((x, i) => {
        const mine = x.id === myEntryId; const voted = x.id === myVote;
        const canVote = verified && !myVote && !mine;
        return `<li class="entry ${mine ? 'mine' : ''}"><span class="rank" aria-hidden="true">${i + 1}</span>
          <div><p class="quote">“${esc(x.text)}”</p><p class="meta">— ${x.credit === 'name' && x.nick ? esc(x.nick) : 'Anonymous member'}${mine ? ' (yours)' : ''} · ${x.votes} vote${x.votes === 1 ? '' : 's'}</p></div>
          ${canVote ? `<button class="btn small ghost" data-vote="${x.id}">Vote</button>` : voted ? '<span class="tag green">✓ Your vote</span>' : ''}</li>`;
      }).join('')}</ol>` : '<div class="banner"><p><strong>No entries yet.</strong> Be the first to write the Best Thing Worth Saying.</p></div>'}
      <p class="note">${myVote ? 'You voted this month. Thank you.' : verified ? 'You can vote once this month.' : 'Only verified members can vote. Your profile shows “Not Verified” for now.'}</p>
    </section>
    <section class="card" aria-labelledby="enter-h">
      <h2 id="enter-h" style="margin-top:0">Your entry</h2>
      ${myEntryId ? '<p>✓ Your entry is in for this month.</p>' : `
      <form id="sug-form"><label for="sug">The Best Thing Worth Saying</label>
        <textarea id="sug" rows="3" maxlength="280" placeholder="280 letters or less.">${esc(store.get('suggestDraft', ''))}</textarea>
        <p class="note" id="sug-count" aria-live="polite" style="margin:4px 0 8px">0 of 280 letters</p>
        <fieldset class="radio-row"><legend>How should we credit you?</legend>
          <label class="check"><input type="radio" name="credit" value="name" checked> By my nickname (${esc(st.member.nick)})</label>
          <label class="check"><input type="radio" name="credit" value="anonymous"> Anonymous</label></fieldset>
        <div class="btn-row"><button class="btn red" type="submit">Send my entry</button></div></form>`}
    </section>`;
    main.querySelectorAll('[data-vote]').forEach((b) => b.addEventListener('click', async () => {
      b.disabled = true; try { await m.vote(b.dataset.vote); toast('Vote counted. One vote per member each month.'); renderSuggest(); } catch (x) { toast(err(x)); b.disabled = false; }
    }));
    const f = $('#sug-form');
    if (f) {
      const count = () => { $('#sug-count').textContent = `${$('#sug').value.length} of 280 letters`; }; count();
      $('#sug').addEventListener('input', () => { count(); store.set('suggestDraft', $('#sug').value); });
      f.addEventListener('submit', async (e) => {
        e.preventDefault(); const text = $('#sug').value.trim();
        if (text.length < 3) { toast('Please write a little more.'); return; }
        const credit = new FormData(f).get('credit');
        try { await m.submitEntry(text, credit); store.del('suggestDraft'); toast('Your entry is in. Good luck!'); renderSuggest(); } catch (x) { toast(err(x)); }
      });
    }
  });
}

/* =====================================================================
   SPONSORS
   ===================================================================== */
export function renderSponsors() {
  main.innerHTML = `${lessonStrip()}<h1>Sponsors</h1>
  <p class="lede">Local businesses that support No2’s mission: teaching Coloradans their rights.</p>
  <h2>Our sponsors</h2>
  ${emptyState('No sponsors yet.', 'Be the first business to support Colorado No2.')}
  <h2>Sponsor levels</h2>
  <div class="levels">${SPONSOR_LEVELS.map((l) => `<section class="card level"><h3>${esc(l.name)}</h3><p class="price">$${l.price}<span class="note"> a month</span></p><ul class="checklist">${l.perks.map((p) => `<li>${esc(p)}</li>`).join('')}</ul></section>`).join('')}</div>
  <h2 id="sp-h">Become a Sponsor</h2>
  <form class="card" id="sp-form" aria-labelledby="sp-h" novalidate>
    <label for="sp-name">Your name</label><input id="sp-name" type="text" maxlength="80" autocomplete="name" required>
    <label for="sp-biz">Business name</label><input id="sp-biz" type="text" maxlength="120" autocomplete="organization">
    <label for="sp-contact">Email or phone, so we can reach you</label><input id="sp-contact" type="text" maxlength="120" autocomplete="email" required>
    <fieldset class="radio-row"><legend>Level</legend>${SPONSOR_LEVELS.map((l, i) => `<label class="check"><input type="radio" name="level" value="${l.id}" ${i === 0 ? 'checked' : ''}> ${esc(l.name)}, $${l.price} a month</label>`).join('')}</fieldset>
    <label for="sp-msg">Message (optional)</label><textarea id="sp-msg" rows="3" maxlength="1000"></textarea>
    <p class="note">Only No2 staff can read this form. No payment is taken here.</p>
    <p class="legal" id="sp-err" role="alert" hidden></p>
    <div class="btn-row"><button class="btn red" type="submit" ${m.isConfigured() ? '' : 'disabled'}>Send</button></div>
    ${m.isConfigured() ? '' : '<p class="note">The form opens as soon as No2’s member service is switched on.</p>'}
  </form>`;
  $('#sp-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fail = (t) => { $('#sp-err').textContent = t; $('#sp-err').hidden = false; };
    const f = { name: $('#sp-name').value.trim(), business: $('#sp-biz').value.trim(), contact: $('#sp-contact').value.trim(), level: new FormData(e.target).get('level'), message: $('#sp-msg').value.trim() };
    if (!f.name) return fail('Please add your name.');
    if (f.contact.length < 3) return fail('Please add an email or phone number.');
    try { await m.sendSponsorRequest(f); e.target.innerHTML = '<p><strong>Thank you!</strong> No2 will contact you soon.</p>'; } catch (x) { fail(err(x)); }
  });
}

/* =====================================================================
   EVENTS AND RANGES
   ===================================================================== */
export function renderEvents() {
  main.innerHTML = `${lessonStrip()}<h1>Events and Ranges</h1>
  <h2 id="ev-h">Event calendar</h2><div id="events" aria-labelledby="ev-h"></div>
  <h2>Ranges and classes</h2>
  <div class="map-wrap"><div id="map" class="map" role="region" aria-label="Map of public shooting ranges in Colorado"></div></div>
  <div id="ranges" class="grid"></div>
  <section class="card"><h3 style="margin-top:0">Find more ranges</h3><ul class="sources">${RANGE_DIRECTORIES.map((d) => `<li><a href="${d.url}" target="_blank" rel="noopener">${esc(d.label)} ↗</a></li>`).join('')}</ul>
  <h3>Find a class</h3><ul class="sources">${CLASS_DIRECTORIES.map((d) => `<li><a href="${d.url}" target="_blank" rel="noopener">${esc(d.label)} ↗</a></li>`).join('')}</ul>
  <p class="note">Know a real public range, class or event in Colorado? Tell us in the <a href="#/suggest">Suggestion Box</a> and No2 staff will check it and add it.</p></section>`;
  const today = new Date().toISOString().slice(0, 10);
  const showRanges = (extra, center) => {
    const all = [...RANGES, ...extra];
    $('#ranges').innerHTML = all.map((r) => `<article class="card"><h3 style="margin-top:0">${esc(r.name)}</h3><p class="meta">${esc(r.where || '')}${center && r.lat ? ` · ${roughDistance(milesBetween(center, r))}` : ''}</p><p>${esc(r.what || '')}</p>${r.link ? `<a class="src" href="${esc(r.link.url || r.link)}" target="_blank" rel="noopener">${esc(r.link.label || 'Website')} ↗</a>` : ''}</article>`).join('');
    drawMap($('#map'), { center: null, spots: all.filter((r) => r.lat).map((r) => ({ lat: r.lat, lon: r.lon, html: `<strong>${esc(r.name)}</strong>` })) }).catch(() => {});
  };
  showRanges([], null);
  const noEvents = emptyState('No events listed yet.', 'No2 lists only real public Colorado events, with links. Check back soon.');
  if (!m.isConfigured()) { $('#events').innerHTML = noEvents; return; }
  m.start().then(async (st) => {
    const [events, ranges] = await Promise.all([m.listPublic('events').catch(() => []), m.listPublic('ranges').catch(() => [])]);
    const upcoming = events.filter((x) => (x.date || '') >= today).sort((a, b) => a.date.localeCompare(b.date));
    $('#events').innerHTML = upcoming.length ? `<ul class="inbox">${upcoming.map((x) => `<li><a href="${esc(x.url)}" target="_blank" rel="noopener"><strong>${esc(x.title)}</strong><span class="note">${esc(new Date(x.date + 'T12:00:00').toDateString())} · ${esc(x.where || '')}</span></a></li>`).join('')}</ul>` : noEvents;
    showRanges(ranges.map((r) => ({ ...r, link: r.url ? { label: 'Website', url: r.url } : null })), areaOf(st));
  }).catch(() => { $('#events').innerHTML = noEvents; });
}

/* =====================================================================
   MY ACCOUNT
   ===================================================================== */
export function renderAccount() {
  if (!m.isConfigured()) { main.innerHTML = `<h1>My Account</h1>${NOT_READY}`; return; }
  main.innerHTML = '<h1>My Account</h1><div class="card"><p>Loading…</p></div>';
  m.start().then(paintAccount).catch((e) => { console.error(e); main.innerHTML = `<h1>My Account</h1>${emptyState('Could not reach No2’s member service', 'Check your signal and try again.')}`; });
}
async function paintAccount() {
  if (!here('account')) return;
  if (m.state().member) await m.refreshMember();
  if (!here('account')) return;
  const { user, member, admin } = m.state();
  if (!user) {
    main.innerHTML = `<h1>Join Colorado No2</h1>
    <p class="lede">Free for Coloradans. Sign in with your Google account, then pick a nickname.</p>
    <div class="card"><button class="btn block google" id="google-btn">${GOOGLE_G} Continue with Google</button>
      <p class="note" style="margin-top:12px"><strong>Your privacy:</strong> Google tells No2 your email so you can sign in. No2 never shows it to anyone. Your No2 profile only has the nickname you pick.</p></div>`;
    $('#google-btn').addEventListener('click', async (e) => { e.currentTarget.disabled = true; try { await m.signIn(); } catch (x) { console.error(x); toast('Sign-in did not work. Please try again.'); } paintAccount(); });
    return;
  }
  if (!member) {
    main.innerHTML = `<h1>Pick your nickname</h1>
    <p class="lede">This is the name other members see. <strong>Don’t use your real name.</strong></p>
    <form class="card" id="join-form" novalidate>
      <label for="nick">Nickname</label>
      <input id="nick" type="text" autocomplete="off" autocapitalize="off" spellcheck="false" maxlength="20" placeholder="Example: HighPlainsHank" aria-describedby="nick-help" required>
      <p class="note" id="nick-help" style="margin:4px 0 10px">3 to 20 letters, numbers or _ . It can’t be changed later.</p>
      <fieldset style="border:0;padding:0;margin:0"><legend class="sr-only">Agreements</legend>
        <label class="check"><input type="checkbox" id="ok-co"> I live in Colorado.</label>
        <label class="check"><input type="checkbox" id="ok-age"> I am 18 or older. (You must be 21 to buy a gun in Colorado.)</label>
        <label class="check"><input type="checkbox" id="ok-rules"> I agree to the No2 member rules:</label>
        <ul class="checklist" style="margin-left:30px">${MEMBER_RULES.map((r) => `<li>${esc(r)}</li>`).join('')}</ul></fieldset>
      <p class="legal" id="nick-err" role="alert" hidden></p>
      <div class="btn-row"><button class="btn red" type="submit">Join No2</button><button class="btn ghost" type="button" id="out-btn">Sign out</button></div>
    </form>`;
    $('#out-btn').addEventListener('click', async () => { await m.signOutMember(); paintAccount(); });
    $('#join-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const fail = (t) => { $('#nick-err').textContent = t; $('#nick-err').hidden = false; };
      const nick = $('#nick').value.trim();
      if (!m.NICK_RULE.test(nick)) return fail('Nickname: use 3 to 20 letters, numbers or _ only.');
      if (!$('#ok-co').checked || !$('#ok-age').checked || !$('#ok-rules').checked) return fail('Please check all three boxes to join.');
      const btn = e.submitter || e.target.querySelector('[type=submit]'); btn.disabled = true; $('#nick-err').hidden = true;
      try { await m.createMember({ nick }); toast(`Welcome to No2, ${nick}!`); paintAccount(); } catch (x) { fail(err(x)); btn.disabled = false; }
    });
    return;
  }
  const ratings = await m.ratingsFor(user.uid).catch(() => []);
  if (!here('account')) return;
  const v = VERIFY[member.verify] || VERIFY.none;
  main.innerHTML = `<h1>My Account</h1>
  <div class="card">
    <div class="profile-head"><span class="avatar" aria-hidden="true">${esc(member.nick[0].toUpperCase())}</span>
      <div><h2 style="margin:0">${esc(member.nick)}</h2><div class="meta">${verifyTag(member.verify)} ${cautionTag(ratings)} <span>Member since ${esc(fmtTs(member.since).split(',').slice(0, 2).join(','))}</span></div></div></div>
    <div class="divider" role="presentation"></div>
    <h3>Verification: ${esc(v.label)}</h3>
    <p>${member.verify === 'none' ? 'Verified members get more trades and can vote in the contest. No2 staff check a phone number, a live picture, or a photo ID, then set your label. How to ask for a check will appear here when staff verification opens.' : esc(v.how)}</p>
    <h3>Your ratings</h3>
    <p>${ratings.length ? `${starText(avg(ratings.map((r) => r.stars)))} ${avg(ratings.map((r) => r.stars)).toFixed(1)} from ${ratings.length} deal${ratings.length === 1 ? '' : 's'}` : 'No ratings yet. They appear here after your first deal.'}</p>
    <div class="btn-row"><a class="btn" href="#/member/${user.uid}">See my public profile</a><a class="btn ghost" href="#/messages">My messages and deals</a>${admin ? '<a class="btn ghost" href="#/admin">No2 Staff</a>' : ''}<button class="btn ghost" id="out-btn">Sign out</button></div>
  </div>
  <div id="area-box"></div>`;
  areaBox($('#area-box'), m.state(), () => {});
  $('#out-btn').addEventListener('click', async () => { await m.signOutMember(); toast('Signed out.'); paintAccount(); });
}
m.onChange(() => { if (here('account')) paintAccount(); });

/* =====================================================================
   NO2 STAFF (admins only; the database checks too)
   ===================================================================== */
export function renderAdmin() {
  main.innerHTML = '<h1>No2 Staff</h1><div id="admin"></div>';
  gate($('#admin'), 'use staff tools', async (st) => {
    if (!(await m.refreshAdmin())) { $('#admin').innerHTML = emptyState('Staff only', 'This page is for No2 staff.'); return; }
    const reqs = await m.sponsorRequests().catch(() => []);
    $('#admin').innerHTML = `
    <form class="card" id="v-form"><h2 style="margin-top:0">Set a member’s verification</h2>
      <label for="v-nick">Member nickname</label><input id="v-nick" type="text" required>
      <label for="v-level">Label</label><select id="v-level">${Object.entries(VERIFY).map(([k, v]) => `<option value="${k}">${esc(v.label)}</option>`).join('')}</select>
      <div class="btn-row"><button class="btn red" type="submit">Save label</button></div></form>
    <form class="card" id="e-form"><h2 style="margin-top:0">Add a real public event</h2>
      <label for="e-title">Event name</label><input id="e-title" type="text" required>
      <label for="e-date">Date</label><input id="e-date" type="date" required>
      <label for="e-where">Town</label><input id="e-where" type="text">
      <label for="e-url">Official link</label><input id="e-url" type="url" required placeholder="https://">
      <div class="btn-row"><button class="btn" type="submit">Add event</button></div></form>
    <form class="card" id="r-form"><h2 style="margin-top:0">Add a real public range</h2>
      <label for="r-name">Range name</label><input id="r-name" type="text" required>
      <label for="r-where">Town or area</label><input id="r-where" type="text">
      <label for="r-town">Nearest town (for the map)</label><select id="r-town">${TOWNS.map((t, i) => `<option value="${i}">${esc(t.name)}</option>`).join('')}</select>
      <label for="r-what">What it offers</label><input id="r-what" type="text">
      <label for="r-url">Official link</label><input id="r-url" type="url" required placeholder="https://">
      <div class="btn-row"><button class="btn" type="submit">Add range</button></div></form>
    <section class="card"><h2 style="margin-top:0">Sponsor requests</h2>
      ${reqs.length ? `<ul class="inbox">${reqs.map((r) => `<li><div><strong>${esc(r.name)}</strong> ${r.business ? '· ' + esc(r.business) : ''} · $${esc(r.level)}/month<br><span class="note">${esc(r.contact)} · ${esc(fmtTs(r.createdAt))}</span><br>${esc(r.message)}</div></li>`).join('')}</ul>` : '<p>No requests yet.</p>'}</section>`;
    $('#v-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      try { const mem = await m.memberByNick($('#v-nick').value.trim()); if (!mem) throw new Error('No member with that nickname.'); await m.setVerify(mem.uid, $('#v-level').value); toast(`${mem.nick} is now ${VERIFY[$('#v-level').value].label}.`); } catch (x) { toast(err(x)); }
    });
    $('#e-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      try { await m.addPublic('events', { title: $('#e-title').value.trim(), date: $('#e-date').value, where: $('#e-where').value.trim(), url: $('#e-url').value.trim() }); toast('Event added.'); e.target.reset(); } catch (x) { toast(err(x)); }
    });
    $('#r-form').addEventListener('submit', async (e) => {
      e.preventDefault(); const t = TOWNS[Number($('#r-town').value)];
      try { await m.addPublic('ranges', { name: $('#r-name').value.trim(), where: $('#r-where').value.trim(), what: $('#r-what').value.trim(), url: $('#r-url').value.trim(), lat: t.lat, lon: t.lon }); toast('Range added.'); e.target.reset(); } catch (x) { toast(err(x)); }
    });
  });
}

/* Newsletter "Trading Post" section: a live count, or "Be the first to post." */
export async function fillNewsletterTradingPost(el) {
  if (!m.isConfigured() || !el) return;
  try {
    const st = await m.start();
    if (!st.user) { el.innerHTML = '<p>Members can see what’s on the Trading Post. <a href="#/account">Join free</a>.</p>'; return; }
    const ls = await m.listOpenListings();
    el.innerHTML = ls.length ? `<p><strong>${ls.length}</strong> item${ls.length === 1 ? '' : 's'} open on the Trading Post right now.</p><a class="btn small" href="#/trade">Go to Trading Post</a>`
      : '<p><strong>Be the first to post.</strong> No member has listed an item yet.</p><a class="btn small red" href="#/sell">Post an item</a>';
  } catch { el.innerHTML = '<p>Visit the <a href="#/trade">Trading Post</a>.</p>'; }
}

export { NOT_ADVICE };
