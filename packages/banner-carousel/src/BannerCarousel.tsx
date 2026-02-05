import React, { useState, useCallback, useEffect } from "react";
import type { BannerConfig, AspectRatio, SlideConfig } from "./types";

const RATIO_MAP: Record<AspectRatio, number> = {
  "16:9": 16 / 9,
  "3:1": 3,
  "4:1": 4,
  "1:1": 1,
};

export interface BannerCarouselProps {
  /** Full config from Creator Banner Creator export (banner-config.json) */
  config?: BannerConfig;
  /** Or pass image URLs and options directly */
  images?: string[];
  aspectRatio?: AspectRatio;
  autoplay?: boolean;
  autoplaySpeed?: number;
  /** Optional: slide captions when using `images` (same order) */
  slides?: SlideConfig[];
}

export function BannerCarousel({
  config,
  images,
  aspectRatio: aspectRatioProp,
  autoplay = true,
  autoplaySpeed = 5,
  slides: slidesProp,
}: BannerCarouselProps) {
  const effectiveConfig = config
    ? {
        aspectRatio: config.aspectRatio,
        slides: config.slides,
        autoplay: config.autoplay ?? true,
        autoplaySpeed: config.autoplaySpeed ?? 5,
      }
    : images && images.length > 0
      ? {
          aspectRatio: (aspectRatioProp ?? "16:9") as AspectRatio,
          slides: images.map((imageUrl, i) => ({
            imageUrl,
            ...slidesProp?.[i],
          })),
          autoplay,
          autoplaySpeed,
        }
      : null;

  const [current, setCurrent] = useState(0);

  const slides = effectiveConfig?.slides ?? [];
  const aspectRatio = effectiveConfig?.aspectRatio ?? "16:9";
  const ratio = RATIO_MAP[aspectRatio];
  const doAutoplay = effectiveConfig?.autoplay ?? true;
  const speed = effectiveConfig?.autoplaySpeed ?? 5;

  const goTo = useCallback(
    (index: number) => {
      if (slides.length === 0) return;
      setCurrent((index + slides.length) % slides.length);
    },
    [slides.length]
  );

  useEffect(() => {
    if (!doAutoplay || slides.length <= 1) return;
    const t = setInterval(() => goTo(current + 1), speed * 1000);
    return () => clearInterval(t);
  }, [doAutoplay, speed, slides.length, current, goTo]);

  if (!effectiveConfig || slides.length === 0) {
    return (
      <div
        className="creator-banner-carousel-placeholder"
        style={{ aspectRatio: ratio, background: "#f1f5f9", borderRadius: 8 }}
      >
        <span style={{ color: "#64748b", fontSize: 14 }}>No slides</span>
      </div>
    );
  }

  return (
    <div className="creator-banner-carousel" style={{ width: "100%" }}>
      <div
        className="creator-banner-carousel-inner"
        style={{
          position: "relative",
          width: "100%",
          overflow: "hidden",
          aspectRatio: ratio,
          borderRadius: 8,
          backgroundColor: "#e2e8f0",
        }}
      >
        {slides.map((slide, index) => (
          <div
            key={slide.imageUrl + index}
            className="creator-banner-carousel-slide"
            style={{
              position: "absolute",
              inset: 0,
              opacity: index === current ? 1 : 0,
              transition: "opacity 0.3s",
              zIndex: index === current ? 1 : 0,
            }}
          >
            <img
              src={slide.imageUrl}
              alt={slide.caption || slide.productName || `Slide ${index + 1}`}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                display: "block",
              }}
            />
            {(slide.productName || slide.caption) && (
              <div
                style={{
                  position: "absolute",
                  bottom: 0,
                  left: 0,
                  right: 0,
                  background: "linear-gradient(transparent, rgba(0,0,0,0.7))",
                  color: "#fff",
                  padding: "12px 16px",
                  fontSize: 14,
                }}
              >
                {slide.productName && (
                  <a
                    href={slide.productLink || "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: "#fff", fontWeight: 600 }}
                  >
                    {slide.productName}
                  </a>
                )}
                {slide.caption && <p style={{ margin: "4px 0 0" }}>{slide.caption}</p>}
              </div>
            )}
          </div>
        ))}
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginTop: 8,
          gap: 8,
        }}
      >
        <div style={{ display: "flex", gap: 4 }}>
          {slides.map((_, index) => (
            <button
              key={index}
              type="button"
              aria-label={`Go to slide ${index + 1}`}
              onClick={() => goTo(index)}
              style={{
                width: 10,
                height: 10,
                borderRadius: "50%",
                border: "none",
                padding: 0,
                cursor: "pointer",
                background: index === current ? "#334155" : "#cbd5e1",
              }}
            />
          ))}
        </div>
        {slides.length > 1 && (
          <>
            <button
              type="button"
              aria-label="Previous slide"
              onClick={() => goTo(current - 1)}
              style={{
                padding: 4,
                border: "none",
                borderRadius: 4,
                background: "#e2e8f0",
                cursor: "pointer",
                fontSize: 18,
              }}
            >
              &#10094;
            </button>
            <button
              type="button"
              aria-label="Next slide"
              onClick={() => goTo(current + 1)}
              style={{
                padding: 4,
                border: "none",
                borderRadius: 4,
                background: "#e2e8f0",
                cursor: "pointer",
                fontSize: 18,
              }}
            >
              &#10095;
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default BannerCarousel;
