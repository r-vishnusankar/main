/**
 * Shared publish logic for immediate publish and cron-scheduled publish.
 */

const META_PAGE_ID = process.env.META_PAGE_ID;
const META_PAGE_ACCESS_TOKEN = process.env.META_PAGE_ACCESS_TOKEN;
const WHATSAPP_PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
const WHATSAPP_ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN ?? process.env.META_PAGE_ACCESS_TOKEN;
const WHATSAPP_TO_PHONE = process.env.WHATSAPP_TO_PHONE; // optional: default recipient
const SHOPIFY_STORE = process.env.SHOPIFY_STORE;
const SHOPIFY_ACCESS_TOKEN = process.env.SHOPIFY_ACCESS_TOKEN;
const SHOPIFY_BLOG_ID = process.env.SHOPIFY_BLOG_ID;

function parseDataUrl(imageUrl: string): { mimeType: string; buffer: Buffer } | null {
  const match = imageUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) return null;
  const mimeType = match[1];
  const base64 = match[2];
  const buffer = Buffer.from(base64, "base64");
  return { mimeType, buffer };
}

export async function publishToMeta(imageUrl: string, message: string): Promise<{ externalId: string }> {
  if (!META_PAGE_ID || !META_PAGE_ACCESS_TOKEN) {
    throw new Error("Meta (Facebook) is not configured. Set META_PAGE_ID and META_PAGE_ACCESS_TOKEN in .env.local.");
  }
  const parsed = parseDataUrl(imageUrl);
  if (!parsed) throw new Error("Invalid image data URL");

  const { buffer, mimeType } = parsed;
  const ext = mimeType === "image/png" ? "png" : "jpg";
  const blob = new Blob([new Uint8Array(buffer)], { type: mimeType });
  const formData = new FormData();
  formData.append("source", blob, `image.${ext}`);
  formData.append("message", message);

  const url = `https://graph.facebook.com/v21.0/${META_PAGE_ID}/photos?access_token=${encodeURIComponent(META_PAGE_ACCESS_TOKEN)}`;
  const res = await fetch(url, {
    method: "POST",
    body: formData,
  });

  const data = await res.json();
  if (data.error) {
    throw new Error(data.error.message || "Meta API error");
  }
  return { externalId: data.id || data.post_id };
}

/**
 * WhatsApp Cloud API: send image with caption to a phone number.
 * Requires WHATSAPP_PHONE_NUMBER_ID and WHATSAPP_ACCESS_TOKEN (or META_PAGE_ACCESS_TOKEN).
 * Recipient from payload.to or env WHATSAPP_TO_PHONE (e.g. 919876543210).
 */
export async function publishToWhatsApp(
  imageUrl: string,
  caption: string,
  to?: string
): Promise<{ externalId: string }> {
  const phoneNumberId = WHATSAPP_PHONE_NUMBER_ID;
  const token = WHATSAPP_ACCESS_TOKEN;
  if (!phoneNumberId || !token) {
    throw new Error(
      "WhatsApp is not configured. Set WHATSAPP_PHONE_NUMBER_ID and WHATSAPP_ACCESS_TOKEN (or META_PAGE_ACCESS_TOKEN) in .env.local."
    );
  }
  const recipient = (to || WHATSAPP_TO_PHONE || "").trim();
  if (!recipient) {
    throw new Error("WhatsApp recipient required. Set WHATSAPP_TO_PHONE in .env or provide 'to' in the request.");
  }
  const parsed = parseDataUrl(imageUrl);
  if (!parsed) throw new Error("Invalid image data URL for WhatsApp");

  const url = `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`;
  const formData = new FormData();
  const blob = new Blob([new Uint8Array(parsed.buffer)], { type: parsed.mimeType });
  formData.append("file", blob, "image.jpg");
  formData.append("type", "image/jpeg");
  formData.append("messaging_product", "whatsapp");
  const uploadUrl = `https://graph.facebook.com/v21.0/${phoneNumberId}/media`;
  const uploadRes = await fetch(uploadUrl, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });
  const uploadData = (await uploadRes.json()) as { id?: string; error?: { message?: string } };
  if (uploadData.error || !uploadData.id) {
    throw new Error(uploadData.error?.message || "WhatsApp media upload failed");
  }

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      recipient: { phone_number: recipient.replace(/\D/g, "") },
      type: "image",
      image: { id: uploadData.id },
      caption: caption ? caption.slice(0, 1024) : undefined,
    }),
  });
  const data = (await res.json()) as { messages?: { id: string }[]; error?: { message?: string } };
  if (data.error) throw new Error(data.error.message || "WhatsApp API error");
  const messageId = data.messages?.[0]?.id;
  if (!messageId) throw new Error("WhatsApp did not return message id");
  return { externalId: messageId };
}

export async function publishToShopifyBlog(
  imageUrl: string,
  title: string,
  bodyHtml: string
): Promise<{ externalId: string }> {
  if (!SHOPIFY_STORE || !SHOPIFY_ACCESS_TOKEN || !SHOPIFY_BLOG_ID) {
    throw new Error(
      "Shopify blog is not configured. Set SHOPIFY_STORE, SHOPIFY_ACCESS_TOKEN, and SHOPIFY_BLOG_ID in .env.local."
    );
  }
  const parsed = parseDataUrl(imageUrl);
  const store = SHOPIFY_STORE.replace(/\.myshopify\.com$/, "");
  const baseUrl = `https://${store}.myshopify.com/admin/api/2024-01`;

  const articleBody = parsed
    ? `${bodyHtml}<p><img src="${imageUrl}" alt="Post image" style="max-width:100%;" /></p>`
    : bodyHtml;

  const res = await fetch(`${baseUrl}/blogs/${SHOPIFY_BLOG_ID}/articles.json`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": SHOPIFY_ACCESS_TOKEN,
    },
    body: JSON.stringify({
      article: {
        title: title || "New post",
        body_html: articleBody,
      },
    }),
  });

  const data = await res.json();
  if (data.errors) {
    const msg = typeof data.errors === "string" ? data.errors : JSON.stringify(data.errors);
    throw new Error(`Shopify API: ${msg}`);
  }
  const id = data.article?.id;
  if (!id) throw new Error("Shopify did not return article id");
  return { externalId: String(id) };
}

export interface PublishPayload {
  imageUrl: string;
  socialCaption?: string;
  blogDescription?: string;
  platform: string;
  /** WhatsApp recipient phone (e.g. 919876543210). Optional if WHATSAPP_TO_PHONE is set. */
  to?: string;
}

export async function doPublish(payload: PublishPayload): Promise<{ externalId: string }> {
  const { imageUrl, socialCaption, blogDescription, platform, to } = payload;
  const caption = [socialCaption, blogDescription].filter(Boolean).join("\n\n") || "Post";
  const platformNorm = (platform || "facebook").toLowerCase();

  if (
    platformNorm === "facebook" ||
    platformNorm === "instagram" ||
    (platformNorm === "social" && META_PAGE_ID && META_PAGE_ACCESS_TOKEN)
  ) {
    return publishToMeta(imageUrl, caption);
  }

  if (platformNorm === "whatsapp") {
    return publishToWhatsApp(imageUrl, caption, to);
  }

  if (
    platformNorm === "shopify_blog" ||
    (platformNorm === "blog" && SHOPIFY_STORE && SHOPIFY_ACCESS_TOKEN && SHOPIFY_BLOG_ID)
  ) {
    const title = (socialCaption || "New post").slice(0, 100);
    return publishToShopifyBlog(imageUrl, title, blogDescription || socialCaption || "");
  }

  throw new Error(`Unsupported or unconfigured platform: ${platform}`);
}
