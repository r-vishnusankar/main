/**
 * Optional image enhancement (e.g. Toonify-style) via external API.
 * Set ENHANCE_IMAGE_API_URL (and optionally ENHANCE_IMAGE_API_KEY) in env to enable.
 * API is expected to accept POST with image (base64 or URL) and return enhanced image as base64 or URL.
 */

const ENHANCE_API_URL = process.env.ENHANCE_IMAGE_API_URL || process.env.TOONIFY_API_URL;
const ENHANCE_API_KEY = process.env.ENHANCE_IMAGE_API_KEY || process.env.TOONIFY_API_KEY;

export function isEnhanceAvailable(): boolean {
  return Boolean(ENHANCE_API_URL?.trim());
}

/**
 * Send image to enhancement API. Returns enhanced image as data URL or null if disabled/failed.
 * Expects API to accept: POST, body { imageBase64, mimeType? } or { imageUrl }, returns { imageUrl } or { imageBase64, mimeType? }.
 */
export async function enhanceImage(dataUrl: string): Promise<string | null> {
  if (!ENHANCE_API_URL?.trim()) return null;
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) return null;
  const [, mimeType, base64] = match;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (ENHANCE_API_KEY) headers["Authorization"] = `Bearer ${ENHANCE_API_KEY}`;
  try {
    const res = await fetch(ENHANCE_API_URL, {
      method: "POST",
      headers,
      body: JSON.stringify({ imageBase64: base64, mimeType }),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { imageUrl?: string; imageBase64?: string; mimeType?: string };
    if (json.imageUrl) {
      const imgRes = await fetch(json.imageUrl);
      const blob = await imgRes.blob();
      const buf = Buffer.from(await blob.arrayBuffer());
      const b64 = buf.toString("base64");
      const mime = blob.type || "image/png";
      return `data:${mime};base64,${b64}`;
    }
    if (json.imageBase64) {
      const mime = json.mimeType || "image/png";
      return `data:${mime};base64,${json.imageBase64}`;
    }
  } catch {
    // ignore
  }
  return null;
}
