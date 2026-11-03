// Barter Kings — test-drive app. Plain JavaScript, no build step.
import * as S from './store.js';
import { CATEGORIES, CONDITIONS, AGES, SOURCES, WORKS, MEMBERS, LISTINGS, PLACES } from './data.js';
import { placeFor, milesBetween, roughDistance, COUNTIES, STATES } from './geo.js';
import { findMatches } from './matcher.js';
import { takeLivePhoto, stampText } from './camera.js';

const app = document.getElementById('app');
const STEPS = ['Offer', 'Counter', 'Lock It In', 'Meet and Inspect', 'Deal Done'];
const TAX_LINE = 'Trades may be taxable, check with your tax preparer.';

// ---------- helpers ----------
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const cat = id => CATEGORIES.find(c => c.id === id) || { name: 'Other', emoji: '📦' };
const st = () => S.get();
const me = () => st().user;
const go = h => { location.hash = h; };
const ago = t => {
  const m = Math.round((Date.now() - t) / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m} min ago`;
  if (m < 1440) return `${Math.round(m / 60)} hr ago`;
  return `${Math.round(m / 1440)} days ago`;
};

function toast(msg) {
  const t = document.createElement('div');
  t.className = 'toast';
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 3500);
}

function allListings() {
  const traded = st().tradedIds || [];
  return [...st().myListings, ...LISTINGS].filter(l => !traded.includes(l.id));
}
const listingById = id => [...st().myListings, ...LISTINGS].find(l => l.id === id);

function memberById(id) {
  if (me() && id === me().id) return { id, name: me().name, city: st().settings.homeCity, ratings: st().extraRatings[id] || [], isMe: true };
  const m = MEMBERS.find(x => x.id === id) || { id, name: 'Member', city: 'Castle Rock', ratings: [] };
  return { ...m, ratings: [...m.ratings, ...(st().extraRatings[id] || [])] };
}

function memberInfo(id) {
  const m = memberById(id);
  const n = m.ratings.length;
  const avg = n ? m.ratings.reduce((a, r) => a + r.stars, 0) / n : 0;
  const bad = m.ratings.filter(r => r.stars <= 2).length;
  return { ...m, avg, count: n, caution: bad >= 3 }; // "Use Caution" after 3+ bad ratings
}

const myPlace = () => placeFor(st().settings.homeCity);
const placeOf = l => (me() && l.ownerId === me().id) ? myPlace() : placeFor(memberById(l.ownerId).city);
const milesTo = l => (me() && l.ownerId === me().id) ? 0 : milesBetween(myPlace(), placeOf(l));

function isVisible(l) {
  const s = st().settings, p = placeOf(l);
  switch (s.mode) {
    case 'radius': return milesTo(l) <= s.radius;
    case 'county': return `${p.county}, ${p.state}` === s.county;
    case 'zip': return (s.zip || '').length >= 3 && p.zip.slice(0, 3) === s.zip.slice(0, 3);
    case 'city': return p.city === s.city;
    case 'state': return p.state === s.state;
    default: return l.ship || milesTo(l) <= 40; // ship-anywhere
  }
}

function areaLabel() {
  const s = st().settings;
  return {
    radius: `Within ${s.radius} miles of ${s.homeCity}`,
    county: s.county,
    zip: `Near zip ${s.zip}`,
    city: `In ${s.city}`,
    state: `All of ${s.state}`,
    anywhere: 'Ship anywhere + nearby',
  }[s.mode];
}

const stars = avg => {
  const full = Math.round(avg);
  return `<span class="stars" aria-label="${avg.toFixed(1)} stars">${'★'.repeat(full)}${'☆'.repeat(5 - full)}</span>`;
};

function photo(l, cls = '') {
  if (l.photo) return `<img class="ph ${cls}" src="${l.photo}" alt="Photo of ${esc(l.title)}">`;
  return `<div class="ph sample ${cls}"><span class="emo">${l.emoji || cat(l.category).emoji}</span><span class="tag">Sample photo · ${esc(stampText(l.photoTime))}</span></div>`;
}

const restrictedWarn = l => cat(l.category).restricted
  ? `<div class="warn">⚠️ May not be legal to send across state lines</div>` : '';

const cautionBadge = info => info.caution ? `<span class="caution">⚠️ Use Caution</span>` : '';

function matchCtx() { return { milesTo, memberInfo }; }

function myMatches() {
  const others = allListings().filter(l => l.ownerId !== me().id && isVisible(l));
  const mine = st().myListings.filter(l => !(st().tradedIds || []).includes(l.id));
  return findMatches(mine, others, matchCtx());
}

function needsMe(d) {
  if (d.cancelled) return false;
  if (d.kind === 'incoming' && d.step === 0) return true;
  if (d.kind === 'outgoing' && d.step === 1 && !d.autoAt) return true;
  if (d.step === 2 || d.step === 3) return true;
  if (d.step === 4 && !d.reviewed) return true;
  return false;
}

// ---------- shell & router ----------
let view = { actions: {} };

function shell(name, inner) {
  const bare = ['welcome', 'signin'].includes(name);
  if (bare) return `<main class="bare">${inner}</main>`;
  const badge = st().deals.filter(needsMe).length;
  const tab = (n, icon, label, extra = '') =>
    `<button class="tab ${name === n ? 'on' : ''} ${extra}" data-go="#/${n}"><span class="ti">${icon}</span><span>${label}</span>${n === 'deals' && badge ? `<b class="badge">${badge}</b>` : ''}</button>`;
  return `
    <header class="top">
      <button class="brand" data-go="#/browse"><span class="crown">👑</span> Barter Kings</button>
      <div class="top-r">
        <button class="icon" data-go="#/settings" aria-label="Area and settings">⚙️</button>
        <button class="icon" data-go="#/profile/me" aria-label="My profile">👤</button>
      </div>
    </header>
    <main>${inner}</main>
    <nav class="tabs">
      ${tab('browse', '🏠', 'Browse')}
      ${tab('matches', '✨', 'Matches')}
      ${tab('list', '➕', 'List', 'big')}
      ${tab('deals', '🤝', 'Deals')}
      ${tab('ideas', '💡', 'Ideas')}
    </nav>`;
}

function render(keepScroll = false) {
  const y = window.scrollY;
  const s = st();
  let [name, arg] = location.hash.replace(/^#\/?/, '').split('/');
  if (!s.seenWelcome) name = 'welcome';
  else if (!s.user) name = 'signin';
  else if (!s.seenIdeas && name !== 'ideas') name = 'ideas'; // page two is always the Suggestion Box
  if (!routes[name]) name = 'browse';
  view = routes[name](arg) || {};
  view.actions = view.actions || {};
  app.innerHTML = shell(name, view.html);
  if (view.mount) view.mount();
  window.scrollTo(0, keepScroll ? y : 0);
}
const rerender = () => render(true);

document.addEventListener('click', e => {
  const g = e.target.closest('[data-go]');
  if (g) { e.preventDefault(); go(g.dataset.go); return; }
  const a = e.target.closest('[data-act]');
  if (a && view.actions[a.dataset.act]) { e.preventDefault(); view.actions[a.dataset.act](a); }
});
window.addEventListener('hashchange', () => render());

// ---------- screens ----------
const routes = {};

routes.welcome = () => ({
  html: `
    <section class="welcome">
      <div class="logo-big">👑</div>
      <h1>Barter Kings</h1>
      <p class="tagline">Trade what you have for what you want.</p>
      <ul class="welcome-points">
        <li>🔁 Swap item for item</li>
        <li>📍 Meet up locally or ship it</li>
        <li>💵 Add cash to even it out</li>
        <li>💡 Shaped by members' ideas</li>
      </ul>
      <button class="btn gold xl" data-act="start">Get started</button>
    </section>`,
  actions: { start: () => { S.update(s => { s.seenWelcome = true; }); go('#/signin'); render(); } },
});

routes.signin = () => ({
  html: `
    <section class="welcome">
      <div class="logo-big">👑</div>
      <h1>Join Barter Kings</h1>
      <p class="tagline">One tap and you're in.</p>
      <button class="btn google xl" data-act="google"><span class="g">G</span> Continue with Google</button>
      <p class="fine">Test version: this button signs you in as a test member. No real Google account is used.</p>
    </section>`,
  actions: {
    google: () => {
      // ===== REAL GOOGLE SIGN-IN PLUGS IN HERE =====
      // Replace this fake user with Firebase Authentication, for example:
      //   const cred = await signInWithPopup(auth, new GoogleAuthProvider());
      //   user = { id: cred.user.uid, name: cred.user.displayName, email: cred.user.email };
      S.update(s => { s.user = { id: 'me', name: 'Jason', email: 'test-member@example.com' }; });
      go('#/ideas'); render();
    },
  },
});

let ideasTab = 'recent';
routes.ideas = () => {
  const s = st();
  const first = !s.seenIdeas;
  const list = [...s.suggestions].sort((a, b) => ideasTab === 'top' ? b.votes - a.votes : b.time - a.time);
  return {
    html: `
      <section class="pad">
        <div class="hero-box">
          <div class="hero-icon">💡</div>
          <h1>Suggestion Box</h1>
          <p>Barter Kings is built by its members. What should we add or change?</p>
          <textarea id="idea" maxlength="240" rows="3" placeholder="Type your idea here…"></textarea>
          <button class="btn gold xl" data-act="submit">Submit my idea</button>
        </div>
        <div class="seg">
          <button class="${ideasTab === 'recent' ? 'on' : ''}" data-act="tab" data-v="recent">Recent</button>
          <button class="${ideasTab === 'top' ? 'on' : ''}" data-act="tab" data-v="top">Most votes</button>
        </div>
        <ul class="ideas">
          ${list.map(g => `
            <li>
              <button class="vote ${s.myVotes[g.id] ? 'on' : ''}" data-act="vote" data-id="${g.id}" aria-label="Upvote">▲<b>${g.votes}</b></button>
              <div><p>${esc(g.text)}</p><small>${esc(g.by)} · ${ago(g.time)}</small></div>
            </li>`).join('')}
        </ul>
        ${first ? `<div class="sticky-cta"><button class="btn purple xl" data-act="next">Next: list your first item →</button>
          <button class="btn ghost" data-act="look">Just look around first</button></div>` : ''}
      </section>`,
    actions: {
      submit: () => {
        const v = document.getElementById('idea').value.trim();
        if (v.length < 4) return toast('Type your idea first.');
        S.update(s => s.suggestions.push({ id: S.uid(), by: s.user.name, text: v, votes: 1, time: Date.now() }));
        S.update(s => { s.myVotes[s.suggestions.at(-1).id] = true; });
        ideasTab = 'recent'; toast('Thanks! Your idea is posted.'); rerender();
      },
      tab: el => { ideasTab = el.dataset.v; rerender(); },
      vote: el => {
        S.update(s => {
          const g = s.suggestions.find(x => x.id === el.dataset.id);
          if (s.myVotes[g.id]) { g.votes--; delete s.myVotes[g.id]; } else { g.votes++; s.myVotes[g.id] = true; }
        });
        rerender();
      },
      next: () => { S.update(s => { s.seenIdeas = true; }); go('#/list'); },
      look: () => { S.update(s => { s.seenIdeas = true; }); go('#/browse'); },
    },
  };
};

let browseCat = 'all';
routes.browse = () => {
  const items = allListings().filter(l => l.ownerId !== me().id && isVisible(l) && (browseCat === 'all' || l.category === browseCat))
    .sort((a, b) => milesTo(a) - milesTo(b));
  const top = st().myListings.length ? myMatches()[0] : null;
  const usedCats = CATEGORIES.filter(c => allListings().some(l => l.category === c.id));
  return {
    html: `
      <section class="pad">
        <button class="area-chip" data-go="#/settings">📍 ${esc(areaLabel())} <u>change</u></button>
        <div class="cats">
          <button class="chip ${browseCat === 'all' ? 'on' : ''}" data-act="cat" data-v="all">All</button>
          ${usedCats.map(c => `<button class="chip ${browseCat === c.id ? 'on' : ''}" data-act="cat" data-v="${c.id}">${c.emoji} ${c.name}</button>`).join('')}
        </div>
        ${top ? `<button class="match-teaser" data-go="#/item/${top.theirs.id}">✨ <span>${esc(top.message)}</span></button>`
          : !st().myListings.length ? `<button class="match-teaser" data-go="#/list">✨ <span>List an item and we'll find trades for it.</span></button>` : ''}
        ${items.length ? `<div class="grid">${items.map(card).join('')}</div>`
          : `<div class="empty"><p>No trades in this area yet.</p><button class="btn purple" data-go="#/settings">Widen my area</button></div>`}
      </section>`,
    actions: { cat: el => { browseCat = el.dataset.v; rerender(); } },
  };
};

function card(l) {
  const info = memberInfo(l.ownerId);
  return `
    <button class="card" data-go="#/item/${l.id}">
      ${photo(l)}
      <div class="card-b">
        <b class="t">${esc(l.title)}</b>
        <span class="sub">${l.condition} · ${roughDistance(milesTo(l))}</span>
        <span class="icons">${l.meet ? '🤝' : ''}${l.ship ? '📦' : ''}${l.cash ? '💵' : ''}${l.openAny ? ' <em>open to anything</em>' : ''}</span>
        ${cautionBadge(info)}${cat(l.category).restricted ? '<span class="mini-warn">⚠️ state lines</span>' : ''}
      </div>
    </button>`;
}

routes.item = id => {
  const l = listingById(id);
  if (!l) return { html: `<section class="pad"><p>That item is gone.</p><button class="btn purple" data-go="#/browse">Back</button></section>` };
  const info = memberInfo(l.ownerId);
  const mine = l.ownerId === me().id;
  const facts = [
    ['Condition', l.condition], ['Age', l.age], ['Got it', l.source], ['Works?', l.works],
    ['Original box', l.box ? 'Yes' : 'No'], ['Meet locally', l.meet ? 'Yes' : 'No'],
    ['Will ship', l.ship ? 'Yes' : 'No'], ['Cash added OK', l.cash ? 'Yes' : 'No'],
  ];
  const wants = l.openAny ? `Open to anything${l.wants.length ? ', especially ' + l.wants.map(w => cat(w).name).join(', ') : ''}`
    : l.wants.map(w => cat(w).name).join(', ') || 'Make an offer';
  return {
    html: `
      <section class="pad">
        <button class="back" onclick="history.back()">‹ Back</button>
        ${photo(l, 'big')}
        <h1 class="item-t">${esc(l.title)}</h1>
        <p class="sub">${cat(l.category).emoji} ${cat(l.category).name} · 📍 ${mine ? 'Your item' : roughDistance(milesTo(l))}</p>
        ${restrictedWarn(l)}
        <div class="wants"><b>Will trade for:</b> ${esc(wants)}</div>
        <dl class="facts">${facts.map(([k, v]) => `<div><dt>${k}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>
        ${mine ? '' : `
        <button class="owner" data-go="#/profile/${l.ownerId}">
          <span class="av">${esc(info.name[0])}</span>
          <span><b>${esc(info.name)}</b> ${cautionBadge(info)}<br>${stars(info.avg)} <small>${info.count} reviews · ${esc(info.city)}</small></span>
          <span>›</span>
        </button>`}
        ${mine ? `<p class="note">This is your item.</p><button class="btn ghost" data-act="remove">Remove this listing</button>`
          : `<div class="sticky-cta"><button class="btn gold xl" data-go="#/offer/${l.id}">Make an offer</button></div>`}
      </section>`,
    actions: {
      remove: () => {
        if (!confirm('Remove this listing?')) return;
        S.update(s => { s.myListings = s.myListings.filter(x => x.id !== l.id); });
        go('#/profile/me');
      },
    },
  };
};

// ----- List an item (tap choices, no typing except optional title) -----
const blankDraft = () => ({ photo: null, photoTime: null, title: '', category: null, condition: null, age: null, source: null, works: null, box: null, meet: true, ship: false, cash: true, openAny: false, wants: [] });
let draft = blankDraft();

function chips(group, options, multi = false) {
  return `<div class="chips">${options.map(o => {
    const [val, label] = Array.isArray(o) ? o : [o, o];
    const on = multi ? draft[group].includes(val) : draft[group] === val;
    return `<button class="chip lg ${on ? 'on' : ''}" data-act="pick" data-g="${group}" data-v="${esc(String(val))}" data-m="${multi ? 1 : 0}">${on ? '✓ ' : ''}${esc(label)}</button>`;
  }).join('')}</div>`;
}
const yesNo = g => chips(g, [['true', 'Yes'], ['false', 'No']]);

routes.list = () => {
  const d = draft;
  const catOpts = CATEGORIES.map(c => [c.id, `${c.emoji} ${c.name}`]);
  const q = (n, label, body) => `<div class="q"><h3><span class="qn">${n}</span>${label}</h3>${body}</div>`;
  return {
    html: `
      <section class="pad form">
        <h1>List an item</h1>
        <p class="sub">Just tap your answers. Only the title is typed, and it's optional.</p>
        ${q(1, 'Live photo of your item', d.photo
          ? `<img class="ph big" src="${d.photo}" alt="Your item photo"><button class="btn ghost" data-act="photo">Retake photo</button>`
          : `<button class="btn purple xl cam-btn" data-act="photo">📸 Take a live photo</button><p class="fine">Photos are taken live and stamped with the date and time. No gallery uploads.</p>`)}
        ${q(2, 'Short title (optional)', `<input id="title" maxlength="50" value="${esc(d.title)}" placeholder="Example: Mountain bike">`)}
        ${q(3, 'Category', chips('category', catOpts))}
        ${d.category && cat(d.category).restricted ? '<div class="warn">⚠️ Items in this category may not be legal to send across state lines. Members will see a warning.</div>' : ''}
        ${q(4, 'Condition', chips('condition', CONDITIONS))}
        ${q(5, 'How old is it?', chips('age', AGES))}
        ${q(6, 'Where did you get it?', chips('source', SOURCES))}
        ${q(7, 'Does it work?', chips('works', WORKS))}
        ${q(8, 'Original box?', yesNo('box'))}
        ${q(9, 'Will you meet locally?', yesNo('meet'))}
        ${q(10, 'Will you ship it?', yesNo('ship'))}
        ${q(11, 'Open to cash being added?', yesNo('cash'))}
        ${q(12, 'Open to anything? (like "bike for anything")', yesNo('openAny'))}
        ${q(13, d.openAny ? 'Any categories you would especially like?' : 'What would you trade it for? Tap all that fit.', chips('wants', CATEGORIES.filter(c => !c.restricted).map(c => [c.id, `${c.emoji} ${c.name}`]), true))}
        <div class="sticky-cta"><button class="btn gold xl" data-act="post">Post my item</button></div>
      </section>`,
    mount: () => {
      document.getElementById('title').addEventListener('input', e => { draft.title = e.target.value; });
    },
    actions: {
      photo: async () => {
        const p = await takeLivePhoto('item');
        if (p) { draft.photo = p.dataUrl; draft.photoTime = p.time; rerender(); }
      },
      pick: el => {
        const g = el.dataset.g; let v = el.dataset.v;
        if (v === 'true') v = true; else if (v === 'false') v = false;
        if (el.dataset.m === '1') draft[g] = draft[g].includes(v) ? draft[g].filter(x => x !== v) : [...draft[g], v];
        else draft[g] = v;
        rerender();
      },
      post: () => {
        const d = draft, missing = [];
        if (!d.photo) missing.push('a live photo');
        ['category', 'condition', 'age', 'source', 'works'].forEach(k => { if (!d[k]) missing.push(k === 'source' ? 'where you got it' : k === 'works' ? 'does it work' : k); });
        if (d.box === null) missing.push('original box');
        if (!d.meet && !d.ship) missing.push('meet locally or ship (pick at least one)');
        if (!d.openAny && !d.wants.length) missing.push('what you would trade for');
        if (missing.length) return toast('Still needed: ' + missing.join(', '));
        const l = {
          ...d, id: 'u' + S.uid(), ownerId: me().id, sample: false,
          title: d.title.trim() || `${cat(d.category).name} (${d.condition})`,
        };
        S.update(s => s.myListings.unshift(l));
        draft = blankDraft();
        toast('Your item is posted! Looking for matches…');
        scheduleIncomingOffer(l);
        go('#/matches');
      },
    },
  };
};

// After the first listing, a sample member sends an offer so the deal flow can be tried both ways.
function scheduleIncomingOffer(myItem) {
  if (st().incomingSent) return;
  S.update(s => { s.incomingSent = true; });
  setTimeout(() => {
    const pool = LISTINGS.filter(l => !memberInfo(l.ownerId).caution && (l.openAny || l.wants.includes(myItem.category)));
    const theirs = pool[0] || LISTINGS[1];
    const other = memberById(theirs.ownerId);
    S.update(s => s.deals.unshift({
      id: S.uid(), kind: 'incoming', otherId: theirs.ownerId, theirIds: [theirs.id], myIds: [myItem.id],
      cash: { amount: 0, payer: null }, method: myItem.meet && theirs.meet ? 'meet' : 'ship',
      photo: null, sampleEmoji: theirs.emoji, step: 0, created: Date.now(),
      history: [{ who: other.name, text: `Offered their ${theirs.title} for your ${myItem.title}.`, time: Date.now() }],
    }));
    toast(`🤝 New offer from ${other.name}! Open Deals.`);
    rerender();
  }, 6000);
}

routes.matches = () => {
  if (!st().myListings.length) return {
    html: `<section class="pad"><h1>Your matches</h1><div class="empty"><p>✨ List an item and we'll find the best trades for it.</p><button class="btn gold xl" data-go="#/list">List an item</button></div></section>`,
  };
  const ms = myMatches();
  return {
    html: `
      <section class="pad">
        <h1>Your matches</h1>
        <p class="sub">Best trades first, ${esc(areaLabel().toLowerCase())}.</p>
        ${ms.length ? ms.map((m, i) => `
          <button class="match" data-go="#/item/${m.theirs.id}">
            <div class="match-pics">${photo(m.mine, 'sm')}<span class="swap">⇄</span>${photo(m.theirs, 'sm')}</div>
            <p class="match-msg">${i === 0 ? '<b class="best">Best match</b> ' : ''}${esc(m.message)}</p>
            <div class="meter"><i style="width:${Math.min(100, m.score)}%"></i></div>
            <ul class="reasons">${m.reasons.slice(0, 3).map(r => `<li>✓ ${esc(r)}</li>`).join('')}</ul>
            <small>${m.method === 'meet' ? '🤝 Meet up' : '📦 Ship'} · ${roughDistance(milesTo(m.theirs))}</small>
          </button>`).join('')
        : `<div class="empty"><p>No strong matches in this area yet.</p><button class="btn purple" data-go="#/settings">Widen my area</button>
           <button class="btn ghost" data-go="#/list">List another item</button></div>`}
      </section>`,
  };
};

// ----- Make an offer -----
let offer = null;
routes.offer = id => {
  const target = listingById(id);
  if (!target) return routes.browse();
  if (!offer || offer.targetId !== id) offer = { targetId: id, myIds: [], cash: 0, payer: 'none', photo: null, photoTime: null };
  const owner = memberInfo(target.ownerId);
  const mine = st().myListings.filter(l => !(st().tradedIds || []).includes(l.id));
  const methods = [];
  if (target.meet && mine.some(l => offer.myIds.includes(l.id) && l.meet)) methods.push('meet');
  if (target.ship) methods.push('ship');
  if (!methods.length && target.meet) methods.push('meet');
  if (!offer.methodPicked || !methods.includes(offer.method)) offer.method = methods[0];
  if (!mine.length) return {
    html: `<section class="pad"><button class="back" onclick="history.back()">‹ Back</button><h1>Make an offer</h1>
      <div class="empty"><p>You need an item of your own to offer. It only takes a minute.</p><button class="btn gold xl" data-go="#/list">List an item</button></div></section>`,
  };
  return {
    html: `
      <section class="pad form">
        <button class="back" onclick="history.back()">‹ Back</button>
        <h1>Make an offer</h1>
        <div class="target">${photo(target, 'sm')}<div><b>${esc(target.title)}</b><br><small>${esc(owner.name)} · ${roughDistance(milesTo(target))}</small></div></div>
        ${owner.caution ? `<div class="warn">⚠️ <b>Use Caution:</b> this member has several bad ratings. Inspect carefully before trading.</div>` : ''}
        <div class="q"><h3><span class="qn">1</span>What are you offering?</h3>
          <p class="fine">Pick more than one to bundle them. Bundled items all go in one photo.</p>
          <div class="pick-items">${mine.map(l => `
            <button class="pick-item ${offer.myIds.includes(l.id) ? 'on' : ''}" data-act="item" data-id="${l.id}">
              ${photo(l, 'xs')}<span>${esc(l.title)}</span><b>${offer.myIds.includes(l.id) ? '✓' : ''}</b></button>`).join('')}</div>
        </div>
        <div class="q"><h3><span class="qn">2</span>Add cash to even it out?</h3>
          ${target.cash ? '' : '<p class="fine">This member prefers no cash, but you can still ask.</p>'}
          <div class="seg">
            <button class="${offer.payer === 'none' ? 'on' : ''}" data-act="payer" data-v="none">No cash</button>
            <button class="${offer.payer === 'me' ? 'on' : ''}" data-act="payer" data-v="me">I add cash</button>
            <button class="${offer.payer === 'them' ? 'on' : ''}" data-act="payer" data-v="them">They add cash</button>
          </div>
          ${offer.payer !== 'none' ? `
            <div class="stepper"><button data-act="cash" data-v="-10">−</button><b>$${offer.cash}</b><button data-act="cash" data-v="10">+</button></div>
            <div class="chips">${[10, 25, 50, 100, 250].map(v => `<button class="chip" data-act="cashset" data-v="${v}">$${v}</button>`).join('')}</div>
            ${offer.cash > 500 ? '<div class="warn">That is a lot of cash. Double-check the trade is fair.</div>' : ''}` : ''}
        </div>
        <div class="q"><h3><span class="qn">3</span>How will you trade?</h3>
          <div class="seg">${methods.map(m => `<button class="${offer.method === m ? 'on' : ''}" data-act="method" data-v="${m}">${m === 'meet' ? '🤝 Meet up' : '📦 Ship'}</button>`).join('')}</div>
          ${offer.method === 'ship' && cat(target.category).restricted && placeOf(target).state !== myPlace().state ? restrictedWarn(target) : ''}
        </div>
        <div class="q"><h3><span class="qn">4</span>Offer photo: you + your items</h3>
          ${offer.photo ? `<img class="ph big" src="${offer.photo}" alt="Your offer photo"><button class="btn ghost" data-act="photo">Retake</button>`
          : `<div class="prompt-box">🙋 <b>You must be in the photo</b> with every item you're offering. This proves it's real. No pictures from Google or AI.</div>
             <button class="btn purple xl cam-btn" data-act="photo">📸 Take offer photo</button>`}
        </div>
        <div class="sticky-cta"><button class="btn gold xl" data-act="send">Send offer</button></div>
      </section>`,
    actions: {
      item: el => { const i = el.dataset.id; offer.myIds = offer.myIds.includes(i) ? offer.myIds.filter(x => x !== i) : [...offer.myIds, i]; rerender(); },
      payer: el => { offer.payer = el.dataset.v; if (offer.payer !== 'none' && !offer.cash) offer.cash = 20; rerender(); },
      cash: el => { offer.cash = Math.max(0, offer.cash + Number(el.dataset.v)); rerender(); },
      cashset: el => { offer.cash = Number(el.dataset.v); rerender(); },
      method: el => { offer.method = el.dataset.v; offer.methodPicked = true; rerender(); },
      photo: async () => { const p = await takeLivePhoto('offer'); if (p) { offer.photo = p.dataUrl; offer.photoTime = p.time; rerender(); } },
      send: () => {
        if (!offer.myIds.length) return toast('Pick at least one item to offer.');
        if (!offer.photo) return toast('Take your offer photo first (you + your items).');
        const d = {
          id: S.uid(), kind: 'outgoing', otherId: target.ownerId, theirIds: [target.id], myIds: offer.myIds,
          cash: { amount: offer.payer === 'none' ? 0 : offer.cash, payer: offer.payer === 'none' ? null : offer.payer },
          method: offer.method, photo: offer.photo, photoTime: offer.photoTime, step: 0, created: Date.now(),
          autoAt: Date.now() + 4000, autoAction: 'counter',
          history: [{ who: 'You', text: 'Sent the offer.', time: Date.now() }],
        };
        S.update(s => s.deals.unshift(d));
        offer = null;
        toast('Offer sent!');
        go('#/deal/' + d.id);
      },
    },
  };
};

// ----- Deals -----
function progress(step, cancelled) {
  return `<ol class="progress ${cancelled ? 'cancelled' : ''}">${STEPS.map((s, i) =>
    `<li class="${i <= step ? 'done' : ''} ${i === step + 1 ? 'next' : ''}"><span>${i <= step ? '✓' : i + 1}</span><em>${s}</em></li>`).join('')}</ol>`;
}

function cashLine(c) {
  if (!c || !c.amount) return '';
  return c.payer === 'me' ? `+ you add $${c.amount}` : `+ they add $${c.amount}`;
}

routes.deals = () => {
  const ds = st().deals;
  return {
    html: `
      <section class="pad">
        <h1>Your deals</h1>
        ${ds.length ? ds.map(d => {
          const other = memberInfo(d.otherId), t = listingById(d.theirIds[0]);
          return `
            <button class="deal-card" data-go="#/deal/${d.id}">
              <div class="row"><b>${esc(t?.title || 'Item')}</b>${needsMe(d) ? '<span class="pill">Your turn</span>' : ''}</div>
              <small>${d.kind === 'incoming' ? 'Offer from' : 'Offer to'} ${esc(other.name)} · ${d.cancelled ? 'Cancelled' : STEPS[d.step]}</small>
              ${progress(d.step, d.cancelled)}
            </button>`;
        }).join('') : `<div class="empty"><p>🤝 No deals yet. Find something you like and tap <b>Make an offer</b>.</p><button class="btn purple" data-go="#/browse">Browse items</button></div>`}
      </section>`,
  };
};

let reviewStars = 0;
routes.deal = id => {
  const d = st().deals.find(x => x.id === id);
  if (!d) return routes.deals();
  const other = memberInfo(d.otherId);
  const theirs = d.theirIds.map(listingById).filter(Boolean);
  const mine = d.myIds.map(listingById).filter(Boolean);
  const itemsRow = arr => arr.map(l => `<div class="mini">${photo(l, 'xs')}<span>${esc(l.title)}</span></div>`).join('');
  const giveCash = d.cash.amount && d.cash.payer === 'me' ? `<div class="mini cash">💵 $${d.cash.amount}</div>` : '';
  const getCash = d.cash.amount && d.cash.payer === 'them' ? `<div class="mini cash">💵 $${d.cash.amount}</div>` : '';
  const waiting = d.autoAt ? `<div class="waiting"><span class="spin"></span> Waiting for ${esc(other.name)} to reply…</div>` : '';

  let act = '';
  if (d.cancelled) act = `<p class="note">This deal was cancelled.</p>`;
  else if (d.step === 0 && d.kind === 'incoming') act = `
      <button class="btn gold xl" data-act="acceptIncoming">✓ Accept as is</button>
      <div class="q"><h3>Or counter: ask them to add cash</h3>
        <div class="stepper"><button data-act="ccash" data-v="-10">−</button><b>$${d.counterAsk || 20}</b><button data-act="ccash" data-v="10">+</button></div>
        <button class="btn purple" data-act="counterIncoming">Send counter</button></div>
      <button class="btn ghost" data-act="cancel">Decline</button>`;
  else if (d.step === 1 && !d.autoAt) act = `
      <div class="counter-box"><b>${esc(other.name)}'s counter:</b> ${d.counter && d.counter.amount ? `you add $${d.counter.amount} cash` : 'no changes, ready to go'}</div>
      <p class="tax">${TAX_LINE}</p>
      <button class="btn gold xl" data-act="lock">🔒 Lock It In</button>
      <button class="btn ghost" data-act="cancel">Cancel deal</button>`;
  else if (d.step === 2) act = `
      <p class="tax">${TAX_LINE}</p>
      <div class="tips">${d.method === 'meet'
        ? '🤝 <b>Meet safely:</b> pick a busy public place in daylight, like a police station parking lot. Look everything over before you hand anything across.'
        : '📦 <b>Shipping is up to you two.</b> Agree who ships first and trade tracking numbers. Inspect when it arrives.'}</div>
      <button class="btn gold xl" data-act="met">✓ ${d.method === 'meet' ? 'We met and I inspected it' : 'It arrived and I inspected it'}</button>
      <button class="btn ghost" data-act="cancel">Cancel deal</button>`;
  else if (d.step === 3) act = `
      <button class="btn gold xl" data-act="done">👑 Everything checks out: Deal Done</button>
      <button class="btn ghost" data-act="cancel">Something's wrong: cancel</button>`;
  else if (d.step === 4 && !d.reviewed) act = `
      <div class="q review"><h3>Rate ${esc(other.name)}</h3>
        <div class="star-pick">${[1, 2, 3, 4, 5].map(n => `<button data-act="star" data-v="${n}" class="${n <= reviewStars ? 'on' : ''}" aria-label="${n} stars">★</button>`).join('')}</div>
        <textarea id="rev" maxlength="140" rows="2" placeholder="Short review (optional)"></textarea>
        <button class="btn gold xl" data-act="review">Post review</button></div>`;
  else if (d.step === 4) act = `<p class="note">🎉 Deal Done. Thanks for your review!</p>`;

  return {
    html: `
      <section class="pad">
        <button class="back" data-go="#/deals">‹ All deals</button>
        <h1>Deal with ${esc(other.name)} ${cautionBadge(other)}</h1>
        ${progress(d.step, d.cancelled)}
        ${waiting}
        <div class="sides">
          <div><h4>You give</h4>${itemsRow(mine)}${giveCash}</div>
          <div class="swap">⇄</div>
          <div><h4>You get</h4>${itemsRow(theirs)}${getCash}</div>
        </div>
        <p class="sub">${d.method === 'meet' ? '🤝 Local meetup' : '📦 Shipping'}${theirs[0] ? ' · ' + roughDistance(milesTo(theirs[0])) : ''}</p>
        <div class="q"><h3>Offer photo</h3>
          ${d.photo ? `<img class="ph big" src="${d.photo}" alt="Offer photo">`
            : `<div class="ph sample big"><span class="emo">🙋${d.sampleEmoji || '📦'}</span><span class="tag">Sample offer photo · ${esc(stampText(d.created))}</span></div>`}
        </div>
        <div class="actions">${act}</div>
        <div class="q"><h3>History</h3><ul class="hist">${d.history.map(h => `<li><b>${esc(h.who)}:</b> ${esc(h.text)} <small>${ago(h.time)}</small></li>`).join('')}</ul></div>
      </section>`,
    actions: {
      acceptIncoming: () => { upd(d, x => { x.step = 2; x.history.push(h('You', 'Accepted. Deal locked in.')); }); },
      ccash: el => { upd(d, x => { x.counterAsk = Math.max(10, (x.counterAsk || 20) + Number(el.dataset.v)); }); },
      counterIncoming: () => {
        upd(d, x => {
          const amt = x.counterAsk || 20;
          x.step = 1; x.counter = { amount: amt, payer: 'them' };
          x.history.push(h('You', `Countered: asked them to add $${amt}.`));
          x.autoAt = Date.now() + 3500; x.autoAction = 'acceptCounter';
        });
      },
      lock: () => { upd(d, x => { if (x.counter) x.cash = { ...x.counter }; x.step = 2; x.history.push(h('You', 'Locked it in.')); }); },
      met: () => { upd(d, x => { x.step = 3; x.history.push(h('You', x.method === 'meet' ? 'Met up and inspected.' : 'Received and inspected.')); }); },
      done: () => {
        upd(d, x => { x.step = 4; x.history.push(h('You', 'Marked Deal Done.')); });
        S.update(s => { s.tradedIds = [...(s.tradedIds || []), ...d.myIds, ...d.theirIds]; });
        reviewStars = 0; toast('👑 Deal Done!'); rerender();
      },
      cancel: () => { if (confirm('Cancel this deal?')) upd(d, x => { x.cancelled = true; x.history.push(h('You', 'Cancelled the deal.')); }); },
      star: el => { reviewStars = Number(el.dataset.v); rerender(); },
      review: () => {
        if (!reviewStars) return toast('Tap the stars to rate first.');
        const text = document.getElementById('rev').value.trim();
        S.update(s => { (s.extraRatings[d.otherId] ||= []).push({ by: s.user.name, stars: reviewStars, text }); });
        upd(d, x => { x.reviewed = true; x.history.push(h('You', `Left a ${reviewStars}-star review.`)); });
        reviewStars = 0;
      },
    },
  };
};

const h = (who, text) => ({ who, text, time: Date.now() });
function upd(d, fn) { S.update(s => fn(s.deals.find(x => x.id === d.id))); rerender(); }

// Pretend replies from sample members, so the test drive feels real.
setInterval(() => {
  let changed = false;
  S.update(s => s.deals.forEach(d => {
    if (!d.autoAt || Date.now() < d.autoAt || d.cancelled) return;
    const other = memberById(d.otherId).name;
    if (d.autoAction === 'counter') {
      d.step = 1;
      if (!d.cash.amount) { d.counter = { amount: 20, payer: 'me' }; d.history.push(h(other, 'Close! Can you add $20 cash?')); }
      else { d.counter = { ...d.cash }; d.history.push(h(other, 'Looks fair to me. Ready to lock it in.')); }
    } else if (d.autoAction === 'acceptCounter') {
      d.step = 2; d.cash = { ...d.counter };
      d.history.push(h(other, 'Deal. Locking it in.'));
    }
    delete d.autoAt; delete d.autoAction;
    changed = true;
    setTimeout(() => toast(`💬 ${other} replied to your deal`), 0);
  }));
  if (changed) {
    const tag = document.activeElement?.tagName;
    if (tag !== 'TEXTAREA' && tag !== 'INPUT') rerender();
  }
}, 1000);

// ----- Profile -----
routes.profile = id => {
  const isMe = !id || id === 'me';
  const info = memberInfo(isMe ? me().id : id);
  const items = allListings().filter(l => l.ownerId === info.id);
  return {
    html: `
      <section class="pad">
        ${isMe ? '' : '<button class="back" onclick="history.back()">‹ Back</button>'}
        <div class="prof">
          <span class="av xl">${esc(info.name[0])}</span>
          <h1>${esc(info.name)}${isMe ? ' (you)' : ''}</h1>
          <p class="sub">📍 ${esc(info.city)} area</p>
          ${info.count ? `<p>${stars(info.avg)} <b>${info.avg.toFixed(1)}</b> · ${info.count} reviews</p>` : '<p class="sub">No reviews yet</p>'}
          ${info.caution ? '<div class="warn">⚠️ <b>Use Caution:</b> this member has 3 or more bad ratings (2 stars or less). Trade carefully.</div>' : ''}
        </div>
        <h2>${isMe ? 'My items' : 'Their items'}</h2>
        ${items.length ? `<div class="grid">${items.map(card).join('')}</div>` : `<p class="sub">No items listed.</p>${isMe ? '<button class="btn gold" data-go="#/list">List an item</button>' : ''}`}
        ${info.count ? `<h2>Reviews</h2><ul class="reviews">${info.ratings.slice().reverse().map(r => `<li>${stars(r.stars)} <b>${esc(r.by)}</b><p>${esc(r.text) || '<i>No comment</i>'}</p></li>`).join('')}</ul>` : ''}
        ${isMe ? `<button class="btn ghost" data-go="#/settings">⚙️ Area and settings</button>` : ''}
      </section>`,
  };
};

// ----- Settings: area and distance -----
routes.settings = () => {
  const s = st().settings;
  const modes = [['radius', '📏 Miles'], ['county', '🗺️ County'], ['zip', '#️⃣ Zip code'], ['city', '🏙️ City'], ['state', '⛰️ Whole state'], ['anywhere', '📦 Ship anywhere']];
  const opt = (arr, v) => arr.map(x => `<option ${x === v ? 'selected' : ''}>${esc(x)}</option>`).join('');
  let control = '';
  if (s.mode === 'radius') control = `<label class="slider"><b id="rv">${s.radius} miles</b><input type="range" id="radius" min="5" max="200" step="5" value="${s.radius}"></label>`;
  if (s.mode === 'county') control = `<select id="county">${opt(COUNTIES, s.county)}</select>`;
  if (s.mode === 'zip') control = `<input id="zip" inputmode="numeric" maxlength="5" value="${esc(s.zip)}" placeholder="Zip code">`;
  if (s.mode === 'city') control = `<select id="city">${opt(PLACES.map(p => p.city), s.city)}</select>`;
  if (s.mode === 'state') control = `<select id="state">${opt(STATES, s.state)}</select>`;
  if (s.mode === 'anywhere') control = `<p class="fine">You'll see every item that ships, plus anything within about 40 miles.</p>`;
  return {
    html: `
      <section class="pad form">
        <h1>Area and settings</h1>
        <div class="q"><h3>My home area</h3>
          <select id="home">${opt(PLACES.map(p => p.city), s.homeCity)}</select>
          <p class="fine">Used only for rough distance, like "about 8 miles". Nobody sees your address.</p></div>
        <div class="q"><h3>Show me trades by</h3>
          <div class="chips">${modes.map(([v, l]) => `<button class="chip lg ${s.mode === v ? 'on' : ''}" data-act="mode" data-v="${v}">${l}</button>`).join('')}</div>
          ${control}</div>
        <p class="sub">Right now: <b>${esc(areaLabel())}</b> · ${allListings().filter(l => l.ownerId !== me().id && isVisible(l)).length} items</p>
        <button class="btn gold xl" data-go="#/browse">Show me trades</button>
        <hr>
        <button class="btn ghost" data-act="signout">Sign out</button>
        <button class="btn ghost danger" data-act="reset">Start over (clear all test data)</button>
        <p class="fine">Barter Kings test version. No real payments, no real shipping. Sample members and items are made up.</p>
      </section>`,
    mount: () => {
      const set = (k, v) => { S.update(x => { x.settings[k] = v; }); };
      const on = (id, ev, fn) => { const el = document.getElementById(id); if (el) el.addEventListener(ev, fn); };
      on('home', 'change', e => { set('homeCity', e.target.value); rerender(); });
      on('radius', 'input', e => { document.getElementById('rv').textContent = e.target.value + ' miles'; });
      on('radius', 'change', e => { set('radius', Number(e.target.value)); rerender(); });
      on('county', 'change', e => { set('county', e.target.value); rerender(); });
      on('zip', 'change', e => { set('zip', e.target.value.replace(/\D/g, '')); rerender(); });
      on('city', 'change', e => { set('city', e.target.value); rerender(); });
      on('state', 'change', e => { set('state', e.target.value); rerender(); });
    },
    actions: {
      mode: el => { S.update(x => { x.settings.mode = el.dataset.v; }); rerender(); },
      signout: () => { S.update(x => { x.user = null; }); go('#/signin'); render(); },
      reset: () => { if (confirm('Erase all your test items, deals and votes?')) { S.reset(); draft = blankDraft(); offer = null; go('#/'); render(); } },
    },
  };
};

render();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
}
