"use client";

import { useState, useCallback, useEffect } from "react";
import type { Slide, AspectRatio } from "@/types/banner";
import { IMAGE_PURPOSE_OPTIONS, IMAGE_PURPOSE_PROMPTS, IMAGE_PURPOSE_ASPECT_RATIO, type ImagePurpose } from "@/lib/imagePurpose";

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
  /** Called when user clicks "Generate image" for a slide; parent should call API, resize to aspectRatio, then update slide. */
  onRegenerateSlide?: (index: number, prompt: string, aspectRatio: AspectRatio) => Promise<void>;
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
  onRegenerateSlide,
}: BannerCarouselProps) {
  const [current, setCurrent] = useState(0);
  const [regeneratingIndex, setRegeneratingIndex] = useState<number | null>(null);
  const [regenerateError, setRegenerateError] = useState<string | null>(null);
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

  useEffect(() => setRegenerateError(null), [current]);

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
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Predefined prompt (editable)</label>
                  <select
                    className="w-full text-sm rounded-lg border border-[#3a3a3a] bg-[#1a1a1a] text-white px-3 py-1.5 focus:outline-none focus:border-[#0066ff] mb-1"
                    value={slide.prompt ? (IMAGE_PURPOSE_OPTIONS.find((o) => IMAGE_PURPOSE_PROMPTS[o.value] === slide.prompt)?.value ?? "") : ""}
                    onChange={(e) => {
                      const v = e.target.value as ImagePurpose | "";
                      if (v) onUpdateSlide(index, { prompt: IMAGE_PURPOSE_PROMPTS[v] });
                    }}
                  >
                    <option value="">Choose a preset…</option>
                    {IMAGE_PURPOSE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label} ({IMAGE_PURPOSE_ASPECT_RATIO[opt.value]})
                      </option>
                    ))}
                  </select>
                  <textarea
                    placeholder="Or type your own prompt for this slide…"
                    value={slide.prompt ?? ""}
                    onChange={(e) => onUpdateSlide(index, { prompt: e.target.value })}
                    rows={2}
                    className="w-full text-sm rounded-lg border border-[#3a3a3a] bg-[#1a1a1a] text-white placeholder-gray-500 px-3 py-1.5 focus:outline-none focus:border-[#0066ff] resize-y min-h-[60px]"
                  />
                </div>
                {onRegenerateSlide && (
                  <div>
                    <p className="text-xs text-gray-500 mb-1.5">Image is generated from the prompt above (and from this slide&apos;s image as reference when present), then resized to <strong className="text-gray-400">{aspectRatio}</strong>.</p>
                    {regenerateError && current === index && (
                      <p className="text-sm text-amber-400 mb-2 rounded-lg bg-amber-500/10 px-2 py-1.5 border border-amber-500/30">{regenerateError}</p>
                    )}
                    <button
                    type="button"
                    onClick={async () => {
                      const promptToUse = (slide.prompt ?? "").trim() || IMAGE_PURPOSE_PROMPTS.homepage_banner;
                      setRegeneratingIndex(index);
                      setRegenerateError(null);
                      try {
                        await onRegenerateSlide(index, promptToUse, aspectRatio);
                      } catch (err) {
                        setRegenerateError(err instanceof Error ? err.message : "Generation failed. Try a simpler prompt or different image.");
                      } finally {
                        setRegeneratingIndex(null);
                      }
                    }}
                    disabled={regeneratingIndex !== null}
                    className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-[#0066ff] to-[#0052cc] text-white text-sm font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity flex items-center gap-2"
                  >
                    <span>{regeneratingIndex === index ? "⏳" : "✨"}</span>
                    <span>{regeneratingIndex === index ? "Generating…" : "Generate image"}</span>
                  </button>
                  </div>
                )}
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
