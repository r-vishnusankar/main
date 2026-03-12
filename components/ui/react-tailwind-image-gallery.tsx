"use client";

import React from "react";

export interface GalleryImage {
  id: string;
  src: string;
  alt: string;
  title: string;
  span?: string;
}

interface GalleryProps {
  data: GalleryImage[];
  onImageClick: (img: GalleryImage) => void;
  title?: string;
}

export function Gallery({ data, onImageClick, title = "My Work" }: GalleryProps) {
  return (
    <section id="portfolio" className="py-20 w-full" style={{ background: "var(--background)" }}>
      <div className="container mx-auto px-6">
        <h2 className="text-4xl font-bold text-center text-white mb-12">
          {title}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {data.map((img) => (
            <div
              key={img.id}
              className={`group cursor-pointer relative overflow-hidden rounded-lg ${img.span ?? "col-span-1"}`}
              onClick={() => onImageClick(img)}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={img.src}
                alt={img.alt}
                className="gallery-img w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-4">
                <p className="text-white text-lg font-medium transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300 ease-in-out">
                  {img.title}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

interface ImageModalProps {
  src: string | null;
  title?: string;
  onClose: () => void;
  onEdit?: () => void;
  onDuplicate?: () => void;
  onFavorite?: () => void;
  isFavorite?: boolean;
}

export function ImageModal({ src, title, onClose, onEdit, onDuplicate, onFavorite, isFavorite }: ImageModalProps) {
  if (!src) return null;

  return (
    <div
      id="imageModal"
      className="fixed inset-0 bg-black bg-opacity-80 flex justify-center items-center z-50 opacity-100"
      onClick={onClose}
    >
      <div className="relative flex flex-col items-center max-w-[90vw] max-h-[90vh]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={title ?? "Enlarged view"}
          className="max-w-[90vw] max-h-[85vh] rounded-lg shadow-2xl object-contain"
          onClick={(e) => e.stopPropagation()}
        />
        {(onEdit || onDuplicate || onFavorite) && (
          <div className="flex flex-wrap gap-2 mt-4" onClick={(e) => e.stopPropagation()}>
            {onEdit && (
              <button
                type="button"
                onClick={onEdit}
                className="px-4 py-2 rounded-lg bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-sm font-medium transition-colors"
              >
                Edit
              </button>
            )}
            {onDuplicate && (
              <button
                type="button"
                onClick={onDuplicate}
                className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-sm font-medium transition-colors border border-white/20"
              >
                Duplicate
              </button>
            )}
            {onFavorite && (
              <button
                type="button"
                onClick={onFavorite}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${isFavorite ? "bg-amber-500/20 text-amber-400 border border-amber-500/40" : "bg-white/10 hover:bg-white/20 text-white border border-white/20"}`}
              >
                {isFavorite ? "★ Favorited" : "☆ Favorite"}
              </button>
            )}
          </div>
        )}
      </div>
      <button
        type="button"
        className="absolute top-5 right-5 text-white text-4xl font-bold hover:opacity-80 transition-opacity"
        onClick={onClose}
        aria-label="Close"
      >
        &times;
      </button>
    </div>
  );
}
