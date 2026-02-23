import { NextRequest, NextResponse } from "next/server";
import {
  addScheduledPost,
  addScheduledGenerateThenPost,
  type ScheduledPostRecord,
  type ScheduledGenerateThenPostRecord,
} from "@/lib/scheduledPostsStore";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const jobType = (body.type as string) || "post";
    const now = new Date().toISOString();

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
      addScheduledGenerateThenPost(record);
      return NextResponse.json({ success: true });
    }

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
    addScheduledPost(record);

    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Schedule failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
