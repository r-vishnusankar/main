/**
 * Centralized image generation prompt builder.
 * Keeps prompts short to save tokens and adds consistent quality hints.
 */

const MAX_USER_PROMPT_LENGTH = 280;
const QUALITY_SUFFIX = "High quality, sharp, professional. No placeholder or error image.";

/**
 * Truncate user/purpose text to cap token usage.
 */
export function capPromptLength(text: string, maxLength: number = MAX_USER_PROMPT_LENGTH): string {
  const trimmed = text.trim();
  if (trimmed.length <= maxLength) return trimmed;
  return trimmed.slice(0, maxLength - 3).trimEnd() + "...";
}

/** Purpose type for generation (Season, Event, Promotion) – passed from Settings. */
export type CampaignPurposeType = "season" | "event" | "promotion" | "general";

/**
 * Build a short campaign prefix from purpose type and text (e.g. "Seasonal: Summer sale 20%. ").
 */
export function getCampaignPrefix(
  purposeType: CampaignPurposeType | null | undefined,
  campaignText: string | null | undefined
): string {
  const text = campaignText?.trim();
  if (!text) return "";
  switch (purposeType) {
    case "season":
      return `Seasonal campaign: ${text}. `;
    case "event":
      return `Festive ${text} theme: `;
    case "promotion":
      return `Promotion: ${text}. `;
    default:
      return text ? `${text}. ` : "";
  }
}

/**
 * Build final prompt for text-to-image: user text + aspect + quality.
 * Uses short phrases to save tokens. Optional campaign purpose (Season/Event/Promotion) from Settings.
 */
export function buildTextToImagePrompt(
  userPrompt: string,
  aspectRatio: string,
  options?: {
    eventName?: string;
    noQualitySuffix?: boolean;
    campaignPurposeType?: CampaignPurposeType | null;
    campaignText?: string | null;
  }
): string {
  const capped = capPromptLength(userPrompt);
  const campaignPrefix = getCampaignPrefix(options?.campaignPurposeType, options?.campaignText);
  const withEvent =
    options?.eventName?.trim() && options?.campaignPurposeType !== "event"
      ? `Festive ${options.eventName.trim()} theme: ${campaignPrefix}${capped}`
      : `${campaignPrefix}${capped}`;
  const aspectPhrase = `Aspect ratio ${aspectRatio}.`;
  const quality = options?.noQualitySuffix ? "" : ` ${QUALITY_SUFFIX}`;
  return `${withEvent}. ${aspectPhrase}${quality}`.trim();
}

/**
 * Build final prompt for image-to-image (product banner): instructions + aspect + quality.
 * Optional campaign purpose (Season/Event/Promotion) from Settings.
 */
export function buildImageToImagePrompt(
  styleAndLayout: string,
  aspectRatio: string,
  options?: { noQualitySuffix?: boolean; campaignPurposeType?: CampaignPurposeType | null; campaignText?: string | null }
): string {
  const capped = capPromptLength(styleAndLayout);
  const campaignPrefix = getCampaignPrefix(options?.campaignPurposeType, options?.campaignText);
  const quality = options?.noQualitySuffix ? "" : ` ${QUALITY_SUFFIX}`;
  return `Create a single banner or marketing image based on this product image. ${campaignPrefix}Style and layout: ${capped}. Aspect ratio ${aspectRatio}. Output only the generated image.${quality}`.trim();
}
