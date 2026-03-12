"use client";

import React, { useState } from "react";
import PreviewImage from "@/components/PreviewImage";

interface NavLink {
  href: string;
  label: string;
}

interface HeroSectionProps {
  backgroundImage?: string;
  logoText?: string;
  navLinks?: NavLink[];
  avatarSrcList?: string[];
  userCount?: number;
  title?: string;
  description?: string;
  placeholder?: string;
  ctaText?: string;
  onSubmit?: (email: string) => void;
  footerVersion?: string;
  authSlot?: React.ReactNode;
}

/* ── Image slots for marquee rows — 3 rows with different combos ── */
const ROW_1_SLOTS = [
  { slot: "homepage-banner", label: "Homepage Banner",  aspect: "aspect-video" },
  { slot: "product-card",    label: "Product Card",     aspect: "aspect-[3/4]" },
  { slot: "sale-promo",      label: "Sale Promo",       aspect: "aspect-video" },
  { slot: "festival",        label: "Festival",         aspect: "aspect-square" },
];

const ROW_2_SLOTS = [
  { slot: "instagram-post",  label: "Instagram Post",   aspect: "aspect-square" },
  { slot: "email-header",    label: "Email Header",     aspect: "aspect-[3/1]" },
  { slot: "product-banner",  label: "Product Banner",   aspect: "aspect-video" },
  { slot: "social-caption",  label: "Social Caption",   aspect: "aspect-square" },
];

const ROW_3_SLOTS = [
  { slot: "product-card",    label: "Product Card",     aspect: "aspect-[3/4]" },
  { slot: "homepage-banner", label: "Homepage Banner",  aspect: "aspect-video" },
  { slot: "festival",        label: "Festival",         aspect: "aspect-square" },
  { slot: "sale-promo",      label: "Sale Promo",       aspect: "aspect-video" },
];

/* ── Single scrolling row ── */
function MarqueeRow({
  slots,
  direction = "left",
  speed = 40,
}: {
  slots: { slot: string; label: string; aspect: string }[];
  direction?: "left" | "right";
  speed?: number;
}) {
  /* Duplicate for seamless loop */
  const items = [...slots, ...slots, ...slots];
  const animationName = direction === "left" ? "marquee-left" : "marquee-right";

  return (
    <div className="flex overflow-hidden w-full">
      <div
        className="flex gap-3 shrink-0"
        style={{
          animation: `${animationName} ${speed}s linear infinite`,
          willChange: "transform",
        }}
      >
        {items.map((item, i) => (
          <div
            key={`${item.slot}-${i}`}
            className="relative flex-shrink-0 rounded-xl overflow-hidden border border-white/[0.08] shadow-lg"
            style={{ width: 200 }}
          >
            <PreviewImage
              slot={item.slot}
              alt={item.label}
              className={`w-full ${item.aspect}`}
            />
            {/* Overlay label */}
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-2.5">
              <p className="text-[9px] font-bold text-white/80 uppercase tracking-wider truncate">{item.label}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function HeroSection({
  logoText = "Brand",
  navLinks = [],
  avatarSrcList = [],
  userCount = 0,
  title = "",
  description = "",
  placeholder = "Enter email",
  ctaText = "Submit",
  onSubmit = () => {},
  footerVersion = "",
  authSlot,
}: HeroSectionProps) {
  const [email, setEmail] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    onSubmit(email);
    setEmail("");
  };

  return (
    <>
      {/* ── Keyframe styles injected via <style> ── */}
      <style>{`
        @keyframes marquee-left {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-33.333%); }
        }
        @keyframes marquee-right {
          0%   { transform: translateX(-33.333%); }
          100% { transform: translateX(0); }
        }
      `}</style>

      <div className="relative min-h-screen w-full overflow-hidden text-white bg-[#08070c]">

        {/* ════════════════════════════════════════════════
            RIGHT PANEL: Auto-scrolling image marquee
            Visible on the right half (hidden on mobile)
        ════════════════════════════════════════════════ */}
        <div className="absolute inset-y-0 right-0 w-full lg:w-[55%] xl:w-[58%] flex flex-col justify-center gap-4 py-8 pointer-events-none overflow-hidden">
          {/* Fade mask on left edge (blends into page) */}
          <div className="absolute inset-y-0 left-0 w-32 bg-gradient-to-r from-[#08070c] to-transparent z-10 pointer-events-none" />
          {/* Fade mask on right edge */}
          <div className="absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-[#08070c] to-transparent z-10 pointer-events-none" />
          {/* Fade top */}
          <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-[#08070c] to-transparent z-10 pointer-events-none" />
          {/* Fade bottom */}
          <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-[#08070c] to-transparent z-10 pointer-events-none" />

          <MarqueeRow slots={ROW_1_SLOTS} direction="left"  speed={38} />
          <MarqueeRow slots={ROW_2_SLOTS} direction="right" speed={45} />
          <MarqueeRow slots={ROW_3_SLOTS} direction="left"  speed={32} />
        </div>

        {/* Left dark overlay (so left side text reads clearly) */}
        <div className="absolute inset-y-0 left-0 w-[55%] bg-gradient-to-r from-[#08070c] via-[#08070c]/95 to-transparent pointer-events-none z-10" />

        {/* ── Header ── */}
        <header className="absolute inset-x-0 top-0 p-6 md:p-8 z-30">
          <div className="max-w-[1400px] mx-auto flex justify-between items-center">
            <div className="text-xl font-black tracking-tight">{logoText}</div>
            <nav className="hidden md:flex space-x-8 text-[13px] font-medium">
              {navLinks.map(({ href, label }) => (
                <a key={href} href={href} className="text-white/60 hover:text-white transition-colors">
                  {label}
                </a>
              ))}
            </nav>
            <div className="flex items-center space-x-4 z-30">
              {authSlot ?? (
                <button type="button" className="border border-white/40 rounded-full px-6 py-2 text-[13px] font-bold hover:bg-white hover:text-black transition-colors">
                  Join
                </button>
              )}
            </div>
          </div>
        </header>

        {/* ── Main Content (left side) ── */}
        <main className="relative z-20 min-h-screen flex items-center px-8 md:px-12 lg:px-20 xl:px-24">
          <div className="w-full">
            <div className="w-full lg:w-[44%] xl:w-[38%]">

              {/* Avatars + social proof */}
              {(avatarSrcList.length > 0 || userCount > 0) && (
                <div className="flex items-center mb-7">
                  <div className="flex -space-x-2">
                    {avatarSrcList.map((src, idx) => (
                      <img
                        key={idx}
                        className="h-8 w-8 rounded-full ring-2 ring-[#08070c] object-cover"
                        src={src}
                        alt={`User ${idx + 1}`}
                      />
                    ))}
                  </div>
                  {userCount > 0 && (
                    <p className="ml-3 text-[13px] text-white/50 font-medium">
                      &lt;{userCount.toLocaleString()} users have joined
                    </p>
                  )}
                </div>
              )}

              {/* Headline */}
              <h1 className="text-5xl md:text-6xl lg:text-[68px] font-black leading-[1.05] tracking-tight mb-6 whitespace-pre-line">
                {title}
              </h1>

              {/* Description */}
              <p className="text-[16px] md:text-[17px] text-white/50 max-w-md mb-10 leading-relaxed font-light">
                {description}
              </p>

              {/* Email form */}
              <form
                className="flex w-full max-w-[400px] shadow-2xl rounded-xl overflow-hidden"
                onSubmit={handleSubmit}
                aria-label="Get started"
              >
                <label htmlFor="hero-email" className="sr-only">Email address</label>
                <input
                  id="hero-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={placeholder}
                  className="flex-1 px-4 py-3.5 bg-white/8 border border-white/15 text-white placeholder:text-white/30 focus:outline-none focus:ring-1 focus:ring-white/20 text-[14px] min-w-0"
                  style={{ backgroundColor: "rgba(255,255,255,0.06)" }}
                  required
                />
                <button
                  type="submit"
                  className="bg-white text-black font-black px-6 py-3.5 hover:bg-white/90 transition-colors whitespace-nowrap text-[14px] border border-white flex-shrink-0"
                >
                  {ctaText}
                </button>
              </form>

              {/* Trust note */}
              <p className="mt-4 text-[12px] text-white/30 font-medium">50 free credits · No credit card required</p>

            </div>
          </div>
        </main>

        {/* ── Footer ── */}
        <footer className="absolute inset-x-0 bottom-0 p-6 md:p-8 z-30">
          <div className="max-w-[1400px] mx-auto flex justify-between items-center">
            <div className="text-[11px] text-white/30 font-mono tracking-widest">{footerVersion}</div>
            <button
              type="button"
              aria-label="Open chat"
              className="bg-white/8 backdrop-blur-sm rounded-full h-12 w-12 flex items-center justify-center hover:bg-white/15 transition-colors border border-white/10"
              style={{ backgroundColor: "rgba(255,255,255,0.06)" }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </button>
          </div>
        </footer>

      </div>
    </>
  );
}
