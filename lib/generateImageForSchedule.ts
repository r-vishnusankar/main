/**
 * Server-side only. Used by cron to generate an image for "generate_then_post" scheduled jobs.
 */

import { generateImage, generateImageFromImage } from "@/lib/gemini";
import { buildTextToImagePrompt } from "@/lib/imagePrompt";

export interface GenerateForScheduleOptions {
  apiKey: string;
  prompt: string;
  aspectRatio: string;
  imageBase64?: string | null;
  imageMimeType?: string | null;
}

/**
 * Returns data URL of the generated image.
 */
export async function generateImageForSchedule(options: GenerateForScheduleOptions): Promise<string> {
  const { apiKey, prompt, aspectRatio, imageBase64, imageMimeType } = options;
  const fullPrompt = buildTextToImagePrompt(prompt, aspectRatio, { noQualitySuffix: false });

  if (imageBase64 && imageMimeType) {
    try {
      return await generateImageFromImage(
        apiKey,
        fullPrompt,
        imageBase64,
        imageMimeType,
        aspectRatio
      );
    } catch {
      return await generateImage(apiKey, fullPrompt);
    }
  }
  return await generateImage(apiKey, fullPrompt);
}
