import { NextRequest, NextResponse } from "next/server";
import { describeImage } from "@/lib/gemini";

const apiKey = process.env.GOOGLE_GEMINI_API_KEY ?? process.env.GEMINI_API_KEY ?? process.env.NANOBANANA_API_KEY;

const BLOG_PROMPT = `Analyze this image and generate content for a blog post.
Return a JSON object with exactly these keys (no other text or markdown):
- "headline": A compelling blog headline (3-8 words, title case).
- "subtitle": Optional short tagline or category (e.g. "THE NEW STORY", "NEWS HEADLINE").
- "body": Two to four complete paragraphs of engaging blog content (3-5 sentences each) that describes or expands on what the image shows. Write in a professional, readable style suitable for e-commerce or lifestyle blogs. IMPORTANT: Ensure each paragraph and the final sentence are fully completed—do not truncate mid-sentence.
- "cta": Optional call-to-action phrase (e.g. "Swipe to know more", "Read more").
- "socialCaption": Short caption for social sharing (1-2 sentences).
- "altText": Concise alt text for the image (under 125 characters).

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
    const prompt =
      typeof context === "string" && context.trim()
        ? `${BLOG_PROMPT}\n\nAdditional context: ${context.trim()}`
        : BLOG_PROMPT;

    const text = await describeImage(apiKey, imageBase64, mimeType, prompt, 8192);

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const jsonStr = jsonMatch ? jsonMatch[0] : text;
    let parsed: {
      headline?: string;
      subtitle?: string;
      body?: string;
      cta?: string;
      socialCaption?: string;
      altText?: string;
    };
    try {
      parsed = JSON.parse(jsonStr) as typeof parsed;
    } catch {
      parsed = {
        headline: "It's All in the Details",
        subtitle: "THE NEW STORY",
        body: text.slice(0, 800),
        cta: "Read more",
        socialCaption: text.slice(0, 150),
        altText: text.slice(0, 125),
      };
    }

    return NextResponse.json({
      headline: parsed.headline ?? "It's All in the Details",
      subtitle: parsed.subtitle ?? "",
      body: parsed.body ?? "",
      cta: parsed.cta ?? "Read more",
      socialCaption: parsed.socialCaption ?? "",
      altText: parsed.altText ?? "",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Blog content generation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
