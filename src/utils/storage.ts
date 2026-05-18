import type { Slide } from '../types';

/**
 * Persistence layer for autosave / projects.
 *
 * Browser → IndexedDB (multi-MB quota, structured clone of any JS value).
 * Electron → filesystem JSON in `app.getPath('userData')` via preload bridge.
 *
 * Picks the right backend at runtime, exposes a uniform async API, and
 * migrates any legacy `localStorage` save into IndexedDB on first run.
 */

const DB_NAME = 'carousel-studio';
const STORE = 'kv';
const DB_VERSION = 1;
const LEGACY_LOCALSTORAGE_KEY = 'carousel-studio:project';

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB unavailable'));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => {
      dbPromise = null;
      reject(req.error ?? new Error('IndexedDB open failed'));
    };
    req.onblocked = () => {
      // Another tab is upgrading; we don't have a v1→v2 yet so this should
      // never fire, but reject defensively to surface the issue.
      reject(new Error('IndexedDB blocked by another tab'));
    };
  });
  return dbPromise;
}

async function idbGet<T>(key: string): Promise<T | undefined> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).get(key);
    req.onsuccess = () => resolve(req.result as T | undefined);
    req.onerror = () => reject(req.error);
  });
}

async function idbSet<T>(key: string, value: T): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    const req = tx.objectStore(STORE).put(value, key);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

async function idbDelete(key: string): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    const req = tx.objectStore(STORE).delete(key);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export interface PersistedProject {
  version: 1;
  updatedAt: number;
  slides: Slide[];
  currentSlideId?: string;
}

export interface StorageBackend {
  name: string;
  saveAutosave: (data: PersistedProject) => Promise<void>;
  loadAutosave: () => Promise<PersistedProject | null>;
  clearAutosave: () => Promise<void>;
  estimateQuota?: () => Promise<{ usage: number; quota: number } | null>;
}

class IndexedDbBackend implements StorageBackend {
  name = 'IndexedDB';
  async saveAutosave(data: PersistedProject) {
    await idbSet('autosave', data);
  }
  async loadAutosave() {
    return (await idbGet<PersistedProject>('autosave')) ?? null;
  }
  async clearAutosave() {
    await idbDelete('autosave');
  }
  async estimateQuota() {
    try {
      const est = await navigator.storage?.estimate?.();
      if (!est) return null;
      return { usage: est.usage ?? 0, quota: est.quota ?? 0 };
    } catch {
      return null;
    }
  }
}

class ElectronBackend implements StorageBackend {
  name = 'Filesystem';
  private api = (window as any).electronAPI as {
    saveAutosave: (json: string) => Promise<string>;
    loadAutosave: () => Promise<string | null>;
    clearAutosave: () => Promise<void>;
  };
  async saveAutosave(data: PersistedProject) {
    await this.api.saveAutosave(JSON.stringify(data));
  }
  async loadAutosave() {
    const content = await this.api.loadAutosave();
    if (!content) return null;
    try {
      return JSON.parse(content);
    } catch {
      return null;
    }
  }
  async clearAutosave() {
    await this.api.clearAutosave();
  }
}

export const isElectron: boolean =
  typeof window !== 'undefined' && (window as any).electronAPI?.isElectron === true;

export const storage: StorageBackend = isElectron
  ? new ElectronBackend()
  : new IndexedDbBackend();

/**
 * Migrate any pre-existing `localStorage` save into the current backend.
 * Runs once at module load and then deletes the legacy key so old data
 * doesn't drift out of sync.
 */
async function migrateLegacyLocalStorage(backend: StorageBackend) {
  try {
    if (typeof localStorage === 'undefined') return;
    const raw = localStorage.getItem(LEGACY_LOCALSTORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.slides)) {
      localStorage.removeItem(LEGACY_LOCALSTORAGE_KEY);
      return;
    }
    const existing = await backend.loadAutosave().catch(() => null);
    if (!existing) {
      await backend.saveAutosave({
        version: 1,
        updatedAt: parsed.updatedAt ?? Date.now(),
        slides: parsed.slides,
        currentSlideId: parsed.currentSlideId,
      });
    }
    localStorage.removeItem(LEGACY_LOCALSTORAGE_KEY);
  } catch {
    // best-effort; never block app load on migration failures
  }
}

if (typeof window !== 'undefined') {
  void migrateLegacyLocalStorage(storage);
}
