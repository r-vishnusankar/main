"use client";

import { useState, useEffect } from "react";
import { getAllBanners, openDB } from "@/lib/indexedDB";
import type { Slide } from "@/types/banner";

function formatTimeAgo(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const sec = Math.floor((now.getTime() - d.getTime()) / 1000);
  if (sec < 60) return "Just now";
  if (sec < 3600) return `${Math.floor(sec / 60)} min ago`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`;
  if (sec < 604800) return `${Math.floor(sec / 86400)}d ago`;
  return d.toLocaleDateString();
}

interface RecentBanner {
  id: string;
  name: string;
  createdAt: string;
  aspectRatio: string;
  firstImageUrl: string | null;
  slides: Slide[];
}

interface RightSidebarProps {
  currentSlides?: Slide[];
  onSelectBanner?: (slides: Slide[], aspectRatio: string) => void;
  onUseAsTemplate?: (slides: Slide[], aspectRatio: string) => void;
  bannersRefreshTrigger?: number;
  /** Controlled open state — parent can pass this to open/close programmatically */
  isOpen?: boolean;
  onToggle?: () => void;
}

export default function RightSidebar({
  currentSlides = [],
  onSelectBanner,
  onUseAsTemplate,
  bannersRefreshTrigger = 0,
  isOpen,
  onToggle,
}: RightSidebarProps) {
  const [internalOpen, setInternalOpen] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("rightSidebarOpen") === "true";
    }
    return false;
  });

  const open = isOpen !== undefined ? isOpen : internalOpen;

  const toggle = () => {
    if (onToggle) {
      onToggle();
    } else {
      const next = !internalOpen;
      setInternalOpen(next);
      localStorage.setItem("rightSidebarOpen", String(next));
    }
  };

  const [showPromo, setShowPromo] = useState(true);
  const [recentBanners, setRecentBanners] = useState<RecentBanner[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const load = async () => {
      try {
        await openDB();
        const list = await getAllBanners();
        if (cancelled) return;
        const sorted = (list || [])
          .filter((b) => b.slides?.length > 0)
          .map((b) => ({
            id: b.id,
            name: b.name || `Banner ${b.id.slice(-6)}`,
            createdAt: b.createdAt,
            aspectRatio: b.aspectRatio || "16:9",
            firstImageUrl: b.slides[0]?.imageUrl ?? null,
            slides: b.slides,
          }))
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .slice(0, 12);
        setRecentBanners(sorted);
      } catch {
        try {
          const raw = localStorage.getItem("savedBanners");
          const list = raw ? JSON.parse(raw) : [];
          if (cancelled) return;
          const sorted = (list || [])
            .filter((b: { slides?: unknown[] }) => (b.slides?.length ?? 0) > 0)
            .map((b: { id: string; name?: string; createdAt: string; aspectRatio?: string; slides: Slide[] }) => ({
              id: b.id,
              name: b.name || `Banner ${b.id.slice(-6)}`,
              createdAt: b.createdAt,
              aspectRatio: b.aspectRatio || "16:9",
              firstImageUrl: b.slides[0]?.imageUrl ?? null,
              slides: b.slides,
            }))
            .sort((a: RecentBanner, b: RecentBanner) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            .slice(0, 12);
          setRecentBanners(sorted);
        } catch {
          if (!cancelled) setRecentBanners([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [bannersRefreshTrigger]);

  return (
    <div className="relative flex flex-shrink-0">
      {/* Toggle tab */}
      <button
        type="button"
        onClick={toggle}
        aria-label={open ? "Hide recent banners" : "Show recent banners"}
        title={open ? "Hide recent" : "Show recent"}
        className="self-start mt-4 -mr-px z-10 flex items-center justify-center w-5 h-12 rounded-l-lg border border-white/[0.08] bg-[var(--panel-bg)] text-gray-500 hover:text-white hover:bg-white/[0.08] transition-colors"
        style={{ backdropFilter: "blur(12px)" }}
      >
        <svg
          width="10"
          height="10"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`transition-transform duration-200 ${open ? "rotate-0" : "rotate-180"}`}
        >
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </button>

      {/* Panel */}
      <div
        className="flex flex-col border-l border-white/[0.06] overflow-hidden transition-all duration-300 ease-in-out"
        style={{
          width: open ? "var(--right-panel-width)" : "0px",
          opacity: open ? 1 : 0,
          background: "var(--panel-bg)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          pointerEvents: open ? "auto" : "none",
        }}
      >
        <div className="w-[var(--right-panel-width)] flex flex-col h-full overflow-hidden">
          {showPromo && (
            <div className="m-3 p-4 rounded-xl border border-white/[0.08] relative overflow-hidden"
              style={{ background: "linear-gradient(135deg, rgba(236,72,153,0.12) 0%, rgba(139,92,246,0.12) 100%)" }}>
              <button
                onClick={() => setShowPromo(false)}
                className="absolute top-2.5 right-2.5 text-gray-500 hover:text-white transition-colors"
                aria-label="Dismiss"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              <p className="text-[13px] font-semibold text-white mb-1">Pro Features</p>
              <p className="text-[12px] text-gray-400 mb-3 leading-relaxed">
                Unlock advanced templates, higher resolution exports, and priority support.
              </p>
              <button className="btn-upgrade w-full justify-center py-1.5 text-[12px]">
                Upgrade to Pro
              </button>
            </div>
          )}

          <div className="flex-1 px-3 pb-3 overflow-hidden flex flex-col min-h-0">
            <h3 className="text-[13px] font-semibold text-white mb-3 mt-1 px-1">Recent Banners</h3>

            {currentSlides.length > 0 && (
              <div className="mb-3">
                <p className="text-[11px] text-gray-500 mb-2 px-1">
                  Session · {currentSlides.length} slide{currentSlides.length !== 1 ? "s" : ""}
                </p>
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {currentSlides.map((slide, i) => (
                    <div
                      key={slide.id}
                      className="flex-shrink-0 w-16 h-12 rounded-lg border border-white/[0.08] overflow-hidden bg-white/[0.04]"
                    >
                      {slide.imageUrl ? (
                        <img src={slide.imageUrl} alt={`Slide ${i + 1}`} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-600 text-[10px]">{i + 1}</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-2 overflow-y-auto flex-1 min-h-0 pr-0.5">
              {loading ? (
                <p className="text-[12px] text-gray-600 px-1">Loading…</p>
              ) : recentBanners.length === 0 ? (
                <p className="text-[12px] text-gray-600 px-1 leading-relaxed">
                  No saved banners yet. Generate or save a banner to see it here.
                </p>
              ) : (
                recentBanners.map((banner) => (
                  <div
                    key={banner.id}
                    className="rounded-xl border border-white/[0.07] bg-white/[0.03] hover:bg-white/[0.06] hover:border-white/[0.14] transition-colors overflow-hidden"
                  >
                    <button
                      type="button"
                      onClick={() => onSelectBanner?.(banner.slides, banner.aspectRatio)}
                      className="w-full text-left"
                    >
                      <div className="w-full h-[52px] bg-white/[0.04] flex items-center justify-center overflow-hidden">
                        {banner.firstImageUrl ? (
                          <img src={banner.firstImageUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-gray-600 text-[11px]">No preview</span>
                        )}
                      </div>
                      <div className="px-3 py-2">
                        <p className="text-[12px] text-gray-200 truncate font-medium">{banner.name}</p>
                        <p className="text-[11px] text-gray-600">{formatTimeAgo(banner.createdAt)}</p>
                      </div>
                    </button>
                    <div className="flex gap-1.5 px-3 pb-2.5">
                      <button
                        type="button"
                        onClick={() => onSelectBanner?.(banner.slides, banner.aspectRatio)}
                        className="flex-1 px-2 py-1.5 text-[11px] font-medium bg-[var(--accent)] text-white rounded-lg hover:bg-[var(--accent-hover)] transition-colors"
                      >
                        Open
                      </button>
                      {onUseAsTemplate && (
                        <button
                          type="button"
                          onClick={() => onUseAsTemplate(banner.slides, banner.aspectRatio)}
                          className="flex-1 px-2 py-1.5 text-[11px] font-medium bg-white/[0.07] text-gray-300 rounded-lg hover:bg-white/[0.12] transition-colors"
                        >
                          Copy
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
