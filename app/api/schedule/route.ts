import { NextRequest, NextResponse } from "next/server";
import {
  addScheduledPost,
  addScheduledGenerateThenPost,
  addScheduledAutoGenerate,
  type ScheduledPostRecord,
  type ScheduledGenerateThenPostRecord,
  type ScheduledAutoGenerateRecord,
} from "@/lib/scheduledPostsStore";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const jobType = (body.type as string) || "post";
    const now = new Date().toISOString();

    // ── auto_generate: generate full post + publish to multiple platforms ──────
    if (jobType === "auto_generate") {
      const {
        id,
        imagePrompt,
        autoGenerateType,
        aspectRatio,
        tone,
        platforms,
        scheduledAt,
        createdAt,
      } = body as {
        id?: string;
        imagePrompt?: string;
        autoGenerateType?: "image_caption" | "caption_only";
        aspectRatio?: string;
        tone?: string;
        platforms?: string[];
        scheduledAt?: string | null;
        createdAt?: string;
      };

      if (!id || !imagePrompt || !scheduledAt) {
        return NextResponse.json(
          { error: "id, imagePrompt, and scheduledAt are required for auto_generate" },
          { status: 400 }
        );
      }
      if (!Array.isArray(platforms) || platforms.length === 0) {
        return NextResponse.json(
          { error: "platforms must be a non-empty array for auto_generate" },
          { status: 400 }
        );
      }

      const record: ScheduledAutoGenerateRecord = {
        id,
        type: "auto_generate",
        imagePrompt,
        autoGenerateType: autoGenerateType ?? "image_caption",
        aspectRatio: aspectRatio ?? "1:1",
        tone: tone ?? "professional",
        platforms,
        scheduledAt,
        createdAt: createdAt ?? now,
      };
      await addScheduledAutoGenerate(record);
      console.log(`[Schedule API] Saved auto_generate job: ${id} (scheduled at ${scheduledAt})`);
      return NextResponse.json({ success: true });
    }

    // ── generate_then_post: generate image from prompt, caption pre-filled ────
    if (jobType === "generate_then_post") {
      const {
        id,
        prompt,
        aspectRatio,
        imageBase64,
        imageMimeType,
        socialCaption,
        platform,
        scheduledAt,
        createdAt,
      } = body as {
        id?: string;
        prompt?: string;
        aspectRatio?: string;
        imageBase64?: string | null;
        imageMimeType?: string | null;
        socialCaption?: string;
        platform?: string;
        scheduledAt?: string | null;
        createdAt?: string;
      };

      if (!id || !prompt || !scheduledAt) {
        return NextResponse.json(
          { error: "id, prompt, and scheduledAt are required for generate_then_post" },
          { status: 400 }
        );
      }

      const record: ScheduledGenerateThenPostRecord = {
        id,
        type: "generate_then_post",
        prompt,
        aspectRatio: aspectRatio ?? "16:9",
        imageBase64: imageBase64 ?? null,
        imageMimeType: imageMimeType ?? null,
        socialCaption: socialCaption ?? "",
        platform: platform ?? "facebook",
        scheduledAt,
        createdAt: createdAt ?? now,
      };
      await addScheduledGenerateThenPost(record);
      console.log(`[Schedule API] Saved generate_then_post job: ${id} (scheduled at ${scheduledAt})`);
      return NextResponse.json({ success: true });
    }

    // ── post: image + caption already ready, publish at scheduled time ─────────
    const {
      id,
      imageUrl,
      socialCaption,
      altText,
      blogDescription,
      platform,
      scheduledAt,
      createdAt,
    } = body as {
      id?: string;
      imageUrl?: string;
      socialCaption?: string;
      altText?: string;
      blogDescription?: string;
      platform?: string;
      scheduledAt?: string | null;
      createdAt?: string;
    };

    if (!id || !imageUrl || !scheduledAt) {
      return NextResponse.json(
        { error: "id, imageUrl, and scheduledAt are required" },
        { status: 400 }
      );
    }

    const record: ScheduledPostRecord = {
      id,
      type: "post",
      imageUrl,
      socialCaption: socialCaption ?? "",
      altText: altText ?? "",
      blogDescription: blogDescription ?? "",
      platform: platform ?? "facebook",
      scheduledAt,
      createdAt: createdAt ?? now,
    };
    await addScheduledPost(record);
    console.log(`[Schedule API] Saved plain post job: ${id} (scheduled at ${scheduledAt})`);
    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Schedule failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
