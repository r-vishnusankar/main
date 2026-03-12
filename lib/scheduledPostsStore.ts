/**
 * Persistent schedule store backed by Upstash Redis.
 * Works on any platform: Render, Vercel, Netlify, Railway, etc.
 * Falls back to in-memory Map when Redis env vars are not set (local dev).
 *
 * Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN in your Render
 * service environment variables to enable persistence.
 *
 * Get a free Redis at: https://upstash.com → Create Database → REST API
 */

import { Redis } from "@upstash/redis";
import fs from "fs";
import path from "path";

const LOCAL_STORE_PATH = path.join(process.cwd(), ".scheduled_jobs.json");

export type ScheduledJobType = "post" | "generate_then_post" | "auto_generate";

/** Scheduled post with image already set (publish at scheduled time). */
export interface ScheduledPostRecord {
  id: string;
  type: "post";
  imageUrl: string;
  socialCaption: string;
  altText: string;
  blogDescription: string;
  platform: string;
  scheduledAt: string;
  createdAt: string;
  retryCount?: number;
  failureReason?: string;
}

/** Schedule: at time T generate image from prompt then publish. */
export interface ScheduledGenerateThenPostRecord {
  id: string;
  type: "generate_then_post";
  prompt: string;
  aspectRatio: string;
  imageBase64?: string | null;
  imageMimeType?: string | null;
  socialCaption: string;
  platform: string;
  scheduledAt: string;
  createdAt: string;
  retryCount?: number;
  failureReason?: string;
}

/** Auto-generate full post (image + caption + hashtags) at scheduled time and publish to multiple platforms. */
export interface ScheduledAutoGenerateRecord {
  id: string;
  type: "auto_generate";
  imagePrompt: string;
  autoGenerateType?: "image_caption" | "caption_only";
  aspectRatio: string;
  tone: string;
  platforms: string[];
  scheduledAt: string;
  createdAt: string;
  retryCount?: number;
  failureReason?: string;
}

export type ScheduledRecord =
  | ScheduledPostRecord
  | ScheduledGenerateThenPostRecord
  | ScheduledAutoGenerateRecord;

const KV_KEY = "pixmerce:scheduled_jobs";
export const MAX_RETRIES = 3;

// ── Redis client ───────────────────────────────────────────────────────────────
const isRedisAvailable =
  !!process.env.UPSTASH_REDIS_REST_URL && !!process.env.UPSTASH_REDIS_REST_TOKEN;

let redisClient: Redis | null = null;
function getRedis(): Redis | null {
  if (!isRedisAvailable) return null;
  if (!redisClient) {
    redisClient = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    });
  }
  return redisClient;
}

// ── In-memory fallback for local dev ──────────────────────────────────────────
let memoryStore = new Map<string, ScheduledRecord>();

// Initialize memory store from local file if it exists
if (fs.existsSync(LOCAL_STORE_PATH)) {
  try {
    const data = JSON.parse(fs.readFileSync(LOCAL_STORE_PATH, "utf8"));
    memoryStore = new Map(Object.entries(data));
    console.log(`[Store] Loaded ${memoryStore.size} jobs from local file`);
  } catch (err) {
    console.error(`[Store] Failed to load local jobs:`, err);
  }
}

function saveMemoryStoreToDisk() {
  try {
    const data = Object.fromEntries(memoryStore);
    fs.writeFileSync(LOCAL_STORE_PATH, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error(`[Store] Failed to save local jobs:`, err);
  }
}

// ── Internal helpers ──────────────────────────────────────────────────────────
async function getAllJobs(): Promise<Map<string, ScheduledRecord>> {
  const redis = getRedis();
  if (!redis) {
    // Re-check disk in case another process added a job (common in dev mode)
    if (fs.existsSync(LOCAL_STORE_PATH)) {
      try {
        const data = JSON.parse(fs.readFileSync(LOCAL_STORE_PATH, "utf8"));
        memoryStore = new Map(Object.entries(data));
      } catch {}
    }
    console.log(`[Store] Redis NOT available, using disk/memory store (${memoryStore.size} jobs)`);
    return new Map(memoryStore);
  }
  try {
    const data = await redis.hgetall<Record<string, ScheduledRecord>>(KV_KEY);
    const map = new Map(data ? Object.entries(data) : []);
    console.log(`[Store] Retrieved ${map.size} jobs from Redis`);
    return map;
  } catch {
    console.log(`[Store] Redis error, falling back to memory store (${memoryStore.size} jobs)`);
    return new Map(memoryStore);
  }
}

async function setJob(record: ScheduledRecord): Promise<void> {
  const redis = getRedis();
  if (!redis) {
    memoryStore.set(record.id, record);
    saveMemoryStoreToDisk();
    return;
  }
  try {
    await redis.hset(KV_KEY, { [record.id]: record });
  } catch {
    memoryStore.set(record.id, record);
    saveMemoryStoreToDisk();
  }
}

async function removeJob(id: string): Promise<void> {
  const redis = getRedis();
  if (!redis) {
    memoryStore.delete(id);
    saveMemoryStoreToDisk();
    return;
  }
  try {
    await redis.hdel(KV_KEY, id);
  } catch {
    memoryStore.delete(id);
    saveMemoryStoreToDisk();
  }
}

// ── Public API ─────────────────────────────────────────────────────────────────
export async function addScheduledPost(post: ScheduledPostRecord): Promise<void> {
  await setJob(post);
}

export async function addScheduledGenerateThenPost(post: ScheduledGenerateThenPostRecord): Promise<void> {
  await setJob(post);
}

export async function addScheduledAutoGenerate(post: ScheduledAutoGenerateRecord): Promise<void> {
  await setJob(post);
}

export async function getScheduledPost(id: string): Promise<ScheduledRecord | undefined> {
  const redis = getRedis();
  if (!redis) return memoryStore.get(id);
  try {
    const data = await redis.hget<ScheduledRecord>(KV_KEY, id);
    return data ?? undefined;
  } catch {
    return memoryStore.get(id);
  }
}

export async function deleteScheduledPost(id: string): Promise<void> {
  await removeJob(id);
}

export async function incrementRetry(id: string): Promise<number> {
  const job = await getScheduledPost(id);
  if (!job) return 0;
  const retryCount = (job.retryCount ?? 0) + 1;
  await setJob({ ...job, retryCount });
  return retryCount;
}

export async function markJobFailed(id: string, reason: string): Promise<void> {
  const job = await getScheduledPost(id);
  if (!job) return;
  await setJob({ ...job, failureReason: reason });
}

export async function getDueScheduledPosts(now: Date): Promise<ScheduledPostRecord[]> {
  const nowIso = now.toISOString();
  const all = await getAllJobs();
  return [...all.values()].filter(
    (p): p is ScheduledPostRecord =>
      p.type === "post" &&
      p.scheduledAt <= nowIso &&
      (p.retryCount ?? 0) < MAX_RETRIES &&
      !p.failureReason
  );
}

export async function getDueScheduledGenerateThenPost(now: Date): Promise<ScheduledGenerateThenPostRecord[]> {
  const nowIso = now.toISOString();
  const all = await getAllJobs();
  return [...all.values()].filter(
    (p): p is ScheduledGenerateThenPostRecord =>
      p.type === "generate_then_post" &&
      p.scheduledAt <= nowIso &&
      (p.retryCount ?? 0) < MAX_RETRIES &&
      !p.failureReason
  );
}

export async function getDueAutoGeneratePosts(now: Date): Promise<ScheduledAutoGenerateRecord[]> {
  const nowIso = now.toISOString();
  const all = await getAllJobs();
  return [...all.values()].filter(
    (p): p is ScheduledAutoGenerateRecord =>
      p.type === "auto_generate" &&
      p.scheduledAt <= nowIso &&
      (p.retryCount ?? 0) < MAX_RETRIES &&
      !p.failureReason
  );
}
