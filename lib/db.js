// =====================================================================
//  db.js — a tiny promise wrapper over IndexedDB.
//  Two stores: `photos` (the assets + all AI metadata + the full blob)
//  and `catalogs` (named collections the user sorts photos into).
//  Everything lives in the browser; nothing is uploaded anywhere.
// =====================================================================

const DB_NAME = "aperture-dam";
const DB_VERSION = 1;
const PHOTOS = "photos";
const CATALOGS = "catalogs";

let dbPromise = null;

function openDB() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB is not available in this environment."));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(PHOTOS)) {
        const store = db.createObjectStore(PHOTOS, { keyPath: "id" });
        store.createIndex("createdAt", "createdAt");
        store.createIndex("catalogId", "catalogId");
      }
      if (!db.objectStoreNames.contains(CATALOGS)) {
        db.createObjectStore(CATALOGS, { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

function tx(store, mode, fn) {
  return openDB().then(
    (db) =>
      new Promise((resolve, reject) => {
        const t = db.transaction(store, mode);
        const os = t.objectStore(store);
        let result;
        Promise.resolve(fn(os)).then((r) => (result = r));
        t.oncomplete = () => resolve(result);
        t.onerror = () => reject(t.error);
        t.onabort = () => reject(t.error);
      })
  );
}

const reqToPromise = (req) =>
  new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });

// ---------- Photos ----------
export const photosDB = {
  getAll: () =>
    tx(PHOTOS, "readonly", (os) => reqToPromise(os.getAll())).then((rows) =>
      (rows || []).sort((a, b) => b.createdAt - a.createdAt)
    ),
  get: (id) => tx(PHOTOS, "readonly", (os) => reqToPromise(os.get(id))),
  put: (photo) => tx(PHOTOS, "readwrite", (os) => reqToPromise(os.put(photo))),
  delete: (id) => tx(PHOTOS, "readwrite", (os) => reqToPromise(os.delete(id))),
  clear: () => tx(PHOTOS, "readwrite", (os) => reqToPromise(os.clear())),
};

// ---------- Catalogs ----------
export const catalogsDB = {
  getAll: () =>
    tx(CATALOGS, "readonly", (os) => reqToPromise(os.getAll())).then((rows) =>
      (rows || []).sort((a, b) => a.createdAt - b.createdAt)
    ),
  put: (catalog) =>
    tx(CATALOGS, "readwrite", (os) => reqToPromise(os.put(catalog))),
  delete: (id) => tx(CATALOGS, "readwrite", (os) => reqToPromise(os.delete(id))),
};

// Rough estimate of how much room the library is using, for the UI.
export async function estimateUsage() {
  if (navigator.storage && navigator.storage.estimate) {
    const { usage, quota } = await navigator.storage.estimate();
    return { usage: usage || 0, quota: quota || 0 };
  }
  return { usage: 0, quota: 0 };
}
