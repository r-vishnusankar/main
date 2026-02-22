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
  if (sec < 86400) return `${Math.floor(sec / 3600)} hours ago`;
  if (sec < 604800) return `${Math.floor(sec / 86400)} days ago`;
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
  /** Current session slides (created images not yet saved as a banner). */
  currentSlides?: Slide[];
  /** When user clicks a saved banner, open it in the editor. */
  onSelectBanner?: (slides: Slide[], aspectRatio: string) => void;
  /** When this changes, refetch recent banners. */
  bannersRefreshTrigger?: number;
  /** Navigate to Banners tab (e.g. for "Open Banners" from settings). */
  onOpenBanners?: () => void;
}

export default function RightSidebar({
  currentSlides = [],
  onSelectBanner,
  bannersRefreshTrigger = 0,
}: RightSidebarProps) {
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
    <div className="w-80 bg-[#2a2a2a] border-l border-[#3a3a3a] flex flex-col">
      {showPromo && (
        <div className="m-4 p-4 bg-gradient-to-br from-pink-500/20 to-purple-500/20 rounded-lg border border-pink-500/30 relative">
          <button
            onClick={() => setShowPromo(false)}
            className="absolute top-2 right-2 text-gray-400 hover:text-white"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl">🎨</span>
            <span className="font-semibold">Pro Features</span>
          </div>
          <p className="text-sm text-gray-300 mb-3">
            Unlock advanced templates, higher resolution exports, and priority support.
          </p>
          <button className="w-full py-2 px-4 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-lg text-sm font-medium hover:opacity-90">
            Upgrade
          </button>
        </div>
      )}

      <div className="flex-1 px-4 pb-4 overflow-hidden flex flex-col min-h-0">
        <h3 className="font-semibold text-sm mb-3">Recent Banners</h3>

        {currentSlides.length > 0 && (
          <div className="mb-3">
            <p className="text-xs text-gray-500 mb-2">Current session ({currentSlides.length} slide{currentSlides.length !== 1 ? "s" : ""})</p>
            <div className="flex gap-2 overflow-x-auto pb-2">
              {currentSlides.map((slide, i) => (
                <div
                  key={slide.id}
                  className="flex-shrink-0 w-20 h-20 rounded-lg border border-[#3a3a3a] overflow-hidden bg-[#1a1a1a]"
                >
                  {slide.imageUrl ? (
                    <img
                      src={slide.imageUrl}
                      alt={`Slide ${i + 1}`}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-500 text-xs">Slide {i + 1}</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-2 overflow-y-auto flex-1 min-h-0">
          {loading ? (
            <p className="text-xs text-gray-500">Loading…</p>
          ) : recentBanners.length === 0 ? (
            <p className="text-xs text-gray-500">No saved banners yet. Generate or save a banner to see it here.</p>
          ) : (
            recentBanners.map((banner) => (
              <button
                key={banner.id}
                type="button"
                onClick={() => onSelectBanner?.(banner.slides, banner.aspectRatio)}
                className="w-full p-2 bg-[#1a1a1a] rounded-lg border border-[#3a3a3a] hover:border-[#4a4a4a] cursor-pointer transition-colors text-left"
              >
                <div className="w-full h-16 rounded mb-2 overflow-hidden bg-[#3a3a3a] flex items-center justify-center">
                  {banner.firstImageUrl ? (
                    <img
                      src={banner.firstImageUrl}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-gray-500 text-xs">No preview</span>
                  )}
                </div>
                <p className="text-xs text-gray-300 truncate font-medium">{banner.name}</p>
                <p className="text-xs text-gray-500">{formatTimeAgo(banner.createdAt)}</p>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
