"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import type { Slide, AspectRatio, TextLayer } from "@/types/banner";
import { IMAGE_PURPOSE_OPTIONS, IMAGE_PURPOSE_PROMPTS, IMAGE_PURPOSE_ASPECT_RATIO, type ImagePurpose } from "@/lib/imagePurpose";

const RATIO_MAP: Record<AspectRatio, number> = {
  "16:9": 16 / 9,
  "3:1": 3,
  "4:1": 4,
  "1:1": 1,
};

/* ── Text overlay constants ─────────────────────────── */
const FONTS = [
  { label: "Sans", value: "system-ui, sans-serif" },
  { label: "Serif", value: "Georgia, serif" },
  { label: "Impact", value: "Impact, Arial Black, sans-serif" },
  { label: "Mono", value: "'Courier New', monospace" },
  { label: "Cursive", value: "cursive" },
];

const FONT_SIZES = [3, 4, 5, 6, 8, 10, 14]; // as % of image height
const TEXT_COLORS = ["#ffffff", "#000000", "#FFD700", "#FF6B35", "#FF3B30", "#34C759", "#007AFF", "#C084FC"];

function makeTextLayer(x: number, y: number): TextLayer {
  return {
    id: `tl-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    x, y,
    text: "Your text",
    fontFamily: "system-ui, sans-serif",
    fontSize: 6,
    color: "#ffffff",
    bold: false,
    align: "left",
    shadow: true,
  };
}

interface BannerCarouselProps {
  slides: Slide[];
  aspectRatio: AspectRatio;
  autoplay?: boolean;
  autoplaySpeed?: number;
  editable?: boolean;
  onRemoveSlide?: (index: number) => void;
  onReorderSlides?: (fromIndex: number, toIndex: number) => void;
  onUpdateSlide?: (index: number, updates: Partial<Slide>) => void;
  /** Called when user clicks "Generate image" for a slide; parent should call API, resize to aspectRatio, then update slide. */
  onRegenerateSlide?: (index: number, prompt: string, aspectRatio: AspectRatio) => Promise<void>;
}

export default function BannerCarousel({
  slides,
  aspectRatio,
  autoplay = true,
  autoplaySpeed = 5,
  editable = false,
  onRemoveSlide,
  onReorderSlides,
  onUpdateSlide,
  onRegenerateSlide,
}: BannerCarouselProps) {
  const [current, setCurrent] = useState(0);
  const [regeneratingIndex, setRegeneratingIndex] = useState<number | null>(null);
  const [regenerateError, setRegenerateError] = useState<string | null>(null);
  const ratio = RATIO_MAP[aspectRatio];

  /* Text overlay state */
  const [textMode, setTextMode] = useState(false);
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const imageContainerRef = useRef<HTMLDivElement>(null);

  /* Stable refs so drag handlers never capture stale closures */
  const currentRef = useRef(current);
  const slidesRef = useRef(slides);
  const onUpdateSlideRef = useRef(onUpdateSlide);
  useEffect(() => { currentRef.current = current; }, [current]);
  useEffect(() => { slidesRef.current = slides; }, [slides]);
  useEffect(() => { onUpdateSlideRef.current = onUpdateSlide; }, [onUpdateSlide]);

  /* Tracks whether the pointer actually moved during a drag (vs a plain click) */
  const didDragRef = useRef(false);

  /* Drag refs — no state for internal tracking, only one state for rendering */
  const dragRef = useRef<{
    layerId: string;
    startMouseX: number;
    startMouseY: number;
    startLayerX: number;
    startLayerY: number;
  } | null>(null);
  // Parallel ref stores live coords so onMouseUp can read without async issues
  const dragLivePosRef = useRef<{ id: string; x: number; y: number } | null>(null);
  const [dragLivePos, setDragLivePos] = useState<{ id: string; x: number; y: number } | null>(null);

  const currentTextLayers: TextLayer[] = slides[current]?.textLayers ?? [];

  /* Window-level drag handlers — registered once, read fresh values via refs */
  useEffect(() => {
    function onMouseMove(e: MouseEvent) {
      if (!dragRef.current || !imageContainerRef.current) return;
      const rect = imageContainerRef.current.getBoundingClientRect();
      const dx = ((e.clientX - dragRef.current.startMouseX) / rect.width) * 100;
      const dy = ((e.clientY - dragRef.current.startMouseY) / rect.height) * 100;
      const newX = Math.max(1, Math.min(99, dragRef.current.startLayerX + dx));
      const newY = Math.max(1, Math.min(99, dragRef.current.startLayerY + dy));
      const pos = { id: dragRef.current.layerId, x: newX, y: newY };
      dragLivePosRef.current = pos;       // reliable — no async
      didDragRef.current = true;          // mark that real movement happened
      setDragLivePos({ ...pos });         // triggers re-render for visual feedback
    }

    function onMouseUp() {
      // Capture everything we need BEFORE touching any refs
      const drag = dragRef.current;
      const finalPos = dragLivePosRef.current;

      // Clear refs first so no other handler can race
      dragRef.current = null;
      dragLivePosRef.current = null;
      setDragLivePos(null);

      if (!drag || !finalPos) return;

      const updater = onUpdateSlideRef.current;
      const idx = currentRef.current;
      const currentSlides = slidesRef.current;
      if (!updater || !currentSlides[idx]) return;

      updater(idx, {
        textLayers: (currentSlides[idx].textLayers ?? []).map((l) =>
          l.id === drag.layerId ? { ...l, x: finalPos.x, y: finalPos.y } : l
        ),
      });
      setIsDirty(true);
    }

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, []); // intentionally empty — all live values accessed via refs

  function startDrag(e: React.MouseEvent, layer: TextLayer) {
    if (!editable || textMode) return;
    e.stopPropagation();
    e.preventDefault();
    didDragRef.current = false;  // reset — will be set true only if mouse actually moves
    dragRef.current = {
      layerId: layer.id,
      startMouseX: e.clientX,
      startMouseY: e.clientY,
      startLayerX: layer.x,
      startLayerY: layer.y,
    };
    setSelectedLayerId(layer.id);
  }

  function addTextLayer(e: React.MouseEvent<HTMLDivElement>) {
    if (!textMode || !editable || !onUpdateSlide) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    const layer = makeTextLayer(x, y);
    const updated = [...currentTextLayers, layer];
    onUpdateSlide(current, { textLayers: updated });
    setSelectedLayerId(layer.id);
    setTextMode(false);
    setIsDirty(true);
  }

  function updateLayer(id: string, patch: Partial<TextLayer>) {
    if (!onUpdateSlide) return;
    const updated = currentTextLayers.map((l) => l.id === id ? { ...l, ...patch } : l);
    onUpdateSlide(current, { textLayers: updated });
    setIsDirty(true);
  }

  function deleteLayer(id: string) {
    if (!onUpdateSlide) return;
    onUpdateSlide(current, { textLayers: currentTextLayers.filter((l) => l.id !== id) });
    setSelectedLayerId(null);
    setIsDirty(true);
  }

  function handleSave() {
    setIsDirty(false);
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 2000);
  }

  const goTo = useCallback(
    (index: number) => {
      if (slides.length === 0) return;
      setCurrent((index + slides.length) % slides.length);
    },
    [slides.length]
  );

  useEffect(() => {
    if (!autoplay || slides.length <= 1) return;
    const t = setInterval(() => goTo(current + 1), autoplaySpeed * 1000);
    return () => clearInterval(t);
  }, [autoplay, autoplaySpeed, slides.length, current, goTo]);

  useEffect(() => setRegenerateError(null), [current]);

  // Cap preview height at ~52vh while preserving aspect ratio.
  // width = min(100%, ratio × 52vh) ensures the image never needs vertical scrolling.
  const previewStyle: React.CSSProperties = {
    aspectRatio: ratio,
    width: `min(100%, calc(${ratio} * 52vh))`,
  };

  if (slides.length === 0) {
    return (
      <div className="flex justify-center">
        <div
          className="rounded-xl border-2 border-dashed border-[#3a3a3a] flex items-center justify-center text-gray-500"
          style={previewStyle}
        >
          <span className="text-sm text-center px-4">No slides yet. Upload or generate an image to add one.</span>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Text mode toolbar — shown above image when editable */}
      {editable && (
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          <button
            type="button"
            onClick={() => { setTextMode((t) => !t); setSelectedLayerId(null); }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
              textMode
                ? "bg-[var(--accent)] border-[var(--accent)] text-white"
                : "bg-white/[0.06] border-white/[0.12] text-gray-300 hover:text-white hover:border-white/20"
            }`}
            title="Click a position on the image to place text"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.5 3.5a2.121 2.121 0 013 3L12 13l-4 1 1-4 6.5-6.5z" />
            </svg>
            {textMode ? "Click image to place…" : "Add Text"}
          </button>

          {currentTextLayers.length > 0 && !textMode && (
            <span className="text-xs text-gray-500">
              {currentTextLayers.length} layer{currentTextLayers.length !== 1 ? "s" : ""} · drag to reposition
            </span>
          )}

          {/* Save button — only shown when something changed */}
          {isDirty && (
            <button
              type="button"
              onClick={handleSave}
              className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-500 hover:bg-emerald-400 text-white border border-emerald-400 transition-all"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
              Save changes
            </button>
          )}
          {savedFlash && !isDirty && (
            <span className="ml-auto text-xs text-emerald-400 flex items-center gap-1">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
              Saved
            </span>
          )}
        </div>
      )}

      <div
        ref={imageContainerRef}
        className={`relative mx-auto overflow-hidden rounded-xl bg-[#1a1a1a] ${textMode ? "cursor-crosshair ring-2 ring-[var(--accent)]" : ""}`}
        style={previewStyle}
        onClick={(e) => {
          if (textMode) {
            addTextLayer(e);
          } else if (selectedLayerId && e.target === e.currentTarget) {
            // Clicking the image background (not a text layer) deselects
            setSelectedLayerId(null);
          }
        }}
      >
        {slides.map((slide, index) => (
          <div
            key={slide.id}
            className="absolute inset-0 transition-opacity duration-300"
            style={{
              opacity: index === current ? 1 : 0,
              zIndex: index === current ? 1 : 0,
            }}
          >
            <img
              src={slide.imageUrl}
              alt={slide.caption || slide.productName || `Slide ${index + 1}`}
              className="w-full h-full object-cover"
            />
            {(slide.productName || slide.caption) && (
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-3 text-white text-sm">
                {slide.productName && (
                  <a href={slide.productLink} target="_blank" rel="noopener noreferrer" className="font-medium hover:underline">
                    {slide.productName}
                  </a>
                )}
                {slide.caption && <p className="mt-0.5">{slide.caption}</p>}
              </div>
            )}

            {/* Render text layers for this slide */}
            {(slide.textLayers ?? []).map((layer) => {
              const isLiveDrag = dragLivePos?.id === layer.id;
              const posX = isLiveDrag ? dragLivePos!.x : layer.x;
              const posY = isLiveDrag ? dragLivePos!.y : layer.y;
              const isSelected = editable && layer.id === selectedLayerId;
              return (
                <div
                  key={layer.id}
                  className="absolute"
                  style={{
                    left: `${posX}%`,
                    top: `${posY}%`,
                    zIndex: 10,
                    transform: "translate(0%, -50%)",
                    cursor: editable ? (dragRef.current?.layerId === layer.id ? "grabbing" : "grab") : "default",
                  }}
                  onMouseDown={(e) => {
                    if (!editable || textMode) return;
                    e.stopPropagation();
                    startDrag(e, layer);
                  }}
                  onClick={(e) => {
                    if (!editable) return;
                    e.stopPropagation();
                    // If the pointer moved (it was a drag), skip the click logic —
                    // selectedLayerId was already set in startDrag so the editor stays open
                    if (didDragRef.current) {
                      didDragRef.current = false;
                      return;
                    }
                    // Plain click → always select this layer (never toggle off on click)
                    setSelectedLayerId(layer.id);
                    setTextMode(false);
                  }}
                >
                  <span
                    style={{
                      fontFamily: layer.fontFamily,
                      fontSize: `${layer.fontSize * 0.3}rem`,
                      color: layer.color,
                      fontWeight: layer.bold ? "bold" : "normal",
                      textAlign: layer.align,
                      textShadow: layer.shadow ? "0 1px 4px rgba(0,0,0,0.8), 0 0 8px rgba(0,0,0,0.5)" : "none",
                      display: "block",
                      whiteSpace: "pre-wrap",
                      lineHeight: 1.2,
                      outline: isSelected ? "2px solid #0066ff" : "2px dashed transparent",
                      outlineOffset: "3px",
                      borderRadius: "2px",
                      padding: "2px 4px",
                      userSelect: "none",
                      transition: isLiveDrag ? "none" : "outline 0.15s",
                    }}
                  >
                    {layer.text}
                  </span>
                  {/* Drag handle indicator when selected */}
                  {isSelected && (
                    <span className="absolute -top-4 left-0 text-[9px] text-[#0066ff] bg-[#0066ff]/10 px-1 rounded whitespace-nowrap select-none pointer-events-none">
                      ↕↔ drag · click to edit
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Text layer editor panel — appears when a layer is selected */}
      {editable && selectedLayerId && (() => {
        const layer = currentTextLayers.find((l) => l.id === selectedLayerId);
        if (!layer) return null;
        return (
          <div className="mt-3 p-3 rounded-xl border border-[var(--accent)]/40 bg-[var(--accent)]/[0.06] space-y-2.5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-300 uppercase tracking-wider">Text Layer</span>
              <button type="button" onClick={() => deleteLayer(layer.id)}
                className="text-xs text-red-400 hover:text-red-300 px-2 py-1 rounded hover:bg-red-500/10 transition-colors"
              >✕ Delete</button>
            </div>

            {/* Text input */}
            <textarea
              value={layer.text}
              onChange={(e) => updateLayer(layer.id, { text: e.target.value })}
              rows={2}
              className="w-full text-sm rounded-lg border border-white/[0.12] bg-[#1a1a1a] text-white px-3 py-1.5 focus:outline-none focus:border-[var(--accent)] resize-none"
              placeholder="Type your text…"
            />

            <div className="grid grid-cols-2 gap-2">
              {/* Font family */}
              <div>
                <label className="block text-[11px] text-gray-500 mb-1">Font</label>
                <select
                  value={layer.fontFamily}
                  onChange={(e) => updateLayer(layer.id, { fontFamily: e.target.value })}
                  className="w-full text-xs rounded-lg border border-white/[0.12] bg-[#1a1a1a] text-white px-2 py-1.5 focus:outline-none focus:border-[var(--accent)]"
                >
                  {FONTS.map((f) => (
                    <option key={f.value} value={f.value} style={{ fontFamily: f.value }}>{f.label}</option>
                  ))}
                </select>
              </div>
              {/* Font size */}
              <div>
                <label className="block text-[11px] text-gray-500 mb-1">Size</label>
                <select
                  value={layer.fontSize}
                  onChange={(e) => updateLayer(layer.id, { fontSize: Number(e.target.value) })}
                  className="w-full text-xs rounded-lg border border-white/[0.12] bg-[#1a1a1a] text-white px-2 py-1.5 focus:outline-none focus:border-[var(--accent)]"
                >
                  {FONT_SIZES.map((s) => (
                    <option key={s} value={s}>{s === 3 ? "XS" : s === 4 ? "S" : s === 5 ? "M" : s === 6 ? "L" : s === 8 ? "XL" : s === 10 ? "2XL" : "3XL"}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Color swatches */}
            <div>
              <label className="block text-[11px] text-gray-500 mb-1.5">Color</label>
              <div className="flex items-center gap-1.5 flex-wrap">
                {TEXT_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => updateLayer(layer.id, { color: c })}
                    className="w-6 h-6 rounded-full border-2 transition-transform hover:scale-110 flex-shrink-0"
                    style={{
                      background: c,
                      borderColor: layer.color === c ? "white" : "transparent",
                      boxShadow: layer.color === c ? "0 0 0 1px #555" : "none",
                    }}
                    title={c}
                  />
                ))}
                {/* Custom color */}
                <input
                  type="color"
                  value={layer.color}
                  onChange={(e) => updateLayer(layer.id, { color: e.target.value })}
                  className="w-6 h-6 rounded-full border border-white/20 cursor-pointer bg-transparent"
                  title="Custom color"
                />
              </div>
            </div>

            {/* Style toggles */}
            <div className="flex items-center gap-2">
              <button type="button"
                onClick={() => updateLayer(layer.id, { bold: !layer.bold })}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-colors ${layer.bold ? "bg-[var(--accent)] border-[var(--accent)] text-white" : "border-white/[0.12] text-gray-400 hover:text-white"}`}
              >B</button>
              <button type="button"
                onClick={() => updateLayer(layer.id, { shadow: !layer.shadow })}
                className={`px-2.5 py-1 rounded-lg text-xs border transition-colors ${layer.shadow ? "bg-white/10 border-white/20 text-white" : "border-white/[0.12] text-gray-400 hover:text-white"}`}
              >Shadow</button>
              {(["left", "center", "right"] as const).map((a) => (
                <button key={a} type="button"
                  onClick={() => updateLayer(layer.id, { align: a })}
                  className={`px-2 py-1 rounded-lg text-xs border transition-colors ${layer.align === a ? "bg-white/10 border-white/20 text-white" : "border-white/[0.12] text-gray-400 hover:text-white"}`}
                >
                  {a === "left" ? "⬅" : a === "center" ? "≡" : "➡"}
                </button>
              ))}
              <button type="button" onClick={() => setSelectedLayerId(null)}
                className="ml-auto text-xs text-gray-500 hover:text-white px-2 py-1 rounded border border-white/[0.08] hover:border-white/20"
              >Done</button>
            </div>
          </div>
        );
      })()}

      <div className="flex items-center justify-between mt-3">
        <div className="flex items-center gap-1.5">
          {slides.map((_, index) => (
            <button
              key={index}
              type="button"
              aria-label={`Go to slide ${index + 1}`}
              onClick={() => goTo(index)}
              className={`w-2 h-2 rounded-full transition-colors ${
                index === current
                  ? "bg-[#0066ff]"
                  : "bg-[#3a3a3a] hover:bg-[#4a4a4a]"
              }`}
            />
          ))}
        </div>
        {slides.length > 1 && (
          <>
            <button
              type="button"
              aria-label="Previous slide"
              onClick={() => goTo(current - 1)}
              className="p-2 rounded-lg hover:bg-[#2a2a2a] text-gray-300 hover:text-white transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              type="button"
              aria-label="Next slide"
              onClick={() => goTo(current + 1)}
              className="p-2 rounded-lg hover:bg-[#2a2a2a] text-gray-300 hover:text-white transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </>
        )}
      </div>

      {editable && onRemoveSlide && onReorderSlides && onUpdateSlide && (
        <div className="mt-4 space-y-3">
          {slides.map((slide, index) => (
            <div
              key={slide.id}
              className="flex items-center gap-3 p-3 rounded-lg border border-[#3a3a3a] bg-[#2a2a2a]"
            >
              <img
                src={slide.imageUrl}
                alt=""
                className="w-16 h-16 object-cover rounded-lg flex-shrink-0"
              />
              <div className="flex-1 min-w-0 space-y-2">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Predefined prompt (editable)</label>
                  <select
                    className="w-full text-sm rounded-lg border border-[#3a3a3a] bg-[#1a1a1a] text-white px-3 py-1.5 focus:outline-none focus:border-[#0066ff] mb-1"
                    value={slide.prompt ? (IMAGE_PURPOSE_OPTIONS.find((o) => IMAGE_PURPOSE_PROMPTS[o.value] === slide.prompt)?.value ?? "") : ""}
                    onChange={(e) => {
                      const v = e.target.value as ImagePurpose | "";
                      if (v) onUpdateSlide(index, { prompt: IMAGE_PURPOSE_PROMPTS[v] });
                    }}
                  >
                    <option value="">Choose a preset…</option>
                    {IMAGE_PURPOSE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label} ({IMAGE_PURPOSE_ASPECT_RATIO[opt.value]})
                      </option>
                    ))}
                  </select>
                  <textarea
                    placeholder="Or type your own prompt for this slide…"
                    value={slide.prompt ?? ""}
                    onChange={(e) => onUpdateSlide(index, { prompt: e.target.value })}
                    rows={2}
                    className="w-full text-sm rounded-lg border border-[#3a3a3a] bg-[#1a1a1a] text-white placeholder-gray-500 px-3 py-1.5 focus:outline-none focus:border-[#0066ff] resize-y min-h-[60px]"
                  />
                </div>
                {onRegenerateSlide && (
                  <div>
                    <p className="text-xs text-gray-500 mb-1.5">Image is generated from the prompt above (and from this slide&apos;s image as reference when present), then resized to <strong className="text-gray-400">{aspectRatio}</strong>.</p>
                    {regenerateError && current === index && (
                      <p className="text-sm text-amber-400 mb-2 rounded-lg bg-amber-500/10 px-2 py-1.5 border border-amber-500/30">{regenerateError}</p>
                    )}
                    <button
                    type="button"
                    onClick={async () => {
                      const promptToUse = (slide.prompt ?? "").trim() || IMAGE_PURPOSE_PROMPTS.homepage_banner;
                      setRegeneratingIndex(index);
                      setRegenerateError(null);
                      try {
                        await onRegenerateSlide(index, promptToUse, aspectRatio);
                      } catch (err) {
                        setRegenerateError(err instanceof Error ? err.message : "Generation failed. Try a simpler prompt or different image.");
                      } finally {
                        setRegeneratingIndex(null);
                      }
                    }}
                    disabled={regeneratingIndex !== null}
                    className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-[#0066ff] to-[#0052cc] text-white text-sm font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity flex items-center gap-2"
                  >
                    <span>{regeneratingIndex === index ? "⏳" : "✨"}</span>
                    <span>{regeneratingIndex === index ? "Generating…" : "Generate image"}</span>
                  </button>
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-1">
                {index > 0 && (
                  <button
                    type="button"
                    onClick={() => onReorderSlides(index, index - 1)}
                    className="p-2 rounded-lg hover:bg-[#3a3a3a] text-gray-400 hover:text-white transition-colors"
                    title="Move left"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                )}
                {index < slides.length - 1 && (
                  <button
                    type="button"
                    onClick={() => onReorderSlides(index, index + 1)}
                    className="p-2 rounded-lg hover:bg-[#3a3a3a] text-gray-400 hover:text-white transition-colors"
                    title="Move right"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => onRemoveSlide(index)}
                  className="p-2 rounded-lg hover:bg-red-500/20 text-red-400 hover:text-red-300 transition-colors"
                  title="Remove slide"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
