import { NextRequest, NextResponse } from "next/server";
import { generateImage, generateImageFromImage, generateImageFromMultipleImages } from "@/lib/gemini";
import { validateGeneratedImage } from "@/lib/validateGeneratedImage";
import { isEnhanceAvailable, enhanceImage } from "@/lib/enhanceImage";
import { buildTextToImagePrompt } from "@/lib/imagePrompt";
import { auth, currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

const rawApiKey = process.env.GOOGLE_GEMINI_API_KEY ?? process.env.GEMINI_API_KEY ?? process.env.NANOBANANA_API_KEY;
const apiKey = rawApiKey?.trim();

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
    const bypassAuth = process.env.DISABLE_AUTH === 'true';
    let userId: string | null = bypassAuth ? null : (await auth()).userId;
    if (bypassAuth) userId = 'test-bypass-user';
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized. Please log in." }, { status: 401 });
    }

    // Attempt to sync user from Clerk to local DB if they don't exist
    let user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      const cUser = await currentUser();
      const email = cUser?.emailAddresses[0]?.emailAddress || `${userId}@placeholder.com`;
      // Check if user exists by email (e.g. same person, different Clerk id) to avoid unique constraint
      user = await prisma.user.findUnique({ where: { email } });
      if (user) {
        userId = user.id; // Use existing user
      } else {
        user = await prisma.user.create({ data: { id: userId, email: email, credits: 50 } });
      }
    }

    if (user.credits <= 0) {
      return NextResponse.json({ error: "Insufficient credits. Please upgrade your plan." }, { status: 403 });
    }

    const body = await request.json();
    const { prompt, imageBase64, imageMimeType, aspectRatio, enhanceQuality, images } = body;
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
      // Multi-image: images array
      const imagesArray = Array.isArray(images) ? images : [];
      const validImages = imagesArray.filter(
        (img: unknown) =>
          img &&
          typeof img === "object" &&
          typeof (img as { imageBase64?: string }).imageBase64 === "string"
      );
      if (validImages.length > 0) {
        const imagesForApi = validImages.map((img: { imageBase64: string; imageMimeType?: string }) => ({
          base64: img.imageBase64,
          mimeType: typeof img.imageMimeType === "string" ? img.imageMimeType : "image/png",
        }));
        try {
          return await generateImageFromMultipleImages(apiKey, usePrompt, imagesForApi, aspect);
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
      // Single image: imageBase64/imageMimeType
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

    // Deduct 1 credit & save image record
    await prisma.$transaction([
      prisma.user.update({
        where: { id: userId },
        data: { credits: { decrement: 1 } },
      }),
      prisma.image.create({
        data: {
          url: imageUrl,
          userId: userId,
          prompt: prompt,
        },
      }),
    ]);

    return NextResponse.json({ imageUrl, status: "success", textOnlyFallback, creditsRemaining: user.credits - 1 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Generation failed";
    console.error("[generate-image] Error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json(
    { error: "Use POST with a prompt to generate images (Gemini returns image directly)" },
    { status: 400 }
  );
}
