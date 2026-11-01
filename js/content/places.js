/* Colorado places. Members pick the nearest town; No2 stores only a rough grid square (about 7 miles wide),
   never an address. Town coordinates are approximate town centers. */

export const CO_BOUNDS = { south: 37.0, north: 41.0, west: -109.06, east: -102.04 };
export const inColorado = (lat, lon) => lat >= CO_BOUNDS.south && lat <= CO_BOUNDS.north && lon >= CO_BOUNDS.west && lon <= CO_BOUNDS.east;

/* Rough location: a 0.1-degree grid square. gy = latitude x 10, gx = longitude x 10 (whole numbers). */
export const toGrid = (lat, lon) => ({ gy: Math.floor(lat * 10), gx: Math.floor(lon * 10) });
export const gridCenter = (gy, gx) => ({ lat: (gy + 0.5) / 10, lon: (gx + 0.5) / 10 });

export function milesBetween(a, b) {
  const R = 3958.8; const rad = (d) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat); const dLon = rad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
/* "about 15 miles away" — rounded to 5 miles so it can't pinpoint anyone. */
export function roughDistance(mi) {
  if (mi < 10) return 'less than 10 miles away';
  return `about ${Math.round(mi / 5) * 5} miles away`;
}

export const TOWNS = [
  ['Alamosa', 37.47, -105.87], ['Aurora', 39.73, -104.83], ['Boulder', 40.01, -105.27], ['Breckenridge', 39.48, -106.04],
  ['Brighton', 39.99, -104.82], ['Burlington', 39.31, -102.27], ['Cañon City', 38.44, -105.24], ['Castle Rock', 39.37, -104.86],
  ['Colorado Springs', 38.83, -104.82], ['Cortez', 37.35, -108.59], ['Craig', 40.52, -107.55], ['Delta', 38.74, -108.07],
  ['Denver', 39.74, -104.99], ['Durango', 37.28, -107.88], ['Estes Park', 40.38, -105.52], ['Fort Collins', 40.59, -105.08],
  ['Fort Morgan', 40.25, -103.80], ['Glenwood Springs', 39.55, -107.32], ['Grand Junction', 39.06, -108.55], ['Greeley', 40.42, -104.71],
  ['Gunnison', 38.55, -106.93], ['Julesburg', 40.99, -102.26], ['Kremmling', 40.06, -106.39], ['La Junta', 37.98, -103.54],
  ['Lakewood', 39.70, -105.08], ['Lamar', 38.09, -102.62], ['Leadville', 39.25, -106.29], ['Limon', 39.26, -103.69],
  ['Longmont', 40.17, -105.10], ['Loveland', 40.40, -105.07], ['Meeker', 40.04, -107.91], ['Monte Vista', 37.58, -106.15],
  ['Montrose', 38.48, -107.88], ['Pagosa Springs', 37.27, -107.01], ['Parker', 39.52, -104.76], ['Pueblo', 38.25, -104.61],
  ['Rifle', 39.53, -107.78], ['Rocky Ford', 38.05, -103.72], ['Salida', 38.53, -106.00], ['Springfield', 37.41, -102.62],
  ['Steamboat Springs', 40.48, -106.83], ['Sterling', 40.63, -103.21], ['Trinidad', 37.17, -104.51], ['Vail', 39.64, -106.37],
  ['Walsenburg', 37.62, -104.78], ['Woodland Park', 38.99, -105.06], ['Yuma', 40.12, -102.72],
].map(([name, lat, lon]) => ({ name, lat, lon }));

/* Real public ranges and official range directories. More are added by No2 staff as they are confirmed. */
export const RANGES = [
  { name: 'Cameo Shooting and Education Complex', where: 'Near Palisade (Mesa County)', lat: 39.15, lon: -108.31,
    what: 'Colorado Parks and Wildlife complex opened in 2018: rifle and pistol ranges, a long precision range, sporting clays, a 5-stand, and archery, including 3D archery.',
    link: { label: 'Colorado Parks and Wildlife: Shooting and Archery', url: 'https://cpw.state.co.us/activities/shooting-and-archery' } },
];
export const RANGE_DIRECTORIES = [
  { label: 'Colorado Parks and Wildlife: all state shooting ranges', url: 'https://cpw.state.co.us/shooting-ranges' },
  { label: 'Colorado Parks and Wildlife: shooting and archery programs', url: 'https://cpw.state.co.us/activities/shooting-and-archery' },
];
export const CLASS_DIRECTORIES = [
  { label: 'Colorado Parks and Wildlife: hunter education and classes', url: 'https://cpw.state.co.us/' },
  { label: 'Concealed carry permits and approved instructors: your county sheriff and the Colorado Bureau of Investigation', url: 'https://cbi.colorado.gov/' },
];
