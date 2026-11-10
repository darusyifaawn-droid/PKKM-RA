import { PpkmData } from '../types/ppkm';
import { DEFAULT_PPKM_DATA } from '../data/defaultPpkmData';

const DB_NAME = 'SimPkkmDatabase';
const DB_VERSION = 1;
const STORE_NAME = 'ppkm_store';
const DATA_KEY = 'ppkm_app_data';

const LOCALSTORAGE_KEY = 'SIM_PKKM_DATA_V2';

/**
 * Open or initialize IndexedDB connection
 */
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!window.indexedDB) {
      reject(new Error('IndexedDB not supported'));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

/**
 * Save PpkmData to both IndexedDB and LocalStorage fallback
 */
export async function savePkkmData(data: PpkmData): Promise<boolean> {
  let savedToIdb = false;

  // 1. Try saving to IndexedDB (Supports large photo datasets up to hundreds of MBs)
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(data, DATA_KEY);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
    savedToIdb = true;
  } catch (err) {
    console.warn('IndexedDB save warning:', err);
  }

  // 2. Try saving to LocalStorage (as fallback)
  try {
    localStorage.setItem(LOCALSTORAGE_KEY, JSON.stringify(data));
  } catch (err) {
    // If LocalStorage quota exceeded due to photos, clear non-essential photos for LocalStorage fallback
    try {
      const trimmedData = {
        ...data,
        photoEvidences: data.photoEvidences.slice(0, 10).map((p) => ({
          ...p,
          fotoUrl: p.fotoUrl.length > 50000 ? '' : p.fotoUrl,
        })),
      };
      localStorage.setItem(LOCALSTORAGE_KEY, JSON.stringify(trimmedData));
    } catch (innerErr) {
      console.warn('LocalStorage fallback quota warning:', innerErr);
    }
  }

  return savedToIdb;
}

/**
 * Load saved PpkmData from IndexedDB or LocalStorage
 */
export async function loadPkkmData(): Promise<PpkmData> {
  // 1. Try loading from IndexedDB first
  try {
    const db = await openDB();
    const idbData = await new Promise<PpkmData | null>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(DATA_KEY);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });

    if (idbData && idbData.institution) {
      return {
        ...DEFAULT_PPKM_DATA,
        ...idbData,
        structuralPositions:
          idbData.structuralPositions && idbData.structuralPositions.length > 0
            ? idbData.structuralPositions
            : DEFAULT_PPKM_DATA.structuralPositions,
      };
    }
  } catch (err) {
    console.warn('IndexedDB load warning:', err);
  }

  // 2. Fall back to LocalStorage
  try {
    const savedLs = localStorage.getItem(LOCALSTORAGE_KEY) || localStorage.getItem('SIM_PPKM_DATA_V1');
    if (savedLs) {
      const parsed = JSON.parse(savedLs);
      if (parsed && parsed.institution) {
        return {
          ...DEFAULT_PPKM_DATA,
          ...parsed,
          structuralPositions:
            parsed.structuralPositions && parsed.structuralPositions.length > 0
              ? parsed.structuralPositions
              : DEFAULT_PPKM_DATA.structuralPositions,
        };
      }
    }
  } catch (err) {
    console.warn('LocalStorage parse warning:', err);
  }

  return DEFAULT_PPKM_DATA;
}

/**
 * Clear saved data from IndexedDB and LocalStorage (Reset to Default)
 */
export async function clearPkkmData(): Promise<void> {
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(DATA_KEY);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('IndexedDB delete warning:', err);
  }

  try {
    localStorage.removeItem(LOCALSTORAGE_KEY);
    localStorage.removeItem('SIM_PPKM_DATA_V1');
  } catch (err) {
    console.warn('LocalStorage clear warning:', err);
  }
}
