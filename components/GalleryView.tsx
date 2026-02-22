"use client";

import { useState, useEffect } from "react";
import { getAllAssets, getAllBanners, openDB } from "@/lib/indexedDB";
import type { Slide, AspectRatio } from "@/types/banner";
import type { StoredAssetRecord, StoredBannerRecord } from "@/lib/indexedDB";

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
  refreshTrigger?: number;
}

const VALID_ASPECT_RATIOS: AspectRatio[] = ["16:9", "3:1", "4:1", "1:1"];

export default function GalleryView({ onSelectForEdit, refreshTrigger = 0 }: GalleryViewProps) {
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewItem, setViewItem] = useState<GalleryItem | null>(null);

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

  const handleSelect = (item: GalleryItem) => {
    const aspectRatio: AspectRatio = item.aspectRatio && VALID_ASPECT_RATIOS.includes(item.aspectRatio as AspectRatio)
      ? (item.aspectRatio as AspectRatio)
      : "16:9";
    const slide: Slide = {
      id: generateId(),
      imageUrl: item.imageUrl,
      prompt: item.prompt ?? undefined,
    };
    onSelectForEdit(slide, aspectRatio);
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center text-gray-400">
        Loading gallery…
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="p-8 max-w-2xl mx-auto text-center">
        <h2 className="text-xl font-semibold text-white mb-2">Gallery</h2>
        <p className="text-gray-400">No created images yet. Generate or upload images from Create or Product banner to see them here.</p>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold text-white mb-2">Gallery</h1>
      <p className="text-gray-400 mb-6">View images in a popup or open in the editor to rework.</p>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {items.map((item) => (
          <div
            key={item.id}
            className="rounded-xl border border-[#3a3a3a] bg-[#2a2a2a] overflow-hidden hover:border-[#4a4a4a] transition-all flex flex-col group"
          >
            <div className="aspect-video bg-[#1a1a1a] relative">
              <img
                src={item.imageUrl}
                alt={item.title}
                className="w-full h-full object-contain"
              />
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center gap-3 opacity-80 group-hover:opacity-100 transition-opacity">
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setViewItem(item); }}
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
              </div>
            </div>
            <div className="p-3 flex flex-col gap-1 min-h-0">
              <span className="text-sm font-medium text-white truncate" title={item.title}>
                {item.title}
              </span>
              {item.prompt && (
                <p className="text-xs text-gray-500 line-clamp-2" title={item.prompt}>
                  {item.prompt}
                </p>
              )}
              {item.aspectRatio && (
                <span className="text-xs text-gray-500">Resolution: {item.aspectRatio}</span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* View popup */}
      {viewItem && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70"
          onClick={() => setViewItem(null)}
          role="dialog"
          aria-modal="true"
          aria-label="View image"
        >
          <div
            className="bg-[#2a2a2a] rounded-xl border border-[#3a3a3a] max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-[#3a3a3a] flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white truncate pr-4">{viewItem.title}</h3>
              <button
                type="button"
                onClick={() => setViewItem(null)}
                className="p-2 rounded-lg hover:bg-[#3a3a3a] text-gray-400 hover:text-white transition-colors"
                aria-label="Close"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-auto p-4 flex flex-col md:flex-row gap-4">
              <div className="flex-shrink-0 md:max-w-[70%] flex justify-center bg-[#1a1a1a] rounded-lg overflow-hidden">
                <img
                  src={viewItem.imageUrl}
                  alt={viewItem.title}
                  className="max-h-[60vh] w-auto object-contain"
                />
              </div>
              <div className="flex flex-col gap-2 min-w-0">
                {viewItem.prompt && (
                  <div>
                    <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Prompt</span>
                    <p className="text-sm text-gray-300 mt-1 break-words">{viewItem.prompt}</p>
                  </div>
                )}
                {viewItem.aspectRatio && (
                  <div>
                    <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Resolution</span>
                    <p className="text-sm text-gray-300 mt-1">{viewItem.aspectRatio}</p>
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => { handleSelect(viewItem); setViewItem(null); }}
                  className="mt-2 px-4 py-2 rounded-lg bg-[#0066ff] hover:bg-[#0052cc] text-white text-sm font-medium flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Open in editor
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
