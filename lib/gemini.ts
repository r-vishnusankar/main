import { GoogleGenAI } from "@google/genai";

const MODEL = process.env.GEMINI_IMAGE_MODEL || "gemini-2.5-flash-image";
const TEXT_MODEL = process.env.GEMINI_TEXT_MODEL || "gemini-2.0-flash";
const VISION_MODEL = process.env.GEMINI_VISION_MODEL || "gemini-2.0-flash";

// Force official Google endpoint to bypass Netlify AI Gateway hijacking
const GOOGLE_API_HOST = "https://generativelanguage.googleapis.com";

/**
 * Helper to call Gemini API via fetch to bypass package-level redirects (like Netlify AI Gateway).
 * This ensures the specialized 'gemini-2.5-flash-image' model works in all environments.
 */
async function callGeminiApi(apiKey: string, model: string, body: any) {
  const url = `${GOOGLE_API_HOST}/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Gemini API Error (${res.status}): ${errorText}`);
  }

  return await res.json();
}

/**
 * Generate an image from a text prompt using Gemini image model.
 * Returns a data URL (data:image/png;base64,...) for the generated image.
 */
export async function generateImage(apiKey: string, prompt: string): Promise<string> {
  const data = await callGeminiApi(apiKey, MODEL, {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      responseModalities: ["TEXT", "IMAGE"],
    },
  });

  const parts = data.candidates?.[0]?.content?.parts || [];
  for (const part of parts) {
    if (part.inlineData?.data) {
      const mimeType = part.inlineData.mimeType || "image/png";
      return `data:${mimeType};base64,${part.inlineData.data}`;
    }
  }

  throw new Error("No image in response. Your prompt may have been blocked or the model is unavailable.");
}

/**
 * Generate a banner from a product image + instructions (image editing).
 */
export async function generateImageFromImage(
  apiKey: string,
  prompt: string,
  imageBase64: string,
  imageMimeType: string = "image/png",
  _aspectRatio?: string
): Promise<string> {
  const data = await callGeminiApi(apiKey, MODEL, {
    contents: [
      {
        role: "user",
        parts: [
          { inlineData: { mimeType: imageMimeType, data: imageBase64 } },
          { text: prompt },
        ],
      },
    ],
    generationConfig: {
      responseModalities: ["TEXT", "IMAGE"],
    },
  });

  const parts = data.candidates?.[0]?.content?.parts || [];
  for (const part of parts) {
    if (part.inlineData?.data) {
      const mimeType = part.inlineData.mimeType || "image/png";
      return `data:${mimeType};base64,${part.inlineData.data}`;
    }
  }

  throw new Error("No image in response");
}

/**
 * Generate an image from multiple reference images + prompt.
 */
export async function generateImageFromMultipleImages(
  apiKey: string,
  prompt: string,
  images: { base64: string; mimeType: string }[],
  _aspectRatio?: string
): Promise<string> {
  const imageParts = images.map((img) => ({
    inlineData: { mimeType: img.mimeType, data: img.base64 },
  }));

  const data = await callGeminiApi(apiKey, MODEL, {
    contents: [
      {
        role: "user",
        parts: [...imageParts, { text: prompt }],
      },
    ],
    generationConfig: {
      responseModalities: ["TEXT", "IMAGE"],
    },
  });

  const parts = data.candidates?.[0]?.content?.parts || [];
  for (const part of parts) {
    if (part.inlineData?.data) {
      const mimeType = part.inlineData.mimeType || "image/png";
      return `data:${mimeType};base64,${part.inlineData.data}`;
    }
  }

  throw new Error("No image in response");
}

/**
 * Generate social media text content from a topic string.
 */
export async function generatePostText(
  apiKey: string,
  topic: string,
  tone: string = "professional"
): Promise<{ socialCaption: string; hashtags: string[]; blogDescription: string }> {
  const prompt = `You are a social media content creator. Generate engaging post content for the following topic.

Topic: ${topic}
Tone: ${tone}

Return ONLY valid JSON (no markdown, no code fences) in this exact shape:
{
  "socialCaption": "engaging social media caption (max 280 chars)",
  "hashtags": ["tag1", "tag2", "tag3", "tag4", "tag5"],
  "blogDescription": "longer description suitable for LinkedIn or a blog post (max 500 chars)"
}`;

  const data = await callGeminiApi(apiKey, TEXT_MODEL, {
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: {
      responseMimeType: "application/json"
    }
  });

  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("Gemini did not return valid JSON for text content.");
  const parsed = JSON.parse(jsonMatch[0]);

  return {
    socialCaption: parsed.socialCaption ?? "",
    hashtags: Array.isArray(parsed.hashtags) ? parsed.hashtags : [],
    blogDescription: parsed.blogDescription ?? "",
  };
}

/**
 * Analyze an image and return a text description.
 */
export async function describeImage(
  apiKey: string,
  imageBase64: string,
  imageMimeType: string,
  prompt: string,
  maxOutputTokens = 2048
): Promise<string> {
  const data = await callGeminiApi(apiKey, VISION_MODEL, {
    contents: [
      {
        role: "user",
        parts: [
          { inlineData: { mimeType: imageMimeType, data: imageBase64 } },
          { text: prompt },
        ],
      },
    ],
    generationConfig: {
      maxOutputTokens,
    },
  });

  return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "No text description generated.";
}
