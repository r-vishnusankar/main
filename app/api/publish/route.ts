import { NextRequest, NextResponse } from "next/server";
import { doPublish } from "@/lib/publishToPlatform";

const META_PAGE_ID = process.env.META_PAGE_ID;
const META_PAGE_ACCESS_TOKEN = process.env.META_PAGE_ACCESS_TOKEN;
const WHATSAPP_PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
const WHATSAPP_TO_PHONE = process.env.WHATSAPP_TO_PHONE;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      imageUrl,
      socialCaption,
      blogDescription,
      platform,
      to,
    } = body as {
      imageUrl?: string;
      socialCaption?: string;
      blogDescription?: string;
      platform?: string;
      to?: string;
    };

    if (!imageUrl || typeof imageUrl !== "string") {
      return NextResponse.json({ error: "imageUrl is required" }, { status: 400 });
    }

    const platformNorm = (platform || "facebook").toLowerCase();

    if (
      (platformNorm === "facebook" || platformNorm === "instagram") &&
      (!META_PAGE_ID || !META_PAGE_ACCESS_TOKEN)
    ) {
      return NextResponse.json(
        {
          error:
            "Meta (Facebook/Instagram) requires META_PAGE_ID and META_PAGE_ACCESS_TOKEN in .env.local.",
        },
        { status: 400 }
      );
    }

    if (
      platformNorm === "whatsapp" &&
      (!WHATSAPP_PHONE_NUMBER_ID || (!WHATSAPP_TO_PHONE && !to))
    ) {
      return NextResponse.json(
        {
          error:
            "WhatsApp requires WHATSAPP_PHONE_NUMBER_ID and WHATSAPP_TO_PHONE (or pass 'to') in .env.local.",
        },
        { status: 400 }
      );
    }

    const result = await doPublish({
      imageUrl,
      socialCaption,
      blogDescription,
      platform: platformNorm,
      ...(platformNorm === "whatsapp" && to ? { to } : {}),
    });
    return NextResponse.json({ success: true, externalId: result.externalId });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Publish failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
