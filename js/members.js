/* Colorado No2 — real member accounts and member data (Firebase sign-in + database).
   Firebase code only loads when it is needed, so the app stays fast and works offline.
   The database rules in firestore.rules decide what each member may read and change. */
import { firebaseConfig } from './firebase-config.js';
import { toGrid } from './content/places.js';

export const isConfigured = () => !!(firebaseConfig && firebaseConfig.apiKey && firebaseConfig.projectId);
export const FIREARM_CATS = ['handguns', 'long-guns', 'shotguns', 'hunting', 'collectors'];

let fb = null; let auth = null; let db = null; let ready = null;
let user = null;      // the Google sign-in (we never store its name or email)
let member = null;    // the No2 member profile
let admin = false;
const listeners = new Set();

export const state = () => ({ configured: isConfigured(), user, member, admin });
export function onChange(fn) { listeners.add(fn); return () => listeners.delete(fn); }
const emit = () => listeners.forEach((fn) => { try { fn(state()); } catch (e) { console.error(e); } });

export function start() {
  if (!isConfigured()) return Promise.resolve(state());
  if (ready) return ready.then(() => state());
  ready = (async () => {
    fb = await import('./vendor/firebase.js');
    const app = fb.initializeApp(firebaseConfig);
    auth = fb.initializeAuth(app, {
      persistence: [fb.indexedDBLocalPersistence, fb.browserLocalPersistence],
      popupRedirectResolver: fb.browserPopupRedirectResolver,
    });
    db = fb.initializeFirestore(app, {});
    // Local testing only: a "demo-" project on localhost talks to the Firebase emulators, never the real database.
    if (location.hostname === 'localhost' && firebaseConfig.projectId.startsWith('demo-')) {
      fb.connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true });
      fb.connectFirestoreEmulator(db, 'localhost', 8085);
      window.__no2TestSignIn = (sub) => fb.signInWithCredential(auth,
        fb.GoogleAuthProvider.credential(JSON.stringify({ sub, email: `${sub}@example.com`, email_verified: true })));
    }
    await fb.getRedirectResult(auth).catch(() => null);
    await new Promise((resolve) => {
      fb.onAuthStateChanged(auth, async (u) => {
        user = u || null; member = null; admin = false;
        if (user) {
          try { member = await getMember(user.uid); } catch (e) { console.error(e); }
          try { admin = (await fb.getDoc(fb.doc(db, 'admins', user.uid))).exists(); } catch { admin = false; }
        }
        emit(); resolve();
      });
    });
  })();
  return ready.then(() => state());   // always the current sign-in state, not the one from first start
}
const need = async () => { await start(); if (!user) throw new Error('Please sign in first.'); };
const needMember = async () => { await need(); if (!member) throw new Error('Please finish joining first.'); };
const snapList = (snap) => snap.docs.map((d) => ({ id: d.id, ...d.data() }));

/* ---------- Sign-in ---------- */
export async function signIn() {
  await start();
  const provider = new fb.GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  try {
    await fb.signInWithPopup(auth, provider);
  } catch (e) {
    // Some phones block pop-ups (for example an installed app on iPhone). Fall back to a full-page sign-in.
    if (['auth/popup-blocked', 'auth/operation-not-supported-in-this-environment', 'auth/cancelled-popup-request'].includes(e.code)) {
      await fb.signInWithRedirect(auth, provider);
    } else if (e.code !== 'auth/popup-closed-by-user') throw e;
  }
}
export async function signOutMember() { await start(); await fb.signOut(auth); }

/* ---------- Members ---------- */
export const NICK_RULE = /^[A-Za-z0-9_]{3,20}$/;
export async function getMember(uid) {
  const snap = await fb.getDoc(fb.doc(db, 'members', uid));
  return snap.exists() ? { uid, ...snap.data() } : null;
}
export async function memberByNick(nick) {
  await need();
  const n = await fb.getDoc(fb.doc(db, 'nicknames', nick.toLowerCase()));
  return n.exists() ? getMember(n.data().uid) : null;
}
export async function createMember({ nick }) {
  await need();
  if (!NICK_RULE.test(nick)) throw new Error('Use 3 to 20 letters, numbers or _ only.');
  const nickRef = fb.doc(db, 'nicknames', nick.toLowerCase());
  if ((await fb.getDoc(nickRef)).exists()) throw new Error('That nickname is taken. Try another one.');
  const batch = fb.writeBatch(db);
  batch.set(fb.doc(db, 'members', user.uid), { nick, verify: 'none', since: fb.serverTimestamp(), colorado: true, adult: true, rulesOk: true });
  batch.set(nickRef, { uid: user.uid });
  try { await batch.commit(); } catch (e) {
    if (e.code === 'permission-denied') throw new Error('That nickname was just taken, or something did not match. Try another nickname.');
    throw e;
  }
  member = await getMember(user.uid); emit(); return member;
}
/* Saves only a rough grid square (about 7 miles wide), never an exact spot. */
export async function setArea(lat, lon) {
  await needMember();
  const g = toGrid(lat, lon);
  await fb.updateDoc(fb.doc(db, 'members', user.uid), g);
  member = { ...member, ...g }; emit(); return g;
}
export async function setVerify(uid, verify) { await need(); await fb.updateDoc(fb.doc(db, 'members', uid), { verify }); }

/* ---------- Trading Post ---------- */
export async function listOpenListings() {
  await need();
  return snapList(await fb.getDocs(fb.query(fb.collection(db, 'listings'), fb.where('status', '==', 'open'), fb.limit(500))))
    .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
}
export async function listingsBy(uid) {
  await need();
  return snapList(await fb.getDocs(fb.query(fb.collection(db, 'listings'), fb.where('uid', '==', uid), fb.limit(100))));
}
export async function getListing(id) { await need(); const s = await fb.getDoc(fb.doc(db, 'listings', id)); return s.exists() ? { id, ...s.data() } : null; }
export async function createListing(f) {
  await needMember();
  if (member.gy == null) throw new Error('Set your area first.');
  const ref = await fb.addDoc(fb.collection(db, 'listings'), {
    uid: user.uid, nick: member.nick, cat: f.cat, title: f.title, desc: f.desc, price: f.price, deal: f.deal, cond: f.cond,
    gy: member.gy, gx: member.gx, status: 'open', createdAt: fb.serverTimestamp(),
  });
  return ref.id;
}
export async function setListingStatus(id, status) { await need(); await fb.updateDoc(fb.doc(db, 'listings', id), { status }); }

/* ---------- Deals ---------- */
export const dealId = (listingId, buyer) => `${listingId}_${buyer}`;
export async function startDeal(listing, text) {
  await needMember();
  const id = dealId(listing.id, user.uid);
  await fb.setDoc(fb.doc(db, 'deals', id), {
    listingId: listing.id, seller: listing.uid, buyer: user.uid, parties: [user.uid, listing.uid],
    firearm: FIREARM_CATS.includes(listing.cat), title: listing.title, offers: [{ by: user.uid, text }],
    agreed: null, lockB: false, lockS: false, locked: null, lockedAt: null, shopB: false, shopS: false,
    metB: false, metS: false, doneB: false, doneS: false, createdAt: fb.serverTimestamp(), updatedAt: fb.serverTimestamp(),
  });
  return id;
}
export async function getDeal(id) { await need(); const s = await fb.getDoc(fb.doc(db, 'deals', id)); return s.exists() ? { id, ...s.data() } : null; }
export function watchDeal(id, cb) {
  return fb.onSnapshot(fb.doc(db, 'deals', id), (s) => cb(s.exists() ? { id, ...s.data() } : null), (e) => { console.error(e); cb(null, e); });
}
export async function myDeals() {
  await need();
  return snapList(await fb.getDocs(fb.query(fb.collection(db, 'deals'), fb.where('parties', 'array-contains', user.uid), fb.limit(100))))
    .sort((a, b) => (b.updatedAt?.seconds || 0) - (a.updatedAt?.seconds || 0));
}
/* One step of a deal. The database rules check every step. */
export async function dealStep(dIn, action, text) {
  await need();
  const me = user.uid;
  for (let attempt = 0; attempt < 3; attempt++) {
    // Always work from the latest copy, so two members tapping at once can't trip over each other.
    const d = await getDeal(dIn.id);
    const buyer = d.buyer === me; const f = (b, s) => (buyer ? b : s);
    const ch = { updatedAt: fb.serverTimestamp() };
    if (action === 'counter') ch.offers = [...d.offers, { by: me, text }];
    if (action === 'accept') ch.agreed = d.offers[d.offers.length - 1].text;
    if (action === 'lock') {
      ch[f('lockB', 'lockS')] = true;
      if (d[f('lockS', 'lockB')]) { ch.locked = { item: d.title, price: d.agreed }; ch.lockedAt = fb.serverTimestamp(); }
    }
    if (action === 'shop') ch[f('shopB', 'shopS')] = true;
    if (action === 'met') ch[f('metB', 'metS')] = true;
    if (action === 'done') ch[f('doneB', 'doneS')] = true;
    try { await fb.updateDoc(fb.doc(db, 'deals', d.id), ch); return; } catch (e) {
      if (e.code !== 'permission-denied' || attempt === 2) throw new Error('That step did not go through. The deal may have changed. Please try again.');
      await new Promise((r) => setTimeout(r, 400 + Math.random() * 600));
    }
  }
}
/* When both have confirmed Deal Done, the seller's app closes the listing. */
export async function closeSoldListing(d) {
  if (!user || d.seller !== user.uid || !(d.doneB && d.doneS)) return;
  try { const l = await getListing(d.listingId); if (l && l.status === 'open') await setListingStatus(d.listingId, 'closed'); } catch { /* listing may be gone */ }
}
export async function refreshMember() {
  await start(); if (!user) return null;
  try { member = await getMember(user.uid); } catch { /* keep old copy */ }
  return member;
}
export async function refreshAdmin() {
  await start(); if (!user) return false;
  try { admin = (await fb.getDoc(fb.doc(db, 'admins', user.uid))).exists(); } catch { admin = false; }
  return admin;
}
export async function rate(d, stars, review) {
  await need();
  const to = d.buyer === user.uid ? d.seller : d.buyer;
  await fb.setDoc(fb.doc(db, 'ratings', `${d.id}_${user.uid}`), { dealId: d.id, from: user.uid, to, stars, review, createdAt: fb.serverTimestamp() });
}
export async function myRatingFor(dId) { await need(); const s = await fb.getDoc(fb.doc(db, 'ratings', `${dId}_${user.uid}`)); return s.exists() ? s.data() : null; }
export async function ratingsFor(uid) {
  await need();
  return snapList(await fb.getDocs(fb.query(fb.collection(db, 'ratings'), fb.where('to', '==', uid), fb.limit(200))))
    .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
}

/* ---------- Private messages ---------- */
export const convoId = (a, b) => [a, b].sort().join('_');
export async function openConvo(otherUid) {
  await needMember();
  const parties = [user.uid, otherUid].sort(); const id = parties.join('_');
  const ref = fb.doc(db, 'convos', id);
  const s = await fb.getDoc(ref).catch(() => null);
  if (!s || !s.exists()) {
    const other = await getMember(otherUid);
    if (!other) throw new Error('That member was not found.');
    await fb.setDoc(ref, { parties, nicks: { [user.uid]: member.nick, [otherUid]: other.nick }, updatedAt: fb.serverTimestamp(), last: '' });
  }
  return id;
}
export async function myConvos() {
  await need();
  return snapList(await fb.getDocs(fb.query(fb.collection(db, 'convos'), fb.where('parties', 'array-contains', user.uid), fb.limit(100))))
    .sort((a, b) => (b.updatedAt?.seconds || 0) - (a.updatedAt?.seconds || 0));
}
export async function getConvo(id) { await need(); const s = await fb.getDoc(fb.doc(db, 'convos', id)); return s.exists() ? { id, ...s.data() } : null; }
export function watchMessages(id, cb) {
  return fb.onSnapshot(fb.query(fb.collection(db, 'convos', id, 'messages'), fb.orderBy('createdAt', 'asc'), fb.limit(300)),
    (s) => cb(snapList(s)), (e) => { console.error(e); cb([], e); });
}
export async function sendMessage(id, text) {
  await needMember();
  await fb.addDoc(fb.collection(db, 'convos', id, 'messages'), { from: user.uid, text, createdAt: fb.serverTimestamp() });
  await fb.updateDoc(fb.doc(db, 'convos', id), { updatedAt: fb.serverTimestamp(), last: text.slice(0, 120) });
}

/* ---------- Contest ---------- */
export const monthKey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
export async function submitEntry(text, credit) {
  await needMember();
  const month = monthKey();
  const claimRef = fb.doc(db, 'contestClaims', `${month}_${user.uid}`);
  if ((await fb.getDoc(claimRef).catch(() => null))?.exists()) throw new Error('You already sent an entry this month.');
  const entryRef = fb.doc(fb.collection(db, 'contestEntries'));
  const b = fb.writeBatch(db);
  b.set(entryRef, { month, text, credit, nick: credit === 'name' ? member.nick : null, votes: 0, createdAt: fb.serverTimestamp() });
  b.set(claimRef, { uid: user.uid, entryId: entryRef.id, month });
  await b.commit();
}
export async function contestStatus() {
  await need();
  const month = monthKey();
  const [entries, claim, vote] = await Promise.all([
    fb.getDocs(fb.query(fb.collection(db, 'contestEntries'), fb.where('month', '==', month), fb.limit(500))).then(snapList),
    fb.getDoc(fb.doc(db, 'contestClaims', `${month}_${user.uid}`)).then((s) => (s.exists() ? s.data() : null)).catch(() => null),
    fb.getDoc(fb.doc(db, 'contestVotes', `${month}_${user.uid}`)).then((s) => (s.exists() ? s.data() : null)).catch(() => null),
  ]);
  entries.sort((a, b) => (b.votes - a.votes) || ((a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0)));
  return { entries, myEntryId: claim?.entryId || null, myVote: vote?.entryId || null };
}
export async function vote(entryId) {
  await needMember();
  const month = monthKey();
  const b = fb.writeBatch(db);
  b.update(fb.doc(db, 'contestEntries', entryId), { votes: fb.increment(1) });
  b.set(fb.doc(db, 'contestVotes', `${month}_${user.uid}`), { uid: user.uid, entryId, month });
  await b.commit();
}

/* ---------- Sponsors, events, ranges ---------- */
export async function sendSponsorRequest(f) {
  await start();
  await fb.addDoc(fb.collection(db, 'sponsorInquiries'), { ...f, createdAt: fb.serverTimestamp() });
}
export async function sponsorRequests() {
  await need();
  return snapList(await fb.getDocs(fb.query(fb.collection(db, 'sponsorInquiries'), fb.limit(200))))
    .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
}
export async function listPublic(coll) {
  await start();
  return snapList(await fb.getDocs(fb.query(fb.collection(db, coll), fb.limit(200))));
}
export async function addPublic(coll, data) { await need(); await fb.addDoc(fb.collection(db, coll), { ...data, addedAt: fb.serverTimestamp() }); }
