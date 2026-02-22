import { NextRequest, NextResponse } from "next/server";
import { generateImage, generateImageFromImage } from "@/lib/gemini";

const apiKey = process.env.GOOGLE_GEMINI_API_KEY ?? process.env.GEMINI_API_KEY ?? process.env.NANOBANANA_API_KEY;

export async function POST(request: NextRequest) {
  if (!apiKey) {
    return NextResponse.json(
      { error: "GOOGLE_GEMINI_API_KEY or GEMINI_API_KEY is not configured" },
      { status: 500 }
    );
  }
  try {
    const body = await request.json();
    const { prompt, imageBase64, imageMimeType, aspectRatio } = body;
    if (!prompt || typeof prompt !== "string") {
      return NextResponse.json(
        { error: "prompt is required" },
        { status: 400 }
      );
    }
    let imageUrl: string;
    let textOnlyFallback = false;
    if (imageBase64 && typeof imageBase64 === "string") {
      try {
        imageUrl = await generateImageFromImage(
          apiKey,
          prompt,
          imageBase64,
          typeof imageMimeType === "string" ? imageMimeType : "image/png",
          typeof aspectRatio === "string" ? aspectRatio : undefined
        );
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.includes("No content") || msg.includes("No image in response") || msg.includes("No response")) {
          imageUrl = await generateImage(apiKey, prompt);
          textOnlyFallback = true;
        } else {
          throw err;
        }
      }
    } else {
      imageUrl = await generateImage(apiKey, prompt);
    }
    return NextResponse.json({ imageUrl, status: "success", textOnlyFallback });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Generation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json(
    { error: "Use POST with a prompt to generate images (Gemini returns image directly)" },
    { status: 400 }
  );
}
