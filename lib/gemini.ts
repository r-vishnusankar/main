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

const VISION_MODEL = process.env.GEMINI_VISION_MODEL || "gemini-2.0-flash";

/**
 * Analyze an image and return a text description (vision: image in, text out).
 * Used for generating social captions, alt text, and blog descriptions.
 * Does not use responseModalities; default text-only response.
 * @param maxOutputTokens - Optional. Increase for longer outputs (e.g. blog body). Default 2048.
 */
export async function describeImage(
  apiKey: string,
  imageBase64: string,
  imageMimeType: string,
  prompt: string,
  maxOutputTokens = 2048
): Promise<string> {
  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model: VISION_MODEL,
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
      maxOutputTokens,
    },
  });

  const candidates = response.candidates;
  if (!candidates?.length) {
    const feedback = (response as { promptFeedback?: { blockReason?: string } }).promptFeedback;
    const reason = feedback?.blockReason ? ` (${feedback.blockReason})` : "";
    throw new Error(`No response from Gemini${reason}. Check your API key and quota.`);
  }

  const parts = candidates[0].content?.parts ?? [];
  const textPart = parts.find((p): p is { text: string } => "text" in p && typeof (p as { text?: string }).text === "string");
  if (textPart?.text) {
    return textPart.text.trim();
  }

  const responseText = (response as { text?: () => string }).text;
  if (typeof responseText === "function") {
    const out = responseText.call(response);
    if (out && typeof out === "string") return out.trim();
  }

  throw new Error("No text in response");
}
