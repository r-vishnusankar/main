import { NextRequest, NextResponse } from "next/server";
import { generatePostText } from "@/lib/gemini";

const API_KEY =
  process.env.GOOGLE_GEMINI_API_KEY ||
  process.env.GEMINI_API_KEY ||
  process.env.NANOBANANA_API_KEY ||
  "";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { topic, tone } = body as { topic?: string; tone?: string };

    if (!topic || !topic.trim()) {
      return NextResponse.json({ error: "topic is required" }, { status: 400 });
    }
    if (!API_KEY) {
      return NextResponse.json(
        { error: "GOOGLE_GEMINI_API_KEY is not configured." },
        { status: 500 }
      );
    }

    const result = await generatePostText(API_KEY, topic.trim(), tone || "professional");
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Text generation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
