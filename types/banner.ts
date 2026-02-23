export type AspectRatio = "16:9" | "3:1" | "4:1" | "1:1";

export interface TextLayer {
  id: string;
  /** Position as percentage of image width/height */
  x: number;
  y: number;
  text: string;
  fontFamily: string;
  /** Font size as % of image height so it scales with the preview */
  fontSize: number;
  color: string;
  bold: boolean;
  align: "left" | "center" | "right";
  shadow: boolean;
}

export interface Slide {
  id: string;
  imageUrl: string; // object URL, blob URL, or remote URL
  imageBlob?: Blob | null; // for export when we have a blob
  productName?: string;
  productLink?: string;
  caption?: string;
  /** Prompt used or to use for AI generation (shown in editor, used for regenerate). */
  prompt?: string;
  /** Text overlays positioned on this slide */
  textLayers?: TextLayer[];
}

export interface BannerConfig {
  aspectRatio: AspectRatio;
  slides: { imageUrl: string; productName?: string; productLink?: string; caption?: string }[];
  autoplay: boolean;
  autoplaySpeed: number;
}
