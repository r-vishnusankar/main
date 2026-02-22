"use client";

import { useState, useEffect, useRef } from "react";
import { useSearchParams, usePathname, useRouter } from "next/navigation";
import BannerCarousel from "@/components/BannerCarousel";
import ImageSourcePanel from "@/components/ImageSourcePanel";
import CalendarPanel from "@/components/CalendarPanel";
import ExportPanel from "@/components/ExportPanel";
import LeftSidebar, { type NavItemId } from "@/components/LeftSidebar";
import TopNav from "@/components/TopNav";
import RightSidebar from "@/components/RightSidebar";
import TemplateGallery from "@/components/TemplateGallery";
import HomeView from "@/components/HomeView";
import BannersView from "@/components/BannersView";
import GalleryView from "@/components/GalleryView";
import HelpView from "@/components/HelpView";
import OnboardingBanner from "@/components/OnboardingBanner";
import type { Slide, AspectRatio } from "@/types/banner";
import { resizeDataUrlToAspect, resizeDataUrlToMaxDimension } from "@/lib/resizeToAspect";
import { type ImagePurpose, IMAGE_PURPOSE_OPTIONS, IMAGE_PURPOSE_ASPECT_RATIO } from "@/lib/imagePurpose";
import { buildTextToImagePrompt, buildImageToImagePrompt, type CampaignPurposeType } from "@/lib/imagePrompt";
import { getBrandPromptSuffix, getBrandKit, setBrandKit } from "@/lib/brandKit";
import type { Celebration } from "@/lib/calendar";

const ASPECT_RATIOS: { value: AspectRatio; label: string }[] = [
  { value: "16:9", label: "16:9" },
  { value: "3:1", label: "3:1" },
  { value: "4:1", label: "4:1" },
  { value: "1:1", label: "1:1" },
];

const VALID_NAV_IDS: NavItemId[] = ["home", "create", "product-banner", "banners", "gallery", "templates", "help"];

export default function EditorPage() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const [activeNavState, setActiveNavState] = useState<NavItemId>("home");
  const activeNav = activeNavState;
  const setActiveNav = (id: NavItemId) => {
    setActiveNavState(id);
    const params = new URLSearchParams(searchParams?.toString() ?? "");
    params.set("view", id);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };
  const isInitialMount = useRef(true);
  useEffect(() => {
    const view = searchParams?.get("view");
    if (view && VALID_NAV_IDS.includes(view as NavItemId)) {
      setActiveNavState(view as NavItemId);
    }
    isInitialMount.current = false;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps -- only on mount
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>("16:9");
  const [slides, setSlides] = useState<Slide[]>([]);
  const [autoplay, setAutoplay] = useState(true);
  const [autoplaySpeed, setAutoplaySpeed] = useState(5);
  const [productName, setProductName] = useState("");
  const [activeTab, setActiveTab] = useState<"create" | "editor">("create");
  const [suggestedPrompt, setSuggestedPrompt] = useState<string | undefined>(undefined);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [createWorkflow, setCreateWorkflow] = useState<"generate" | "product">("generate");
  const [selectedCreatePurpose, setSelectedCreatePurpose] = useState<ImagePurpose | null>("homepage_banner");
  const [campaignPurposeType, setCampaignPurposeType] = useState<CampaignPurposeType>("general");
  const [bannersRefreshTrigger, setBannersRefreshTrigger] = useState(0);
  const [selectedEvent, setSelectedEvent] = useState<Celebration | null>(null);
  const [brandPromptSuffix, setBrandPromptSuffix] = useState("");
  const [batchListText, setBatchListText] = useState("");
  const [batchGenerating, setBatchGenerating] = useState(false);
  const [batchProgress, setBatchProgress] = useState("");
  const [batchError, setBatchError] = useState<string | null>(null);

  useEffect(() => {
    setBrandPromptSuffix(getBrandKit().brandPromptSuffix ?? "");
  }, []);

  const addSlide = (slide: Slide, source?: "upload" | "generate") => {
    setSlides((prev) => [...prev, slide]);
    setActiveNav("create");
    if (source === "upload") {
      setActiveTab("editor");
    }
  };

  const generateSlideId = () => `slide-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

  const handleBatchGenerate = async () => {
    const lines = batchListText
      .split(/\n/)
      .map((l) => l.trim())
      .filter(Boolean)
      .slice(0, 15);
    if (lines.length === 0) return;
    setBatchGenerating(true);
    setBatchError(null);
    const campaignText = campaignPurposeType === "event" ? (selectedEvent?.name ?? productName) : productName;
    const brandSuffix = getBrandPromptSuffix().trim() || undefined;
    const slides: Slide[] = [];
    try {
      for (let i = 0; i < lines.length; i++) {
        setBatchProgress(`${i + 1}/${lines.length}`);
        const promptToSend = buildTextToImagePrompt(lines[i], aspectRatio, {
          eventName: selectedEvent?.name,
          campaignPurposeType,
          campaignText,
          brandPromptSuffix: brandSuffix,
        });
        const res = await fetch("/api/generate-image", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt: promptToSend, aspectRatio }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Failed to generate image");
        let imageUrl = data.imageUrl;
        if (!imageUrl) throw new Error("No image in response");
        if (!imageUrl.startsWith("data:")) {
          const blob = await (await fetch(imageUrl)).blob();
          imageUrl = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = () => reject(reader.error);
            reader.readAsDataURL(blob);
          });
        }
        imageUrl = await resizeDataUrlToAspect(imageUrl, aspectRatio);
        slides.push({ id: generateSlideId(), imageUrl, prompt: lines[i] });
      }
      setSlides(slides);
      setActiveTab("editor");
      setActiveNav("create");
      setBatchListText("");
    } catch (err) {
      setBatchError(err instanceof Error ? err.message : "Batch generation failed");
      setSlides(slides);
      if (slides.length > 0) {
        setActiveTab("editor");
        setActiveNav("create");
      }
    } finally {
      setBatchGenerating(false);
      setBatchProgress("");
    }
  };

  const handleSelectBanner = (bannerSlides: Slide[], bannerAspectRatio: string) => {
    setSlides(bannerSlides);
    setAspectRatio(bannerAspectRatio as AspectRatio);
    setActiveTab("editor");
    setActiveNav("create");
  };

  /** Open editor with a copy of the banner (new slide ids) so the original is not modified. */
  const handleUseAsTemplate = (bannerSlides: Slide[], bannerAspectRatio: string) => {
    setSlides(bannerSlides.map((s) => ({ ...s, id: generateSlideId() })));
    setAspectRatio(bannerAspectRatio as AspectRatio);
    setActiveTab("editor");
    setActiveNav("create");
  };

  const handleSelectForEdit = (slide: Slide, aspectRatio: AspectRatio) => {
    setSlides([slide]);
    setAspectRatio(aspectRatio);
    setActiveNav("create");
    setActiveTab("editor");
  };

  /** Add a slide to the carousel and open editor (Duplicate / use as template from gallery). */
  const handleAddToEditor = (slide: Slide, aspectRatio: AspectRatio) => {
    setSlides((prev) => [...prev, slide]);
    setAspectRatio(aspectRatio);
    setActiveTab("editor");
    setActiveNav("create");
  };

  const handleSelectAsset = (imageUrl: string) => {
    // Add asset as a slide
    const slide: Slide = {
      id: `slide-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      imageUrl,
    };
    addSlide(slide);
  };

  const handleNavChange = (id: NavItemId) => {
    setActiveNav(id);
    if (id === "create") {
      setActiveTab("create");
    }
  };

  const removeSlide = (index: number) => {
    setSlides((prev) => prev.filter((_, i) => i !== index));
  };

  const reorderSlides = (fromIndex: number, toIndex: number) => {
    setSlides((prev) => {
      const next = [...prev];
      const [removed] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, removed);
      return next;
    });
  };

  const updateSlide = (index: number, updates: Partial<Slide>) => {
    setSlides((prev) =>
      prev.map((s, i) => (i === index ? { ...s, ...updates } : s))
    );
  };

  /** Get base64 + mime from a slide image URL for use as reference in image-to-image generation. Resizes to max 1024px to avoid API failures. */
  const getImageBase64FromUrl = async (imageUrl: string): Promise<{ imageBase64: string; imageMimeType: string } | null> => {
    if (!imageUrl?.trim()) return null;
    let dataUrl: string | null = null;
    if (imageUrl.startsWith("data:")) {
      dataUrl = imageUrl;
    } else if (imageUrl.startsWith("blob:")) {
      try {
        const response = await fetch(imageUrl);
        const blob = await response.blob();
        dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = () => reject(reader.error);
          reader.readAsDataURL(blob);
        });
      } catch {
        return null;
      }
    }
    if (!dataUrl) return null;
    try {
      const resized = await resizeDataUrlToMaxDimension(dataUrl);
      const match = resized.match(/^data:([^;]+);base64,(.+)$/);
      if (match) return { imageMimeType: match[1], imageBase64: match[2] };
    } catch {
      const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
      if (match) return { imageMimeType: match[1], imageBase64: match[2] };
    }
    return null;
  };

  const handleRegenerateSlide = async (index: number, prompt: string, aspectRatio: AspectRatio) => {
    const promptTrimmed = prompt.trim();
    const slide = slides[index];
    const referenceImage = slide?.imageUrl ? await getImageBase64FromUrl(slide.imageUrl) : null;
    const campaignText = campaignPurposeType === "event" ? (selectedEvent?.name ?? productName) : productName;
    const campaignOpts = { campaignPurposeType, campaignText, brandPromptSuffix: getBrandPromptSuffix().trim() || undefined };
    const eventStyle = selectedEvent?.name?.trim() && campaignPurposeType !== "event" ? ` Style: festive for ${selectedEvent.name}.` : "";
    const promptToSend = referenceImage
      ? buildImageToImagePrompt(promptTrimmed + eventStyle, aspectRatio, campaignOpts)
      : buildTextToImagePrompt(promptTrimmed, aspectRatio, { eventName: selectedEvent?.name, ...campaignOpts });
    const body: { prompt: string; imageBase64?: string; imageMimeType?: string; aspectRatio?: AspectRatio } = { prompt: promptToSend, aspectRatio };
    if (referenceImage) {
      body.imageBase64 = referenceImage.imageBase64;
      body.imageMimeType = referenceImage.imageMimeType;
    }
    const res = await fetch("/api/generate-image", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Failed to generate image");
    let imageUrl = data.imageUrl;
    if (!imageUrl) throw new Error("No image in response");
    if (!imageUrl.startsWith("data:")) {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      imageUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(blob);
      });
    }
    const resizedImageUrl = await resizeDataUrlToAspect(imageUrl, aspectRatio);
    updateSlide(index, { imageUrl: resizedImageUrl, prompt: promptTrimmed });
  };

  return (
    <div className="h-screen flex flex-col bg-[#1a1a1a] text-white overflow-hidden">
      <TopNav />
      <div className="flex-1 flex overflow-hidden">
        <LeftSidebar activeId={activeNav} onNavChange={handleNavChange} />
        
        <main className="flex-1 overflow-y-auto">
          {activeNav === "home" && <HomeView onNavigate={handleNavChange} />}
          
          {activeNav === "banners" && (
            <BannersView
              refreshTrigger={bannersRefreshTrigger}
              onSelectBanner={handleSelectBanner}
              onUseAsTemplate={handleUseAsTemplate}
              onSelectAsset={handleSelectAsset}
            />
          )}

          {activeNav === "gallery" && (
            <GalleryView
              onSelectForEdit={handleSelectForEdit}
              onAddToEditor={handleAddToEditor}
              refreshTrigger={bannersRefreshTrigger}
            />
          )}

          {activeNav === "product-banner" && (
            <div className="p-8 max-w-6xl mx-auto">
              <h1 className="text-4xl font-bold mb-2">Banner from product image</h1>
              <p className="text-gray-400 mb-8">Choose a template, add your product image, and describe the banner. After creating, you&apos;ll go to the editor.</p>
              <div className="mb-8">
                <h2 className="text-lg font-semibold text-white mb-3">1. Choose a template</h2>
                <TemplateGallery
                  selectedTemplateId={selectedTemplateId}
                  onSelectTemplate={(templateId, ratio, promptHint) => {
                    setSelectedTemplateId(templateId);
                    setAspectRatio(ratio);
                    setSuggestedPrompt(promptHint);
                  }}
                />
              </div>
              <div className="p-6 bg-gradient-to-br from-[#2a2a2a] to-[#1a1a1a] rounded-xl border border-[#3a3a3a]">
                <h2 className="text-lg font-semibold text-white mb-4">2. Add product image and instructions</h2>
                <p className="text-sm text-gray-400 mb-1">
                  Upload your product image and describe how the banner should look. The template&apos;s suggested style is pre-filled—edit as needed.
                </p>
                <p className="text-xs text-gray-500 mb-4">Creating at <span className="text-gray-400 font-medium">{aspectRatio}</span> aspect ratio</p>
                  <ImageSourcePanel
                    aspectRatio={aspectRatio}
                    onAddSlide={(slide) => {
                      setSlides((prev) => [...prev, slide]);
                      setActiveNav("create");
                      setActiveTab("editor");
                    }}
                    suggestedPrompt={suggestedPrompt}
                    workflow="product"
                    campaignPurposeType={campaignPurposeType}
                    campaignText={campaignPurposeType === "event" ? (selectedEvent?.name ?? productName) : productName}
                  />
              </div>
            </div>
          )}

          {activeNav === "templates" && (
            <div className="p-8 max-w-6xl mx-auto">
              <h1 className="text-4xl font-bold mb-6">Templates</h1>
              <p className="text-gray-400 mb-8">Choose a template to get started with your banner</p>
              <TemplateGallery
                selectedTemplateId={selectedTemplateId}
                onSelectTemplate={(templateId, ratio, promptHint) => {
                  setSelectedTemplateId(templateId);
                  setAspectRatio(ratio);
                  setSuggestedPrompt(promptHint);
                  setActiveNav("create"); // Switch to create tab after selecting template
                }}
              />
            </div>
          )}

          {activeNav === "help" && <HelpView />}

          {activeNav === "create" && (
            <>
            {activeTab === "create" ? (
            <div className="p-8 max-w-6xl mx-auto">
              <h1 className="text-4xl font-bold mb-6">Create something new</h1>

              <OnboardingBanner />

              {/* What do you want to create? */}
              <p className="text-gray-400 mb-1">What do you want to create?</p>
              <p className="text-xs text-gray-500 mb-4">Pick a purpose to get a pre-filled prompt you can edit. Use the Product banner option in the left sidebar to create from a template and your product photo.</p>
              <div className="flex flex-wrap gap-3 mb-8">
                {IMAGE_PURPOSE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      setCreateWorkflow("generate");
                      setSelectedCreatePurpose(opt.value);
                      setSuggestedPrompt(undefined);
                      setSelectedTemplateId(null);
                      setAspectRatio(IMAGE_PURPOSE_ASPECT_RATIO[opt.value] as AspectRatio);
                    }}
                    className={`px-5 py-3 rounded-xl border text-left transition-colors ${
                      createWorkflow === "generate" && selectedCreatePurpose === opt.value
                        ? "bg-[#0066ff]/10 border-[#0066ff] text-white"
                        : "bg-[#2a2a2a] border-[#3a3a3a] text-gray-300 hover:border-[#4a4a4a]"
                    }`}
                  >
                    <span className="font-semibold">{opt.label}</span>
                  </button>
                ))}
              </div>

              <div className="mb-8 p-6 bg-gradient-to-br from-[#2a2a2a] to-[#1a1a1a] rounded-xl border border-[#3a3a3a]">
                  {selectedEvent && (
                    <div className="flex items-center justify-between gap-2 mb-4 p-2 rounded-lg bg-[#0066ff]/10 border border-[#0066ff]/30">
                      <span className="text-sm text-gray-300">Using event: {selectedEvent.name}</span>
                      <button
                        type="button"
                        onClick={() => setSelectedEvent(null)}
                        className="py-1 px-2 rounded text-xs font-medium text-[#0066ff] hover:bg-[#0066ff]/20"
                      >
                        Clear
                      </button>
                    </div>
                  )}
                  <h2 className="text-lg font-semibold text-white mb-4">Generate from prompt</h2>
                  <p className="text-sm text-gray-400 mb-4">Choose a purpose above, edit the prompt below, then click Generate. Or upload an image—you&apos;ll go straight to the Banner Editor to add prompts per slide.</p>
                  <ImageSourcePanel
                    aspectRatio={aspectRatio}
                    onAddSlide={addSlide}
                    suggestedPrompt={suggestedPrompt}
                    workflow="generate"
                    initialImagePurpose={selectedCreatePurpose ?? undefined}
                    selectedEvent={selectedEvent}
                    campaignPurposeType={campaignPurposeType}
                    campaignText={campaignPurposeType === "event" ? (selectedEvent?.name ?? productName) : productName}
                    onSaveBanner={async (bannerSlides, bannerAspectRatio, imagePurpose) => {
                      // Save banner automatically when image is generated
                      try {
                        const { saveBanner, openDB } = await import("@/lib/indexedDB");
                        const useIndexedDB = await openDB().then(() => true).catch(() => false);
                        
                        const newBanner = {
                          id: `banner-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
                          slides: bannerSlides,
                          aspectRatio: bannerAspectRatio,
                          createdAt: new Date().toISOString(),
                          name: `Generated: ${new Date().toLocaleDateString()}`,
                          ...(imagePurpose && { imagePurpose }),
                        };
                        
                        if (useIndexedDB) {
                          await saveBanner(newBanner);
                        } else {
                          const storedBanners = localStorage.getItem("savedBanners");
                          const banners = storedBanners ? JSON.parse(storedBanners) : [];
                          banners.push(newBanner);
                          localStorage.setItem("savedBanners", JSON.stringify(banners));
                        }
                        // Trigger refresh of banners view
                        setBannersRefreshTrigger(prev => prev + 1);
                      } catch (err) {
                        console.warn("Failed to auto-save banner:", err);
                      }
                    }}
                  />
                </div>

              <div className="mb-8 p-6 bg-[#2a2a2a] rounded-xl border border-[#3a3a3a]">
                <h3 className="text-lg font-semibold text-white mb-2">Batch from list</h3>
                <p className="text-sm text-gray-400 mb-3">One prompt per line (max 15). Generates all then opens the editor.</p>
                <textarea
                  value={batchListText}
                  onChange={(e) => setBatchListText(e.target.value)}
                  placeholder="e.g.&#10;Summer sale hero&#10;Product spotlight&#10;Festive banner"
                  rows={4}
                  className="w-full px-4 py-3 bg-[#1a1a1a] border border-[#3a3a3a] rounded-lg text-white placeholder-gray-500 text-sm focus:outline-none focus:border-[#0066ff] resize-y mb-3"
                  disabled={batchGenerating}
                />
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleBatchGenerate}
                    disabled={batchGenerating || !batchListText.trim()}
                    className="px-4 py-2 bg-[#0066ff] text-white rounded-lg text-sm font-medium hover:bg-[#0052cc] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {batchGenerating ? `Generating… ${batchProgress}` : "Generate from list"}
                  </button>
                  <span className="text-xs text-gray-500">Uses current aspect ratio and Settings (purpose, campaign, brand).</span>
                </div>
                {batchError && (
                  <p className="mt-2 text-sm text-red-400" role="alert">{batchError}</p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div className="p-6 bg-[#2a2a2a] rounded-xl border border-[#3a3a3a] hover:border-[#4a4a4a] transition-colors">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-3xl">📅</span>
                    <h3 className="text-xl font-semibold">Celebration Banners</h3>
                  </div>
                  <p className="text-gray-400 text-sm mb-4">
                    Pick a date and region to generate festive banners for holidays and celebrations.
                  </p>
                  <CalendarPanel
                    onAddSlide={addSlide}
                    productName={productName}
                    selectedEvent={selectedEvent}
                    onSelectEvent={setSelectedEvent}
                  />
                </div>

                <div className="p-6 bg-[#2a2a2a] rounded-xl border border-[#3a3a3a] hover:border-[#4a4a4a] transition-colors">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-3xl">⚙️</span>
                    <h3 className="text-xl font-semibold">Settings</h3>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm text-gray-400 mb-2">Purpose for generation</label>
                      <p className="text-xs text-gray-500 mb-2">Passed into every image generation (e.g. season, event, promotion).</p>
                      <div className="flex flex-wrap gap-2">
                        {(
                          [
                            { value: "season" as const, label: "Season" },
                            { value: "event" as const, label: "Event" },
                            { value: "promotion" as const, label: "Promotion" },
                            { value: "general" as const, label: "General" },
                          ] as const
                        ).map(({ value, label }) => (
                          <button
                            key={value}
                            type="button"
                            onClick={() => setCampaignPurposeType(value)}
                            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                              campaignPurposeType === value
                                ? "bg-[#0066ff] text-white"
                                : "bg-[#1a1a1a] border border-[#3a3a3a] text-gray-300 hover:border-[#4a4a4a]"
                            }`}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm text-gray-400 mb-2">Default purpose</label>
                      <select
                        value={selectedCreatePurpose ?? "homepage_banner"}
                        onChange={(e) => {
                          const v = e.target.value as ImagePurpose | "";
                          setSelectedCreatePurpose(v || "homepage_banner");
                          if (v) {
                            setAspectRatio(IMAGE_PURPOSE_ASPECT_RATIO[v] as AspectRatio);
                            setSuggestedPrompt(undefined);
                          }
                        }}
                        className="w-full px-4 py-2 bg-[#1a1a1a] border border-[#3a3a3a] rounded-lg text-white focus:outline-none focus:border-[#0066ff]"
                      >
                        {IMAGE_PURPOSE_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                      <p className="text-xs text-gray-500 mt-1">Pre-fills the prompt when you generate.</p>
                    </div>
                    <div>
                      <label className="block text-sm text-gray-400 mb-2">
                        Campaign / product text
                        {campaignPurposeType !== "general" && (
                          <span className="text-xs text-gray-500 ml-1">
                            (for {campaignPurposeType === "event" ? "Event: use calendar event or type below" : campaignPurposeType})
                          </span>
                        )}
                      </label>
                      <input
                        type="text"
                        value={productName}
                        onChange={(e) => setProductName(e.target.value)}
                        placeholder={campaignPurposeType === "event" ? "e.g. Independence Day" : "e.g. Summer sale 20%"}
                        className="w-full px-4 py-2 bg-[#1a1a1a] border border-[#3a3a3a] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#0066ff]"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-400 mb-2">Aspect ratio</label>
                      <select
                        value={aspectRatio}
                        onChange={(e) => setAspectRatio(e.target.value as AspectRatio)}
                        className="w-full px-4 py-2 bg-[#1a1a1a] border border-[#3a3a3a] rounded-lg text-white focus:outline-none focus:border-[#0066ff]"
                      >
                        {ASPECT_RATIOS.map(({ value, label }) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="pt-2 border-t border-[#3a3a3a]">
                      <label className="block text-sm text-gray-400 mb-2">Brand kit</label>
                      <input
                        type="text"
                        value={brandPromptSuffix}
                        onChange={(e) => {
                          const v = e.target.value;
                          setBrandPromptSuffix(v);
                          setBrandKit({ ...getBrandKit(), brandPromptSuffix: v.trim() || undefined });
                        }}
                        placeholder="e.g. Brand: Acme, blue theme"
                        className="w-full px-4 py-2 bg-[#1a1a1a] border border-[#3a3a3a] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#0066ff]"
                      />
                      <p className="text-xs text-gray-500 mt-1">Appended to every generation prompt.</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={autoplay}
                          onChange={(e) => setAutoplay(e.target.checked)}
                          className="w-4 h-4 rounded border-[#3a3a3a] bg-[#1a1a1a] text-[#0066ff] focus:ring-[#0066ff]"
                        />
                        <span className="text-sm">Autoplay</span>
                      </label>
                      {autoplay && (
                        <label className="flex items-center gap-2">
                          <span className="text-sm text-gray-400">Speed</span>
                          <input
                            type="number"
                            min={2}
                            max={15}
                            value={autoplaySpeed}
                            onChange={(e) => setAutoplaySpeed(Number(e.target.value))}
                            className="w-20 px-2 py-1 bg-[#1a1a1a] border border-[#3a3a3a] rounded text-white text-sm focus:outline-none focus:border-[#0066ff]"
                          />
                        </label>
                      )}
                    </div>
                    <div className="pt-2 border-t border-[#3a3a3a] space-y-2">
                      <button
                        type="button"
                        onClick={() => setActiveNav("banners")}
                        className="w-full px-4 py-2 bg-[#1a1a1a] border border-[#3a3a3a] rounded-lg text-sm text-gray-300 hover:bg-[#3a3a3a] hover:text-white transition-colors"
                      >
                        📁 Open Banners
                      </button>
                      {slides.length > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            setSlides([]);
                            setActiveTab("create");
                          }}
                          className="w-full px-4 py-2 bg-[#1a1a1a] border border-red-500/40 rounded-lg text-sm text-red-400 hover:bg-red-500/10 transition-colors"
                        >
                          Clear current slides
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {slides.length > 0 && (
                <div className="mt-8">
                  <button
                    onClick={() => setActiveTab("editor")}
                    className="px-6 py-3 bg-gradient-to-r from-[#0066ff] to-[#0052cc] text-white rounded-lg font-medium hover:opacity-90 transition-opacity"
                  >
                    View Editor ({slides.length} {slides.length === 1 ? "slide" : "slides"})
                  </button>
                </div>
              )}
            </div>
            ) : (
            <div className="p-8 max-w-7xl mx-auto">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold">Banner Editor</h2>
                  {slides.length > 0 && (
                    <p className="text-sm text-gray-400 mt-1">
                      {slides.length} {slides.length === 1 ? "slide" : "slides"} • All images are saved in Assets
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setActiveTab("create");
                      setCreateWorkflow("generate");
                    }}
                    className="px-4 py-2 bg-gradient-to-r from-[#0066ff] to-[#0052cc] text-white rounded-lg hover:opacity-90 transition-opacity font-medium"
                  >
                    ✨ Add slide from AI
                  </button>
                  <button
                    onClick={() => setActiveTab("create")}
                    className="px-4 py-2 bg-[#2a2a2a] border border-[#3a3a3a] rounded-lg hover:bg-[#3a3a3a] transition-colors"
                  >
                    ← Back to Create
                  </button>
                </div>
              </div>

              {selectedEvent && (
                <div className="flex items-center justify-between gap-2 mb-4 p-2 rounded-lg bg-[#0066ff]/10 border border-[#0066ff]/30">
                  <span className="text-sm text-gray-300">Using event: {selectedEvent.name} — Generate image will include this event in the prompt.</span>
                  <button
                    type="button"
                    onClick={() => setSelectedEvent(null)}
                    className="py-1 px-2 rounded text-xs font-medium text-[#0066ff] hover:bg-[#0066ff]/20"
                  >
                    Clear
                  </button>
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                  <div className="bg-[#2a2a2a] rounded-xl border border-[#3a3a3a] p-6">
                    {slides.length > 0 && (
                      <div className="mb-4 p-3 bg-[#1a1a1a] border border-[#3a3a3a] rounded-lg">
                        <p className="text-sm text-gray-400">
                          💡 <strong>Tip:</strong> Uploaded and generated images both add slides here. All are saved in{" "}
                          <button
                            onClick={() => setActiveNav("banners")}
                            className="text-[#0066ff] hover:underline"
                          >
                            Assets
                          </button>
                          . Use &quot;Add slide from AI&quot; above to generate another image, or go back to Create to upload more.
                        </p>
                      </div>
                    )}
                    <BannerCarousel
                      slides={slides}
                      aspectRatio={aspectRatio}
                      autoplay={autoplay}
                      autoplaySpeed={autoplaySpeed}
                      onRemoveSlide={removeSlide}
                      onReorderSlides={reorderSlides}
                      onUpdateSlide={updateSlide}
                      onRegenerateSlide={handleRegenerateSlide}
                      editable
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <ExportPanel
                    slides={slides}
                    aspectRatio={aspectRatio}
                    autoplay={autoplay}
                    autoplaySpeed={autoplaySpeed}
                    onSaveBanner={() => {
                      // Optionally refresh banners view or show notification
                    }}
                  />
                </div>
              </div>
            </div>
            )}
            </>
          )}
        </main>

        <RightSidebar
          currentSlides={slides}
          onSelectBanner={handleSelectBanner}
          onUseAsTemplate={handleUseAsTemplate}
          bannersRefreshTrigger={bannersRefreshTrigger}
        />
      </div>
    </div>
  );
}
