"use client";

import { useState, useEffect } from "react";
import type { AspectRatio } from "@/types/banner";
import {
  TEMPLATE_CATEGORIES,
  type TemplateItem,
  type TemplateCategory,
} from "@/data/templates";

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

export default function TemplateGallery({ onSelectTemplate, selectedTemplateId = null }: TemplateGalleryProps) {
  const [customTemplates, setCustomTemplates] = useState<CustomTemplate[]>([]);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    setCustomTemplates(loadCustomTemplates());
  }, []);

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
            onClick={() => setShowModal(true)}
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
            onClick={() => setShowModal(true)}
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
                onSelect={() => onSelectTemplate(template.id, template.aspectRatio, template.promptHint)}
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
                onSelect={() => onSelectTemplate(template.id, template.aspectRatio, template.promptHint)}
              />
            ))}
          </div>
        </section>
      ))}

      {showModal && (
        <CreateTemplateModal
          onClose={() => setShowModal(false)}
          onSave={handleSaveCustom}
        />
      )}
    </div>
  );
}
