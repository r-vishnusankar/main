/**
 * Server-side only. Used by cron to generate images and full post packages
 * for scheduled jobs.
 */

import { generateImage, generateImageFromImage, describeImage } from "@/lib/gemini";
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
 * Used for "generate_then_post" job type.
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

export interface FullPostPackage {
  imageUrl: string;
  socialCaption: string;
  hashtags: string[];
  altText: string;
  blogDescription: string;
}

/**
 * Auto-generate a complete post package: image + caption + hashtags + alt text.
 * Used for "auto_generate" job type.
 */
export async function generateFullPostForSchedule(options: {
  apiKey: string;
  imagePrompt: string;
  aspectRatio: string;
  tone: string;
}): Promise<FullPostPackage> {
  const { apiKey, imagePrompt, aspectRatio, tone } = options;
  const fullPrompt = buildTextToImagePrompt(imagePrompt, aspectRatio, { noQualitySuffix: false });

  // Step 1: Generate image
  const imageUrl = await generateImage(apiKey, fullPrompt);

  // Step 2: Extract base64 from data URL for description
  const match = imageUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) {
    return {
      imageUrl,
      socialCaption: imagePrompt,
      hashtags: [],
      altText: imagePrompt,
      blogDescription: imagePrompt,
    };
  }
  const imageMimeType = match[1];
  const imageBase64 = match[2];

  // Step 3: Generate caption, hashtags, and alt text from the image
  const toneInstruction = tone
    ? `Write in a ${tone} tone.`
    : "Write in a professional and engaging tone.";

  const describePrompt = `You are a social media content creator.
${toneInstruction}
Analyze this image and provide a JSON response with exactly these fields:
{
  "socialCaption": "an engaging social media caption (max 220 chars)",
  "hashtags": ["array", "of", "5-10", "relevant", "hashtags", "without", "the", "# symbol"],
  "altText": "descriptive alt text for accessibility (max 120 chars)",
  "blogDescription": "a short blog/description paragraph (2-3 sentences)"
}
Only return valid JSON, no other text.`;

  let socialCaption = imagePrompt;
  let hashtags: string[] = [];
  let altText = imagePrompt;
  let blogDescription = imagePrompt;

  try {
    const raw = await describeImage(apiKey, imageBase64, imageMimeType, describePrompt, 1024);
    const cleaned = raw.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(cleaned);
    socialCaption = parsed.socialCaption ?? socialCaption;
    hashtags = Array.isArray(parsed.hashtags) ? parsed.hashtags : hashtags;
    altText = parsed.altText ?? altText;
    blogDescription = parsed.blogDescription ?? blogDescription;
  } catch {
    // If JSON parsing fails, use plain text as caption
  }

  return { imageUrl, socialCaption, hashtags, altText, blogDescription };
}

/**
 * Auto-generate only the text content (caption + hashtags) from a topic.
 * Used for "auto_generate" job type when autoGenerateType is "caption_only".
 */
export async function generateTextOnlyPostForSchedule(options: {
  apiKey: string;
  topic: string;
  tone: string;
}): Promise<Omit<FullPostPackage, "imageUrl"> & { imageUrl: "" }> {
  const { apiKey, topic, tone } = options;

  const toneInstruction = tone
    ? `Write in a ${tone} tone.`
    : "Write in a professional and engaging tone.";

  const prompt = `You are a social media content creator.
Topic: ${topic}
${toneInstruction}
Provide a JSON response with exactly these fields:
{
  "socialCaption": "an engaging social media caption (max 220 chars)",
  "hashtags": ["array", "of", "5-10", "relevant", "hashtags", "without", "the", "# symbol"],
  "blogDescription": "a short blog/description paragraph (2-3 sentences)"
}
Only return valid JSON, no other text.`;

  try {
    const { generatePostText } = await import("@/lib/gemini");
    // Actually using describeImage is not right if there is no image.
    // We should use a text model.
    const res = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=" + apiKey, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { response_mime_type: "application/json" }
      })
    });
    const data = await res.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
    const parsed = JSON.parse(text);

    return {
      imageUrl: "",
      socialCaption: parsed.socialCaption ?? topic,
      hashtags: Array.isArray(parsed.hashtags) ? parsed.hashtags : [],
      altText: "",
      blogDescription: parsed.blogDescription ?? topic,
    };
  } catch {
    return {
      imageUrl: "",
      socialCaption: topic,
      hashtags: [],
      altText: "",
      blogDescription: topic,
    };
  }
}
