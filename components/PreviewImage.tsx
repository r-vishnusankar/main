"use client";

import { useState } from "react";

/**
 * Shows a beautiful gradient background INSTANTLY (always works, no network needed).
 * Simultaneously loads an image — if it loads successfully, it fades in over the gradient.
 * Also tries local /home-previews/{slot}.jpg first, then picsum.photos as fallback.
 *
 * To override: drop a file into public/home-previews/ using the slot name (any format).
 */

const SLOT_CONFIG: Record<string, { gradient: string; label: string; picsumSeed: string }> = {
  "homepage-banner":  { gradient: "linear-gradient(135deg,#0f2a5c 0%,#1d4ed8 55%,#6d28d9 100%)", label: "Homepage Banner",  picsumSeed: "banner1" },
  "product-card":     { gradient: "linear-gradient(160deg,#0a2a1e 0%,#065f46 55%,#059669 100%)", label: "Product Card",     picsumSeed: "product2" },
  "instagram-post":   { gradient: "linear-gradient(135deg,#3b0764 0%,#7c3aed 55%,#db2777 100%)", label: "Instagram Post",   picsumSeed: "fashion3" },
  "sale-promo":       { gradient: "linear-gradient(135deg,#450a0a 0%,#b91c1c 55%,#ea580c 100%)", label: "Sale Promo",       picsumSeed: "sale4" },
  "email-header":     { gradient: "linear-gradient(135deg,#0c1a4a 0%,#1e40af 55%,#0ea5e9 100%)", label: "Email Header",     picsumSeed: "email5" },
  "festival":         { gradient: "linear-gradient(135deg,#451a03 0%,#b45309 55%,#f59e0b 100%)", label: "Festival",         picsumSeed: "festival6" },
  "product-banner":   { gradient: "linear-gradient(135deg,#1e1b4b 0%,#4338ca 55%,#7c3aed 100%)", label: "Product Banner",   picsumSeed: "shoes7" },
  "social-caption":   { gradient: "linear-gradient(135deg,#042f2e 0%,#0f766e 55%,#10b981 100%)", label: "Social Caption",   picsumSeed: "social8" },
  "hero-main":        { gradient: "linear-gradient(135deg,#0f172a 0%,#1e3a8a 55%,#7c3aed 100%)", label: "Hero Main",        picsumSeed: "store9" },
  "hero-square-1":    { gradient: "linear-gradient(135deg,#1a0533 0%,#9333ea 55%,#ec4899 100%)", label: "Instagram",        picsumSeed: "fashion10" },
  "hero-portrait-1":  { gradient: "linear-gradient(160deg,#052e16 0%,#166534 55%,#16a34a 100%)", label: "Product",          picsumSeed: "product11" },
  "step-1":           { gradient: "linear-gradient(135deg,#0f172a 0%,#1e40af 100%)",             label: "Upload",           picsumSeed: "upload12" },
  "step-2":           { gradient: "linear-gradient(135deg,#1e1b4b 0%,#6d28d9 100%)",             label: "Template",         picsumSeed: "template13" },
  "step-3":           { gradient: "linear-gradient(135deg,#022c22 0%,#065f46 100%)",             label: "Publish",          picsumSeed: "publish14" },
};

interface PreviewImageProps {
  slot: string;
  alt: string;
  className?: string;
  style?: React.CSSProperties;
  overlay?: React.ReactNode;
}

export default function PreviewImage({ slot, alt, className = "", style, overlay }: PreviewImageProps) {
  const config = SLOT_CONFIG[slot] ?? { gradient: "linear-gradient(135deg,#1a1a2e,#16213e)", label: slot, picsumSeed: slot };

  const [imgSrc, setImgSrc] = useState(`/home-previews/${slot}.jpg`);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [triedLocal, setTriedLocal] = useState(false);

  function handleError() {
    if (!triedLocal) {
      // Local file not found → try picsum
      setTriedLocal(true);
      setImgSrc(`https://picsum.photos/seed/${config.picsumSeed}/900/600`);
    }
    // If picsum also fails, imgLoaded stays false and gradient shows
  }

  return (
    <div
      className={`relative overflow-hidden ${className}`}
      style={{ background: config.gradient, ...style }}
    >
      {/* Gradient is always visible. Image fades in on top when loaded. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        key={imgSrc}
        src={imgSrc}
        alt={alt}
        onLoad={() => setImgLoaded(true)}
        onError={handleError}
        className="absolute inset-0 w-full h-full object-cover transition-opacity duration-500"
        style={{ opacity: imgLoaded ? 1 : 0 }}
        loading="lazy"
        decoding="async"
      />
      {/* Gradient label shown when image hasn't loaded yet */}
      {!imgLoaded && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-[11px] font-semibold text-white/30 uppercase tracking-widest">{config.label}</span>
        </div>
      )}
      {overlay && <div className="absolute inset-0">{overlay}</div>}
    </div>
  );
}
