"use client";

import { useState } from "react";
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
import HelpView from "@/components/HelpView";
import type { Slide, AspectRatio } from "@/types/banner";

const ASPECT_RATIOS: { value: AspectRatio; label: string }[] = [
  { value: "16:9", label: "16:9" },
  { value: "3:1", label: "3:1" },
  { value: "4:1", label: "4:1" },
  { value: "1:1", label: "1:1" },
];

export default function EditorPage() {
  const [activeNav, setActiveNav] = useState<NavItemId>("home");
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>("16:9");
  const [slides, setSlides] = useState<Slide[]>([]);
  const [autoplay, setAutoplay] = useState(true);
  const [autoplaySpeed, setAutoplaySpeed] = useState(5);
  const [productName, setProductName] = useState("");
  const [activeTab, setActiveTab] = useState<"create" | "editor">("create");
  const [suggestedPrompt, setSuggestedPrompt] = useState<string | undefined>(undefined);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [createWorkflow, setCreateWorkflow] = useState<"generate" | "product">("generate");
  const [bannersRefreshTrigger, setBannersRefreshTrigger] = useState(0);

  const addSlide = (slide: Slide) => {
    setSlides((prev) => [...prev, slide]);
    setActiveTab("editor");
    setActiveNav("create"); // Switch to create tab when adding slides
  };

  const handleSelectBanner = (bannerSlides: Slide[], bannerAspectRatio: string) => {
    setSlides(bannerSlides);
    setAspectRatio(bannerAspectRatio as AspectRatio);
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
              onSelectAsset={handleSelectAsset}
            />
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

              {/* Workflow selector */}
              <div className="flex gap-4 mb-8">
                <button
                  type="button"
                  onClick={() => {
                    setCreateWorkflow("generate");
                    setSuggestedPrompt(undefined);
                    setSelectedTemplateId(null);
                  }}
                  className={`flex-1 max-w-xs px-6 py-4 rounded-xl border text-left transition-colors ${
                    createWorkflow === "generate"
                      ? "bg-[#0066ff]/10 border-[#0066ff] text-white"
                      : "bg-[#2a2a2a] border-[#3a3a3a] text-gray-300 hover:border-[#4a4a4a]"
                  }`}
                >
                  <span className="block text-2xl mb-1">✨</span>
                  <span className="font-semibold block">Generate image</span>
                  <span className="text-sm text-gray-400 mt-0.5">
                    Describe what you want and generate a banner image with AI
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setCreateWorkflow("product")}
                  className={`flex-1 max-w-xs px-6 py-4 rounded-xl border text-left transition-colors ${
                    createWorkflow === "product"
                      ? "bg-[#0066ff]/10 border-[#0066ff] text-white"
                      : "bg-[#2a2a2a] border-[#3a3a3a] text-gray-300 hover:border-[#4a4a4a]"
                  }`}
                >
                  <span className="block text-2xl mb-1">🖼️</span>
                  <span className="font-semibold block">Banner from product</span>
                  <span className="text-sm text-gray-400 mt-0.5">
                    Pick a template, add your product image, and describe the banner
                  </span>
                </button>
              </div>

              {createWorkflow === "generate" ? (
                <div className="mb-8 p-6 bg-gradient-to-br from-[#2a2a2a] to-[#1a1a1a] rounded-xl border border-[#3a3a3a]">
                  <h2 className="text-lg font-semibold text-white mb-4">Generate from prompt</h2>
                  <ImageSourcePanel
                    aspectRatio={aspectRatio}
                    onAddSlide={addSlide}
                    suggestedPrompt={suggestedPrompt}
                    workflow="generate"
                    onSaveBanner={async (bannerSlides, bannerAspectRatio) => {
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
              ) : (
                <>
                  <div className="mb-6">
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
                  <div className="mb-8 p-6 bg-gradient-to-br from-[#2a2a2a] to-[#1a1a1a] rounded-xl border border-[#3a3a3a]">
                    <h2 className="text-lg font-semibold text-white mb-4">2. Add product image and instructions</h2>
                    <p className="text-sm text-gray-400 mb-4">
                      Upload your product image and describe how the banner should look. The template&apos;s suggested style is pre-filled—edit as needed.
                    </p>
                    <ImageSourcePanel
                      aspectRatio={aspectRatio}
                      onAddSlide={addSlide}
                      suggestedPrompt={suggestedPrompt}
                      workflow="product"
                    />
                  </div>
                </>
              )}

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
                  />
                </div>

                <div className="p-6 bg-[#2a2a2a] rounded-xl border border-[#3a3a3a] hover:border-[#4a4a4a] transition-colors">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-3xl">⚙️</span>
                    <h3 className="text-xl font-semibold">Settings</h3>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm text-gray-400 mb-2">Product name</label>
                      <input
                        type="text"
                        value={productName}
                        onChange={(e) => setProductName(e.target.value)}
                        placeholder="e.g. Summer Sale"
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
                <button
                  onClick={() => setActiveTab("create")}
                  className="px-4 py-2 bg-[#2a2a2a] border border-[#3a3a3a] rounded-lg hover:bg-[#3a3a3a] transition-colors"
                >
                  ← Back to Create
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                  <div className="bg-[#2a2a2a] rounded-xl border border-[#3a3a3a] p-6">
                    {slides.length > 0 && (
                      <div className="mb-4 p-3 bg-[#1a1a1a] border border-[#3a3a3a] rounded-lg">
                        <p className="text-sm text-gray-400">
                          💡 <strong>Tip:</strong> All images in these slides are saved in{" "}
                          <button
                            onClick={() => setActiveNav("banners")}
                            className="text-[#0066ff] hover:underline"
                          >
                            Assets
                          </button>
                          {". "}
                          {createWorkflow === "generate" && "Generated images are also saved as banners."}
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

        <RightSidebar />
      </div>
    </div>
  );
}
