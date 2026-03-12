import { NextRequest, NextResponse } from "next/server";
import {
  getDueScheduledPosts,
  getDueScheduledGenerateThenPost,
  getDueAutoGeneratePosts,
  deleteScheduledPost,
  incrementRetry,
  markJobFailed,
  MAX_RETRIES,
} from "@/lib/scheduledPostsStore";
import { doPublish } from "@/lib/publishToPlatform";
import {
  generateImageForSchedule,
  generateFullPostForSchedule,
  generateTextOnlyPostForSchedule,
} from "@/lib/generateImageForSchedule";

const CRON_SECRET = process.env.CRON_SECRET;
const apiKey =
  process.env.GOOGLE_GEMINI_API_KEY ??
  process.env.GEMINI_API_KEY ??
  process.env.NANOBANANA_API_KEY;

type JobResult = {
  id: string;
  type: string;
  success: boolean;
  platform?: string;
  error?: string;
  generatedContent?: {
    imageUrl: string;
    socialCaption: string;
    altText?: string;
    blogDescription?: string;
  };
};

export async function GET(request: NextRequest) {
  if (CRON_SECRET) {
    const auth = request.headers.get("authorization");
    const token = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
    if (token !== CRON_SECRET) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const now = new Date();
  const nowIso = now.toISOString();
  const results: JobResult[] = [];

  console.log(`[Cron] Checking due jobs at ${nowIso}`);

  // ── Type 1: Plain scheduled posts (image + caption pre-filled) ──────────────
  const duePosts = await getDueScheduledPosts(now);
  console.log(`[Cron] Found ${duePosts.length} due plain posts`);
  for (const post of duePosts) {
    try {
      await doPublish({
        imageUrl: post.imageUrl,
        socialCaption: post.socialCaption,
        blogDescription: post.blogDescription,
        platform: post.platform,
      });
      await deleteScheduledPost(post.id);
      results.push({ id: post.id, type: "post", success: true, platform: post.platform });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const retries = await incrementRetry(post.id);
      if (retries >= MAX_RETRIES) {
        await markJobFailed(post.id, message);
      }
      results.push({ id: post.id, type: "post", success: false, platform: post.platform, error: message });
    }
  }

  // ── Type 2: Generate image then post (image from prompt, caption pre-filled) ─
  const dueGenerate = await getDueScheduledGenerateThenPost(now);
  console.log(`[Cron] Found ${dueGenerate.length} due gen-then-post jobs`);
  for (const job of dueGenerate) {
    if (!apiKey) {
      results.push({
        id: job.id,
        type: "generate_then_post",
        success: false,
        error: "Gemini API key not configured",
      });
      continue;
    }
    try {
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
      await deleteScheduledPost(job.id);
      results.push({
        id: job.id,
        type: "generate_then_post",
        success: true,
        platform: job.platform,
        generatedContent: { imageUrl, socialCaption: job.socialCaption },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const retries = await incrementRetry(job.id);
      if (retries >= MAX_RETRIES) {
        await markJobFailed(job.id, message);
      }
      results.push({ id: job.id, type: "generate_then_post", success: false, error: message });
    }
  }

  // ── Type 3: Auto-generate full post (image + caption + hashtags) → multi-platform ──
  const dueAutoGenerate = await getDueAutoGeneratePosts(now);
  console.log(`[Cron] Found ${dueAutoGenerate.length} due auto-gen jobs`);
  for (const job of dueAutoGenerate) {
    if (!apiKey) {
      results.push({
        id: job.id,
        type: "auto_generate",
        success: false,
        error: "Gemini API key not configured",
      });
      continue;
    }
    try {
      const postPackage =
        job.autoGenerateType === "caption_only"
          ? await generateTextOnlyPostForSchedule({
              apiKey,
              topic: job.imagePrompt,
              tone: job.tone,
            })
          : await generateFullPostForSchedule({
              apiKey,
              imagePrompt: job.imagePrompt,
              aspectRatio: job.aspectRatio,
              tone: job.tone,
            });

      const captionWithHashtags =
        postPackage.hashtags.length > 0
          ? `${postPackage.socialCaption}\n\n${postPackage.hashtags.map((t) => `#${t}`).join(" ")}`
          : postPackage.socialCaption;

      // Publish to each platform in the job's platforms list
      const platforms = job.platforms?.length ? job.platforms : ["facebook"];
      let anySuccess = false;

      for (const platform of platforms) {
        try {
          await doPublish({
            imageUrl: postPackage.imageUrl,
            socialCaption: captionWithHashtags,
            blogDescription: postPackage.blogDescription,
            platform,
          });
          results.push({
            id: job.id,
            type: "auto_generate",
            success: true,
            platform,
            generatedContent: {
              imageUrl: postPackage.imageUrl,
              socialCaption: captionWithHashtags,
              altText: postPackage.altText,
              blogDescription: postPackage.blogDescription,
            },
          });
          anySuccess = true;
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          results.push({ id: job.id, type: "auto_generate", success: false, platform, error: message });
        }
      }

      if (anySuccess) {
        await deleteScheduledPost(job.id);
      } else {
        const retries = await incrementRetry(job.id);
        if (retries >= MAX_RETRIES) {
          await markJobFailed(job.id, "All platform publishes failed after max retries");
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const retries = await incrementRetry(job.id);
      if (retries >= MAX_RETRIES) {
        await markJobFailed(job.id, message);
      }
      results.push({ id: job.id, type: "auto_generate", success: false, error: message });
    }
  }

  const processed = duePosts.length + dueGenerate.length + dueAutoGenerate.length;
  return NextResponse.json({ processed, results });
}
