"use client";

import { useState, useEffect, useRef } from "react";
import type { AspectRatio, Slide } from "@/types/banner";
import {
  TEMPLATE_CATEGORIES,
  type TemplateItem,
  type TemplateCategory,
} from "@/data/templates";
import {
  type ImagePurpose,
  IMAGE_PURPOSE_OPTIONS,
  IMAGE_PURPOSE_PROMPTS,
} from "@/lib/imagePurpose";
import { buildTextToImagePrompt, buildImageToImagePrompt } from "@/lib/imagePrompt";
import { getBrandPromptSuffix } from "@/lib/brandKit";
import { saveAsset, openDB } from "@/lib/indexedDB";
import {
  resizeImageToAspect,
  getAspectRatioNumber,
  resizeDataUrlToAspect,
  resizeDataUrlToMaxDimension,
} from "@/lib/resizeToAspect";

const ASPECT_RATIO_OPTIONS: AspectRatio[] = ["16:9", "1:1", "3:1", "4:1"];

interface CustomTemplate {
  id: string;
  name: string;
  aspectRatio: AspectRatio;
  promptHint: string;
  createdAt: string;
}

const CUSTOM_TEMPLATES_KEY = "customTemplates";

function loadCustomTemplates(): CustomTemplate[] {
  try {
    const raw = localStorage.getItem(CUSTOM_TEMPLATES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveCustomTemplates(templates: CustomTemplate[]) {
  localStorage.setItem(CUSTOM_TEMPLATES_KEY, JSON.stringify(templates));
}

interface TemplateGalleryProps {
  onSelectTemplate: (templateId: string, aspectRatio: AspectRatio, promptHint?: string) => void;
  selectedTemplateId?: string | null;
  /** When provided, the "Use Template" modal can generate images directly. */
  onAddSlide?: (slide: Slide, source?: "upload" | "generate") => void;
  onSaveBanner?: (slides: Slide[], aspectRatio: AspectRatio, imagePurpose?: ImagePurpose) => void;
}

/* ── Active template type (built-in or custom) for the modal ── */
interface ActiveTemplate {
  id: string;
  name: string;
  aspectRatio: AspectRatio;
  promptHint: string;
  gradient: string;
  icon: TemplateItem["icon"];
  isPhoneFrame: boolean;
}

/* ── helpers ──────────────────────────────────────────────── */
async function fileToDataUrl(file: File): Promise<{ base64: string; mimeType: string; dataUrl: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
      if (match) resolve({ base64: match[2], mimeType: match[1], dataUrl });
      else reject(new Error("Failed to read file"));
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

async function saveAssetToDB(
  imageUrl: string,
  name: string,
  type: "upload" | "generated",
  prompt?: string,
  aspectRatio?: AspectRatio,
  imagePurpose?: ImagePurpose
) {
  const assetObj = {
    id: `asset-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    imageUrl, name, type,
    uploadedAt: new Date().toISOString(),
    ...(prompt && { prompt }),
    ...(aspectRatio && { aspectRatio }),
    ...(imagePurpose && { imagePurpose }),
  };
  try {
    const useDB = await openDB().then(() => true).catch(() => false);
    if (useDB) {
      await saveAsset(assetObj);
    } else {
      const stored = localStorage.getItem("savedAssets");
      const assets = stored ? JSON.parse(stored) : [];
      assets.push(assetObj);
      localStorage.setItem("savedAssets", JSON.stringify(assets));
    }
  } catch (err) {
    console.warn("saveAssetToDB failed:", err);
  }
}

/* ── ModalCreatePanel ─────────────────────────────────────── */
function ModalCreatePanel({
  template,
  onAddSlide,
  onSaveBanner,
  onClose,
}: {
  template: ActiveTemplate;
  onAddSlide: (slide: Slide, source?: "upload" | "generate") => void;
  onSaveBanner?: (slides: Slide[], aspectRatio: AspectRatio, imagePurpose?: ImagePurpose) => void;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<"generate" | "product" | "upload">("generate");
  const [imagePurpose, setImagePurpose] = useState<ImagePurpose>("homepage_banner");
  const [prompt, setPrompt] = useState(template.promptHint ?? "");
  const [enhanceQuality, setEnhanceQuality] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Result state — shown in-modal after generation
  const [resultSlide, setResultSlide] = useState<Slide | null>(null);

  // product-image mode
  const [productFile, setProductFile] = useState<File | null>(null);
  const [productPreview, setProductPreview] = useState<string | null>(null);
  const [bannerInstructions, setBannerInstructions] = useState(template.promptHint ?? "");
  const [creatingBanner, setCreatingBanner] = useState(false);

  const uploadRef = useRef<HTMLInputElement>(null);
  const productRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!productFile) { setProductPreview(null); return; }
    const url = URL.createObjectURL(productFile);
    setProductPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [productFile]);

  function handlePurposeChange(p: ImagePurpose) {
    setImagePurpose(p);
    setPrompt(IMAGE_PURPOSE_PROMPTS[p] ?? "");
  }

  async function toBase64DataUrl(imageUrl: string): Promise<string> {
    if (imageUrl.startsWith("data:")) return imageUrl;
    const r = await fetch(imageUrl);
    const blob = await r.blob();
    return new Promise<string>((resolve, reject) => {
      const rd = new FileReader(); rd.onload = () => resolve(rd.result as string); rd.onerror = () => reject(rd.error); rd.readAsDataURL(blob);
    });
  }

  async function handleGenerate() {
    if (!prompt.trim()) { setError("Please enter a prompt"); return; }
    setError(null); setGenerating(true);
    try {
      const promptToSend = buildTextToImagePrompt(prompt.trim(), template.aspectRatio, {
        brandPromptSuffix: getBrandPromptSuffix().trim() || undefined,
      });
      const res = await fetch("/api/generate-image", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: promptToSend, aspectRatio: template.aspectRatio, enhanceQuality }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Generation failed");
      let imageUrl = await toBase64DataUrl(data.imageUrl);
      imageUrl = await resizeDataUrlToAspect(imageUrl, template.aspectRatio);
      await saveAssetToDB(imageUrl, `Generated: ${prompt.trim().substring(0,30)}`, "generated", prompt.trim(), template.aspectRatio, imagePurpose);
      const slide: Slide = { id: `slide-${Date.now()}-${Math.random().toString(36).slice(2,9)}`, imageUrl, prompt: prompt.trim() };
      onSaveBanner?.([slide], template.aspectRatio, imagePurpose);
      // Show result in modal — don't navigate
      setResultSlide(slide);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setGenerating(false);
    }
  }

  async function handleProductBanner() {
    if (!productFile) { setError("Upload a product image first"); return; }
    if (!bannerInstructions.trim()) { setError("Add instructions for the banner"); return; }
    setError(null); setCreatingBanner(true);
    try {
      let { base64, mimeType, dataUrl } = await fileToDataUrl(productFile);
      const resizedUrl = await resizeDataUrlToMaxDimension(dataUrl);
      const m = resizedUrl.match(/^data:([^;]+);base64,(.+)$/);
      if (m) { base64 = m[2]; mimeType = m[1]; }
      const promptToSend = buildImageToImagePrompt(bannerInstructions.trim(), template.aspectRatio, {
        brandPromptSuffix: getBrandPromptSuffix().trim() || undefined,
      });
      const res = await fetch("/api/generate-image", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: promptToSend, imageBase64: base64, imageMimeType: mimeType, aspectRatio: template.aspectRatio, enhanceQuality }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Banner creation failed");
      let imageUrl = await toBase64DataUrl(data.imageUrl);
      imageUrl = await resizeDataUrlToAspect(imageUrl, template.aspectRatio);
      await saveAssetToDB(imageUrl, `Banner: ${bannerInstructions.trim().substring(0,30)}`, "generated", bannerInstructions.trim(), template.aspectRatio);
      const slide: Slide = { id: `slide-${Date.now()}-${Math.random().toString(36).slice(2,9)}`, imageUrl, prompt: bannerInstructions.trim() };
      onSaveBanner?.([slide], template.aspectRatio);
      // Show result in modal — don't navigate
      setResultSlide(slide);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Banner creation failed");
    } finally {
      setCreatingBanner(false);
    }
  }

  async function handleDirectUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith("image/")) return;
    setError(null);
    try {
      const ratioNum = getAspectRatioNumber(template.aspectRatio);
      const blob = await resizeImageToAspect(file, ratioNum);
      const imageUrl = await new Promise<string>((resolve, reject) => {
        const rd = new FileReader(); rd.onload = () => resolve(rd.result as string); rd.onerror = () => reject(rd.error); rd.readAsDataURL(blob);
      });
      await saveAssetToDB(imageUrl, file.name, "upload", undefined, template.aspectRatio);
      setResultSlide({ id: `slide-${Date.now()}-${Math.random().toString(36).slice(2,9)}`, imageUrl, imageBlob: blob });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    }
    e.target.value = "";
  }

  /* ── Result view ── */
  if (resultSlide) {
    return (
      <div className="flex flex-col items-center gap-6 h-full">
        <div className="w-full flex-1 rounded-2xl overflow-hidden border border-white/[0.08] bg-black flex items-center justify-center" style={{minHeight: 200}}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={resultSlide.imageUrl}
            alt="Generated"
            className="w-full h-full object-contain"
            style={{ maxHeight: 420 }}
          />
        </div>
        <p className="text-[13px] text-emerald-400 flex items-center gap-2 font-semibold">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          Image saved to Gallery
        </p>
        <div className="w-full flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 btn-secondary py-3 text-[14px] font-semibold"
          >
            Close
          </button>
          <button
            type="button"
            onClick={() => { onAddSlide(resultSlide, "generate"); onClose(); }}
            className="flex-1 btn-primary py-3 text-[14px] font-semibold"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            Edit in Editor
          </button>
          <button
            type="button"
            onClick={() => setResultSlide(null)}
            className="px-4 btn-secondary py-3 text-[13px]"
            title="Generate another"
          >
            ↺ Again
          </button>
        </div>
      </div>
    );
  }

  const isBusy = generating || creatingBanner;

  return (
    <div className="flex flex-col gap-6 h-full">
      {/* ── Tab switcher ── */}
      <div className="flex gap-1 p-1 rounded-xl bg-white/[0.04] border border-white/[0.07]">
        {([
          { id: "generate", label: "✦ Generate" },
          { id: "product",  label: "📦 Product image" },
          { id: "upload",   label: "⬆ Upload" },
        ] as const).map((t) => (
          <button key={t.id} type="button"
            onClick={() => { setTab(t.id); setError(null); }}
            className={`flex-1 py-2.5 px-3 rounded-lg text-[13px] font-semibold transition-all ${tab === t.id ? "bg-[var(--accent)] text-white shadow" : "text-gray-400 hover:text-white hover:bg-white/[0.06]"}`}
          >{t.label}</button>
        ))}
      </div>

      {/* ── Generate from prompt ── */}
      {tab === "generate" && (
        <div className="flex flex-col gap-5 flex-1">
          <div>
            <label className="block text-[13px] font-semibold text-gray-300 mb-2">Image Purpose</label>
            <select value={imagePurpose} onChange={(e) => handlePurposeChange(e.target.value as ImagePurpose)} className="input-base w-full">
              {IMAGE_PURPOSE_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
            </select>
          </div>
          <div className="flex-1 flex flex-col">
            <div className="flex items-center justify-between mb-2">
              <label className="text-[13px] font-semibold text-gray-300">Prompt</label>
              <span className="text-[11px] text-gray-600">{prompt.length} chars</span>
            </div>
            <textarea className="input-base w-full flex-1 resize-none leading-relaxed" rows={7}
              placeholder="Describe the image you want to generate…"
              value={prompt} onChange={(e) => setPrompt(e.target.value)} disabled={isBusy}
            />
            <p className="text-[11px] text-gray-600 mt-1.5">Pre-filled from template — edit freely.</p>
          </div>
          <EnhanceToggle value={enhanceQuality} onChange={setEnhanceQuality} />
          <button type="button" onClick={handleGenerate} disabled={isBusy || !prompt.trim()}
            className="btn-primary w-full py-3.5 text-[15px] font-bold disabled:opacity-50 disabled:cursor-not-allowed">
            {generating ? <BusyLabel label="Generating image…" /> : "✦ Generate Image"}
          </button>
        </div>
      )}

      {/* ── From product image ── */}
      {tab === "product" && (
        <div className="flex flex-col gap-5 flex-1">
          <div>
            <label className="block text-[13px] font-semibold text-gray-300 mb-2">Product image</label>
            <input ref={productRef} type="file" accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; setProductFile(f ?? null); e.target.value = ""; }} className="hidden" />
            {productPreview ? (
              <div className="relative rounded-xl overflow-hidden border border-white/[0.08] bg-black" style={{maxHeight:180}}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={productPreview} alt="Product" className="w-full h-full object-contain" style={{maxHeight:180}} />
                <button type="button" onClick={() => setProductFile(null)} className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/70 border border-white/20 flex items-center justify-center text-gray-300 hover:text-white">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
                </button>
              </div>
            ) : (
              <button type="button" onClick={() => productRef.current?.click()} className="w-full h-28 rounded-xl border-2 border-dashed border-white/[0.1] hover:border-[var(--accent)]/50 bg-white/[0.02] hover:bg-[var(--accent)]/5 flex flex-col items-center justify-center gap-2 transition-all">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-gray-500"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                <span className="text-[13px] text-gray-500">Click to upload product image</span>
              </button>
            )}
          </div>
          <div className="flex-1 flex flex-col">
            <div className="flex items-center justify-between mb-2">
              <label className="text-[13px] font-semibold text-gray-300">Banner instructions</label>
              <span className="text-[11px] text-gray-600">{bannerInstructions.length} chars</span>
            </div>
            <textarea className="input-base w-full flex-1 resize-none leading-relaxed" rows={6}
              placeholder="Describe how the banner should look — style, background, text placement, mood…"
              value={bannerInstructions} onChange={(e) => setBannerInstructions(e.target.value)} disabled={isBusy}
            />
          </div>
          <EnhanceToggle value={enhanceQuality} onChange={setEnhanceQuality} />
          <button type="button" onClick={handleProductBanner} disabled={isBusy || !productFile || !bannerInstructions.trim()}
            className="btn-primary w-full py-3.5 text-[15px] font-bold disabled:opacity-50 disabled:cursor-not-allowed">
            {creatingBanner ? <BusyLabel label="Creating banner…" /> : "✦ Create Banner"}
          </button>
        </div>
      )}

      {/* ── Upload image ── */}
      {tab === "upload" && (
        <div className="flex flex-col gap-5 flex-1">
          <p className="text-[14px] text-gray-400 leading-relaxed">
            Upload your own image — it will be auto-resized to <span className="font-mono text-white">{template.aspectRatio}</span> and shown here instantly.
          </p>
          <input ref={uploadRef} type="file" accept="image/*" onChange={handleDirectUpload} className="hidden" />
          <button type="button" onClick={() => uploadRef.current?.click()}
            className="w-full h-40 rounded-2xl border-2 border-dashed border-white/[0.12] hover:border-[var(--accent)]/50 bg-white/[0.02] hover:bg-[var(--accent)]/5 flex flex-col items-center justify-center gap-3 transition-all group">
            <span className="w-12 h-12 rounded-2xl bg-white/[0.05] group-hover:bg-[var(--accent)]/10 flex items-center justify-center text-gray-400 group-hover:text-[var(--accent)] transition-colors">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
            </span>
            <div className="text-center">
              <p className="text-[14px] font-semibold text-gray-300 group-hover:text-white transition-colors">Click to upload image</p>
              <p className="text-[12px] text-gray-600 mt-1">JPG, PNG, WebP — auto-resized to {template.aspectRatio}</p>
            </div>
          </button>
        </div>
      )}

      {error && (
        <div className="p-3.5 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-[13px] flex items-start gap-2">
          <svg className="flex-shrink-0 mt-0.5" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          {error}
        </div>
      )}
    </div>
  );
}

function EnhanceToggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-3 p-3.5 rounded-xl border border-white/[0.07] bg-white/[0.02] cursor-pointer hover:bg-white/[0.04] transition-colors">
      <div className="relative flex-shrink-0">
        <input type="checkbox" checked={value} onChange={(e) => onChange(e.target.checked)} className="sr-only peer" />
        <div className="w-9 h-5 rounded-full border border-white/20 bg-white/[0.06] peer-checked:bg-[var(--accent)] transition-colors" />
        <div className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white/40 peer-checked:translate-x-4 peer-checked:bg-white transition-all" />
      </div>
      <div>
        <p className="text-[13px] font-semibold text-white">Enhance quality</p>
        <p className="text-[11px] text-gray-500">Adds detail and sharpness to the generated image</p>
      </div>
    </label>
  );
}

function BusyLabel({ label }: { label: string }) {
  return (
    <span className="flex items-center justify-center gap-2">
      <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10" strokeOpacity=".3"/><path d="M12 2a10 10 0 0 1 10 10" />
      </svg>
      {label}
    </span>
  );
}

/* ── UseTemplateModal ─────────────────────────────────────── */
function UseTemplateModal({
  template,
  onClose,
  onAddSlide,
  onSaveBanner,
  onSelectTemplate,
}: {
  template: ActiveTemplate;
  onClose: () => void;
  onAddSlide?: (slide: Slide, source?: "upload" | "generate") => void;
  onSaveBanner?: (slides: Slide[], aspectRatio: AspectRatio, imagePurpose?: ImagePurpose) => void;
  onSelectTemplate: (templateId: string, aspectRatio: AspectRatio, promptHint?: string) => void;
}) {
  /* If no onAddSlide provided, just navigate (old behaviour) */
  const handleAddSlide = (slide: Slide, source?: "upload" | "generate") => {
    if (onAddSlide) {
      onAddSlide(slide, source);
    } else {
      onSelectTemplate(template.id, template.aspectRatio, template.promptHint);
    }
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-md" />

      {/* Modal */}
      <div
        className="relative w-full max-w-5xl rounded-2xl border border-white/[0.1] bg-[#0e0e16] shadow-2xl overflow-hidden flex flex-col"
        style={{ maxHeight: "95vh", minHeight: "600px" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.07] flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[var(--accent)]/15 flex items-center justify-center">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <line x1="3" y1="9" x2="21" y2="9" />
                <line x1="9" y1="21" x2="9" y2="9" />
              </svg>
            </div>
            <div>
              <h2 className="text-[16px] font-bold text-white tracking-tight leading-tight">{template.name}</h2>
              <span className="text-[11px] font-mono text-gray-500">{template.aspectRatio} aspect ratio</span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex flex-col lg:flex-row overflow-y-auto flex-1" style={{ minHeight: 0 }}>
          {/* Left: template preview */}
          <div className="flex-shrink-0 w-full lg:w-80 xl:w-96 p-6 border-b lg:border-b-0 lg:border-r border-white/[0.07] flex flex-col gap-5">
            {/* Visual preview */}
            <div className="rounded-xl overflow-hidden border border-white/[0.08] bg-[#1a1a26]">
              <div className="p-3 bg-[#252535]">
                {template.isPhoneFrame ? (
                  <div className="mx-auto w-36 h-64 rounded-2xl bg-black overflow-hidden border border-[#444]">
                    <div className="h-7 flex items-center justify-between px-3 border-b border-[#333]">
                      <div className="w-2.5 h-2.5 rounded-full bg-[#555]" />
                      <div className="h-1.5 w-14 bg-[#444] rounded" />
                    </div>
                    <div className="flex-1 h-[13.5rem] flex items-center justify-center p-3">
                      <TemplateIcon icon={template.icon} gradient={template.gradient} />
                    </div>
                  </div>
                ) : (
                  <div className="mx-auto w-full rounded-xl border border-[#444] bg-[#1a1a1a] overflow-hidden">
                    <div className="h-7 bg-[#2a2a2a] flex items-center gap-1.5 px-2.5 border-b border-[#333]">
                      {["#ff5f57","#febc2e","#28c840"].map(c => (
                        <span key={c} className="w-2 h-2 rounded-full" style={{background:c}} />
                      ))}
                    </div>
                    <div className="p-5 flex items-center justify-center" style={{minHeight: 160}}>
                      <TemplateIcon icon={template.icon} gradient={template.gradient} />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Aspect ratio info */}
            <div className="space-y-2">
              <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03] border border-white/[0.07]">
                <span className="text-[12px] text-gray-400">Aspect ratio</span>
                <span className="text-[12px] font-mono font-bold text-white">{template.aspectRatio}</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03] border border-white/[0.07]">
                <span className="text-[12px] text-gray-400">Format</span>
                <span className="text-[12px] font-semibold text-white capitalize">{template.isPhoneFrame ? "Mobile" : "Desktop / Web"}</span>
              </div>
            </div>

            {/* Quick tip */}
            <div className="p-3 rounded-xl bg-[var(--accent)]/5 border border-[var(--accent)]/20">
              <p className="text-[11px] text-[var(--accent)] font-semibold mb-1">💡 Tip</p>
              <p className="text-[11px] text-gray-400 leading-relaxed">
                Edit the prompt on the right to match your brand, then generate or upload a product image.
              </p>
            </div>
          </div>

          {/* Right: create panel */}
          <div className="flex-1 p-7 overflow-y-auto flex flex-col min-h-0">
            <ModalCreatePanel
              template={template}
              onAddSlide={handleAddSlide}
              onSaveBanner={onSaveBanner}
              onClose={onClose}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function TemplateIcon({
  icon,
  gradient,
}: {
  icon: TemplateItem["icon"];
  gradient: string;
}) {
  const gradientClass = `bg-gradient-to-br ${gradient}`;
  const size = "w-10 h-10";
  switch (icon) {
    case "carousel":
      return (
        <div className="flex items-center justify-center gap-0.5">
          <span className="text-[#666] text-xs font-bold">&lt;</span>
          <svg className={`${size} ${gradientClass}`} viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
          </svg>
          <span className="text-[#666] text-xs font-bold">&gt;</span>
        </div>
      );
    case "feed":
      return (
        <div className="flex flex-col items-center gap-1">
          <div className={`${size} rounded-t-full ${gradientClass}`} style={{ clipPath: "ellipse(45% 40% at 50% 50%)" }} />
          <div className={`h-1.5 w-14 rounded-full ${gradientClass}`} />
        </div>
      );
    case "landscape":
      return <div className={`h-8 w-14 rounded ${gradientClass}`} />;
    case "portrait":
      return (
        <svg className={`${size} ${gradientClass}`} viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
        </svg>
      );
    case "blog":
      return (
        <div className="flex flex-col items-center gap-1.5">
          <div className={`${size} rounded-full ${gradientClass}`} />
          <div className="flex flex-col gap-0.5">
            <div className="h-0.5 w-8 bg-[#444] rounded" />
            <div className="h-0.5 w-6 bg-[#444] rounded" />
          </div>
        </div>
      );
    case "header":
      return (
        <div className="flex flex-col items-center w-full">
          <div className={`h-6 w-full rounded-t-full ${gradientClass}`} />
          <div className="h-0.5 w-12 bg-[#444] rounded mt-1" />
          <div className="h-0.5 w-10 bg-[#444] rounded mt-0.5" />
        </div>
      );
    case "banner":
      return (
        <div className="flex flex-col w-full gap-1">
          <div className={`h-5 w-full rounded-l ${gradientClass}`} style={{ borderTopRightRadius: "9999px", borderBottomRightRadius: "9999px" }} />
          <div className="flex gap-1 mt-0.5">
            <div className="h-2 w-2 rounded-full bg-[#444]" />
            <div className="h-0.5 flex-1 bg-[#444] rounded self-center" />
          </div>
        </div>
      );
    case "star":
      return (
        <div className="flex flex-col items-center gap-1">
          <svg className={`${size} ${gradientClass}`} viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
          <div className="flex flex-col gap-0.5">
            <div className="h-0.5 w-6 bg-[#444] rounded" />
            <div className="h-0.5 w-4 bg-[#444] rounded" />
          </div>
        </div>
      );
    case "heart":
      return (
        <div className="flex flex-col items-center gap-1">
          <svg className={`${size} ${gradientClass}`} viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
          </svg>
          <div className="h-0.5 w-8 bg-[#444] rounded" />
        </div>
      );
    case "browser":
    default:
      return (
        <div className="flex items-start gap-2 w-full">
          <svg className={`w-8 h-8 shrink-0 ${gradientClass}`} viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
          <div className="flex flex-col gap-0.5 flex-1 min-w-0">
            <div className="h-0.5 w-full bg-[#444] rounded" />
            <div className="h-0.5 w-[80%] bg-[#444] rounded" />
            <div className="h-0.5 w-[60%] bg-[#444] rounded" />
          </div>
        </div>
      );
  }
}

function TemplateCard({
  template,
  isPhoneFrame,
  isSelected,
  onSelect,
  onDelete,
}: {
  template: TemplateItem & { isCustom?: boolean };
  isPhoneFrame: boolean;
  isSelected: boolean;
  onSelect: () => void;
  onDelete?: () => void;
}) {
  return (
    <div className={`relative group rounded-xl cursor-pointer select-none focus:outline-none ${isSelected ? "ring-2 ring-[var(--accent)] ring-offset-2 ring-offset-[var(--background)]" : ""}`}>
      <button
        type="button"
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); onSelect(); }}
        onPointerDown={(e) => e.stopPropagation()}
        className="w-full text-left focus:outline-none"
      >
        <div className={`rounded-xl bg-[var(--card-bg)] overflow-hidden shadow-sm transition-all border ${isSelected ? "border-[var(--accent)]" : "border-[var(--border)] group-hover:border-[#4a4a4a]"}`}>
          <div className="p-2 bg-[#333]">
            {isPhoneFrame ? (
              <div className="mx-auto w-20 h-36 rounded-lg bg-black overflow-hidden border border-[#444]">
                <div className="h-5 flex items-center justify-between px-1.5 border-b border-[#333]">
                  <div className="w-2 h-2 rounded-full bg-[#555]" />
                  <div className="h-1 w-8 bg-[#444] rounded" />
                </div>
                <div className="h-[7.5rem] flex items-center justify-center bg-black p-1">
                  <TemplateIcon icon={template.icon ?? "browser"} gradient={template.gradient ?? "from-gray-500 to-gray-700"} />
                </div>
              </div>
            ) : (
              <div className="mx-auto w-24 h-28 rounded border border-[#444] bg-[#1a1a1a] overflow-hidden">
                <div className="h-5 bg-[#2a2a2a] flex items-center gap-1 px-1.5 border-b border-[#333]">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#555]" />
                  <div className="w-1.5 h-1.5 rounded-full bg-[#555]" />
                  <div className="w-1.5 h-1.5 rounded-full bg-[#555]" />
                </div>
                <div className="p-1.5 h-[5.5rem] flex items-center justify-center">
                  <TemplateIcon icon={template.icon ?? "browser"} gradient={template.gradient ?? "from-gray-500 to-gray-700"} />
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="mt-2 px-0.5">
          <p className="text-[13px] text-gray-300 group-hover:text-white transition-colors truncate">
            {template.name}
          </p>
          <div className="mt-1 flex items-center gap-1.5 flex-wrap">
            <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-[#3a3a3a] border border-[#4a4a4a]">
              <span className="text-[11px] text-gray-400 font-mono">{template.aspectRatio}</span>
            </span>
            {(template as TemplateItem & { isCustom?: boolean }).isCustom && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-[var(--accent)]/10 border border-[var(--accent)]/30">
                <span className="text-[11px] text-[var(--accent)] font-medium">Custom</span>
              </span>
            )}
          </div>
        </div>
      </button>
      {onDelete && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          title="Delete custom template"
          className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/60 border border-white/10 text-gray-400 hover:text-red-400 hover:border-red-400/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
}

function CreateTemplateModal({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: (t: CustomTemplate) => void;
}) {
  const [name, setName] = useState("");
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>("16:9");
  const [prompt, setPrompt] = useState("");
  const [error, setError] = useState("");

  function handleSave() {
    if (!name.trim()) { setError("Template name is required."); return; }
    if (!prompt.trim()) { setError("Prompt hint is required."); return; }
    onSave({
      id: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name: name.trim(),
      aspectRatio,
      promptHint: prompt.trim(),
      createdAt: new Date().toISOString(),
    });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-lg rounded-2xl border border-white/[0.1] bg-[#111] shadow-2xl p-6 space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-[18px] font-bold text-white tracking-tight">Create custom template</h2>
          <button type="button" onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-colors">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Fields */}
        <div className="space-y-4">
          <div>
            <label className="block text-[13px] font-medium text-gray-300 mb-1.5">Template name <span className="text-red-400">*</span></label>
            <input
              className="input-base w-full"
              placeholder="e.g. Flash Sale Banner"
              value={name}
              onChange={(e) => { setName(e.target.value); setError(""); }}
              maxLength={60}
            />
          </div>

          <div>
            <label className="block text-[13px] font-medium text-gray-300 mb-1.5">Aspect ratio</label>
            <div className="flex flex-wrap gap-2">
              {ASPECT_RATIO_OPTIONS.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setAspectRatio(r)}
                  className={`px-3 py-1.5 rounded-lg border text-[13px] font-mono font-medium transition-all ${
                    aspectRatio === r
                      ? "bg-[var(--accent)]/15 border-[var(--accent)]/60 text-white"
                      : "bg-white/[0.04] border-white/[0.08] text-gray-400 hover:border-white/20 hover:text-white"
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-[13px] font-medium text-gray-300 mb-1.5">
              Prompt hint <span className="text-red-400">*</span>
              <span className="ml-2 text-[12px] text-gray-500 font-normal">Pre-filled when template is selected</span>
            </label>
            <textarea
              className="input-base w-full resize-none"
              rows={4}
              placeholder="Describe the style, layout, colors, and mood of this template…"
              value={prompt}
              onChange={(e) => { setPrompt(e.target.value); setError(""); }}
              maxLength={500}
            />
            <p className="text-[11px] text-gray-600 mt-1 text-right">{prompt.length}/500</p>
          </div>
        </div>

        {error && <p className="text-[13px] text-red-400">{error}</p>}

        <div className="flex justify-end gap-3 pt-1">
          <button type="button" onClick={onClose} className="btn-secondary px-5 py-2 text-[14px]">Cancel</button>
          <button type="button" onClick={handleSave} className="btn-primary px-5 py-2 text-[14px]">Save template</button>
        </div>
      </div>
    </div>
  );
}

export default function TemplateGallery({ onSelectTemplate, selectedTemplateId = null, onAddSlide, onSaveBanner }: TemplateGalleryProps) {
  const [customTemplates, setCustomTemplates] = useState<CustomTemplate[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [activeTemplate, setActiveTemplate] = useState<ActiveTemplate | null>(null);

  useEffect(() => {
    setCustomTemplates(loadCustomTemplates());
  }, []);

  function openUseModal(template: ActiveTemplate) {
    setActiveTemplate(template);
  }
  function closeUseModal() {
    setActiveTemplate(null);
  }

  function handleSaveCustom(t: CustomTemplate) {
    const updated = [t, ...customTemplates];
    setCustomTemplates(updated);
    saveCustomTemplates(updated);
  }

  function handleDeleteCustom(id: string) {
    const updated = customTemplates.filter((t) => t.id !== id);
    setCustomTemplates(updated);
    saveCustomTemplates(updated);
  }

  const customAsTemplateItems: (TemplateItem & { isCustom: boolean })[] = customTemplates.map((c) => ({
    id: c.id,
    name: c.name,
    aspectRatio: c.aspectRatio,
    promptHint: c.promptHint,
    gradient: "from-[var(--accent)] to-purple-600",
    icon: "browser" as const,
    isCustom: true,
  }));

  return (
    <div className="space-y-8 mb-8">
      {/* Custom templates section */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[17px] font-bold text-white tracking-tight">My Custom Templates</h2>
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="btn-primary text-[13px] px-4 py-2 flex items-center gap-2"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
            Create template
          </button>
        </div>

        {customAsTemplateItems.length === 0 ? (
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="w-full h-28 rounded-xl border-2 border-dashed border-white/[0.1] hover:border-[var(--accent)]/40 bg-white/[0.02] hover:bg-[var(--accent)]/5 flex flex-col items-center justify-center gap-2 transition-all group"
          >
            <span className="w-9 h-9 rounded-xl bg-white/[0.05] group-hover:bg-[var(--accent)]/10 flex items-center justify-center text-gray-500 group-hover:text-[var(--accent)] transition-colors">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 5v14M5 12h14" />
              </svg>
            </span>
            <span className="text-[13px] text-gray-500 group-hover:text-gray-300 transition-colors">Create your first custom template</span>
          </button>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-4">
            {customAsTemplateItems.map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
                isPhoneFrame={false}
                isSelected={selectedTemplateId === template.id}
                onSelect={() => openUseModal({ ...template, isPhoneFrame: false })}
                onDelete={() => handleDeleteCustom(template.id)}
              />
            ))}
          </div>
        )}
      </section>

      {/* Built-in categories */}
      {TEMPLATE_CATEGORIES.map((category: TemplateCategory) => (
        <section key={category.id}>
          <h2 className="text-[17px] font-bold text-white tracking-tight mb-4">{category.title}</h2>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-4">
            {category.templates.map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
                isPhoneFrame={category.id === "instagram"}
                isSelected={selectedTemplateId === template.id}
                onSelect={() => openUseModal({ ...template, isPhoneFrame: category.id === "instagram" })}
              />
            ))}
          </div>
        </section>
      ))}

      {/* "Create custom template" modal */}
      {showCreateModal && (
        <CreateTemplateModal
          onClose={() => setShowCreateModal(false)}
          onSave={handleSaveCustom}
        />
      )}

      {/* "Use template" modal */}
      {activeTemplate && (
        <UseTemplateModal
          template={activeTemplate}
          onClose={closeUseModal}
          onAddSlide={onAddSlide}
          onSaveBanner={onSaveBanner}
          onSelectTemplate={onSelectTemplate}
        />
      )}
    </div>
  );
}
