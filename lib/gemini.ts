import { GoogleGenAI } from "@google/genai";

const MODEL = process.env.GEMINI_IMAGE_MODEL || "gemini-2.5-flash-image";

/**
 * Generate an image from a text prompt using Gemini image model.
 * Returns a data URL (data:image/png;base64,...) for the generated image.
 * Requires responseModalities: ["TEXT", "IMAGE"] so the API returns image output.
 */
export async function generateImage(apiKey: string, prompt: string): Promise<string> {
  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model: MODEL,
    contents: prompt,
    config: {
      responseModalities: ["TEXT", "IMAGE"],
    },
  });

  const candidates = response.candidates;
  if (!candidates?.length) {
    const feedback = (response as { promptFeedback?: { blockReason?: string } }).promptFeedback;
    const reason = feedback?.blockReason ? ` (${feedback.blockReason})` : "";
    throw new Error(`No response from Gemini${reason}. Check your API key and quota.`);
  }

  const parts = candidates[0].content?.parts ?? [];
  if (!parts.length) {
    const finishReason = (candidates[0] as { finishReason?: string }).finishReason;
    throw new Error(
      `No content in response (${finishReason ?? "OTHER"}). ` +
        "The model may have blocked the output (e.g. safety or policy). Try a simpler, generic prompt and avoid brand/character names."
    );
  }

  for (const part of parts) {
    if (part.inlineData?.data) {
      const mimeType = part.inlineData.mimeType ?? "image/png";
      return `data:${mimeType};base64,${part.inlineData.data}`;
    }
  }

  throw new Error("No image in response");
}

/**
 * Generate a banner from a product image + instructions (image editing).
 * Uses the uploaded image as the base. Requires responseModalities so the API returns an image.
 * Request format: single user Content with image part first, then text (recommended for image-in).
 */
export async function generateImageFromImage(
  apiKey: string,
  prompt: string,
  imageBase64: string,
  imageMimeType: string = "image/png",
  _aspectRatio?: string
): Promise<string> {
  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model: MODEL,
    contents: [
      {
        role: "user",
        parts: [
          { inlineData: { mimeType: imageMimeType, data: imageBase64 } },
          { text: prompt },
        ],
      },
    ],
    config: {
      responseModalities: ["TEXT", "IMAGE"],
    },
  });

  const candidates = response.candidates;
  if (!candidates?.length) {
    const feedback = (response as { promptFeedback?: { blockReason?: string } }).promptFeedback;
    const reason = feedback?.blockReason ? ` (${feedback.blockReason})` : "";
    throw new Error(`No response from Gemini${reason}. Check your API key and quota.`);
  }

  const parts = candidates[0].content?.parts ?? [];
  if (!parts.length) {
    const finishReason = (candidates[0] as { finishReason?: string }).finishReason;
    throw new Error(
      `No content in response (${finishReason ?? "OTHER"}). ` +
        "The model may have blocked the output. Try a simpler prompt or a different product image."
    );
  }

  for (const part of parts) {
    if (part.inlineData?.data) {
      const mimeType = part.inlineData.mimeType ?? "image/png";
      return `data:${mimeType};base64,${part.inlineData.data}`;
    }
  }

  throw new Error("No image in response");
}
