"use client";

import { useState, useRef, useEffect } from "react";
import type { Slide, AspectRatio } from "@/types/banner";
import { resizeImageToAspect, getAspectRatioNumber, resizeDataUrlToAspect, resizeDataUrlToMaxDimension } from "@/lib/resizeToAspect";
import { saveAsset, openDB } from "@/lib/indexedDB";
import {
  type ImagePurpose,
  IMAGE_PURPOSE_OPTIONS,
  IMAGE_PURPOSE_PROMPTS,
} from "@/lib/imagePurpose";
import { buildTextToImagePrompt, buildImageToImagePrompt, type CampaignPurposeType } from "@/lib/imagePrompt";
import { getBrandPromptSuffix } from "@/lib/brandKit";

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
  /** When source is "upload", the page may e.g. switch to the editor tab. */
  onAddSlide: (slide: Slide, source?: "upload" | "generate") => void;
  suggestedPrompt?: string;
  /** When set, shows only that workflow (no mode dropdown). */
  workflow?: CreateWorkflow;
  /** Callback when a banner should be saved (for workflow 1 - generate image) */
  onSaveBanner?: (slides: Slide[], aspectRatio: AspectRatio, imagePurpose?: ImagePurpose) => void;
  /** When set, initializes purpose dropdown and prompt to this value (e.g. from "What to create?" card). */
  initialImagePurpose?: ImagePurpose;
  /** When set, the event name is included in the prompt when generating (event-themed image). */
  selectedEvent?: { name: string; date: string } | null;
  /** Purpose type from Settings (Season, Event, Promotion) – passed into generation. */
  campaignPurposeType?: CampaignPurposeType | null;
  /** Campaign/product text from Settings (e.g. "Summer sale 20%") – passed into generation. */
  campaignText?: string | null;
}

const DEFAULT_PURPOSE: ImagePurpose = "homepage_banner";

export default function ImageSourcePanel({ aspectRatio, onAddSlide, suggestedPrompt, workflow, onSaveBanner, initialImagePurpose, selectedEvent, campaignPurposeType, campaignText }: ImageSourcePanelProps) {
  const [prompt, setPrompt] = useState(
    () => suggestedPrompt ?? (workflow === "generate" ? IMAGE_PURPOSE_PROMPTS[initialImagePurpose ?? DEFAULT_PURPOSE] : "")
  );
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const ratioNum = getAspectRatioNumber(aspectRatio);

  const [imagePurpose, setImagePurpose] = useState<ImagePurpose>(initialImagePurpose ?? DEFAULT_PURPOSE);

  const [productFile, setProductFile] = useState<File | null>(null);
  const [productPreviewUrl, setProductPreviewUrl] = useState<string | null>(null);
  const [bannerInstructions, setBannerInstructions] = useState(suggestedPrompt ?? "");
  const [creatingBanner, setCreatingBanner] = useState(false);
  const [mode, setMode] = useState<"text" | "product">("text");
  const [enhanceQuality, setEnhanceQuality] = useState(false);
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

  // When workflow is generate, pre-fill prompt from purpose preset when purpose changes
  useEffect(() => {
    if (workflow === "generate") {
      setPrompt(IMAGE_PURPOSE_PROMPTS[imagePurpose]);
    }
  }, [workflow, imagePurpose]);

  // Sync to initialImagePurpose when parent passes it (e.g. "What to create?" card clicked)
  useEffect(() => {
    if (workflow === "generate" && initialImagePurpose !== undefined) {
      setImagePurpose(initialImagePurpose);
      setPrompt(IMAGE_PURPOSE_PROMPTS[initialImagePurpose]);
    }
  }, [workflow, initialImagePurpose]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList?.length) return;
    const files = Array.from(fileList).filter((f) => f.type.startsWith("image/"));
    if (files.length === 0) return;
    setError(null);
    try {
      for (const file of files) {
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
              type: "upload",
            });
          } else {
            const storedAssets = localStorage.getItem("savedAssets");
            const assets = storedAssets ? JSON.parse(storedAssets) : [];
            assets.push({
              id: `asset-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
              imageUrl,
              name: file.name,
              uploadedAt: new Date().toISOString(),
              type: "upload",
            });
            localStorage.setItem("savedAssets", JSON.stringify(assets));
          }
        } catch (err) {
          console.warn("Failed to save uploaded image to assets:", err);
        }

        onAddSlide(
          {
            id: generateId(),
            imageUrl: url,
            imageBlob: blob,
          },
          "upload"
        );
      }
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
    const promptToSend = buildTextToImagePrompt(trimmed, aspectRatio, {
      eventName: selectedEvent?.name,
      campaignPurposeType,
      campaignText,
      brandPromptSuffix: getBrandPromptSuffix().trim() || undefined,
    });
    try {
      let res: Response | null = null;
      let data: { imageUrl?: string; error?: string; textOnlyFallback?: boolean } = {};
      for (let attempt = 0; attempt <= 1; attempt++) {
        try {
          res = await fetch("/api/generate-image", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ prompt: promptToSend, aspectRatio, enhanceQuality }),
          });
          data = await res.json();
          if (res.ok) break;
          if ((res.status === 502 || res.status === 503) && attempt === 0) {
            await new Promise((r) => setTimeout(r, 1500));
            continue;
          }
          throw new Error(data.error ?? "Failed to generate image");
        } catch (err) {
          if (attempt === 0 && (err instanceof TypeError || (err as Error).message?.includes("fetch"))) {
            await new Promise((r) => setTimeout(r, 1500));
            continue;
          }
          throw err;
        }
      }
      if (!res?.ok) throw new Error(data.error ?? "Failed to generate image");
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

      // Resize to selected aspect ratio so the slide matches the banner
      imageUrl = await resizeDataUrlToAspect(imageUrl, aspectRatio);

      // Save generated image to assets with type:"generated"
      const purposeToSave = workflow === "generate" ? imagePurpose : undefined;
      try {
        const useIndexedDB = await openDB().then(() => true).catch(() => false);
        if (useIndexedDB) {
          await saveAsset({
            id: `asset-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
            imageUrl,
            name: `Generated: ${trimmed.substring(0, 30)}${trimmed.length > 30 ? "..." : ""}`,
            uploadedAt: new Date().toISOString(),
            type: "generated",
            ...(purposeToSave && { imagePurpose: purposeToSave }),
            prompt: trimmed || undefined,
            aspectRatio,
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
            type: "generated",
            ...(purposeToSave && { imagePurpose: purposeToSave }),
            prompt: trimmed || undefined,
            aspectRatio,
          });
          localStorage.setItem("savedAssets", JSON.stringify(assets));
        }
      } catch (err) {
        console.warn("Failed to save generated image to assets:", err);
      }

      const slide: Slide = {
        id: generateId(),
        imageUrl,
        prompt: trimmed || undefined,
      };
      
      onAddSlide(slide);
      
      // Save banner and trigger gallery refresh for generate and product-banner workflows
      if ((workflow === "generate" || workflow === "product") && onSaveBanner) {
        onSaveBanner([slide], aspectRatio, purposeToSave);
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
      let { base64, mimeType } = await fileToBase64(productFile);
      const dataUrl = `data:${mimeType};base64,${base64}`;
      const resizedUrl = await resizeDataUrlToMaxDimension(dataUrl);
      const resizedMatch = resizedUrl.match(/^data:([^;]+);base64,(.+)$/);
      if (resizedMatch) {
        base64 = resizedMatch[2];
        mimeType = resizedMatch[1];
      }
      const promptToSend = buildImageToImagePrompt(trimmed, aspectRatio, {
        campaignPurposeType,
        campaignText,
        brandPromptSuffix: getBrandPromptSuffix().trim() || undefined,
      });
      let res: Response | null = null;
      let data: { imageUrl?: string; error?: string; textOnlyFallback?: boolean } = {};
      for (let attempt = 0; attempt <= 1; attempt++) {
        try {
          res = await fetch("/api/generate-image", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              prompt: promptToSend,
              imageBase64: base64,
              imageMimeType: mimeType,
              aspectRatio,
              enhanceQuality,
            }),
          });
          data = await res.json();
          if (res.ok) break;
          if ((res.status === 502 || res.status === 503) && attempt === 0) {
            await new Promise((r) => setTimeout(r, 1500));
            continue;
          }
          throw new Error(data.error ?? "Failed to create banner");
        } catch (err) {
          if (attempt === 0 && (err instanceof TypeError || (err as Error).message?.includes("fetch"))) {
            await new Promise((r) => setTimeout(r, 1500));
            continue;
          }
          throw err;
        }
      }
      if (!res?.ok) throw new Error(data.error ?? "Failed to create banner");
      let imageUrl = data.imageUrl;
      if (!imageUrl) throw new Error("No image in response");
      if (data.textOnlyFallback) {
        setError("Note: Generated from prompt only (product image could not be used).");
        setTimeout(() => setError(null), 6000);
      }

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

      // Resize to selected template aspect ratio so the banner matches the chosen template
      imageUrl = await resizeDataUrlToAspect(imageUrl, aspectRatio);

      // Save product banner as generated image
      try {
        const useIndexedDB = await openDB().then(() => true).catch(() => false);
        if (useIndexedDB) {
          await saveAsset({
            id: `asset-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
            imageUrl,
            name: `Banner: ${trimmed.substring(0, 30)}${trimmed.length > 30 ? "..." : ""}`,
            uploadedAt: new Date().toISOString(),
            type: "generated",
            prompt: trimmed || undefined,
            aspectRatio,
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
            type: "generated",
            prompt: trimmed || undefined,
            aspectRatio,
          });
          localStorage.setItem("savedAssets", JSON.stringify(assets));
        }
      } catch (err) {
        console.warn("Failed to save banner image to assets:", err);
      }

      const productSlide = { id: generateId(), imageUrl, prompt: trimmed || undefined };
      onAddSlide(productSlide);
      // Save banner and trigger gallery refresh
      if (onSaveBanner) {
        onSaveBanner([productSlide], aspectRatio);
      }
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
              {workflow === "generate" && selectedEvent?.name && (
                <span className="px-2 text-xs text-gray-500 flex-shrink-0" title="Event will be included in the prompt">
                  Event: {selectedEvent.name}
                </span>
              )}
              {/* Only show purpose dropdown when not controlled by parent (e.g. BannersView); on Create page purpose is set by "What do you want to create?" cards to avoid duplicate */}
              {workflow === "generate" && initialImagePurpose === undefined && (
                <select
                  value={imagePurpose}
                  onChange={(e) => setImagePurpose(e.target.value as ImagePurpose)}
                  className="px-4 py-4 bg-[#1a1a1a] border-r border-[#3a3a3a] text-white text-sm focus:outline-none cursor-pointer"
                  title="Image for"
                >
                  {IMAGE_PURPOSE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              )}
              <input
                type="text"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !generating && handleGenerate()}
                placeholder="Describe the image you want to generate"
                className="flex-1 px-4 py-4 bg-transparent text-white placeholder-gray-500 focus:outline-none text-sm"
                disabled={generating}
              />
              <label className="flex items-center gap-2 px-2 text-gray-400 text-xs whitespace-nowrap cursor-pointer border-r border-[#3a3a3a]">
                <input
                  type="checkbox"
                  checked={enhanceQuality}
                  onChange={(e) => setEnhanceQuality(e.target.checked)}
                  className="rounded border-[#3a3a3a] bg-[#1a1a1a] text-[#0066ff] focus:ring-[#0066ff]"
                />
                Enhance
              </label>
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
                  <div className="px-4 py-2 flex justify-center bg-[#0d0d0d] rounded-lg border border-[#3a3a3a]">
                    <img
                      src={productPreviewUrl}
                      alt="Product preview"
                      className="max-h-48 w-auto max-w-full object-contain"
                    />
                  </div>
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
              <label className="flex items-center gap-2 px-2 text-gray-400 text-xs whitespace-nowrap cursor-pointer border-r border-[#3a3a3a]">
                <input
                  type="checkbox"
                  checked={enhanceQuality}
                  onChange={(e) => setEnhanceQuality(e.target.checked)}
                  className="rounded border-[#3a3a3a] bg-[#1a1a1a] text-[#0066ff] focus:ring-[#0066ff]"
                />
                Enhance
              </label>
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
            multiple
            onChange={handleUpload}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="text-[#0066ff] hover:text-[#0052cc] underline"
          >
            upload images
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
