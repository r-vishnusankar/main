// IndexedDB utility for storing large assets
import type { ImagePurpose } from "@/lib/imagePurpose";

const DB_NAME = "BannerCreatorDB";
const DB_VERSION = 2;
const ASSETS_STORE = "assets";
const BANNERS_STORE = "banners";
const CONTENT_POSTS_STORE = "content_posts";

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

      if (!db.objectStoreNames.contains(CONTENT_POSTS_STORE)) {
        const postsStore = db.createObjectStore(CONTENT_POSTS_STORE, { keyPath: "id" });
        postsStore.createIndex("scheduledAt", "scheduledAt", { unique: false });
        postsStore.createIndex("status", "status", { unique: false });
      }
    };
  });
}

export interface StoredAssetRecord {
  id: string;
  imageUrl: string;
  name: string;
  uploadedAt: string;
  imagePurpose?: ImagePurpose;
  /** Prompt used to create the image (for gallery and rework). */
  prompt?: string;
  /** Aspect ratio used (e.g. "16:9") for gallery and rework. */
  aspectRatio?: string;
  /** Whether this was manually uploaded or AI-generated. */
  type?: "upload" | "generated";
}

export async function saveAsset(asset: StoredAssetRecord): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([ASSETS_STORE], "readwrite");
    const store = transaction.objectStore(ASSETS_STORE);
    const request = store.put(asset);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function getAllAssets(): Promise<StoredAssetRecord[]> {
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

export interface StoredBannerRecord {
  id: string;
  slides: any[];
  aspectRatio: string;
  createdAt: string;
  name?: string;
  imagePurpose?: ImagePurpose;
  /** Optional reminder date (YYYY-MM-DD) for campaigns. */
  reminderDate?: string;
}

export async function saveBanner(banner: StoredBannerRecord): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([BANNERS_STORE], "readwrite");
    const store = transaction.objectStore(BANNERS_STORE);
    const request = store.put(banner);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function getAllBanners(): Promise<StoredBannerRecord[]> {
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

export type ContentPostPlatform = "facebook" | "instagram" | "whatsapp" | "social" | "blog" | "shopify_blog" | "linkedin";
export type ContentPostStatus = "draft" | "scheduled" | "processing" | "published" | "failed";

export interface StoredContentPostRecord {
  id: string;
  imageUrl: string;
  socialCaption: string;
  altText: string;
  blogDescription: string;
  hashtags: string[];
  platform: ContentPostPlatform;
  scheduledAt: string | null;
  status: ContentPostStatus;
  createdAt: string;
  publishedAt?: string;
  externalId?: string;
  /** Blog page: template id */
  blogTemplate?: string;
  /** Blog page: headline */
  blogHeadline?: string;
  /** Blog page: subtitle/category */
  blogSubtitle?: string;
  /** Blog page: full body content */
  blogBody?: string;
  /** Blog page: call-to-action */
  blogCta?: string;
  /** Number of publish retry attempts */
  retryCount?: number;
  /** Reason for terminal failure */
  failureReason?: string;
  /** For auto_generate jobs: image prompt used */
  imagePrompt?: string;
  /** For auto_generate jobs: tone used */
  tone?: string;
  /** For auto_generate jobs: multiple platforms */
  platforms?: string[];
}

export async function saveContentPost(post: StoredContentPostRecord): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([CONTENT_POSTS_STORE], "readwrite");
    const store = transaction.objectStore(CONTENT_POSTS_STORE);
    const request = store.put(post);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function getAllContentPosts(): Promise<StoredContentPostRecord[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([CONTENT_POSTS_STORE], "readonly");
    const store = transaction.objectStore(CONTENT_POSTS_STORE);
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

export async function getContentPost(id: string): Promise<StoredContentPostRecord | undefined> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([CONTENT_POSTS_STORE], "readonly");
    const store = transaction.objectStore(CONTENT_POSTS_STORE);
    const request = store.get(id);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function deleteContentPost(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([CONTENT_POSTS_STORE], "readwrite");
    const store = transaction.objectStore(CONTENT_POSTS_STORE);
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function updateContentPost(id: string, updates: Partial<StoredContentPostRecord>): Promise<void> {
  const existing = await getContentPost(id);
  if (!existing) return;
  await saveContentPost({ ...existing, ...updates, id });
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
