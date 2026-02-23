import { NextRequest, NextResponse } from "next/server";
import {
  getDueScheduledPosts,
  getDueScheduledGenerateThenPost,
  deleteScheduledPost,
} from "@/lib/scheduledPostsStore";
import { doPublish } from "@/lib/publishToPlatform";
import { generateImageForSchedule } from "@/lib/generateImageForSchedule";

const CRON_SECRET = process.env.CRON_SECRET;
const apiKey =
  process.env.GOOGLE_GEMINI_API_KEY ??
  process.env.GEMINI_API_KEY ??
  process.env.NANOBANANA_API_KEY;

export async function GET(request: NextRequest) {
  if (CRON_SECRET) {
    const auth = request.headers.get("authorization");
    const token = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
    if (token !== CRON_SECRET) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const now = new Date();
  const results: { id: string; type: string; success: boolean; error?: string }[] = [];

  const duePosts = getDueScheduledPosts(now);
  for (const post of duePosts) {
    try {
      await doPublish({
        imageUrl: post.imageUrl,
        socialCaption: post.socialCaption,
        blogDescription: post.blogDescription,
        platform: post.platform,
      });
      deleteScheduledPost(post.id);
      results.push({ id: post.id, type: "post", success: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      results.push({ id: post.id, type: "post", success: false, error: message });
    }
  }

  const dueGenerate = getDueScheduledGenerateThenPost(now);
  for (const job of dueGenerate) {
    try {
      if (!apiKey) {
        results.push({
          id: job.id,
          type: "generate_then_post",
          success: false,
          error: "Gemini API key not configured",
        });
        continue;
      }
      const imageUrl = await generateImageForSchedule({
        apiKey,
        prompt: job.prompt,
        aspectRatio: job.aspectRatio,
        imageBase64: job.imageBase64 ?? undefined,
        imageMimeType: job.imageMimeType ?? undefined,
      });
      await doPublish({
        imageUrl,
        socialCaption: job.socialCaption,
        platform: job.platform,
      });
      deleteScheduledPost(job.id);
      results.push({ id: job.id, type: "generate_then_post", success: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      results.push({
        id: job.id,
        type: "generate_then_post",
        success: false,
        error: message,
      });
    }
  }

  return NextResponse.json({
    processed: duePosts.length + dueGenerate.length,
    results,
  });
}
