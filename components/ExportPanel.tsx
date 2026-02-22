"use client";

import { useState, useEffect } from "react";
import { buildBannerZip } from "@/lib/export";
import { saveBanner, getAllBanners, openDB } from "@/lib/indexedDB";
import type { Slide, AspectRatio } from "@/types/banner";

interface ExportPanelProps {
  slides: Slide[];
  aspectRatio: AspectRatio;
  autoplay: boolean;
  autoplaySpeed: number;
  onSaveBanner?: () => void;
}

export default function ExportPanel({
  slides,
  aspectRatio,
  autoplay,
  autoplaySpeed,
  onSaveBanner,
}: ExportPanelProps) {
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [useIndexedDB, setUseIndexedDB] = useState(false);
  const [exportPreset, setExportPreset] = useState<string>("general");
  const [saveName, setSaveName] = useState("");
  const [reminderDate, setReminderDate] = useState("");

  const EXPORT_PRESETS: { value: string; label: string }[] = [
    { value: "general", label: "General" },
    { value: "instagram", label: "Instagram" },
    { value: "facebook", label: "Facebook" },
    { value: "homepage-hero", label: "Homepage hero (16:9)" },
    { value: "product-card", label: "Product card (1:1)" },
    { value: "plp-thumbnail", label: "PLP thumbnail (1:1)" },
    { value: "order-confirmation", label: "Order confirmation (16:9)" },
  ];

  useEffect(() => {
    // Check if IndexedDB is available
    openDB()
      .then(() => setUseIndexedDB(true))
      .catch(() => setUseIndexedDB(false));
  }, []);

  const handleSaveBanner = async () => {
    if (slides.length === 0) {
      setError("Add at least one slide to save.");
      return;
    }
    setError(null);
    
    try {
      const bannerName = saveName.trim() || `Banner ${Date.now()}`;
      const newBanner = {
        id: `banner-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        slides,
        aspectRatio,
        createdAt: new Date().toISOString(),
        name: bannerName,
        ...(reminderDate.trim() && { reminderDate: reminderDate.trim() }),
      };
      
      if (useIndexedDB) {
        // Save to IndexedDB
        await saveBanner(newBanner);
      } else {
        // Fallback to localStorage
        const storedBanners = localStorage.getItem("savedBanners");
        const banners = storedBanners ? JSON.parse(storedBanners) : [];
        banners.push(newBanner);
        localStorage.setItem("savedBanners", JSON.stringify(banners));
      }
      
      setSaved(true);
      setSaveName("");
      setReminderDate("");
      setTimeout(() => setSaved(false), 2000);

      onSaveBanner?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save banner");
    }
  };

  const handleDownload = async () => {
    if (slides.length === 0) {
      setError("Add at least one slide to download.");
      return;
    }
    setError(null);
    setDownloading(true);
    try {
      const blob = await buildBannerZip({
        slides,
        aspectRatio,
        autoplay,
        autoplaySpeed,
        exportPreset,
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const presetName = exportPreset === "general" ? "banner-carousel" : `${exportPreset}-banner`;
      a.download = `${presetName}.zip`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Export failed");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="p-6 bg-[#2a2a2a] rounded-xl border border-[#3a3a3a] space-y-4">
      <h2 className="font-semibold text-lg">Export & Save</h2>
      
      <div className="space-y-3">
        <div>
          <p className="text-sm text-gray-400 mb-2">
            Save this banner to your collection for later editing or reuse.
          </p>
          <label className="block text-xs text-gray-500 mb-1">Name (optional)</label>
          <input
            type="text"
            value={saveName}
            onChange={(e) => setSaveName(e.target.value)}
            placeholder="e.g. Summer Sale Hero"
            className="w-full px-3 py-2 mb-2 bg-[#1a1a1a] border border-[#3a3a3a] rounded-lg text-white placeholder-gray-500 text-sm focus:outline-none focus:border-[#0066ff]"
          />
          <label className="block text-xs text-gray-500 mb-1">Reminder date (optional)</label>
          <input
            type="date"
            value={reminderDate}
            onChange={(e) => setReminderDate(e.target.value)}
            className="w-full px-3 py-2 mb-2 bg-[#1a1a1a] border border-[#3a3a3a] rounded-lg text-white text-sm focus:outline-none focus:border-[#0066ff]"
          />
          <button
            type="button"
            onClick={handleSaveBanner}
            disabled={slides.length === 0 || saved}
            className="w-full py-2.5 px-4 rounded-lg bg-[#3a3a3a] border border-[#4a4a4a] text-white hover:bg-[#4a4a4a] disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors text-sm"
          >
            {saved ? "✓ Saved!" : "💾 Save Banner"}
          </button>
        </div>

        <div className="pt-2 border-t border-[#3a3a3a]">
          <p className="text-sm text-gray-400 mb-2">
            Export your banner as a ZIP with <code className="text-xs bg-[#1a1a1a] px-1.5 py-0.5 rounded">index.html</code>, <code className="text-xs bg-[#1a1a1a] px-1.5 py-0.5 rounded">images/</code>, and <code className="text-xs bg-[#1a1a1a] px-1.5 py-0.5 rounded">banner-config.json</code>. Use the HTML file on any website.
          </p>
          <div className="mb-2">
            <label className="block text-xs text-gray-500 mb-1">Platform / preset (filename + optional readme)</label>
            <select
              value={exportPreset}
              onChange={(e) => setExportPreset(e.target.value)}
              className="w-full px-3 py-2 bg-[#1a1a1a] border border-[#3a3a3a] rounded-lg text-white text-sm focus:outline-none focus:border-[#0066ff]"
            >
              {EXPORT_PRESETS.map((p) => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
          </div>
          <button
            type="button"
            onClick={handleDownload}
            disabled={downloading || slides.length === 0}
            className="w-full py-3 px-4 rounded-lg bg-gradient-to-r from-[#0066ff] to-[#0052cc] text-white hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-opacity"
          >
            {downloading ? "Preparing…" : "Download banner"}
          </button>
        </div>
      </div>
      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm" role="alert">
          {error}
        </div>
      )}
    </div>
  );
}
