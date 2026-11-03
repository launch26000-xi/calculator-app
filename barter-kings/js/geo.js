// Rough distance helpers. We only ever use city centres, never addresses.
import { PLACES } from './data.js';

export function placeFor(city) {
  return PLACES.find(p => p.city === city) || PLACES[0];
}

export function milesBetween(a, b) {
  const R = 3958.8, rad = d => d * Math.PI / 180;
  const dLat = rad(b.lat - a.lat), dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

// "about 8 miles" style — never exact.
export function roughDistance(mi) {
  if (mi < 3) return 'nearby, under 3 miles';
  if (mi < 10) return `about ${Math.round(mi)} miles`;
  if (mi < 60) return `about ${Math.round(mi / 5) * 5} miles`;
  if (mi < 300) return `about ${Math.round(mi / 10) * 10} miles`;
  return 'far away, shipping only';
}

export const COUNTIES = [...new Set(PLACES.map(p => `${p.county}, ${p.state}`))];
export const STATES = [...new Set(PLACES.map(p => p.state))];
