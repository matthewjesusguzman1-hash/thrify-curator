/**
 * devicePhotos.js — On-device photo storage using IndexedDB.
 *
 * Photos are stored ONLY on the inspector's device. The server never receives
 * the image bytes. MongoDB only holds metadata (photo_id, original filename,
 * mime, created_at, annotations) so saved inspections know which photos to
 * look up locally.
 *
 * If the device is lost or the browser storage is cleared, the photos are gone.
 * This is the explicit security policy for this app (photos may contain carrier /
 * driver PII from shipping papers and should never land on shared infrastructure).
 */

const DB_NAME = "inspnav_device_photos";
const DB_VERSION = 1;
const STORE = "photos";

let dbPromise = null;

function openDB() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: "photo_id" });
        store.createIndex("inspection_id", "inspection_id", { unique: false });
        store.createIndex("created_at", "created_at", { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

function tx(mode) {
  return openDB().then((db) => {
    const t = db.transaction(STORE, mode);
    return t.objectStore(STORE);
  });
}

function randomId() {
  // Simple uuid-ish; no crypto required because these are local-only keys.
  return "dp_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 10);
}

/**
 * Persist a photo blob on-device.
 * @param {Blob|File} blob
 * @param {object} meta { inspectionId, category?, itemId?, assessmentId?, originalFilename? }
 * @returns {Promise<object>} { photo_id, original_filename, mime, size, created_at, ...meta }
 */
export async function savePhoto(blob, meta = {}) {
  const photo_id = meta.photo_id || randomId();
  const record = {
    photo_id,
    inspection_id: meta.inspectionId || meta.inspection_id || "__standalone__",
    category: meta.category || "general",
    item_id: meta.itemId || meta.item_id || null,
    assessment_id: meta.assessmentId || meta.assessment_id || null,
    original_filename: meta.originalFilename || meta.original_filename || (blob.name || `photo_${photo_id}.jpg`),
    mime: blob.type || "image/jpeg",
    size: blob.size || 0,
    created_at: new Date().toISOString(),
    blob,
  };
  const store = await tx("readwrite");
  return new Promise((resolve, reject) => {
    const req = store.put(record);
    req.onsuccess = () => {
      // Return the public metadata (no blob) to the caller.
      const { blob: _b, ...publicMeta } = record;
      resolve(publicMeta);
    };
    req.onerror = () => reject(req.error);
  });
}

/** Retrieve the raw blob for a photo ID. Returns null if not on this device. */
export async function getPhotoBlob(photo_id) {
  if (!photo_id) return null;
  const store = await tx("readonly");
  return new Promise((resolve) => {
    const req = store.get(photo_id);
    req.onsuccess = () => resolve(req.result?.blob || null);
    req.onerror = () => resolve(null);
  });
}

/** Retrieve the full record (metadata + blob) for a photo ID. */
export async function getPhotoRecord(photo_id) {
  if (!photo_id) return null;
  const store = await tx("readonly");
  return new Promise((resolve) => {
    const req = store.get(photo_id);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => resolve(null);
  });
}

/** Delete one photo from device storage. */
export async function deletePhoto(photo_id) {
  if (!photo_id) return;
  const store = await tx("readwrite");
  return new Promise((resolve, reject) => {
    const req = store.delete(photo_id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

/** Delete every photo associated with an inspection. */
export async function deletePhotosForInspection(inspectionId) {
  if (!inspectionId) return;
  const store = await tx("readwrite");
  const idx = store.index("inspection_id");
  return new Promise((resolve) => {
    const req = idx.openCursor(IDBKeyRange.only(inspectionId));
    req.onsuccess = (e) => {
      const cursor = e.target.result;
      if (cursor) {
        cursor.delete();
        cursor.continue();
      } else {
        resolve();
      }
    };
    req.onerror = () => resolve();
  });
}

/** Total bytes stored on this device. */
export async function getStorageUsage() {
  try {
    if (navigator.storage?.estimate) {
      const est = await navigator.storage.estimate();
      return { usage: est.usage || 0, quota: est.quota || 0 };
    }
  } catch { /* ignore */ }
  // Fallback — sum our records.
  const store = await tx("readonly");
  return new Promise((resolve) => {
    let total = 0;
    const req = store.openCursor();
    req.onsuccess = (e) => {
      const c = e.target.result;
      if (c) { total += c.value.size || 0; c.continue(); }
      else resolve({ usage: total, quota: 0 });
    };
    req.onerror = () => resolve({ usage: 0, quota: 0 });
  });
}

/** List metadata for all photos currently on device (no blobs). */
export async function listAllMetadata() {
  const store = await tx("readonly");
  return new Promise((resolve) => {
    const out = [];
    const req = store.openCursor();
    req.onsuccess = (e) => {
      const c = e.target.result;
      if (c) {
        // eslint-disable-next-line no-unused-vars
        const { blob, ...meta } = c.value;
        out.push(meta);
        c.continue();
      } else resolve(out);
    };
    req.onerror = () => resolve([]);
  });
}
