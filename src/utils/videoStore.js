const DB_NAME = 'CoachCoreVideoDB';
const DB_VERSION = 2;
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
      let store;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      } else {
        store = request.transaction.objectStore(STORE_NAME);
      }

      if (store && !store.indexNames.contains('ownerId')) {
        store.createIndex('ownerId', 'ownerId', { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Saves a video clip with binary blob data into IndexedDB, associated with the ownerId.
 * @param {object} clip 
 * @param {Blob|File} [blob] 
 * @param {string} [ownerId] 
 * @returns {Promise<void>}
 */
export async function saveVideoClipToIDB(clip, blob = null, ownerId = null) {
  const uid = ownerId || clip.ownerId || 'guest';
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      
      const record = {
        ...clip,
        ownerId: uid,
        blob: blob || clip.blob || null,
        updatedAt: new Date().toISOString()
      };
      
      // Do not store transient Object URLs in IndexedDB
      delete record.videoUrl;

      const req = store.put(record);
      req.onsuccess = () => resolve();
      req.onerror = (e) => {
        const error = e.target.error || new Error('Failed to save clip to IndexedDB');
        if (error.name === 'QuotaExceededError') {
          console.warn('Storage quota exceeded while saving video clip.');
        }
        reject(error);
      };
    });
  } catch (err) {
    console.error('Error saving video clip to IndexedDB:', err);
    throw err;
  }
}

/**
 * Retrieves video clips belonging strictly to the authenticated ownerId from IndexedDB,
 * re-creating live Object URLs for playback.
 * @param {string} [ownerId] 
 * @returns {Promise<object[]>}
 */
export async function getVideoClipsFromIDB(ownerId) {
  const uid = ownerId || 'guest';
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      
      let req;
      if (store.indexNames.contains('ownerId')) {
        const index = store.index('ownerId');
        req = index.getAll(uid);
      } else {
        req = store.getAll();
      }

      req.onsuccess = () => {
        const records = req.result || [];
        // Filter strictly by ownerId to guarantee user isolation and ignore unowned legacy records
        const userRecords = records.filter(rec => rec.ownerId === uid);

        const clips = userRecords.map(rec => {
          let videoUrl = rec.videoUrl || '';
          if (rec.blob && (rec.blob instanceof Blob || typeof rec.blob === 'object')) {
            try {
              videoUrl = URL.createObjectURL(rec.blob);
            } catch (err) {
              console.warn('Failed to create object URL for clip:', err);
            }
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
 * Deletes a video clip from IndexedDB after confirming ownership.
 * @param {string} clipId 
 * @param {string} [ownerId] 
 * @returns {Promise<void>}
 */
export async function deleteVideoClipFromIDB(clipId, ownerId) {
  const uid = ownerId || 'guest';
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      
      // Get clip first to verify ownership
      const getReq = store.get(clipId);
      getReq.onsuccess = () => {
        const record = getReq.result;
        if (record && record.ownerId && record.ownerId !== uid) {
          reject(new Error('Unauthorized: You do not own this video clip.'));
          return;
        }
        const delReq = store.delete(clipId);
        delReq.onsuccess = () => resolve();
        delReq.onerror = () => reject(delReq.error);
      };
      getReq.onerror = () => reject(getReq.error);
    });
  } catch (err) {
    console.error('Failed to delete clip from IndexedDB:', err);
    throw err;
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
