/**
 * Maps aspect ratio string to Tailwind aspect-* class for consistent card image areas.
 */

export const ASPECT_RATIO_CLASSES: Record<string, string> = {
  "16:9": "aspect-video",
  "1:1": "aspect-square",
  "3:1": "aspect-[3/1]",
  "4:1": "aspect-[4/1]",
};

export function getAspectRatioClass(ratio: string | null | undefined): string {
  if (!ratio) return "aspect-video";
  return ASPECT_RATIO_CLASSES[ratio] ?? "aspect-video";
}
