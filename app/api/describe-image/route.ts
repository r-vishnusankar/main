import { NextRequest, NextResponse } from "next/server";
import { describeImage } from "@/lib/gemini";

const apiKey = process.env.GOOGLE_GEMINI_API_KEY ?? process.env.GEMINI_API_KEY ?? process.env.NANOBANANA_API_KEY;

const DESCRIPTION_PROMPT = `Analyze this image and provide content suitable for social media and e-commerce blog use.
Return a JSON object with exactly these keys (no other text or markdown):
- "socialCaption": A short, engaging caption for social media (1-2 sentences, optionally with a call-to-action).
- "altText": Concise accessibility alt text describing the image (under 125 characters).
- "blogDescription": Two to three sentences for use in a product or blog post describing what's in the image.
Optional: add "hashtags" as an array of 3-5 relevant hashtags (without #) if the image is brand/product oriented.

Return only valid JSON, no code block or markdown.`;

export async function POST(request: NextRequest) {
  if (!apiKey) {
    return NextResponse.json(
      { error: "GOOGLE_GEMINI_API_KEY or GEMINI_API_KEY is not configured" },
      { status: 500 }
    );
  }
  try {
    const body = await request.json();
    const { imageBase64, imageMimeType, context } = body;
    if (!imageBase64 || typeof imageBase64 !== "string") {
      return NextResponse.json(
        { error: "imageBase64 is required" },
        { status: 400 }
      );
    }
    const mimeType = typeof imageMimeType === "string" ? imageMimeType : "image/png";
    const prompt = typeof context === "string" && context.trim()
      ? `${DESCRIPTION_PROMPT}\n\nAdditional context from the user: ${context.trim()}`
      : DESCRIPTION_PROMPT;

    const text = await describeImage(apiKey, imageBase64, mimeType, prompt);

    // Try to parse as JSON; if the model wrapped in markdown, strip it
    let parsed: { socialCaption?: string; altText?: string; blogDescription?: string; hashtags?: string[] };
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const jsonStr = jsonMatch ? jsonMatch[0] : text;
    try {
      parsed = JSON.parse(jsonStr) as typeof parsed;
    } catch {
      parsed = {
        socialCaption: text.slice(0, 200),
        altText: text.slice(0, 125),
        blogDescription: text,
      };
    }

    return NextResponse.json({
      socialCaption: parsed.socialCaption ?? "",
      altText: parsed.altText ?? "",
      blogDescription: parsed.blogDescription ?? "",
      hashtags: Array.isArray(parsed.hashtags) ? parsed.hashtags : [],
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Description failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json(
    { error: "Use POST with imageBase64 to describe an image" },
    { status: 400 }
  );
}
