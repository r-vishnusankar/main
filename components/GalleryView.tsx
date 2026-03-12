"use client";

import { useState, useEffect } from "react";
import { getAllAssets, getAllBanners, openDB } from "@/lib/indexedDB";
import type { Slide, AspectRatio } from "@/types/banner";
import type { StoredAssetRecord, StoredBannerRecord } from "@/lib/indexedDB";
import { getFavoriteIds, toggleFavorite } from "@/lib/favorites";
import { Gallery, ImageModal, type GalleryImage } from "@/components/ui/react-tailwind-image-gallery";
import { Search, Star } from "lucide-react";

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
  onAddToEditor?: (slide: Slide, aspectRatio: AspectRatio) => void;
  refreshTrigger?: number;
}

const VALID_ASPECT_RATIOS: AspectRatio[] = ["16:9", "3:1", "4:1", "1:1"];

/** Map aspect ratio to grid span for varied layout */
function getSpanForAspectRatio(index: number, aspectRatio: string | null): string {
  const ar = aspectRatio ?? "16:9";
  if (ar === "16:9" || ar === "3:1" || ar === "4:1") return index % 3 === 0 ? "sm:col-span-2" : "col-span-1";
  return "col-span-1";
}

export default function GalleryView({ onSelectForEdit, onAddToEditor, refreshTrigger = 0 }: GalleryViewProps) {
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalImage, setModalImage] = useState<GalleryItem | null>(null);
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
        const seenUrls = new Set<string>();

        // Prioritize banners first so they get their proper banner names,
        // then add assets only if they haven't been seen yet.
        const bannerList = banners || [];
        for (const b of bannerList) {
          if (!b.slides?.length) continue;
          const created = b.createdAt || new Date().toISOString();
          const ar = b.aspectRatio || "16:9";
          b.slides.forEach((s: { imageUrl?: string; prompt?: string; id?: string }, i: number) => {
            if (s?.imageUrl && !seenUrls.has(s.imageUrl)) {
              seenUrls.add(s.imageUrl);
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

        for (const a of assets || []) {
          if (!a.imageUrl) continue;
          const isGenerated = a.type === "generated" || (!a.type && !!a.prompt);
          if (!isGenerated) continue;
          
          if (!seenUrls.has(a.imageUrl)) {
            seenUrls.add(a.imageUrl);
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

  const displayItems = (showFavoritesOnly ? items.filter((i) => favoriteIds.has(i.id)) : items).filter(
    (i) =>
      !searchQuery.trim() ||
      [i.title, i.prompt].some((t) => t && String(t).toLowerCase().includes(searchQuery.trim().toLowerCase()))
  );

  const galleryData: GalleryImage[] = displayItems.map((item, index) => ({
    id: item.id,
    src: item.imageUrl,
    alt: item.title,
    title: item.title,
    span: getSpanForAspectRatio(index, item.aspectRatio),
  }));

  const openModal = (img: GalleryImage) => {
    const item = displayItems.find((i) => i.id === img.id);
    if (item) setModalImage(item);
  };

  const closeModal = () => setModalImage(null);

  const handleEdit = () => {
    if (!modalImage) return;
    const aspectRatio = getAspectRatio(modalImage);
    const slide: Slide = {
      id: generateId(),
      imageUrl: modalImage.imageUrl,
      prompt: modalImage.prompt ?? undefined,
    };
    onSelectForEdit(slide, aspectRatio);
    closeModal();
  };

  const handleDuplicate = () => {
    if (!modalImage || !onAddToEditor) return;
    const aspectRatio = getAspectRatio(modalImage);
    const slide: Slide = {
      id: generateId(),
      imageUrl: modalImage.imageUrl,
      prompt: modalImage.prompt ?? undefined,
    };
    onAddToEditor(slide, aspectRatio);
    closeModal();
  };

  const handleToggleFavorite = (itemId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    toggleFavorite(itemId);
    setFavoriteIds(new Set(getFavoriteIds()));
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeModal();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

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
            className="flex-1 min-w-[180px] px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg text-white placeholder-gray-500 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
          />
          <button type="button" onClick={() => setShowFavoritesOnly(false)} className={`px-3 py-1.5 rounded-lg text-sm ${!showFavoritesOnly ? "bg-[var(--accent)] text-white" : "bg-[var(--card-bg)] border border-[var(--border)] text-gray-400 hover:text-white"}`}>All</button>
          <button type="button" onClick={() => setShowFavoritesOnly(true)} className={`px-3 py-1.5 rounded-lg text-sm flex items-center gap-1.5 ${showFavoritesOnly ? "bg-[var(--accent)] text-white" : "bg-[var(--card-bg)] border border-[var(--border)] text-gray-400 hover:text-white"}`}><Star className="w-4 h-4" /> Favorites</button>
        </div>
        <p className="text-gray-400">{showFavoritesOnly && !searchQuery.trim() ? "No favorites yet. Click the star on any image to add it to Favorites." : "No results. Try changing search or filters."}</p>
      </div>
    );
  }

  return (
    <div className="w-full min-w-0">
      {/* Search and filters */}
      <div className="px-6 py-6 flex flex-wrap items-center gap-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name or prompt…"
            className="w-full pl-9 pr-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg text-white placeholder-gray-500 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
          />
        </div>
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
          <Star className="w-4 h-4" /> Favorites
        </button>
      </div>

      <Gallery data={galleryData} onImageClick={openModal} title="Gallery" />

      <ImageModal
        src={modalImage?.imageUrl ?? null}
        title={modalImage?.title}
        onClose={closeModal}
        onEdit={handleEdit}
        onDuplicate={onAddToEditor ? handleDuplicate : undefined}
        onFavorite={modalImage ? () => handleToggleFavorite(modalImage.id) : undefined}
        isFavorite={modalImage ? favoriteIds.has(modalImage.id) : false}
      />
    </div>
  );
}
