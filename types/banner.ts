export type AspectRatio = "16:9" | "3:1" | "4:1" | "1:1";

export interface Slide {
  id: string;
  imageUrl: string; // object URL, blob URL, or remote URL
  imageBlob?: Blob | null; // for export when we have a blob
  productName?: string;
  productLink?: string;
  caption?: string;
}

export interface BannerConfig {
  aspectRatio: AspectRatio;
  slides: { imageUrl: string; productName?: string; productLink?: string; caption?: string }[];
  autoplay: boolean;
  autoplaySpeed: number;
}
