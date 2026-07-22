const DB_NAME = 'CoachCoreVideoDB';
const DB_VERSION = 1;
const STORE_NAME = 'clips';

function openDB() {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB is not supported in this environment.'));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Saves a video clip with binary blob data into IndexedDB.
 * @param {object} clip 
 * @param {Blob|File} [blob] 
 * @returns {Promise<void>}
 */
export async function saveVideoClipToIDB(clip, blob = null) {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const record = {
        ...clip,
        blob: blob || clip.blob || null,
        updatedAt: new Date().toISOString()
      };
      // Clean up objectUrl from record saved to DB (object URLs expire)
      delete record.videoUrl;

      const req = store.put(record);
      req.onsuccess = () => resolve();
      req.onerror = (e) => reject(e.target.error || new Error('Failed to save clip to IndexedDB'));
    });
  } catch (err) {
    console.error('Error saving video clip to IndexedDB:', err);
    throw err;
  }
}

/**
 * Retrieves all video clips for a user from IndexedDB, re-creating live Object URLs for playback.
 * @returns {Promise<object[]>}
 */
export async function getAllVideoClipsFromIDB() {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();
      req.onsuccess = () => {
        const records = req.result || [];
        const clips = records.map(rec => {
          let videoUrl = rec.videoUrl || '';
          if (rec.blob && rec.blob instanceof Blob) {
            videoUrl = URL.createObjectURL(rec.blob);
          }
          return {
            ...rec,
            videoUrl
          };
        });
        resolve(clips);
      };
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('Failed to load video clips from IndexedDB:', err);
    return [];
  }
}

/**
 * Deletes a video clip from IndexedDB.
 * @param {string} clipId 
 * @returns {Promise<void>}
 */
export async function deleteVideoClipFromIDB(clipId) {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(clipId);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.error('Failed to delete clip from IndexedDB:', err);
  }
}

/**
 * Revokes a video object URL safely.
 * @param {string} url 
 */
export function safeRevokeObjectURL(url) {
  if (url && typeof url === 'string' && url.startsWith('blob:')) {
    try {
      URL.revokeObjectURL(url);
    } catch {}
  }
}
