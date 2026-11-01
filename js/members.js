/* Colorado No2 — real member accounts (Firebase sign-in + database).
   Firebase code only loads when it is needed, so the app stays fast and works offline. */
import { firebaseConfig } from './firebase-config.js';

export const isConfigured = () => !!(firebaseConfig && firebaseConfig.apiKey && firebaseConfig.projectId);

let fb = null;       // Firebase functions
let auth = null;
let db = null;
let ready = null;
let user = null;     // signed-in Google account (we never store its name or email)
let member = null;   // the No2 member profile
const listeners = new Set();

export const state = () => ({ configured: isConfigured(), user, member, loading: !!ready && !auth });
export function onChange(fn) { listeners.add(fn); return () => listeners.delete(fn); }
const emit = () => listeners.forEach((fn) => { try { fn(state()); } catch (e) { console.error(e); } });

/* Start Firebase (once). Safe to call many times. */
export function start() {
  if (!isConfigured()) return Promise.resolve(state());
  if (ready) return ready;
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
      // Test-only sign-in for automated tests (the emulator accepts fake Google tokens).
      window.__no2TestSignIn = (sub) => fb.signInWithCredential(auth,
        fb.GoogleAuthProvider.credential(JSON.stringify({ sub, email: `${sub}@example.com`, email_verified: true })));
    }
    await fb.getRedirectResult(auth).catch(() => null);
    await new Promise((resolve) => {
      fb.onAuthStateChanged(auth, async (u) => {
        user = u || null;
        member = null;
        if (user) {
          try { member = await loadMember(user.uid); } catch (e) { console.error(e); }
        }
        emit(); resolve();
      });
    });
    return state();
  })();
  return ready;
}

async function loadMember(uid) {
  const snap = await fb.getDoc(fb.doc(db, 'members', uid));
  return snap.exists() ? { uid, ...snap.data() } : null;
}

/* "Continue with Google" */
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
    } else if (e.code !== 'auth/popup-closed-by-user') {
      throw e;
    }
  }
}

export async function signOutMember() { await start(); await fb.signOut(auth); }

export const NICK_RULE = /^[A-Za-z0-9_]{3,20}$/;

/* Create the member profile and claim the nickname together, so two members can't share one. */
export async function createMember({ nick }) {
  await start();
  if (!user) throw new Error('Please sign in first.');
  if (!NICK_RULE.test(nick)) throw new Error('Use 3 to 20 letters, numbers or _ only.');
  const nickRef = fb.doc(db, 'nicknames', nick.toLowerCase());
  const taken = await fb.getDoc(nickRef);
  if (taken.exists()) throw new Error('That nickname is taken. Try another one.');
  const batch = fb.writeBatch(db);
  batch.set(fb.doc(db, 'members', user.uid), {
    nick, verify: 'none', since: fb.serverTimestamp(), colorado: true, adult: true, rulesOk: true,
  });
  batch.set(nickRef, { uid: user.uid });
  try {
    await batch.commit();
  } catch (e) {
    if (e.code === 'permission-denied') throw new Error('That nickname was just taken, or something did not match. Try another nickname.');
    throw e;
  }
  member = await loadMember(user.uid);
  emit();
  return member;
}

/* Contest */
export const monthKey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

export async function submitEntry(text) {
  await start();
  if (!member) throw new Error('Please finish joining first.');
  const month = monthKey();
  const ref = fb.doc(db, 'contestEntries', `${month}_${user.uid}`);
  if ((await fb.getDoc(ref)).exists()) throw new Error('You already sent an entry this month.');
  await fb.setDoc(ref, { uid: user.uid, nick: member.nick, text, month, createdAt: fb.serverTimestamp() });
}

export async function listEntries() {
  await start();
  if (!user) return [];
  const q = fb.query(fb.collection(db, 'contestEntries'), fb.where('month', '==', monthKey()), fb.limit(200));
  const snap = await fb.getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
    .sort((a, b) => (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0));
}
