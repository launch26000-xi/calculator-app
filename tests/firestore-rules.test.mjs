import { initializeTestEnvironment, assertSucceeds, assertFails } from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, updateDoc, writeBatch, serverTimestamp, collection, getDocs, query, where, addDoc, increment } from 'firebase/firestore';
import fs from 'node:fs';
const env = await initializeTestEnvironment({ projectId: 'demo-no2', firestore: { rules: fs.readFileSync(process.argv[2], 'utf8'), host: 'localhost', port: 8085 } });
let pass = 0, fail = 0;
const t = async (name, fn) => { try { await fn(); pass++; console.log('PASS', name); } catch (e) { fail++; console.log('FAIL', name, '-', e.message.split('\n')[0]); } };
const db = (u) => env.authenticatedContext(u).firestore();
const anon = env.unauthenticatedContext().firestore();
const A = db('alice'), B = db('bob'), C = db('carl'), ADM = db('boss');
await env.withSecurityRulesDisabled(async (c) => { await setDoc(doc(c.firestore(), 'admins', 'boss'), { at: 1 }); });
const join = (d, uid, nick, extra = {}) => { const b = writeBatch(d);
  b.set(doc(d, 'members', uid), { nick, verify: 'none', since: serverTimestamp(), colorado: true, adult: true, rulesOk: true, ...extra });
  b.set(doc(d, 'nicknames', nick.toLowerCase()), { uid }); return b.commit(); };

// --- members
await t('alice joins', () => assertSucceeds(join(A, 'alice', 'AliceCO')));
await t('bob joins', () => assertSucceeds(join(B, 'bob', 'BobCO')));
await t('carl joins', () => assertSucceeds(join(C, 'carl', 'CarlCO')));
await t('nickname taken (case)', () => assertFails(join(db('dan'), 'dan', 'aliceco')));
await t('cannot self-verify at join', () => assertFails(join(db('dan'), 'dan', 'DanCO', { verify: 'photoid' })));
await t('alice sets area in Colorado', () => assertSucceeds(updateDoc(doc(A, 'members', 'alice'), { gy: 397, gx: -1050 })));
await t('bob sets area in Colorado', () => assertSucceeds(updateDoc(doc(B, 'members', 'bob'), { gy: 388, gx: -1049 })));
await t('area outside Colorado refused', () => assertFails(updateDoc(doc(C, 'members', 'carl'), { gy: 450, gx: -1050 })));
await t('area must be whole numbers (rough only)', () => assertFails(updateDoc(doc(C, 'members', 'carl'), { gy: 397.123, gx: -1050 })));
await t('member cannot set own verify', () => assertFails(updateDoc(doc(A, 'members', 'alice'), { verify: 'photoid' })));
await t('admin sets verify', () => assertSucceeds(updateDoc(doc(ADM, 'members', 'bob'), { verify: 'phone' })));
await t('admin cannot set junk verify', () => assertFails(updateDoc(doc(ADM, 'members', 'bob'), { verify: 'super' })));
await t('visitors cannot read members', () => assertFails(getDoc(doc(anon, 'members', 'alice'))));

// --- listings
const listing = (uid, nick, extra = {}) => ({ uid, nick, cat: 'shotguns', title: 'Remington 870 12 ga', desc: 'Good shape', price: 300, deal: 'Sell', cond: 'Good', gy: 397, gx: -1050, status: 'open', createdAt: serverTimestamp(), ...extra });
await t('alice posts a listing', () => assertSucceeds(setDoc(doc(A, 'listings', 'L1'), listing('alice', 'AliceCO'))));
await t('alice posts a knife listing', () => assertSucceeds(setDoc(doc(A, 'listings', 'L2'), listing('alice', 'AliceCO', { cat: 'knives', title: 'Buck 119' }))));
await t('listing must use her own area (no exact spot)', () => assertFails(setDoc(doc(A, 'listings', 'L3'), listing('alice', 'AliceCO', { gy: 380 }))));
await t('carl (no area) cannot post', () => assertFails(setDoc(doc(C, 'listings', 'L4'), listing('carl', 'CarlCO'))));
await t('cannot post as someone else', () => assertFails(setDoc(doc(B, 'listings', 'L5'), listing('alice', 'AliceCO'))));
await t('no address field allowed', () => assertFails(setDoc(doc(A, 'listings', 'L6'), listing('alice', 'AliceCO', { address: '1 Main' }))));
await t('bad category refused', () => assertFails(setDoc(doc(A, 'listings', 'L7'), listing('alice', 'AliceCO', { cat: 'tanks' }))));
await t('bob cannot edit alice listing', () => assertFails(updateDoc(doc(B, 'listings', 'L1'), { price: 1 })));
await t('alice edits price', () => assertSucceeds(updateDoc(doc(A, 'listings', 'L1'), { price: 320 })));
await t('visitors cannot read listings', () => assertFails(getDoc(doc(anon, 'listings', 'L1'))));

// --- deal on a gun (needs gun shop step)
const D = 'L1_bob';
const deal = (extra = {}) => ({ listingId: 'L1', seller: 'alice', buyer: 'bob', parties: ['bob', 'alice'], firearm: true, title: 'Remington 870 12 ga',
  offers: [{ by: 'bob', text: '$280' }], agreed: null, lockB: false, lockS: false, locked: null, lockedAt: null, shopB: false, shopS: false,
  metB: false, metS: false, doneB: false, doneS: false, createdAt: serverTimestamp(), updatedAt: serverTimestamp(), ...extra });
const up = (d, data) => updateDoc(doc(d, 'deals', D), { ...data, updatedAt: serverTimestamp() });
await t('seller cannot make offer on own item', () => assertFails(setDoc(doc(A, 'deals', 'L1_alice'), deal({ buyer: 'alice', parties: ['alice', 'alice'], offers: [{ by: 'alice', text: '$1' }] }))));
await t('must mark gun deals as firearm', () => assertFails(setDoc(doc(B, 'deals', D), deal({ firearm: false }))));
await t('bob makes an offer', () => assertSucceeds(setDoc(doc(B, 'deals', D), deal())));
await t('carl cannot read their deal', () => assertFails(getDoc(doc(C, 'deals', D))));
await t('bob cannot offer twice in a row', () => assertFails(up(B, { offers: [{ by: 'bob', text: '$280' }, { by: 'bob', text: '$290' }] })));
await t('bob cannot accept his own offer', () => assertFails(up(B, { agreed: '$280' })));
await t('alice counters', () => assertSucceeds(up(A, { offers: [{ by: 'bob', text: '$280' }, { by: 'alice', text: '$300' }] })));
await t('bob cannot lock before agreeing', () => assertFails(up(B, { lockB: true })));
await t('bob cannot accept a made-up price', () => assertFails(up(B, { agreed: '$100' })));
await t('bob accepts $300', () => assertSucceeds(up(B, { agreed: '$300' })));
await t('alice cannot change agreed price', () => assertFails(up(A, { agreed: '$500' })));
await t('bob cannot tap alice lock', () => assertFails(up(B, { lockS: true })));
await t('bob locks', () => assertSucceeds(up(B, { lockB: true })));
await t('alice cannot lock without freezing ticket', () => assertFails(up(A, { lockS: true })));
await t('alice cannot freeze a different price', () => assertFails(up(A, { lockS: true, locked: { item: 'Remington 870 12 ga', price: '$200' }, lockedAt: serverTimestamp() })));
await t('alice locks; ticket freezes', () => assertSucceeds(up(A, { lockS: true, locked: { item: 'Remington 870 12 ga', price: '$300' }, lockedAt: serverTimestamp() })));
await t('locked ticket cannot change', () => assertFails(up(A, { locked: { item: 'x', price: '$1' }, lockedAt: serverTimestamp() })));
await t('cannot unlock', () => assertFails(up(B, { lockB: false })));
await t('gun deal: cannot skip gun shop step', () => assertFails(up(B, { metB: true })));
await t('bob agrees to meet at gun shop', () => assertSucceeds(up(B, { shopB: true })));
await t('alice agrees to meet at gun shop', () => assertSucceeds(up(A, { shopS: true })));
await t('cannot finish before meeting', () => assertFails(up(B, { doneB: true })));
await t('both meet and inspect', async () => { await assertSucceeds(up(B, { metB: true })); await assertSucceeds(up(A, { metS: true })); });
await t('bob cannot rate before deal done', () => assertFails(setDoc(doc(B, 'ratings', D + '_bob'), { dealId: D, from: 'bob', to: 'alice', stars: 5, review: 'Great', createdAt: serverTimestamp() })));
await t('both confirm deal done', async () => { await assertSucceeds(up(B, { doneB: true })); await assertSucceeds(up(A, { doneS: true })); });
await t('bob rates alice', () => assertSucceeds(setDoc(doc(B, 'ratings', D + '_bob'), { dealId: D, from: 'bob', to: 'alice', stars: 5, review: 'On time, as described.', createdAt: serverTimestamp() })));
await t('bob cannot rate twice', () => assertFails(setDoc(doc(B, 'ratings', D + '_bob'), { dealId: D, from: 'bob', to: 'alice', stars: 1, review: '', createdAt: serverTimestamp() })));
await t('carl cannot rate a deal he was not in', () => assertFails(setDoc(doc(C, 'ratings', D + '_carl'), { dealId: D, from: 'carl', to: 'alice', stars: 1, review: '', createdAt: serverTimestamp() })));
await t('stars must be 1-5', () => assertFails(setDoc(doc(A, 'ratings', D + '_alice'), { dealId: D, from: 'alice', to: 'bob', stars: 6, review: '', createdAt: serverTimestamp() })));
await t('alice rates bob', () => assertSucceeds(setDoc(doc(A, 'ratings', D + '_alice'), { dealId: D, from: 'alice', to: 'bob', stars: 4, review: '', createdAt: serverTimestamp() })));

// --- knife deal: no gun shop step
await t('non-gun deal skips gun shop step', async () => {
  const K = 'L2_bob';
  await assertSucceeds(setDoc(doc(B, 'deals', K), deal({ listingId: 'L2', firearm: false, title: 'Buck 119', offers: [{ by: 'bob', text: '$60' }] })));
  const u = (d, data) => updateDoc(doc(d, 'deals', K), { ...data, updatedAt: serverTimestamp() });
  await assertSucceeds(u(A, { agreed: '$60' }));
  await assertSucceeds(u(A, { lockS: true }));
  await assertSucceeds(u(B, { lockB: true, locked: { item: 'Buck 119', price: '$60' }, lockedAt: serverTimestamp() }));
  await assertFails(u(B, { shopB: true }));
  await assertSucceeds(u(B, { metB: true }));
});

// --- messages
const cid = 'alice_bob';
await t('bob starts a private chat with alice', () => assertSucceeds(setDoc(doc(B, 'convos', cid), { parties: ['alice', 'bob'], nicks: { alice: 'AliceCO', bob: 'BobCO' }, updatedAt: serverTimestamp(), last: '' })));
await t('bob sends a message', () => assertSucceeds(addDoc(collection(B, 'convos', cid, 'messages'), { from: 'bob', text: 'Hi, is it still for sale?', createdAt: serverTimestamp() })));
await t('bob cannot send as alice', () => assertFails(addDoc(collection(B, 'convos', cid, 'messages'), { from: 'alice', text: 'fake', createdAt: serverTimestamp() })));
await t('carl cannot read their messages', () => assertFails(getDocs(collection(C, 'convos', cid, 'messages'))));
await t('carl cannot write into their chat', () => assertFails(addDoc(collection(C, 'convos', cid, 'messages'), { from: 'carl', text: 'hey', createdAt: serverTimestamp() })));
await t('alice reads her messages', () => assertSucceeds(getDocs(collection(A, 'convos', cid, 'messages'))));
await t('alice lists her chats', () => assertSucceeds(getDocs(query(collection(A, 'convos'), where('parties', 'array-contains', 'alice')))));
await t('fake nickname in chat refused', () => assertFails(setDoc(doc(C, 'convos', 'alice_carl'), { parties: ['alice', 'carl'], nicks: { alice: 'Boss', carl: 'CarlCO' }, updatedAt: serverTimestamp(), last: '' })));

// --- contest
const M = '2026-11';
const enter = (d, uid, entryId, credit, nick, text = 'Freedom is kept, not given.') => { const b = writeBatch(d);
  b.set(doc(d, 'contestEntries', entryId), { month: M, text, credit, nick, votes: 0, createdAt: serverTimestamp() });
  b.set(doc(d, 'contestClaims', `${M}_${uid}`), { uid, entryId, month: M }); return b.commit(); };
await t('alice enters with credit', () => assertSucceeds(enter(A, 'alice', 'E1', 'name', 'AliceCO')));
await t('alice cannot enter twice', () => assertFails(enter(A, 'alice', 'E2', 'name', 'AliceCO')));
await t('carl enters anonymously', () => assertSucceeds(enter(C, 'carl', 'E3', 'anonymous', null, 'A right unused is a right lost.')));
await t('anonymous entry cannot carry a name', () => assertFails(enter(B, 'bob', 'E4', 'anonymous', 'BobCO')));
await t('cannot claim someone else\'s nickname', () => assertFails(enter(B, 'bob', 'E4', 'name', 'AliceCO')));
await t('nobody can read who wrote an entry', () => assertFails(getDoc(doc(B, 'contestClaims', `${M}_carl`))));
const vote = (d, uid, entryId) => { const b = writeBatch(d);
  b.update(doc(d, 'contestEntries', entryId), { votes: increment(1) });
  b.set(doc(d, 'contestVotes', `${M}_${uid}`), { uid, entryId, month: M }); return b.commit(); };
await t('unverified alice cannot vote', () => assertFails(vote(A, 'alice', 'E3')));
await t('verified bob votes', () => assertSucceeds(vote(B, 'bob', 'E1')));
await t('bob cannot vote twice', () => assertFails(vote(B, 'bob', 'E3')));
await t('vote count cannot be faked', () => assertFails(updateDoc(doc(B, 'contestEntries', 'E3'), { votes: 99 })));
await env.withSecurityRulesDisabled(async (c) => { await updateDoc(doc(c.firestore(), 'members', 'carl'), { verify: 'picture' }); });
await t('carl cannot vote for his own entry', () => assertFails(vote(C, 'carl', 'E3')));
await t('carl votes for alice', () => assertSucceeds(vote(C, 'carl', 'E1')));
await t('entries ranked by votes are readable', async () => { const s = await assertSucceeds(getDocs(query(collection(B, 'contestEntries'), where('month', '==', M)))); if (s.docs.find((x) => x.id === 'E1').data().votes !== 2) throw new Error('count'); });

// --- sponsors, events
await t('visitor sends a sponsor request', () => assertSucceeds(addDoc(collection(anon, 'sponsorInquiries'), { name: 'Pat', business: 'Pat\'s Range', contact: 'pat@example.com', level: '150', message: 'Interested', createdAt: serverTimestamp() })));
await t('bad sponsor level refused', () => assertFails(addDoc(collection(anon, 'sponsorInquiries'), { name: 'Pat', business: '', contact: 'pat@x.com', level: '5', message: '', createdAt: serverTimestamp() })));
await t('members cannot read sponsor requests', () => assertFails(getDocs(collection(A, 'sponsorInquiries'))));
await t('admin reads sponsor requests', () => assertSucceeds(getDocs(collection(ADM, 'sponsorInquiries'))));
await t('members cannot add events', () => assertFails(addDoc(collection(A, 'events'), { title: 'x' })));
await t('admin adds an event', () => assertSucceeds(addDoc(collection(ADM, 'events'), { title: 'Hunter education class', date: '2026-12-05', where: 'Denver', url: 'https://cpw.state.co.us/' })));
await t('visitors can read events', () => assertSucceeds(getDocs(collection(anon, 'events'))));
await t('nobody can write anywhere else', () => assertFails(setDoc(doc(A, 'secret', 'x'), { a: 1 })));

console.log(`\n${pass} passed, ${fail} failed`);
await env.cleanup(); process.exit(fail ? 1 : 0);
