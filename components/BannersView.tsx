"use client";

import { useState, useEffect, useRef } from "react";
import type { Slide } from "@/types/banner";
import { resizeImageToAspect, getAspectRatioNumber } from "@/lib/resizeToAspect";
import {
  openDB,
  saveAsset,
  getAllAssets,
  deleteAsset,
  saveBanner,
  getAllBanners,
  deleteBanner,
  getStorageUsage,
} from "@/lib/indexedDB";
import ImageViewer from "@/components/ImageViewer";

interface StoredBanner {
  id: string;
  slides: Slide[];
  aspectRatio: string;
  createdAt: string;
  name?: string;
}

interface StoredAsset {
  id: string;
  imageUrl: string;
  name: string;
  uploadedAt: string;
  file?: File;
}

interface BannersViewProps {
  onSelectBanner: (slides: Slide[], aspectRatio: string) => void;
  onSelectAsset: (imageUrl: string) => void;
  refreshTrigger?: number; // When this changes, reload banners
}

export default function BannersView({ onSelectBanner, onSelectAsset, refreshTrigger }: BannersViewProps) {
  const [banners, setBanners] = useState<StoredBanner[]>([]);
  const [assets, setAssets] = useState<StoredAsset[]>([]);
  const [activeTab, setActiveTab] = useState<"banners" | "assets">("banners");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [generatePrompt, setGeneratePrompt] = useState("");
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [selectedReferenceImage, setSelectedReferenceImage] = useState<StoredAsset | null>(null);
  const [numVariations, setNumVariations] = useState<1 | 2 | 3>(1);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [storageInfo, setStorageInfo] = useState<{ used: number; quota: number } | null>(null);
  const [useIndexedDB, setUseIndexedDB] = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        // Check if IndexedDB is available
        await openDB();
        setUseIndexedDB(true);

        // Load from IndexedDB
        const [indexedAssets, indexedBanners] = await Promise.all([
          getAllAssets(),
          getAllBanners(),
        ]);

        setAssets(indexedAssets as StoredAsset[]);
        setBanners(indexedBanners as StoredBanner[]);

        // Get storage usage
        const usage = await getStorageUsage();
        setStorageInfo(usage);

        // Migrate from localStorage if IndexedDB is empty but localStorage has data
        const storedAssets = localStorage.getItem("savedAssets");
        const storedBanners = localStorage.getItem("savedBanners");

        if (indexedAssets.length === 0 && storedAssets) {
          try {
            const parsedAssets = JSON.parse(storedAssets);
            const validAssets = parsedAssets.filter((asset: StoredAsset) => {
              if (!asset.imageUrl) return false;
              if (asset.imageUrl.startsWith("blob:")) return false;
              return asset.imageUrl.startsWith("data:") || asset.imageUrl.startsWith("http");
            });

            // Migrate to IndexedDB
            for (const asset of validAssets) {
              await saveAsset(asset);
            }
            setAssets(validAssets);
            localStorage.removeItem("savedAssets"); // Clear localStorage after migration
          } catch (e) {
            console.error("Failed to migrate assets:", e);
          }
        }

        if (indexedBanners.length === 0 && storedBanners) {
          try {
            const parsedBanners = JSON.parse(storedBanners);
            for (const banner of parsedBanners) {
              await saveBanner(banner);
            }
            setBanners(parsedBanners);
            localStorage.removeItem("savedBanners"); // Clear localStorage after migration
          } catch (e) {
            console.error("Failed to migrate banners:", e);
          }
        }
      } catch (error) {
        console.error("IndexedDB not available, falling back to localStorage:", error);
        setUseIndexedDB(false);

        // Fallback to localStorage
        const storedBanners = localStorage.getItem("savedBanners");
        if (storedBanners) {
          try {
            setBanners(JSON.parse(storedBanners));
          } catch (e) {
            console.error("Failed to load banners:", e);
          }
        }

        const storedAssets = localStorage.getItem("savedAssets");
        if (storedAssets) {
          try {
            const parsedAssets = JSON.parse(storedAssets);
            const validAssets = parsedAssets.filter((asset: StoredAsset) => {
              if (!asset.imageUrl) return false;
              if (asset.imageUrl.startsWith("blob:")) return false;
              return asset.imageUrl.startsWith("data:") || asset.imageUrl.startsWith("http");
            });
            setAssets(validAssets);
            if (validAssets.length !== parsedAssets.length) {
              localStorage.setItem("savedAssets", JSON.stringify(validAssets));
            }
          } catch (e) {
            console.error("Failed to load assets:", e);
          }
        }
      }
    };

    loadData();
  }, [refreshTrigger]); // Reload when refreshTrigger changes

  // Compress image to reduce size
  const compressImage = (file: File, maxWidth: number = 1920, maxHeight: number = 1920, quality: number = 0.8): Promise<File> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          let width = img.width;
          let height = img.height;

          // Calculate new dimensions
          if (width > height) {
            if (width > maxWidth) {
              height = (height * maxWidth) / width;
              width = maxWidth;
            }
          } else {
            if (height > maxHeight) {
              width = (width * maxHeight) / height;
              height = maxHeight;
            }
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext("2d");
          if (!ctx) {
            reject(new Error("Failed to get canvas context"));
            return;
          }

          ctx.drawImage(img, 0, 0, width, height);

          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(new Error("Failed to compress image"));
                return;
              }
              const compressedFile = new File([blob], file.name, {
                type: file.type,
                lastModified: Date.now(),
              });
              resolve(compressedFile);
            },
            file.type,
            quality
          );
        };
        img.onerror = () => reject(new Error("Failed to load image"));
        img.src = e.target?.result as string;
      };
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
  };

  // Convert file to base64 data URL
  const fileToDataURL = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
  };

  const handleUploadAsset = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith("image/")) {
      e.target.value = "";
      return;
    }

    // Check file size (limit to 10MB for base64 conversion)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      setUploadError(`File is too large. Maximum size is ${(maxSize / 1024 / 1024).toFixed(0)}MB`);
      e.target.value = "";
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    setUploadError(null);
    setGenerateError(null);

    try {
      setUploadProgress(10);
      
      // Compress image to reduce storage size
      const compressedFile = await compressImage(file);
      setUploadProgress(30);
      
      const id = `asset-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      
      setUploadProgress(50);
      
      // Convert to base64 data URL so it persists across page reloads
      const imageUrl = await fileToDataURL(compressedFile);
      
      setUploadProgress(70);
      
      const newAsset: StoredAsset = {
        id,
        imageUrl,
        name: file.name,
        uploadedAt: new Date().toISOString(),
      };

      setUploadProgress(80);

      const updatedAssets = [...assets, newAsset];
      
      // Limit to 50 assets to prevent storage overflow
      const maxAssets = 50;
      const assetsToSave = updatedAssets.slice(-maxAssets);
      
      setUploadProgress(90);

      try {
        if (useIndexedDB) {
          // Save to IndexedDB
          await saveAsset(newAsset);
          setAssets(assetsToSave);
          
          // Update storage info
          const usage = await getStorageUsage();
          setStorageInfo(usage);
        } else {
          // Fallback to localStorage
          localStorage.setItem(
            "savedAssets",
            JSON.stringify(assetsToSave.map(({ file, ...rest }) => rest))
          );
          setAssets(assetsToSave);
        }
        
        if (updatedAssets.length > maxAssets) {
          setUploadError(`Storage limit reached. Only the latest ${maxAssets} assets are kept.`);
        }
      } catch (storageError: any) {
        // Handle quota exceeded error (for localStorage fallback)
        if (!useIndexedDB && (storageError.name === "QuotaExceededError" || storageError.message?.includes("quota"))) {
          const reducedAssets = updatedAssets.slice(-20);
          try {
            localStorage.setItem(
              "savedAssets",
              JSON.stringify(reducedAssets.map(({ file, ...rest }) => rest))
            );
            setAssets(reducedAssets);
            setUploadError("Storage full. Removed older assets to make space. Please delete unused assets.");
          } catch (retryError) {
            setUploadError("Storage quota exceeded. Please delete some assets before uploading more.");
            setUploading(false);
            setUploadProgress(0);
            e.target.value = "";
            return;
          }
        } else {
          throw storageError;
        }
      }

      setUploadProgress(100);
      
      // Small delay to show completion
      setTimeout(() => {
        setUploading(false);
        setUploadProgress(0);
        if (uploadError && uploadError.includes("Removed older assets")) {
          // Keep the warning visible
        } else {
          setUploadError(null);
        }
      }, 500);
    } catch (err) {
      console.error("Failed to upload asset:", err);
      setUploadError(err instanceof Error ? err.message : "Failed to upload image. Please try again.");
      setUploading(false);
      setUploadProgress(0);
    }

    e.target.value = "";
  };

  const handleDeleteBanner = async (id: string) => {
    const updated = banners.filter((b) => b.id !== id);
    setBanners(updated);
    
    if (useIndexedDB) {
      await deleteBanner(id);
    } else {
      localStorage.setItem("savedBanners", JSON.stringify(updated));
    }
  };

  const handleDeleteAsset = async (id: string) => {
    const updated = assets.filter((a) => a.id !== id);
    setAssets(updated);
    
    if (useIndexedDB) {
      await deleteAsset(id);
      const usage = await getStorageUsage();
      setStorageInfo(usage);
    } else {
      localStorage.setItem("savedAssets", JSON.stringify(updated.map(({ file, ...rest }) => rest)));
    }
  };

  const handleSaveCurrentBanner = (slides: Slide[], aspectRatio: string) => {
    const newBanner: StoredBanner = {
      id: `banner-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      slides,
      aspectRatio,
      createdAt: new Date().toISOString(),
      name: `Banner ${banners.length + 1}`,
    };

    const updated = [...banners, newBanner];
    setBanners(updated);
    localStorage.setItem("savedBanners", JSON.stringify(updated));
  };

  // Convert image URL to base64
  const imageUrlToBase64 = async (url: string): Promise<{ base64: string; mimeType: string }> => {
    // If it's already a data URL, extract base64 directly
    if (url.startsWith("data:")) {
      const match = url.match(/^data:([^;]+);base64,(.+)$/);
      if (match) {
        return { base64: match[2], mimeType: match[1] };
      }
    }
    
    // Otherwise, fetch and convert
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
        if (match) {
          resolve({ base64: match[2], mimeType: match[1] });
        } else {
          reject(new Error("Failed to convert image to base64"));
        }
      };
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
  };

  const handleGenerateImage = async () => {
    const trimmed = generatePrompt.trim();
    if (!trimmed) {
      setGenerateError("Enter a prompt to generate an image");
      return;
    }
    if (!selectedReferenceImage) {
      setGenerateError("Select a reference image first");
      return;
    }
    setGenerateError(null);
    setGenerating(true);
    try {
      // Convert reference image to base64
      const { base64, mimeType } = await imageUrlToBase64(selectedReferenceImage.imageUrl);
      
      // Generate multiple variations
      const generatedImages: StoredAsset[] = [];
      
      for (let i = 0; i < numVariations; i++) {
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
        if (!res.ok) throw new Error(data.error ?? "Failed to generate image");
        const imageUrl = data.imageUrl;
        if (!imageUrl) throw new Error("No image in response");

        // Convert remote URL to base64 if it's not already a data URL
        let finalImageUrl = imageUrl;
        if (!imageUrl.startsWith("data:")) {
          try {
            // Fetch the image and convert to base64
            const response = await fetch(imageUrl);
            const blob = await response.blob();
            finalImageUrl = await new Promise<string>((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = () => resolve(reader.result as string);
              reader.onerror = () => reject(reader.error);
              reader.readAsDataURL(blob);
            });
          } catch (err) {
            console.warn("Failed to convert image to base64, using original URL:", err);
            // Fallback to original URL if conversion fails
            finalImageUrl = imageUrl;
          }
        }

        const id = `asset-${Date.now()}-${Math.random().toString(36).slice(2, 9)}-${i}`;
        generatedImages.push({
          id,
          imageUrl: finalImageUrl,
          name: `Variation ${i + 1}: ${trimmed.substring(0, 25)}${trimmed.length > 25 ? "..." : ""}`,
          uploadedAt: new Date().toISOString(),
        });
      }

      // Add all generated images to assets
        const updatedAssets = [...assets, ...generatedImages];
        
        // Limit to 50 assets to prevent storage overflow
        const maxAssets = 50;
        const assetsToSave = updatedAssets.slice(-maxAssets);
        
        try {
          if (useIndexedDB) {
            // Save to IndexedDB
            for (const asset of generatedImages) {
              await saveAsset(asset);
            }
            setAssets(assetsToSave);
            
            // Update storage info
            const usage = await getStorageUsage();
            setStorageInfo(usage);
          } else {
            // Fallback to localStorage
            localStorage.setItem(
              "savedAssets",
              JSON.stringify(assetsToSave.map(({ file, ...rest }) => rest))
            );
            setAssets(assetsToSave);
          }
          
          if (updatedAssets.length > maxAssets) {
            setGenerateError(`Storage limit reached. Only the latest ${maxAssets} assets are kept.`);
          }
        } catch (storageError: any) {
          // Handle quota exceeded error (for localStorage fallback)
          if (!useIndexedDB && (storageError.name === "QuotaExceededError" || storageError.message?.includes("quota"))) {
            const reducedAssets = updatedAssets.slice(-20);
            try {
              localStorage.setItem(
                "savedAssets",
                JSON.stringify(reducedAssets.map(({ file, ...rest }) => rest))
              );
              setAssets(reducedAssets);
              setGenerateError("Storage full. Removed older assets to make space. Please delete unused assets.");
            } catch (retryError) {
              setGenerateError("Storage quota exceeded. Please delete some assets before generating more.");
            }
          } else {
            throw storageError;
          }
        }

      // Reset form
      setGeneratePrompt("");
      setSelectedReferenceImage(null);
      setNumVariations(1);
    } catch (err) {
      setGenerateError(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setGenerating(false);
    }
  };

  return (
      <div className="p-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-4xl font-bold mb-2">Banners & Assets</h1>
          <p className="text-gray-400">
            Manage your created banners and uploaded image assets
            {storageInfo && (
              <span className="ml-2 text-xs">
                ({((storageInfo.used / storageInfo.quota) * 100).toFixed(1)}% used - {useIndexedDB ? "IndexedDB" : "localStorage"})
              </span>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab("banners")}
            className={`px-4 py-2 rounded-lg transition-colors ${
              activeTab === "banners"
                ? "bg-[#0066ff] text-white"
                : "bg-[#2a2a2a] border border-[#3a3a3a] text-gray-300 hover:border-[#4a4a4a]"
            }`}
          >
            Banners
          </button>
          <button
            onClick={() => setActiveTab("assets")}
            className={`px-4 py-2 rounded-lg transition-colors ${
              activeTab === "assets"
                ? "bg-[#0066ff] text-white"
                : "bg-[#2a2a2a] border border-[#3a3a3a] text-gray-300 hover:border-[#4a4a4a]"
            }`}
          >
            Assets
          </button>
        </div>
      </div>

          {activeTab === "banners" ? (
        <div>
          {banners.length === 0 ? (
            <div className="p-12 bg-[#2a2a2a] rounded-xl border border-[#3a3a3a] text-center">
            <span className="text-5xl mb-4 block">📁</span>
            <h3 className="text-xl font-semibold mb-2">No banners yet</h3>
            <p className="text-gray-400 mb-4">
              Generated images are automatically saved as banners. Create your first banner to see it here.
            </p>
            <p className="text-sm text-gray-500 mt-2">
              💡 Tip: All generated images are also saved in the Assets tab
            </p>
          </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {banners.map((banner) => (
                <div
                  key={banner.id}
                  className="bg-[#2a2a2a] rounded-xl border border-[#3a3a3a] overflow-hidden hover:border-[#4a4a4a] transition-colors"
                >
                  {banner.slides[0] && (
                    <div className="aspect-video bg-[#1a1a1a] relative overflow-hidden">
                      <img
                        src={banner.slides[0].imageUrl}
                        alt={banner.name || "Banner"}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = "none";
                          const parent = target.parentElement;
                          if (parent) {
                            parent.innerHTML = `
                              <div class="w-full h-full flex items-center justify-center text-gray-500">
                                <div class="text-center">
                                  <span class="text-2xl block mb-1">📁</span>
                                  <span class="text-xs">Image failed to load</span>
                                </div>
                              </div>
                            `;
                          }
                        }}
                        loading="lazy"
                        style={{ minHeight: "100%", minWidth: "100%" }}
                      />
                    </div>
                  )}
                  <div className="p-4">
                    <h3 className="font-semibold mb-1">{banner.name || "Untitled Banner"}</h3>
                    <p className="text-xs text-gray-400 mb-2">
                      {banner.slides.length} {banner.slides.length === 1 ? "slide" : "slides"} • {banner.aspectRatio}
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => onSelectBanner(banner.slides, banner.aspectRatio)}
                        className="flex-1 px-3 py-1.5 bg-[#0066ff] text-white rounded text-sm hover:bg-[#0052cc] transition-colors"
                      >
                        Open
                      </button>
                      <button
                        onClick={() => handleDeleteBanner(banner.id)}
                        className="px-3 py-1.5 bg-[#3a3a3a] text-gray-300 rounded text-sm hover:bg-[#4a4a4a] transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div>
          <div className="mb-6">
            <h2 className="text-xl font-semibold mb-4">Image Assets</h2>
            
            {/* Generate Image Section */}
            <div className="mb-6 p-4 bg-gradient-to-br from-[#2a2a2a] to-[#1a1a1a] rounded-xl border border-[#3a3a3a]">
              <h3 className="text-sm font-semibold text-gray-300 mb-4 flex items-center gap-2">
                <span>✨</span> Generate Variations with AI
              </h3>
              
              {/* Step 1: Select Reference Image */}
              <div className="mb-4">
                <label className="block text-xs text-gray-400 mb-2">Step 1: Select a reference image</label>
                {selectedReferenceImage ? (
                  <div className="flex items-center gap-3 p-3 bg-[#1a1a1a] border border-[#0066ff] rounded-lg">
                    <div className="w-16 h-16 bg-[#2a2a2a] rounded overflow-hidden flex-shrink-0">
                      <img
                        src={selectedReferenceImage.imageUrl}
                        alt={selectedReferenceImage.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = "none";
                          const parent = target.parentElement;
                          if (parent) {
                            parent.innerHTML = `
                              <div class="w-full h-full flex items-center justify-center text-gray-500">
                                <span class="text-xl">🖼️</span>
                              </div>
                            `;
                          }
                        }}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{selectedReferenceImage.name}</p>
                      <p className="text-xs text-gray-400">Reference image selected</p>
                    </div>
                    <button
                      onClick={() => setSelectedReferenceImage(null)}
                      className="px-3 py-1 bg-[#3a3a3a] text-gray-300 rounded text-xs hover:bg-[#4a4a4a] transition-colors flex-shrink-0"
                    >
                      Change
                    </button>
                  </div>
                ) : (
                  <p className="text-sm text-gray-400 italic">Click on an image below to select it as reference</p>
                )}
              </div>

              {/* Step 2: Enter Prompt */}
              {selectedReferenceImage && (
                <>
                  <div className="mb-4">
                    <label className="block text-xs text-gray-400 mb-2">Step 2: Enter your prompt</label>
                    <input
                      type="text"
                      value={generatePrompt}
                      onChange={(e) => setGeneratePrompt(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && !generating && handleGenerateImage()}
                      placeholder="Describe how you want to transform the image..."
                      className="w-full px-4 py-2 bg-[#1a1a1a] border border-[#3a3a3a] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#0066ff] text-sm"
                      disabled={generating}
                    />
                  </div>

                  {/* Step 3: Select Number of Variations */}
                  <div className="mb-4">
                    <label className="block text-xs text-gray-400 mb-2">Step 3: How many variations?</label>
                    <div className="flex gap-2">
                      {[1, 2, 3].map((num) => (
                        <button
                          key={num}
                          onClick={() => setNumVariations(num as 1 | 2 | 3)}
                          disabled={generating}
                          className={`flex-1 px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                            numVariations === num
                              ? "bg-[#0066ff] text-white"
                              : "bg-[#1a1a1a] border border-[#3a3a3a] text-gray-300 hover:border-[#4a4a4a]"
                          } disabled:opacity-50 disabled:cursor-not-allowed`}
                        >
                          {num} {num === 1 ? "Image" : "Images"}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Generate Button */}
                  <button
                    onClick={handleGenerateImage}
                    disabled={generating || !generatePrompt.trim()}
                    className="w-full px-6 py-3 bg-gradient-to-r from-[#0066ff] to-[#0052cc] text-white rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity font-medium text-sm flex items-center justify-center gap-2"
                  >
                    <span>{generating ? "⏳" : "✨"}</span>
                    <span>
                      {generating
                        ? `Generating ${numVariations} ${numVariations === 1 ? "image" : "images"}...`
                        : `Generate ${numVariations} ${numVariations === 1 ? "Variation" : "Variations"}`}
                    </span>
                  </button>
                </>
              )}
              
              {generateError && (
                <div className="mt-3 p-2 bg-red-500/10 border border-red-500/30 rounded text-red-400 text-xs">
                  {generateError}
                </div>
              )}
            </div>

            {/* Upload Section */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-gray-300">Or upload an image</h3>
              <div className="flex gap-2">
                {assets.length > 0 && (
                  <button
                    onClick={() => setViewerOpen(true)}
                    className="px-4 py-2 bg-[#2a2a2a] border border-[#3a3a3a] text-gray-300 rounded-lg hover:border-[#4a4a4a] hover:text-white transition-colors text-sm font-medium flex items-center gap-2"
                    title="View all images"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    <span>View All ({assets.length})</span>
                  </button>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleUploadAsset}
                  className="hidden"
                  disabled={uploading}
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="px-4 py-2 bg-[#2a2a2a] border border-[#3a3a3a] text-gray-300 rounded-lg hover:border-[#4a4a4a] hover:text-white transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {uploading ? (
                    <>
                      <span className="animate-spin">⏳</span>
                      <span>Uploading...</span>
                    </>
                  ) : (
                    <>
                      <span>+</span>
                      <span>Upload Image</span>
                    </>
                  )}
                </button>
              </div>
            </div>
              
              {/* Upload Progress Bar */}
              {uploading && (
                <div className="mb-2">
                  <div className="w-full bg-[#1a1a1a] rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-[#0066ff] to-[#0052cc] h-2 rounded-full transition-all duration-300 ease-out"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-400 mt-1 text-right">{uploadProgress}%</p>
                </div>
              )}
              
              {/* Upload Error */}
              {uploadError && (
                <div className="mb-2 p-2 bg-red-500/10 border border-red-500/30 rounded text-red-400 text-xs">
                  {uploadError}
                  <button
                    onClick={() => setUploadError(null)}
                    className="ml-2 underline hover:no-underline"
                  >
                    Dismiss
                  </button>
                </div>
              )}
            </div>
          </div>

          {assets.length === 0 ? (
            <div className="p-12 bg-[#2a2a2a] rounded-xl border border-[#3a3a3a] text-center">
              <span className="text-5xl mb-4 block">🖼️</span>
              <h3 className="text-xl font-semibold mb-2">No assets yet</h3>
              <p className="text-gray-400 mb-4">
                All generated, uploaded, and created images are automatically saved here
              </p>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 bg-[#0066ff] text-white rounded-lg hover:bg-[#0052cc] transition-colors"
              >
                Upload Your First Image
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {assets.map((asset) => (
                <div
                  key={asset.id}
                  className={`bg-[#2a2a2a] rounded-xl border overflow-hidden transition-colors group cursor-pointer ${
                    selectedReferenceImage?.id === asset.id
                      ? "border-[#0066ff] ring-2 ring-[#0066ff]/50"
                      : "border-[#3a3a3a] hover:border-[#4a4a4a]"
                  }`}
                  onClick={() => {
                    if (!selectedReferenceImage) {
                      setSelectedReferenceImage(asset);
                    } else {
                      onSelectAsset(asset.imageUrl);
                    }
                  }}
                >
                  <div className="aspect-square bg-[#1a1a1a] relative overflow-hidden w-full">
                    <img
                      src={asset.imageUrl}
                      alt={asset.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        const parent = target.parentElement;
                        if (parent && !parent.querySelector(".error-placeholder")) {
                          target.style.display = "none";
                          const errorDiv = document.createElement("div");
                          errorDiv.className = "error-placeholder w-full h-full flex items-center justify-center text-gray-500 absolute inset-0";
                          errorDiv.innerHTML = `
                            <div class="text-center">
                              <span class="text-2xl block mb-1">🖼️</span>
                              <span class="text-xs">Failed to load</span>
                            </div>
                          `;
                          parent.appendChild(errorDiv);
                        }
                      }}
                      onLoad={(e) => {
                        // Remove error placeholder if image loads successfully
                        const target = e.target as HTMLImageElement;
                        const parent = target.parentElement;
                        const errorPlaceholder = parent?.querySelector(".error-placeholder");
                        if (errorPlaceholder) {
                          errorPlaceholder.remove();
                        }
                      }}
                      loading="lazy"
                      style={{ minHeight: "100%", minWidth: "100%" }}
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center pointer-events-none">
                      <span className="opacity-0 group-hover:opacity-100 text-white text-sm font-medium transition-opacity text-center px-2">
                        {selectedReferenceImage?.id === asset.id
                          ? "Selected as reference"
                          : selectedReferenceImage
                          ? "Click to use"
                          : "Click to select"}
                      </span>
                    </div>
                    {selectedReferenceImage?.id === asset.id && (
                      <div className="absolute top-2 right-2 w-6 h-6 bg-[#0066ff] rounded-full flex items-center justify-center z-10 shadow-lg">
                        <span className="text-white text-xs">✓</span>
                      </div>
                    )}
                  </div>
                  <div className="p-3">
                    <p className="text-sm font-medium truncate mb-1">{asset.name}</p>
                    <div className="flex gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectAsset(asset.imageUrl);
                        }}
                        className="flex-1 px-2 py-1 bg-[#0066ff] text-white rounded text-xs hover:bg-[#0052cc] transition-colors"
                      >
                        Use
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteAsset(asset.id);
                        }}
                        className="px-2 py-1 bg-[#3a3a3a] text-gray-300 rounded text-xs hover:bg-[#4a4a4a] transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Image Viewer Modal */}
      <ImageViewer
        images={assets.map((asset) => ({
          id: asset.id,
          imageUrl: asset.imageUrl,
          name: asset.name,
        }))}
        isOpen={viewerOpen}
        onClose={() => setViewerOpen(false)}
      />
    </div>
  );
}
