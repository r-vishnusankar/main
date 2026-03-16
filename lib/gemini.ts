import { GoogleGenerativeAI, Part } from "@google/generative-ai";

const MODEL = process.env.GEMINI_IMAGE_MODEL || "gemini-2.0-flash";

/**
 * Generate an image from a text prompt using Gemini image model.
 * Returns a data URL (data:image/png;base64,...) for the generated image.
 * Requires responseModalities: ["TEXT", "IMAGE"] so the API returns image output.
 */
export async function generateImage(apiKey: string, prompt: string): Promise<string> {
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: MODEL });

  const result = await model.generateContent({
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: {
      // @ts-ignore - responseModalities is a newer field
      responseModalities: ["TEXT", "IMAGE"],
    },
  });

  const response = result.response;
  const candidates = response.candidates;

  if (!candidates?.length) {
    const feedback = (response as any).promptFeedback;
    const reason = feedback?.blockReason ? ` (${feedback.blockReason})` : "";
    throw new Error(`No response from Gemini${reason}. Check your API key and quota.`);
  }

  const parts = candidates[0].content?.parts ?? [];
  if (!parts.length) {
    const finishReason = candidates[0].finishReason;
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
 */
export async function generateImageFromImage(
  apiKey: string,
  prompt: string,
  imageBase64: string,
  imageMimeType: string = "image/png",
  _aspectRatio?: string
): Promise<string> {
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: MODEL });

  const result = await model.generateContent({
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
      // @ts-ignore
      responseModalities: ["TEXT", "IMAGE"],
    },
  });

  const response = result.response;
  const candidates = response.candidates;

  if (!candidates?.length) {
    const feedback = (response as any).promptFeedback;
    const reason = feedback?.blockReason ? ` (${feedback.blockReason})` : "";
    throw new Error(`No response from Gemini${reason}. Check your API key and quota.`);
  }

  const parts = candidates[0].content?.parts ?? [];
  if (!parts.length) {
    const finishReason = candidates[0].finishReason;
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

/**
 * Generate an image from multiple reference images + prompt (multi-image composition/blending).
 */
export async function generateImageFromMultipleImages(
  apiKey: string,
  prompt: string,
  images: { base64: string; mimeType: string }[],
  _aspectRatio?: string
): Promise<string> {
  if (!images?.length) {
    throw new Error("At least one image is required for multi-image generation");
  }
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: MODEL });

  const imageParts: Part[] = images.map((img) => ({
    inlineData: { mimeType: img.mimeType, data: img.base64 },
  }));

  const result = await model.generateContent({
    contents: [
      {
        role: "user",
        parts: [...imageParts, { text: prompt }],
      },
    ],
    generationConfig: {
      // @ts-ignore
      responseModalities: ["TEXT", "IMAGE"],
    },
  });

  const response = result.response;
  const candidates = response.candidates;

  if (!candidates?.length) {
    const feedback = (response as any).promptFeedback;
    const reason = feedback?.blockReason ? ` (${feedback.blockReason})` : "";
    throw new Error(`No response from Gemini${reason}. Check your API key and quota.`);
  }

  const parts = candidates[0].content?.parts ?? [];
  if (!parts.length) {
    const finishReason = candidates[0].finishReason;
    throw new Error(
      `No content in response (${finishReason ?? "OTHER"}). ` +
        "The model may have blocked the output. Try a simpler prompt or different reference images."
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

const TEXT_MODEL = process.env.GEMINI_TEXT_MODEL || "gemini-2.0-flash";

/**
 * Generate social media text content from a topic string (no image required).
 */
export async function generatePostText(
  apiKey: string,
  topic: string,
  tone: string = "professional"
): Promise<{ socialCaption: string; hashtags: string[]; blogDescription: string }> {
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: TEXT_MODEL });

  const prompt = `You are a social media content creator. Generate engaging post content for the following topic.

Topic: ${topic}
Tone: ${tone}

Return ONLY valid JSON (no markdown, no code fences) in this exact shape:
{
  "socialCaption": "engaging social media caption (max 280 chars)",
  "hashtags": ["tag1", "tag2", "tag3", "tag4", "tag5"],
  "blogDescription": "longer description suitable for LinkedIn or a blog post (max 500 chars)"
}`;

  const result = await model.generateContent(prompt);
  const response = result.response;
  const text = response.text();

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("Gemini did not return valid JSON for text content.");
  const parsed = JSON.parse(jsonMatch[0]);

  return {
    socialCaption: parsed.socialCaption ?? "",
    hashtags: Array.isArray(parsed.hashtags) ? parsed.hashtags : [],
    blogDescription: parsed.blogDescription ?? "",
  };
}

const VISION_MODEL = process.env.GEMINI_VISION_MODEL || "gemini-2.0-flash";

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
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: VISION_MODEL });

  const result = await model.generateContent({
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

  const response = result.response;
  return response.text().trim();
}
