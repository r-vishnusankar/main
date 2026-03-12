/**
 * Shared publish logic for immediate publish and cron-scheduled publish.
 * Supports: Facebook, Instagram, WhatsApp, LinkedIn (personal profile), Shopify Blog.
 */

const META_PAGE_ID = process.env.META_PAGE_ID;
const META_PAGE_ACCESS_TOKEN = process.env.META_PAGE_ACCESS_TOKEN;
/** Instagram Business Account ID — distinct from Facebook Page ID.
 *  Get it via: GET /{META_PAGE_ID}?fields=instagram_business_account&access_token={token}
 */
const META_IG_ACCOUNT_ID = process.env.META_IG_ACCOUNT_ID;
/** ImgBB API key for temporary public image hosting (required for Instagram).
 *  Get a free key at: https://api.imgbb.com
 */
const IMGBB_API_KEY = process.env.IMGBB_API_KEY;
const WHATSAPP_PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
const WHATSAPP_ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN ?? process.env.META_PAGE_ACCESS_TOKEN;
const WHATSAPP_TO_PHONE = process.env.WHATSAPP_TO_PHONE;
const SHOPIFY_STORE = process.env.SHOPIFY_STORE;
const SHOPIFY_ACCESS_TOKEN = process.env.SHOPIFY_ACCESS_TOKEN;
const SHOPIFY_BLOG_ID = process.env.SHOPIFY_BLOG_ID;
const LINKEDIN_ACCESS_TOKEN = process.env.LINKEDIN_ACCESS_TOKEN;
const LINKEDIN_PERSON_URN = process.env.LINKEDIN_PERSON_URN;

function parseDataUrl(imageUrl: string): { mimeType: string; buffer: Buffer } | null {
  const match = imageUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) return null;
  const mimeType = match[1];
  const base64 = match[2];
  const buffer = Buffer.from(base64, "base64");
  return { mimeType, buffer };
}

/** Upload a base64 data URL image to ImgBB and return a public HTTPS URL.
 *  Required for Instagram which only accepts public image URLs.
 */
async function uploadImageToImgBB(imageUrl: string): Promise<string> {
  if (!IMGBB_API_KEY) {
    throw new Error("IMGBB_API_KEY is not set. Get a free key at https://api.imgbb.com and add it to .env.local.");
  }
  const parsed = parseDataUrl(imageUrl);
  if (!parsed) throw new Error("Invalid image data URL for ImgBB upload");

  const base64 = parsed.buffer.toString("base64");
  const form = new FormData();
  form.append("key", IMGBB_API_KEY);
  form.append("image", base64);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30_000);
  try {
    const res = await fetch("https://api.imgbb.com/1/upload", {
      method: "POST",
      body: form,
      signal: controller.signal,
    });
    const data = await res.json() as {
      success?: boolean;
      data?: { url?: string; display_url?: string };
      error?: { message?: string };
    };
    if (!data.success || !data.data?.url) {
      throw new Error(
        `ImgBB upload failed: ${
          typeof data.error === "object" ? data.error?.message : JSON.stringify(data)
        }`
      );
    }
    return data.data.url;
  } catch (err) {
    if ((err as Error).name === "AbortError") {
      throw new Error("ImgBB upload timed out after 30s. Check your internet connection.");
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Exchange a User Access Token for a Page-specific Access Token.
 * Facebook's Pages API (/photos, /feed) requires a Page Token, NOT a User Token.
 * Without this exchange the API returns: (#200) publish_actions are not available.
 */
async function getPageAccessToken(pageId: string, userToken: string): Promise<string> {
  try {
    const res = await fetch(
      `https://graph.facebook.com/v21.0/${pageId}?fields=access_token&access_token=${encodeURIComponent(userToken)}`
    );
    const data = await res.json() as { access_token?: string };
    if (data.access_token) return data.access_token;
  } catch {
    // fall through — return the original token as fallback
  }
  return userToken;
}

/** Facebook Page — post image to page feed.
 *  Auto-exchanges User Token → Page Token to avoid #200 publish_actions error.
 */
export async function publishToMeta(imageUrl: string, message: string): Promise<{ externalId: string }> {
  if (!META_PAGE_ID || !META_PAGE_ACCESS_TOKEN) {
    throw new Error("Meta (Facebook) is not configured. Set META_PAGE_ID and META_PAGE_ACCESS_TOKEN in .env.local.");
  }
  const parsed = parseDataUrl(imageUrl);
  if (!parsed) throw new Error("Invalid image data URL");

  // Exchange User Token → Page Token (fixes #200 publish_actions deprecated error)
  const pageToken = await getPageAccessToken(META_PAGE_ID, META_PAGE_ACCESS_TOKEN);

  const { buffer, mimeType } = parsed;
  const ext = mimeType === "image/png" ? "png" : "jpg";
  const blob = new Blob([new Uint8Array(buffer)], { type: mimeType });
  const formData = new FormData();
  formData.append("source", blob, `image.${ext}`);
  formData.append("message", message);

  const url = `https://graph.facebook.com/v21.0/${META_PAGE_ID}/photos?access_token=${encodeURIComponent(pageToken)}`;
  const res = await fetch(url, { method: "POST", body: formData });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message || "Facebook API error");
  return { externalId: data.id || data.post_id };
}

/**
 * Instagram Business Account — post an image using the proper 2-step
 * Instagram Content Publishing API.
 *
 * Step 1: Create a media container (image_url must be a public HTTPS URL).
 * Step 2: Publish the container.
 *
 * Requires:
 *   META_IG_ACCOUNT_ID  — Instagram Business Account ID
 *   META_PAGE_ACCESS_TOKEN — Page Access Token with instagram_content_publish scope
 *   IMGBB_API_KEY       — Free image hosting to make data URLs publicly accessible
 */
export async function publishToInstagram(
  imageUrl: string,
  caption: string
): Promise<{ externalId: string }> {
  const igUserId = META_IG_ACCOUNT_ID;
  const accessToken = META_PAGE_ACCESS_TOKEN;

  if (!igUserId || !accessToken) {
    throw new Error(
      "Instagram is not configured. Set META_IG_ACCOUNT_ID and META_PAGE_ACCESS_TOKEN in .env.local."
    );
  }

  // Instagram API requires a public HTTPS URL — upload via ImgBB first
  const publicImageUrl = await uploadImageToImgBB(imageUrl);

  // Exchange User Token → Page Token (Instagram requires Page Token scope)
  const pageId = process.env.META_PAGE_ID || "";
  const pageToken = await getPageAccessToken(pageId, accessToken);

  // ── Step 1: Create media container ─────────────────────────────────────────
  const containerController = new AbortController();
  const containerTimer = setTimeout(() => containerController.abort(), 60_000); // Increased to 60s
  let containerData: { id?: string; error?: { message?: string; code?: number } };
  try {
    const containerRes = await fetch(
      `https://graph.facebook.com/v21.0/${igUserId}/media`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image_url: publicImageUrl,
          caption: caption.slice(0, 2200),
          access_token: pageToken,
        }),
        signal: containerController.signal,
      }
    );
    containerData = await containerRes.json();
    console.log(`[Instagram] Container data:`, JSON.stringify(containerData));
  } catch (err) {
    if ((err as Error).name === "AbortError") {
      throw new Error("Instagram container creation timed out after 30s.");
    }
    throw err;
  } finally {
    clearTimeout(containerTimer);
  }

  if (containerData.error || !containerData.id) {
    throw new Error(
      containerData.error?.message ||
        `Instagram container creation failed (code ${
          containerData.error?.code ?? "unknown"
        }). Check token permissions: instagram_content_publish, instagram_basic, pages_manage_posts.`
    );
  }

  const creationId = containerData.id;

  // ── Step 2: Publish the container ──────────────────────────────────────────
  const publishController = new AbortController();
  const publishTimer = setTimeout(() => publishController.abort(), 30_000);
  let publishData: { id?: string; error?: { message?: string; code?: number } };
  try {
    const publishRes = await fetch(
      `https://graph.facebook.com/v21.0/${igUserId}/media_publish`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          creation_id: creationId,
          access_token: pageToken,
        }),
        signal: publishController.signal,
      }
    );
    publishData = await publishRes.json();
    console.log(`[Instagram] Publish data:`, JSON.stringify(publishData));
  } catch (err) {
    if ((err as Error).name === "AbortError") {
      throw new Error("Instagram publish timed out after 30s.");
    }
    throw err;
  } finally {
    clearTimeout(publishTimer);
  }
  if (publishData.error || !publishData.id) {
    throw new Error(
      publishData.error?.message ||
        `Instagram publish failed (code ${
          publishData.error?.code ?? "unknown"
        }).`
    );
  }

  return { externalId: publishData.id };
}

/** Facebook text-only feed post (no image). Instagram does not support text-only via API. */
export async function publishTextToFacebook(message: string): Promise<{ externalId: string }> {
  if (!META_PAGE_ID || !META_PAGE_ACCESS_TOKEN) {
    throw new Error("Meta (Facebook) is not configured. Set META_PAGE_ID and META_PAGE_ACCESS_TOKEN in .env.local.");
  }
  // Exchange User Token → Page Token
  const pageToken = await getPageAccessToken(META_PAGE_ID, META_PAGE_ACCESS_TOKEN);
  const url = `https://graph.facebook.com/v21.0/${META_PAGE_ID}/feed`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, access_token: pageToken }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message || "Meta API error");
  return { externalId: data.id || data.post_id };
}

/** WhatsApp text-only message. */
export async function publishTextToWhatsApp(
  message: string,
  to?: string
): Promise<{ externalId: string }> {
  const phoneNumberId = WHATSAPP_PHONE_NUMBER_ID;
  const token = WHATSAPP_ACCESS_TOKEN;
  if (!phoneNumberId || !token) {
    throw new Error(
      "WhatsApp is not configured. Set WHATSAPP_PHONE_NUMBER_ID and WHATSAPP_ACCESS_TOKEN in .env.local."
    );
  }
  const recipient = (to || WHATSAPP_TO_PHONE || "").trim();
  if (!recipient) {
    throw new Error("WhatsApp recipient required. Set WHATSAPP_TO_PHONE in .env or provide 'to' in the request.");
  }
  const url = `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: recipient.replace(/\D/g, ""),
      type: "text",
      text: { body: message.slice(0, 4096) },
    }),
  });
  const data = (await res.json()) as { messages?: { id: string }[]; error?: { message?: string } };
  if (data.error) throw new Error(data.error.message || "WhatsApp API error");
  const messageId = data.messages?.[0]?.id;
  if (!messageId) throw new Error("WhatsApp did not return message id");
  return { externalId: messageId };
}

/**
 * WhatsApp Cloud API: send image with caption to a phone number.
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

/** LinkedIn text-only post (no image). Uses shareMediaCategory: NONE. */
export async function publishTextToLinkedIn(text: string): Promise<{ externalId: string }> {
  if (!LINKEDIN_ACCESS_TOKEN || !LINKEDIN_PERSON_URN) {
    throw new Error(
      "LinkedIn is not configured. Set LINKEDIN_ACCESS_TOKEN and LINKEDIN_PERSON_URN in .env.local."
    );
  }
  const headers = {
    Authorization: `Bearer ${LINKEDIN_ACCESS_TOKEN}`,
    "Content-Type": "application/json",
    "X-Restli-Protocol-Version": "2.0.0",
  };
  const postRes = await fetch("https://api.linkedin.com/v2/ugcPosts", {
    method: "POST",
    headers,
    body: JSON.stringify({
      author: LINKEDIN_PERSON_URN,
      lifecycleState: "PUBLISHED",
      specificContent: {
        "com.linkedin.ugc.ShareContent": {
          shareCommentary: { text: text.slice(0, 3000) },
          shareMediaCategory: "NONE",
        },
      },
      visibility: { "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC" },
    }),
  });
  const postData = (await postRes.json()) as { id?: string; message?: string };
  if (!postData.id) {
    throw new Error(`LinkedIn post creation failed: ${postData.message ?? JSON.stringify(postData)}`);
  }
  return { externalId: postData.id };
}

/**
 * LinkedIn personal profile publishing via UGC Posts API.
 * Requires LINKEDIN_ACCESS_TOKEN (OAuth 2.0 with w_member_social scope)
 * and LINKEDIN_PERSON_URN (e.g. urn:li:person:XXXXXXXX).
 */
export async function publishToLinkedIn(
  imageUrl: string,
  caption: string
): Promise<{ externalId: string }> {
  if (!LINKEDIN_ACCESS_TOKEN || !LINKEDIN_PERSON_URN) {
    throw new Error(
      "LinkedIn is not configured. Set LINKEDIN_ACCESS_TOKEN and LINKEDIN_PERSON_URN in .env.local."
    );
  }

  const parsed = parseDataUrl(imageUrl);
  if (!parsed) throw new Error("Invalid image data URL for LinkedIn");

  const headers = {
    Authorization: `Bearer ${LINKEDIN_ACCESS_TOKEN}`,
    "Content-Type": "application/json",
    "X-Restli-Protocol-Version": "2.0.0",
  };

  // Step 1: Register image upload
  const registerRes = await fetch("https://api.linkedin.com/v2/assets?action=registerUpload", {
    method: "POST",
    headers,
    body: JSON.stringify({
      registerUploadRequest: {
        recipes: ["urn:li:digitalmediaRecipe:feedshare-image"],
        owner: LINKEDIN_PERSON_URN,
        serviceRelationships: [
          {
            relationshipType: "OWNER",
            identifier: "urn:li:userGeneratedContent",
          },
        ],
      },
    }),
  });

  const registerData = (await registerRes.json()) as {
    value?: {
      asset?: string;
      uploadMechanism?: {
        "com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest"?: {
          uploadUrl?: string;
        };
      };
    };
    message?: string;
  };

  if (!registerData.value?.asset) {
    throw new Error(
      `LinkedIn image registration failed: ${registerData.message ?? JSON.stringify(registerData)}`
    );
  }

  const assetUrn = registerData.value.asset;
  const uploadUrl =
    registerData.value.uploadMechanism?.[
      "com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest"
    ]?.uploadUrl;

  if (!uploadUrl) throw new Error("LinkedIn did not return an upload URL");

  // Step 2: Upload image binary
  const imageBlob = new Blob([new Uint8Array(parsed.buffer)], { type: parsed.mimeType });
  const uploadRes = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${LINKEDIN_ACCESS_TOKEN}`,
      "Content-Type": parsed.mimeType,
    },
    body: imageBlob,
  });

  if (!uploadRes.ok) {
    throw new Error(`LinkedIn image upload failed: ${uploadRes.status} ${uploadRes.statusText}`);
  }

  // Step 3: Create UGC post with image
  const postRes = await fetch("https://api.linkedin.com/v2/ugcPosts", {
    method: "POST",
    headers,
    body: JSON.stringify({
      author: LINKEDIN_PERSON_URN,
      lifecycleState: "PUBLISHED",
      specificContent: {
        "com.linkedin.ugc.ShareContent": {
          shareCommentary: {
            text: caption.slice(0, 3000),
          },
          shareMediaCategory: "IMAGE",
          media: [
            {
              status: "READY",
              description: { text: caption.slice(0, 200) },
              media: assetUrn,
              title: { text: "Post" },
            },
          ],
        },
      },
      visibility: {
        "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC",
      },
    }),
  });

  const postData = (await postRes.json()) as { id?: string; message?: string };
  if (!postData.id) {
    throw new Error(`LinkedIn post creation failed: ${postData.message ?? JSON.stringify(postData)}`);
  }

  return { externalId: postData.id };
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
  /** Omit or leave empty for text-only posts. */
  imageUrl?: string;
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
  const hasImage = !!(imageUrl && imageUrl.trim());

  if (
    platformNorm === "facebook" ||
    (platformNorm === "social" && META_PAGE_ID && META_PAGE_ACCESS_TOKEN)
  ) {
    return hasImage ? publishToMeta(imageUrl!, caption) : publishTextToFacebook(caption);
  }

  if (platformNorm === "instagram") {
    if (!hasImage) throw new Error("Instagram requires an image. Text-only posts are not supported by the Instagram API.");
    return publishToInstagram(imageUrl!, caption);
  }

  if (platformNorm === "whatsapp") {
    return hasImage
      ? publishToWhatsApp(imageUrl!, caption, to)
      : publishTextToWhatsApp(caption, to);
  }

  if (platformNorm === "linkedin") {
    return hasImage ? publishToLinkedIn(imageUrl!, caption) : publishTextToLinkedIn(caption);
  }

  if (
    platformNorm === "shopify_blog" ||
    (platformNorm === "blog" && SHOPIFY_STORE && SHOPIFY_ACCESS_TOKEN && SHOPIFY_BLOG_ID)
  ) {
    const title = (socialCaption || "New post").slice(0, 100);
    return publishToShopifyBlog(imageUrl ?? "", title, blogDescription || socialCaption || "");
  }

  throw new Error(`Unsupported or unconfigured platform: ${platform}`);
}

/** Check which platforms are configured based on available env vars. */
export function getConfiguredPlatforms(): Record<string, boolean> {
  return {
    facebook: !!(META_PAGE_ID && META_PAGE_ACCESS_TOKEN),
    // Instagram needs its own account ID + ImgBB for image hosting
    instagram: !!(META_IG_ACCOUNT_ID && META_PAGE_ACCESS_TOKEN && IMGBB_API_KEY),
    whatsapp: !!(WHATSAPP_PHONE_NUMBER_ID && (WHATSAPP_ACCESS_TOKEN || META_PAGE_ACCESS_TOKEN)),
    linkedin: !!(LINKEDIN_ACCESS_TOKEN && LINKEDIN_PERSON_URN),
    shopify_blog: !!(SHOPIFY_STORE && SHOPIFY_ACCESS_TOKEN && SHOPIFY_BLOG_ID),
  };
}
