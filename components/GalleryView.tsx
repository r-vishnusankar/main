"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { getAllAssets, getAllBanners, openDB } from "@/lib/indexedDB";
import type { Slide, AspectRatio } from "@/types/banner";
import type { StoredAssetRecord, StoredBannerRecord } from "@/lib/indexedDB";
import { getFavoriteIds, toggleFavorite } from "@/lib/favorites";
import { getAspectRatioClass } from "@/lib/aspectRatioClass";

export interface GalleryItem {
  id: string;
  imageUrl: string;
  title: string;
  prompt: string | null;
  aspectRatio: string | null;
  createdAt: string;
  source: "asset" | "banner";
}

function generateId(): string {
  return `slide-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

interface GalleryViewProps {
  onSelectForEdit: (slide: Slide, aspectRatio: AspectRatio) => void;
  /** Add this slide to the carousel and open editor (Duplicate). Optional. */
  onAddToEditor?: (slide: Slide, aspectRatio: AspectRatio) => void;
  refreshTrigger?: number;
}

const VALID_ASPECT_RATIOS: AspectRatio[] = ["16:9", "3:1", "4:1", "1:1"];

export default function GalleryView({ onSelectForEdit, onAddToEditor, refreshTrigger = 0 }: GalleryViewProps) {
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewIndex, setViewIndex] = useState<number | null>(null);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    setFavoriteIds(new Set(getFavoriteIds()));
  }, [refreshTrigger]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const load = async () => {
      try {
        await openDB();
        let assets: StoredAssetRecord[] = await getAllAssets().catch(() => []);
        if (assets.length === 0) {
          try {
            const raw = localStorage.getItem("savedAssets");
            const list = raw ? JSON.parse(raw) : [];
            assets = Array.isArray(list) ? list : [];
          } catch {
            // ignore
          }
        }
        let banners: StoredBannerRecord[] = await getAllBanners().catch(() => []);
        if (banners.length === 0) {
          try {
            const raw = localStorage.getItem("savedBanners");
            banners = raw ? JSON.parse(raw) : [];
          } catch {
            // ignore
          }
        }

        if (cancelled) return;

        const galleryItems: GalleryItem[] = [];

        for (const a of assets || []) {
          if (!a.imageUrl) continue;
          // Show only AI-generated images in Gallery; uploads go to Assets section
          const isGenerated = a.type === "generated" || (!a.type && !!a.prompt);
          if (!isGenerated) continue;
          galleryItems.push({
            id: a.id,
            imageUrl: a.imageUrl,
            title: a.name || "Image",
            prompt: a.prompt ?? null,
            aspectRatio: a.aspectRatio ?? null,
            createdAt: a.uploadedAt,
            source: "asset",
          });
        }

        const bannerList = banners || [];

        for (const b of bannerList) {
          if (!b.slides?.length) continue;
          const created = b.createdAt || new Date().toISOString();
          const ar = b.aspectRatio || "16:9";
          b.slides.forEach((s: { imageUrl?: string; prompt?: string; id?: string }, i: number) => {
            if (s?.imageUrl) {
              galleryItems.push({
                id: `${b.id}-${i}`,
                imageUrl: s.imageUrl,
                title: b.name || `Slide ${i + 1}`,
                prompt: s.prompt ?? null,
                aspectRatio: ar,
                createdAt: created,
                source: "banner",
              });
            }
          });
        }

        galleryItems.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setItems(galleryItems);
      } catch {
        if (!cancelled) setItems([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [refreshTrigger]);

  const getAspectRatio = (item: GalleryItem): AspectRatio =>
    item.aspectRatio && VALID_ASPECT_RATIOS.includes(item.aspectRatio as AspectRatio)
      ? (item.aspectRatio as AspectRatio)
      : "16:9";

  const handleSelect = (item: GalleryItem) => {
    const aspectRatio = getAspectRatio(item);
    const slide: Slide = {
      id: generateId(),
      imageUrl: item.imageUrl,
      prompt: item.prompt ?? undefined,
    };
    onSelectForEdit(slide, aspectRatio);
  };

  const handleDuplicate = (item: GalleryItem, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onAddToEditor) return;
    const aspectRatio = getAspectRatio(item);
    const slide: Slide = {
      id: generateId(),
      imageUrl: item.imageUrl,
      prompt: item.prompt ?? undefined,
    };
    onAddToEditor(slide, aspectRatio);
  };

  const handleToggleFavorite = (itemId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    toggleFavorite(itemId);
    setFavoriteIds(new Set(getFavoriteIds()));
  };

  const displayItems = (showFavoritesOnly ? items.filter((i) => favoriteIds.has(i.id)) : items).filter(
    (i) =>
      !searchQuery.trim() ||
      [i.title, i.prompt].some((t) => t && String(t).toLowerCase().includes(searchQuery.trim().toLowerCase()))
  );

  const viewItem = viewIndex !== null ? displayItems[viewIndex] ?? null : null;

  const openViewer = useCallback((idx: number) => setViewIndex(idx), []);
  const closeViewer = useCallback(() => setViewIndex(null), []);
  const prevImage = useCallback(() =>
    setViewIndex((i) => (i !== null && i > 0 ? i - 1 : displayItems.length - 1)), [displayItems.length]);
  const nextImage = useCallback(() =>
    setViewIndex((i) => (i !== null && i < displayItems.length - 1 ? i + 1 : 0)), [displayItems.length]);

  // Keyboard navigation
  useEffect(() => {
    if (viewIndex === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeViewer();
      else if (e.key === "ArrowLeft") prevImage();
      else if (e.key === "ArrowRight") nextImage();
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [viewIndex, closeViewer, prevImage, nextImage]);

  // Touch swipe tracking
  const touchStartX = useRef<number | null>(null);
  const onTouchStart = (e: React.TouchEvent) => { touchStartX.current = e.touches[0].clientX; };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const delta = e.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(delta) < 40) return;
    if (delta < 0) nextImage(); else prevImage();
  };

  if (loading) {
    return (
      <div className="w-full min-w-0 px-8 py-12 flex items-center justify-center text-gray-400">
        Loading gallery…
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="w-full min-w-0 px-8 py-12 text-center">
        <h2 className="text-xl font-semibold text-white mb-2">Gallery</h2>
        <p className="text-gray-400 text-sm">No images yet. Create or upload images from Create or Product banner to see them here.</p>
      </div>
    );
  }

  if (displayItems.length === 0 && (showFavoritesOnly || searchQuery.trim())) {
    return (
      <div className="w-full min-w-0 px-8 py-10">
        <h1 className="text-2xl font-bold text-white mb-2">Gallery</h1>
        <div className="flex flex-wrap items-center gap-4 mb-6">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name or prompt…"
            className="flex-1 min-w-[180px] px-3 py-2 bg-[#1a1a1a] border border-[#3a3a3a] rounded-lg text-white placeholder-gray-500 text-sm focus:outline-none focus:border-[#0066ff]"
          />
          <button type="button" onClick={() => setShowFavoritesOnly(false)} className={`px-3 py-1.5 rounded-lg text-sm ${!showFavoritesOnly ? "bg-[#0066ff] text-white" : "bg-[#2a2a2a] text-gray-400 hover:text-white"}`}>All</button>
          <button type="button" onClick={() => setShowFavoritesOnly(true)} className={`px-3 py-1.5 rounded-lg text-sm flex items-center gap-1.5 ${showFavoritesOnly ? "bg-[#0066ff] text-white" : "bg-[#2a2a2a] text-gray-400 hover:text-white"}`}><span>★</span> Favorites</button>
        </div>
        <p className="text-gray-400">{showFavoritesOnly && !searchQuery.trim() ? "No favorites yet. Click the star on any image to add it to Favorites." : "No results. Try changing search or filters."}</p>
      </div>
    );
  }

  return (
      <div className="w-full min-w-0 px-8 py-10">
      <h1 className="text-[22px] font-semibold text-white mb-2">Gallery</h1>
      <p className="text-gray-400 text-[15px] mb-6">View images in a popup or open in the editor to rework.</p>
      <div className="flex flex-wrap items-center gap-4 mb-6">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by name or prompt…"
          className="flex-1 min-w-[180px] px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg text-white placeholder-gray-500 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
        />
        <button
          type="button"
          onClick={() => setShowFavoritesOnly(false)}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${!showFavoritesOnly ? "bg-[var(--accent)] text-white" : "bg-[var(--card-bg)] border border-[var(--border)] text-gray-400 hover:text-white"}`}
        >
          All
        </button>
        <button
          type="button"
          onClick={() => setShowFavoritesOnly(true)}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1.5 transition-colors ${showFavoritesOnly ? "bg-[var(--accent)] text-white" : "bg-[var(--card-bg)] border border-[var(--border)] text-gray-400 hover:text-white"}`}
        >
          <span aria-hidden="true">★</span> Favorites
        </button>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {displayItems.map((item) => (
          <div
            key={item.id}
            className="rounded-xl border border-white/[0.1] card-glass overflow-hidden hover:border-white/20 transition-all flex flex-col group min-w-0"
          >
            <div className={`${getAspectRatioClass(item.aspectRatio)} bg-[var(--background)] relative min-h-[120px]`}>
              <img
                src={item.imageUrl}
                alt={item.title}
                className="w-full h-full object-contain"
              />
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center gap-2 opacity-80 group-hover:opacity-100 transition-opacity">
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); openViewer(displayItems.indexOf(item)); }}
                  className="p-2.5 rounded-full bg-white/90 hover:bg-white text-[#1a1a1a] transition-colors"
                  title="View"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); handleSelect(item); }}
                  className="p-2.5 rounded-full bg-[#0066ff] hover:bg-[#0052cc] text-white transition-colors"
                  title="Edit"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
                {onAddToEditor && (
                  <button
                    type="button"
                    onClick={(e) => handleDuplicate(item, e)}
                    className="p-2.5 rounded-full bg-[#3a3a3a] hover:bg-[#4a4a4a] text-white transition-colors"
                    title="Duplicate (add to editor)"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h2m8 0h2a2 2 0 012 2v2m0 8v2a2 2 0 01-2 2h-2m-8 0H6a2 2 0 01-2-2v-8a2 2 0 012-2h2" />
                    </svg>
                  </button>
                )}
                <button
                  type="button"
                  onClick={(e) => handleToggleFavorite(item.id, e)}
                  className={`p-2.5 rounded-full transition-colors ${favoriteIds.has(item.id) ? "bg-amber-500/90 text-white" : "bg-[#3a3a3a] text-gray-400 hover:bg-[#4a4a4a] hover:text-amber-400"}`}
                  title={favoriteIds.has(item.id) ? "Unfavorite" : "Favorite"}
                >
                  <svg className="w-5 h-5" fill={favoriteIds.has(item.id) ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="p-3 flex flex-col gap-1 min-h-[4.5rem]">
              <span className="text-sm font-medium text-white truncate" title={item.title}>
                {item.title}
              </span>
              {item.prompt && (
                <p className="text-xs text-gray-500 line-clamp-2" title={item.prompt}>
                  {item.prompt}
                </p>
              )}
              {item.aspectRatio && (
                <span className="text-xs text-gray-500">{item.aspectRatio}</span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* View popup — fullscreen lightbox with prev/next navigation */}
      {viewItem && viewIndex !== null && (
        <div
          className="fixed inset-0 z-50 flex flex-col bg-black/95"
          onClick={closeViewer}
          role="dialog"
          aria-modal="true"
          aria-label="View image"
        >
          {/* Top bar */}
          <div
            className="flex-shrink-0 flex items-center justify-between px-6 py-3 bg-black/60 backdrop-blur-md border-b border-white/10"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 min-w-0">
              <h3 className="text-base font-semibold text-white truncate">{viewItem.title}</h3>
              <span className="flex-shrink-0 text-xs text-gray-500">{viewIndex + 1} / {displayItems.length}</span>
            </div>
            <button
              type="button"
              onClick={closeViewer}
              className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
              aria-label="Close"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Image area with swipe support */}
          <div
            className="flex-1 flex items-center justify-center min-h-0 relative"
            onClick={closeViewer}
            onTouchStart={onTouchStart}
            onTouchEnd={onTouchEnd}
          >
            {/* Prev arrow */}
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); prevImage(); }}
              className="absolute left-4 z-10 p-3 rounded-full bg-black/50 hover:bg-black/80 text-white border border-white/10 transition-all hover:scale-110"
              aria-label="Previous image"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={viewItem.imageUrl}
              alt={viewItem.title}
              className="max-w-full max-h-full object-contain rounded-lg shadow-2xl select-none"
              style={{ maxHeight: "calc(100vh - 140px)", padding: "24px 80px" }}
              onClick={(e) => e.stopPropagation()}
              draggable={false}
            />

            {/* Next arrow */}
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); nextImage(); }}
              className="absolute right-4 z-10 p-3 rounded-full bg-black/50 hover:bg-black/80 text-white border border-white/10 transition-all hover:scale-110"
              aria-label="Next image"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          {/* Bottom info bar */}
          <div
            className="flex-shrink-0 flex flex-wrap items-center gap-4 px-6 py-3 bg-black/60 backdrop-blur-md border-t border-white/10"
            onClick={(e) => e.stopPropagation()}
          >
            {viewItem.aspectRatio && (
              <span className="text-xs text-gray-400 bg-white/10 px-2 py-1 rounded">
                {viewItem.aspectRatio}
              </span>
            )}
            {viewItem.prompt && (
              <p className="flex-1 text-sm text-gray-300 truncate min-w-0" title={viewItem.prompt}>
                <span className="text-gray-500 mr-1">Prompt:</span>{viewItem.prompt}
              </p>
            )}
            <button
              type="button"
              onClick={() => { handleSelect(viewItem); closeViewer(); }}
              className="ml-auto flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-lg bg-[#0066ff] hover:bg-[#0052cc] text-white text-sm font-medium transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Open in editor
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
