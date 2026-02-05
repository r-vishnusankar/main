// IndexedDB utility for storing large assets
const DB_NAME = "BannerCreatorDB";
const DB_VERSION = 1;
const ASSETS_STORE = "assets";
const BANNERS_STORE = "banners";

interface DB {
  db: IDBDatabase;
}

let dbInstance: IDBDatabase | null = null;

export async function openDB(): Promise<IDBDatabase> {
  if (dbInstance) {
    return dbInstance;
  }

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      dbInstance = request.result;
      resolve(request.result);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Create assets store if it doesn't exist
      if (!db.objectStoreNames.contains(ASSETS_STORE)) {
        const assetsStore = db.createObjectStore(ASSETS_STORE, { keyPath: "id" });
        assetsStore.createIndex("uploadedAt", "uploadedAt", { unique: false });
      }

      // Create banners store if it doesn't exist
      if (!db.objectStoreNames.contains(BANNERS_STORE)) {
        db.createObjectStore(BANNERS_STORE, { keyPath: "id" });
      }
    };
  });
}

export async function saveAsset(asset: { id: string; imageUrl: string; name: string; uploadedAt: string }): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([ASSETS_STORE], "readwrite");
    const store = transaction.objectStore(ASSETS_STORE);
    const request = store.put(asset);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function getAllAssets(): Promise<Array<{ id: string; imageUrl: string; name: string; uploadedAt: string }>> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([ASSETS_STORE], "readonly");
    const store = transaction.objectStore(ASSETS_STORE);
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

export async function deleteAsset(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([ASSETS_STORE], "readwrite");
    const store = transaction.objectStore(ASSETS_STORE);
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function saveBanner(banner: { id: string; slides: any[]; aspectRatio: string; createdAt: string; name?: string }): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([BANNERS_STORE], "readwrite");
    const store = transaction.objectStore(BANNERS_STORE);
    const request = store.put(banner);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function getAllBanners(): Promise<Array<{ id: string; slides: any[]; aspectRatio: string; createdAt: string; name?: string }>> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([BANNERS_STORE], "readonly");
    const store = transaction.objectStore(BANNERS_STORE);
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

export async function deleteBanner(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([BANNERS_STORE], "readwrite");
    const store = transaction.objectStore(BANNERS_STORE);
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// Get storage usage estimate
export async function getStorageUsage(): Promise<{ used: number; quota: number }> {
  if ("storage" in navigator && "estimate" in navigator.storage) {
    const estimate = await navigator.storage.estimate();
    return {
      used: estimate.usage || 0,
      quota: estimate.quota || 0,
    };
  }
  return { used: 0, quota: 0 };
}
