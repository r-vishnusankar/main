"use client";

import { useState, useEffect } from "react";

interface ImageViewerProps {
  images: Array<{ id: string; imageUrl: string; name: string }>;
  isOpen: boolean;
  onClose: () => void;
}

export default function ImageViewer({ images, isOpen, onClose }: ImageViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(0);
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "ArrowLeft") {
        setCurrentIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1));
      } else if (e.key === "ArrowRight") {
        setCurrentIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0));
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, images.length, onClose]);

  if (!isOpen || images.length === 0) return null;

  const currentImage = images[currentIndex];

  return (
    <div
      className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="relative max-w-7xl max-h-full w-full h-full flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4 text-white">
          <div>
            <h2 className="text-xl font-semibold">{currentImage.name}</h2>
            <p className="text-sm text-gray-400">
              {currentIndex + 1} of {images.length}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            aria-label="Close"
          >
            <span className="text-2xl">×</span>
          </button>
        </div>

        {/* Image Container */}
        <div className="flex-1 flex items-center justify-center relative min-h-0">
          {/* Previous Button */}
          {images.length > 1 && (
            <button
              onClick={() => setCurrentIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1))}
              className="absolute left-4 p-3 bg-black/50 hover:bg-black/70 rounded-full text-white transition-colors z-10"
              aria-label="Previous image"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}

          {/* Image */}
          <div className="max-w-full max-h-full flex items-center justify-center">
            <img
              src={currentImage.imageUrl}
              alt={currentImage.name}
              className="max-w-full max-h-full object-contain rounded-lg"
            />
          </div>

          {/* Next Button */}
          {images.length > 1 && (
            <button
              onClick={() => setCurrentIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0))}
              className="absolute right-4 p-3 bg-black/50 hover:bg-black/70 rounded-full text-white transition-colors z-10"
              aria-label="Next image"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          )}
        </div>

        {/* Thumbnail Strip */}
        {images.length > 1 && (
          <div className="mt-4 flex gap-2 overflow-x-auto pb-2">
            {images.map((image, index) => (
              <button
                key={image.id}
                onClick={() => setCurrentIndex(index)}
                className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-all ${
                  index === currentIndex
                    ? "border-[#0066ff] ring-2 ring-[#0066ff]/50"
                    : "border-transparent hover:border-gray-500"
                }`}
              >
                <img
                  src={image.imageUrl}
                  alt={image.name}
                  className="w-full h-full object-cover"
                />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
