"use client";

import { useState, useCallback, useEffect } from "react";
import type { Slide, AspectRatio } from "@/types/banner";

const RATIO_MAP: Record<AspectRatio, number> = {
  "16:9": 16 / 9,
  "3:1": 3,
  "4:1": 4,
  "1:1": 1,
};

interface BannerCarouselProps {
  slides: Slide[];
  aspectRatio: AspectRatio;
  autoplay?: boolean;
  autoplaySpeed?: number;
  editable?: boolean;
  onRemoveSlide?: (index: number) => void;
  onReorderSlides?: (fromIndex: number, toIndex: number) => void;
  onUpdateSlide?: (index: number, updates: Partial<Slide>) => void;
}

export default function BannerCarousel({
  slides,
  aspectRatio,
  autoplay = true,
  autoplaySpeed = 5,
  editable = false,
  onRemoveSlide,
  onReorderSlides,
  onUpdateSlide,
}: BannerCarouselProps) {
  const [current, setCurrent] = useState(0);
  const ratio = RATIO_MAP[aspectRatio];

  const goTo = useCallback(
    (index: number) => {
      if (slides.length === 0) return;
      setCurrent((index + slides.length) % slides.length);
    },
    [slides.length]
  );

  useEffect(() => {
    if (!autoplay || slides.length <= 1) return;
    const t = setInterval(() => goTo(current + 1), autoplaySpeed * 1000);
    return () => clearInterval(t);
  }, [autoplay, autoplaySpeed, slides.length, current, goTo]);

  if (slides.length === 0) {
    return (
      <div
        className="w-full rounded-xl border-2 border-dashed border-[#3a3a3a] flex items-center justify-center text-gray-500"
        style={{ aspectRatio: ratio }}
      >
        <span className="text-sm">No slides yet. Upload or generate an image to add one.</span>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div
        className="relative w-full overflow-hidden rounded-xl bg-[#1a1a1a]"
        style={{ aspectRatio: ratio }}
      >
        {slides.map((slide, index) => (
          <div
            key={slide.id}
            className="absolute inset-0 transition-opacity duration-300"
            style={{
              opacity: index === current ? 1 : 0,
              zIndex: index === current ? 1 : 0,
            }}
          >
            <img
              src={slide.imageUrl}
              alt={slide.caption || slide.productName || `Slide ${index + 1}`}
              className="w-full h-full object-cover"
            />
            {(slide.productName || slide.caption) && (
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-3 text-white text-sm">
                {slide.productName && (
                  <a
                    href={slide.productLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium hover:underline"
                  >
                    {slide.productName}
                  </a>
                )}
                {slide.caption && <p className="mt-0.5">{slide.caption}</p>}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between mt-3">
        <div className="flex items-center gap-1.5">
          {slides.map((_, index) => (
            <button
              key={index}
              type="button"
              aria-label={`Go to slide ${index + 1}`}
              onClick={() => goTo(index)}
              className={`w-2 h-2 rounded-full transition-colors ${
                index === current
                  ? "bg-[#0066ff]"
                  : "bg-[#3a3a3a] hover:bg-[#4a4a4a]"
              }`}
            />
          ))}
        </div>
        {slides.length > 1 && (
          <>
            <button
              type="button"
              aria-label="Previous slide"
              onClick={() => goTo(current - 1)}
              className="p-2 rounded-lg hover:bg-[#2a2a2a] text-gray-300 hover:text-white transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              type="button"
              aria-label="Next slide"
              onClick={() => goTo(current + 1)}
              className="p-2 rounded-lg hover:bg-[#2a2a2a] text-gray-300 hover:text-white transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </>
        )}
      </div>

      {editable && onRemoveSlide && onReorderSlides && onUpdateSlide && (
        <div className="mt-4 space-y-3">
          {slides.map((slide, index) => (
            <div
              key={slide.id}
              className="flex items-center gap-3 p-3 rounded-lg border border-[#3a3a3a] bg-[#2a2a2a]"
            >
              <img
                src={slide.imageUrl}
                alt=""
                className="w-16 h-16 object-cover rounded-lg flex-shrink-0"
              />
              <div className="flex-1 min-w-0 space-y-2">
                <input
                  type="text"
                  placeholder="Product name"
                  value={slide.productName ?? ""}
                  onChange={(e) => onUpdateSlide(index, { productName: e.target.value })}
                  className="w-full text-sm rounded-lg border border-[#3a3a3a] bg-[#1a1a1a] text-white placeholder-gray-500 px-3 py-1.5 focus:outline-none focus:border-[#0066ff]"
                />
                <input
                  type="text"
                  placeholder="Product link (optional)"
                  value={slide.productLink ?? ""}
                  onChange={(e) => onUpdateSlide(index, { productLink: e.target.value })}
                  className="w-full text-sm rounded-lg border border-[#3a3a3a] bg-[#1a1a1a] text-white placeholder-gray-500 px-3 py-1.5 focus:outline-none focus:border-[#0066ff]"
                />
                <input
                  type="text"
                  placeholder="Caption (optional)"
                  value={slide.caption ?? ""}
                  onChange={(e) => onUpdateSlide(index, { caption: e.target.value })}
                  className="w-full text-sm rounded-lg border border-[#3a3a3a] bg-[#1a1a1a] text-white placeholder-gray-500 px-3 py-1.5 focus:outline-none focus:border-[#0066ff]"
                />
              </div>
              <div className="flex flex-col gap-1">
                {index > 0 && (
                  <button
                    type="button"
                    onClick={() => onReorderSlides(index, index - 1)}
                    className="p-2 rounded-lg hover:bg-[#3a3a3a] text-gray-400 hover:text-white transition-colors"
                    title="Move left"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                )}
                {index < slides.length - 1 && (
                  <button
                    type="button"
                    onClick={() => onReorderSlides(index, index + 1)}
                    className="p-2 rounded-lg hover:bg-[#3a3a3a] text-gray-400 hover:text-white transition-colors"
                    title="Move right"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => onRemoveSlide(index)}
                  className="p-2 rounded-lg hover:bg-red-500/20 text-red-400 hover:text-red-300 transition-colors"
                  title="Remove slide"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
