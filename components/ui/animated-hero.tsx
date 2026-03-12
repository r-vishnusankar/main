"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { MoveRight, LayoutGrid } from "lucide-react";
import { Button } from "@/components/ui/button";

interface HeroProps {
  onNavigate?: (id: "create" | "templates" | "help" | "gallery" | "content-publish" | "home") => void;
  /** Right-side content (e.g. image grid) — renders in original two-column layout */
  rightSlot?: React.ReactNode;
}

function IconCheck() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function Hero({ onNavigate, rightSlot }: HeroProps) {
  const [titleNumber, setTitleNumber] = useState(0);
  const titles = useMemo(
    () => ["stunning", "amazing", "new", "beautiful", "smart"],
    []
  );

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (titleNumber === titles.length - 1) {
        setTitleNumber(0);
      } else {
        setTitleNumber(titleNumber + 1);
      }
    }, 2000);
    return () => clearTimeout(timeoutId);
  }, [titleNumber, titles]);

  const content = (
    <>
      <div>
        <Button
          variant="secondary"
          size="default"
          className="gap-2 text-[14px] px-4 py-2 border-[var(--accent)]/30 bg-[var(--accent)]/10 text-[var(--accent)] hover:bg-[var(--accent)]/20"
          onClick={() => onNavigate?.("create")}
        >
          AI-powered for e-commerce <MoveRight className="w-4 h-4" />
        </Button>
      </div>
      <div className="flex gap-5 flex-col">
        <h1 className="text-[3rem] sm:text-[3.5rem] md:text-[4rem] lg:text-[4.5rem] font-black text-white leading-[1.08] tracking-tight">
          Turn product images
          <br />
          into{" "}
          <span className="relative inline-block min-w-[160px] sm:min-w-[200px] md:min-w-[220px] min-h-[1.2em] align-baseline overflow-hidden">
            {titles.map((title, index) => (
              <motion.span
                key={index}
                className="absolute left-0 top-0 font-semibold text-[var(--accent)] whitespace-nowrap"
                initial={{ opacity: 0, y: 20 }}
                transition={{ type: "spring", stiffness: 100, damping: 15 }}
                animate={
                  titleNumber === index
                    ? { y: 0, opacity: 1 }
                    : { y: titleNumber > index ? -20 : 20, opacity: 0 }
                }
              >
                {title}
              </motion.span>
            ))}
          </span>{" "}
          banners
          <br />
          in seconds
        </h1>

        <p className="text-gray-400 text-[17px] sm:text-[18px] leading-relaxed max-w-[540px]">
          Upload a product image, pick a purpose — homepage banner, product card,
          Instagram post, sale promo — and let AI create pixel-perfect visuals for
          every platform.
        </p>
      </div>
      <div className="flex flex-wrap gap-4">
        <Button
          size="lg"
          className="gap-2 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-[16px] sm:text-[17px] px-8 py-4 h-auto"
          onClick={() => onNavigate?.("create")}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
          Start Creating Free
        </Button>
        <Button
          size="lg"
          className="gap-2 border border-white/20 bg-white/5 text-white hover:bg-white/10 text-[16px] sm:text-[17px] px-8 py-4 h-auto"
          variant="outline"
          onClick={() => onNavigate?.("templates")}
        >
          <LayoutGrid className="w-5 h-5" />
          Browse Templates
        </Button>
      </div>
      <div className="flex flex-wrap items-center gap-5">
        {["Homepage banners", "Instagram posts", "Product cards", "Sale promos"].map((t) => (
          <span key={t} className="flex items-center gap-1.5 text-[14px] sm:text-[15px] text-gray-500">
            <IconCheck />
            {t}
          </span>
        ))}
      </div>
    </>
  );

  if (rightSlot) {
    return (
      <div className="flex flex-col lg:flex-row gap-12 lg:gap-16 items-center w-full">
        <div className="flex-1 min-w-0 flex flex-col gap-5 lg:gap-6">{content}</div>
        <div className="flex-shrink-0 w-full lg:w-[46%] xl:w-[48%]">{rightSlot}</div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="container mx-auto">
        <div className="flex gap-8 py-20 lg:py-40 items-center justify-center flex-col">{content}</div>
      </div>
    </div>
  );
}

export { Hero };
