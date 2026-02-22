/**
 * Brand kit / default settings stored in localStorage.
 * Used to prepend/append brand context to prompts and set default aspect/purpose.
 */

import type { ImagePurpose } from "@/lib/imagePurpose";

const STORAGE_KEY = "bannerCreatorBrandKit";

export interface BrandKit {
  defaultAspectRatio?: string;
  defaultPurpose?: ImagePurpose;
  /** Appended to generation prompts (e.g. "Brand: Acme, blue theme"). */
  brandPromptSuffix?: string;
}

export function getBrandKit(): BrandKit {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as BrandKit;
    return {
      defaultAspectRatio: typeof parsed.defaultAspectRatio === "string" ? parsed.defaultAspectRatio : undefined,
      defaultPurpose:
        parsed.defaultPurpose && ["homepage_banner", "product_card", "plp_thumbnail", "order_confirmation"].includes(parsed.defaultPurpose)
          ? (parsed.defaultPurpose as ImagePurpose)
          : undefined,
      brandPromptSuffix: typeof parsed.brandPromptSuffix === "string" ? parsed.brandPromptSuffix.trim() || undefined : undefined,
    };
  } catch {
    return {};
  }
}

export function setBrandKit(kit: BrandKit): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(kit));
  } catch {
    // ignore
  }
}

/** Returns brand suffix to append to prompts, or empty string. */
export function getBrandPromptSuffix(): string {
  const suffix = getBrandKit().brandPromptSuffix;
  return suffix ? ` ${suffix}` : "";
}
