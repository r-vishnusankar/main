"use client";

import { useState, useRef, useEffect } from "react";
import type { Slide, AspectRatio } from "@/types/banner";
import { resizeImageToAspect, getAspectRatioNumber } from "@/lib/resizeToAspect";
import { saveAsset, openDB } from "@/lib/indexedDB";

function generateId(): string {
  return `slide-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

async function fileToBase64(file: File): Promise<{ base64: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
      if (match) resolve({ base64: match[2], mimeType: match[1] });
      else reject(new Error("Failed to read file"));
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export type CreateWorkflow = "generate" | "product";

interface ImageSourcePanelProps {
  aspectRatio: AspectRatio;
  onAddSlide: (slide: Slide) => void;
  suggestedPrompt?: string;
  /** When set, shows only that workflow (no mode dropdown). */
  workflow?: CreateWorkflow;
  /** Callback when a banner should be saved (for workflow 1 - generate image) */
  onSaveBanner?: (slides: Slide[], aspectRatio: AspectRatio) => void;
}

export default function ImageSourcePanel({ aspectRatio, onAddSlide, suggestedPrompt, workflow, onSaveBanner }: ImageSourcePanelProps) {
  const [prompt, setPrompt] = useState(suggestedPrompt ?? "");
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const ratioNum = getAspectRatioNumber(aspectRatio);

  const [productFile, setProductFile] = useState<File | null>(null);
  const [productPreviewUrl, setProductPreviewUrl] = useState<string | null>(null);
  const [bannerInstructions, setBannerInstructions] = useState(suggestedPrompt ?? "");
  const [creatingBanner, setCreatingBanner] = useState(false);
  const [mode, setMode] = useState<"text" | "product">("text");
  const effectiveMode: "text" | "product" = workflow === "product" ? "product" : workflow === "generate" ? "text" : mode;

  useEffect(() => {
    if (!productFile) {
      setProductPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(productFile);
    setProductPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [productFile]);

  useEffect(() => {
    if (suggestedPrompt !== undefined) {
      setPrompt(suggestedPrompt);
      setBannerInstructions(suggestedPrompt);
    }
  }, [suggestedPrompt]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith("image/")) return;
    setError(null);
    try {
      const blob = await resizeImageToAspect(file, ratioNum);
      const url = URL.createObjectURL(blob);
      
      // Convert to base64 and save to assets automatically
      try {
        const imageUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = () => reject(reader.error);
          reader.readAsDataURL(blob);
        });

        const useIndexedDB = await openDB().then(() => true).catch(() => false);
        if (useIndexedDB) {
          await saveAsset({
            id: `asset-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
            imageUrl,
            name: file.name,
            uploadedAt: new Date().toISOString(),
          });
        } else {
          // Fallback to localStorage
          const storedAssets = localStorage.getItem("savedAssets");
          const assets = storedAssets ? JSON.parse(storedAssets) : [];
          assets.push({
            id: `asset-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
            imageUrl,
            name: file.name,
            uploadedAt: new Date().toISOString(),
          });
          localStorage.setItem("savedAssets", JSON.stringify(assets.slice(-50))); // Keep last 50
        }
      } catch (err) {
        console.warn("Failed to save uploaded image to assets:", err);
      }

      onAddSlide({
        id: generateId(),
        imageUrl: url,
        imageBlob: blob,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    }
    e.target.value = "";
  };

  const handleGenerate = async () => {
    const trimmed = prompt.trim();
    if (!trimmed) {
      setError("Enter a prompt");
      return;
    }
    setError(null);
    setGenerating(true);
    try {
      const res = await fetch("/api/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to generate image");
      let imageUrl = data.imageUrl;
      if (!imageUrl) throw new Error("No image in response");

      // Convert remote URL to base64 for storage
      if (!imageUrl.startsWith("data:")) {
        try {
          const response = await fetch(imageUrl);
          const blob = await response.blob();
          imageUrl = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = () => reject(reader.error);
            reader.readAsDataURL(blob);
          });
        } catch (err) {
          console.warn("Failed to convert image to base64:", err);
        }
      }

      // Save to assets automatically
      try {
        const useIndexedDB = await openDB().then(() => true).catch(() => false);
        if (useIndexedDB) {
          await saveAsset({
            id: `asset-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
            imageUrl,
            name: `Generated: ${trimmed.substring(0, 30)}${trimmed.length > 30 ? "..." : ""}`,
            uploadedAt: new Date().toISOString(),
          });
        } else {
          // Fallback to localStorage
          const storedAssets = localStorage.getItem("savedAssets");
          const assets = storedAssets ? JSON.parse(storedAssets) : [];
          assets.push({
            id: `asset-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
            imageUrl,
            name: `Generated: ${trimmed.substring(0, 30)}${trimmed.length > 30 ? "..." : ""}`,
            uploadedAt: new Date().toISOString(),
          });
          localStorage.setItem("savedAssets", JSON.stringify(assets.slice(-50))); // Keep last 50
        }
      } catch (err) {
        console.warn("Failed to save generated image to assets:", err);
      }

      const slide: Slide = {
        id: generateId(),
        imageUrl,
      };
      
      onAddSlide(slide);
      
      // For workflow 1 (generate image), automatically save as banner
      if (workflow === "generate" && onSaveBanner) {
        onSaveBanner([slide], aspectRatio);
      }
      
      setPrompt("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setGenerating(false);
    }
  };

  const handleProductFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setProductFile(file && file.type.startsWith("image/") ? file : null);
    setError(null);
    e.target.value = "";
  };

  const handleCreateBannerFromProduct = async () => {
    if (!productFile) {
      setError("Upload a product image first");
      return;
    }
    const trimmed = bannerInstructions.trim();
    if (!trimmed) {
      setError("Enter instructions for the banner (style, layout, background, text placement, design)");
      return;
    }
    setError(null);
    setCreatingBanner(true);
    try {
      const { base64, mimeType } = await fileToBase64(productFile);
      const res = await fetch("/api/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: trimmed,
          imageBase64: base64,
          imageMimeType: mimeType,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to create banner");
      let imageUrl = data.imageUrl;
      if (!imageUrl) throw new Error("No image in response");

      // Convert remote URL to base64 for storage
      if (!imageUrl.startsWith("data:")) {
        try {
          const response = await fetch(imageUrl);
          const blob = await response.blob();
          imageUrl = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = () => reject(reader.error);
            reader.readAsDataURL(blob);
          });
        } catch (err) {
          console.warn("Failed to convert image to base64:", err);
        }
      }

      // Save to assets automatically
      try {
        const useIndexedDB = await openDB().then(() => true).catch(() => false);
        if (useIndexedDB) {
          await saveAsset({
            id: `asset-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
            imageUrl,
            name: `Banner: ${trimmed.substring(0, 30)}${trimmed.length > 30 ? "..." : ""}`,
            uploadedAt: new Date().toISOString(),
          });
        } else {
          // Fallback to localStorage
          const storedAssets = localStorage.getItem("savedAssets");
          const assets = storedAssets ? JSON.parse(storedAssets) : [];
          assets.push({
            id: `asset-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
            imageUrl,
            name: `Banner: ${trimmed.substring(0, 30)}${trimmed.length > 30 ? "..." : ""}`,
            uploadedAt: new Date().toISOString(),
          });
          localStorage.setItem("savedAssets", JSON.stringify(assets.slice(-50))); // Keep last 50
        }
      } catch (err) {
        console.warn("Failed to save banner image to assets:", err);
      }

      onAddSlide({ id: generateId(), imageUrl });
      setBannerInstructions("");
      setProductFile(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Banner creation failed");
    } finally {
      setCreatingBanner(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Adobe-style generation input */}
      <div className="relative">
        <div className="flex items-center gap-2 bg-[#1a1a1a] border border-[#3a3a3a] rounded-xl overflow-hidden focus-within:border-[#0066ff] transition-colors">
          {!workflow && (
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value as "text" | "product")}
              className="px-4 py-4 bg-[#1a1a1a] border-r border-[#3a3a3a] text-white text-sm focus:outline-none cursor-pointer"
            >
              <option value="text">Image</option>
              <option value="product">From Product</option>
            </select>
          )}
          {effectiveMode === "text" ? (
            <>
              <input
                type="text"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !generating && handleGenerate()}
                placeholder="Describe the image you want to generate"
                className="flex-1 px-4 py-4 bg-transparent text-white placeholder-gray-500 focus:outline-none text-sm"
                disabled={generating}
              />
              <button
                type="button"
                onClick={handleGenerate}
                disabled={generating || !prompt.trim()}
                className="px-6 py-4 bg-gradient-to-r from-[#0066ff] to-[#0052cc] text-white font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity flex items-center gap-2"
              >
                <span>✨</span>
                <span>{generating ? "Generating…" : "Generate"}</span>
              </button>
            </>
          ) : (
            <>
              <div className="flex-1 flex flex-col">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleProductFileChange}
                  className="hidden"
                  id="product-image-input"
                />
                <label
                  htmlFor="product-image-input"
                  className="px-4 py-2 text-sm text-gray-400 hover:text-white cursor-pointer border-b border-[#3a3a3a]"
                >
                  {productFile ? productFile.name : "Choose product image"}
                </label>
                {productPreviewUrl && (
                  <img
                    src={productPreviewUrl}
                    alt="Product"
                    className="h-16 object-contain px-4 py-2"
                  />
                )}
                <input
                  type="text"
                  value={bannerInstructions}
                  onChange={(e) => setBannerInstructions(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !creatingBanner && handleCreateBannerFromProduct()}
                  placeholder="Describe how the banner should look (style, layout, background, text)"
                  className="px-4 py-2 bg-transparent text-white placeholder-gray-500 focus:outline-none text-sm"
                  disabled={creatingBanner}
                />
              </div>
              <button
                type="button"
                onClick={handleCreateBannerFromProduct}
                disabled={creatingBanner || !productFile || !bannerInstructions.trim()}
                className="px-6 py-4 bg-gradient-to-r from-[#0066ff] to-[#0052cc] text-white font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity flex items-center gap-2"
              >
                <span>✨</span>
                <span>{creatingBanner ? "Creating…" : "Create"}</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Quick upload option - only in generate workflow or when no workflow (both modes) */}
      {(effectiveMode === "text" || !workflow) && (
        <div className="flex items-center gap-4 text-sm text-gray-400">
          <span>Or</span>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleUpload}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="text-[#0066ff] hover:text-[#0052cc] underline"
          >
            upload an image
          </button>
        </div>
      )}

      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm" role="alert">
          {error}
        </div>
      )}
    </div>
  );
}
