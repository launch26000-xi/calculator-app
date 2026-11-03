// Barter Kings — test-drive storage. Everything is saved on this device only (localStorage).
// Later: swap these functions for a real hosted database (for example Firebase Firestore).
import { SUGGESTIONS } from './data.js';

const KEY = 'barterkings.v1';

const fresh = () => ({
  user: null,                 // { id, name, email }
  seenWelcome: false,
  seenIdeas: false,           // must visit the Suggestion Box before listing
  myListings: [],
  deals: [],
  suggestions: SUGGESTIONS.map(s => ({ ...s })),
  myVotes: {},                // suggestionId -> true
  extraRatings: {},           // memberId -> [{by, stars, text}]
  settings: { homeCity: 'Castle Rock', mode: 'radius', radius: 25, county: 'Douglas County, CO', zip: '80104', city: 'Castle Rock', state: 'CO' },
  incomingSent: false,
});

let state;
try { state = { ...fresh(), ...JSON.parse(localStorage.getItem(KEY) || '{}') }; }
catch { state = fresh(); }

export function get() { return state; }

export function save() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); return true; }
  catch (e) {
    alert('Your phone is out of room for test photos. Go to the gear button, then "Start over" to clear test data.');
    return false;
  }
}

export function update(fn) { fn(state); save(); }

export function reset() {
  try { localStorage.removeItem(KEY); } catch {}
  state = fresh();
}

export const uid = () => Math.random().toString(36).slice(2, 10);
