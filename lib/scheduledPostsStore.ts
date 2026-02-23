/**
 * In-memory store for scheduled posts (server-side).
 * Used by api/schedule and api/cron/publish-scheduled.
 * For production at scale, replace with Vercel KV or a database.
 */

export type ScheduledJobType = "post" | "generate_then_post";

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
}

export type ScheduledRecord = ScheduledPostRecord | ScheduledGenerateThenPostRecord;

const store = new Map<string, ScheduledRecord>();

export function addScheduledPost(post: ScheduledPostRecord): void {
  store.set(post.id, post);
}

export function addScheduledGenerateThenPost(post: ScheduledGenerateThenPostRecord): void {
  store.set(post.id, post);
}

export function getScheduledPost(id: string): ScheduledRecord | undefined {
  return store.get(id);
}

export function deleteScheduledPost(id: string): void {
  store.delete(id);
}

export function getDueScheduledPosts(now: Date): ScheduledPostRecord[] {
  const nowIso = now.toISOString();
  return [...store.values()].filter(
    (p): p is ScheduledPostRecord => p.type === "post" && p.scheduledAt <= nowIso
  );
}

export function getDueScheduledGenerateThenPost(now: Date): ScheduledGenerateThenPostRecord[] {
  const nowIso = now.toISOString();
  return [...store.values()].filter(
    (p): p is ScheduledGenerateThenPostRecord =>
      p.type === "generate_then_post" && p.scheduledAt <= nowIso
  );
}
