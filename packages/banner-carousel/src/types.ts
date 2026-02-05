export type AspectRatio = "16:9" | "3:1" | "4:1" | "1:1";

export interface SlideConfig {
  imageUrl: string;
  productName?: string;
  productLink?: string;
  caption?: string;
}

export interface BannerConfig {
  aspectRatio: AspectRatio;
  slides: SlideConfig[];
  autoplay?: boolean;
  autoplaySpeed?: number;
}
