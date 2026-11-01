/* Colorado No2 — free OpenStreetMap (Leaflet, kept inside the app).
   Members only ever appear as fuzzy circles over a rough area, never an exact spot. */
import { CO_BOUNDS } from './content/places.js';

let L = null;
async function leaflet() {
  if (!L) {
    if (!document.querySelector('link[data-leaflet]')) {
      const link = document.createElement('link');
      link.rel = 'stylesheet'; link.href = 'css/leaflet.css'; link.dataset.leaflet = '1';
      document.head.appendChild(link);
    }
    L = await import('./vendor/leaflet.js');
  }
  return L;
}

const MI = 1609.34;
const CO_CENTER = [39.0, -105.55];

/* opts: { center: {lat, lon} | null, radiusMi: number | null, areas: [{lat, lon, count, html}], spots: [{lat, lon, html}] } */
export async function drawMap(el, opts) {
  const Lf = await leaflet();
  if (el._map) { el._map.remove(); el._map = null; }
  const map = Lf.map(el, { scrollWheelZoom: false, zoomSnap: 0.5, attributionControl: true });
  el._map = map;
  Lf.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 13, minZoom: 5,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors',
  }).addTo(map);
  // Colorado's border (it's a rectangle on the map)
  const co = Lf.rectangle([[CO_BOUNDS.south, CO_BOUNDS.west], [CO_BOUNDS.north, CO_BOUNDS.east]],
    { color: '#0B2545', weight: 2, fill: false, dashArray: '6 6', interactive: false }).addTo(map);

  // Fuzzy circles: a soft outer glow plus a softer inner circle. Never a pin.
  (opts.areas || []).forEach((a) => {
    Lf.circle([a.lat, a.lon], { radius: 9000, stroke: false, fillColor: '#C8102E', fillOpacity: 0.12, interactive: false }).addTo(map);
    const c = Lf.circle([a.lat, a.lon], { radius: 5500, stroke: false, fillColor: '#C8102E', fillOpacity: 0.28 }).addTo(map);
    if (a.html) c.bindPopup(a.html);
  });
  // Public places (ranges) can be shown as small dots.
  (opts.spots || []).forEach((s) => {
    const m = Lf.circleMarker([s.lat, s.lon], { radius: 7, color: '#0B2545', weight: 2, fillColor: '#fff', fillOpacity: 1 }).addTo(map);
    if (s.html) m.bindPopup(s.html);
  });
  // The radius ring from the member's rough area
  let ringBounds = null;
  if (opts.center) {
    Lf.circle([opts.center.lat, opts.center.lon], { radius: 2500, stroke: false, fillColor: '#0B2545', fillOpacity: 0.35, interactive: false }).addTo(map);
    if (opts.radiusMi && Number.isFinite(opts.radiusMi)) {
      Lf.circle([opts.center.lat, opts.center.lon], { radius: opts.radiusMi * MI, color: '#C8102E', weight: 3, dashArray: '8 6', fill: true, fillOpacity: 0.04, interactive: false }).addTo(map);
      ringBounds = Lf.latLng(opts.center.lat, opts.center.lon).toBounds(opts.radiusMi * MI * 2);
    }
  }
  const coBounds = Lf.latLngBounds([[CO_BOUNDS.south, CO_BOUNDS.west], [CO_BOUNDS.north, CO_BOUNDS.east]]);
  map.fitBounds(ringBounds || coBounds, { padding: [10, 10] });
  if (!ringBounds) map.panTo(CO_CENTER);
  void co;
  setTimeout(() => map.invalidateSize(), 50);
  return map;
}
