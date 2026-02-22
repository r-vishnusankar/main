/**
 * Image purpose: where the generated image will be used (e.g. homepage banner, product card).
 * Used for preset prompts and dashboard filtering.
 */
export type ImagePurpose =
  | "homepage_banner"
  | "product_card"
  | "plp_thumbnail"
  | "order_confirmation";

export const IMAGE_PURPOSE_OPTIONS: { value: ImagePurpose; label: string }[] = [
  { value: "homepage_banner", label: "Banner for homepage" },
  { value: "product_card", label: "Product card" },
  { value: "plp_thumbnail", label: "PLP thumbnail" },
  { value: "order_confirmation", label: "Order confirmation" },
];

export const IMAGE_PURPOSE_PROMPTS: Record<ImagePurpose, string> = {
  homepage_banner:
    "High-impact hero banner for homepage, full-width, clear focal point, professional marketing style, suitable for e-commerce hero section.",
  product_card:
    "Clean product card image, white or neutral background, centered product, consistent lighting, suitable for product grid and PDP.",
  plp_thumbnail:
    "Product listing page thumbnail, square or consistent aspect, clear product visibility, minimal background, e-commerce PLP style.",
  order_confirmation:
    "Thank-you or order confirmation graphic, friendly and reassuring tone, space for order details, professional and clean design.",
};

export function getPurposeLabel(value: ImagePurpose): string {
  return IMAGE_PURPOSE_OPTIONS.find((o) => o.value === value)?.label ?? value;
}

/** Suggested aspect ratio per purpose for e-commerce (optional auto-set when purpose is selected). */
export const IMAGE_PURPOSE_ASPECT_RATIO: Record<ImagePurpose, string> = {
  homepage_banner: "16:9",
  product_card: "1:1",
  plp_thumbnail: "1:1",
  order_confirmation: "16:9",
};
