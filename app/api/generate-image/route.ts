import { NextRequest, NextResponse } from "next/server";
import { generateImage, generateImageFromImage } from "@/lib/gemini";
import { validateGeneratedImage } from "@/lib/validateGeneratedImage";
import { isEnhanceAvailable, enhanceImage } from "@/lib/enhanceImage";
import { buildTextToImagePrompt } from "@/lib/imagePrompt";

const apiKey = process.env.GOOGLE_GEMINI_API_KEY ?? process.env.GEMINI_API_KEY ?? process.env.NANOBANANA_API_KEY;

/** Minimal prompt for a single retry when validation fails (saves tokens). */
function retryPrompt(aspectRatio: string): string {
  return buildTextToImagePrompt("Professional marketing image, clean and sharp.", aspectRatio, {
    noQualitySuffix: false,
  });
}

export async function POST(request: NextRequest) {
  if (!apiKey) {
    return NextResponse.json(
      { error: "GOOGLE_GEMINI_API_KEY or GEMINI_API_KEY is not configured" },
      { status: 500 }
    );
  }
  try {
    const body = await request.json();
    const { prompt, imageBase64, imageMimeType, aspectRatio, enhanceQuality } = body;
    if (!prompt || typeof prompt !== "string") {
      return NextResponse.json(
        { error: "prompt is required" },
        { status: 400 }
      );
    }
    const aspect = typeof aspectRatio === "string" ? aspectRatio : "16:9";
    let imageUrl: string;
    let textOnlyFallback = false;

    const tryGenerate = async (usePrompt: string): Promise<string> => {
      if (imageBase64 && typeof imageBase64 === "string") {
        try {
          return await generateImageFromImage(
            apiKey,
            usePrompt,
            imageBase64,
            typeof imageMimeType === "string" ? imageMimeType : "image/png",
            aspect
          );
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          if (
            msg.includes("No content") ||
            msg.includes("No image in response") ||
            msg.includes("No response")
          ) {
            textOnlyFallback = true;
            return await generateImage(apiKey, usePrompt);
          }
          throw err;
        }
      }
      return await generateImage(apiKey, usePrompt);
    };

    imageUrl = await tryGenerate(prompt);
    const validation = validateGeneratedImage(imageUrl);
    if (!validation.ok) {
      imageUrl = await tryGenerate(retryPrompt(aspect));
      const retryValidation = validateGeneratedImage(imageUrl);
      if (!retryValidation.ok) {
        return NextResponse.json(
          { error: `Generated image failed validation: ${retryValidation.reason ?? "unknown"}` },
          { status: 502 }
        );
      }
    }

    if (enhanceQuality === true && isEnhanceAvailable()) {
      const enhanced = await enhanceImage(imageUrl);
      if (enhanced) imageUrl = enhanced;
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
