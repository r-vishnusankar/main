import { GoogleGenAI } from "@google/genai";

const MODEL = "gemini-2.5-flash-image";

/**
 * Generate an image from a text prompt using Gemini 2.5 Flash Image.
 * Returns a data URL (data:image/png;base64,...) for the generated image.
 */
export async function generateImage(apiKey: string, prompt: string): Promise<string> {
  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model: MODEL,
    contents: prompt,
  });

  const candidates = response.candidates;
  if (!candidates?.length) {
    throw new Error("No response from Gemini");
  }

  const parts = candidates[0].content?.parts;
  if (!parts?.length) {
    throw new Error("No content in response");
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
 * Generate a banner from a product image + instructions using Gemini 2.5 Flash Image (image editing).
 * Uses the uploaded image as the base and follows style, layout, background, text placement, and design preferences.
 * Returns a data URL for the generated banner.
 */
export async function generateImageFromImage(
  apiKey: string,
  prompt: string,
  imageBase64: string,
  imageMimeType: string = "image/png"
): Promise<string> {
  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model: MODEL,
    contents: [
      { text: prompt },
      { inlineData: { mimeType: imageMimeType, data: imageBase64 } },
    ],
  });

  const candidates = response.candidates;
  if (!candidates?.length) {
    throw new Error("No response from Gemini");
  }

  const parts = candidates[0].content?.parts;
  if (!parts?.length) {
    throw new Error("No content in response");
  }

  for (const part of parts) {
    if (part.inlineData?.data) {
      const mimeType = part.inlineData.mimeType ?? "image/png";
      return `data:${mimeType};base64,${part.inlineData.data}`;
    }
  }

  throw new Error("No image in response");
}
