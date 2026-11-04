// IndexedDB storage: media blobs, projects, presets, settings, watch history.
const DB_NAME = 'mindmovie';
const DB_VER = 1;
let dbp = null;

function open() {
  if (dbp) return dbp;
  dbp = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VER);
    req.onupgradeneeded = () => {
      const db = req.result;
      for (const s of ['media', 'projects', 'presets', 'kv']) {
        if (!db.objectStoreNames.contains(s)) db.createObjectStore(s, { keyPath: s === 'kv' ? 'k' : 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbp;
}

async function tx(store, mode, fn) {
  const db = await open();
  return new Promise((resolve, reject) => {
    const t = db.transaction(store, mode);
    const s = t.objectStore(store);
    let out;
    const r = fn(s);
    if (r && 'onsuccess' in r) r.onsuccess = () => { out = r.result; };
    t.oncomplete = () => resolve(out);
    t.onerror = () => reject(t.error);
    t.onabort = () => reject(t.error);
  });
}

export const db = {
  put: (store, val) => tx(store, 'readwrite', (s) => s.put(val)),
  get: (store, key) => tx(store, 'readonly', (s) => s.get(key)),
  del: (store, key) => tx(store, 'readwrite', (s) => s.delete(key)),
  all: (store) => tx(store, 'readonly', (s) => s.getAll()),
  clear: (store) => tx(store, 'readwrite', (s) => s.clear()),
  async kvGet(k, dflt) { const r = await this.get('kv', k); return r ? r.v : dflt; },
  kvSet(k, v) { return this.put('kv', { k, v }); },
};

export function uid(p = 'id') {
  return p + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}
