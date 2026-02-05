"use client";

import type { AspectRatio } from "@/types/banner";
import {
  TEMPLATE_CATEGORIES,
  type TemplateItem,
  type TemplateCategory,
} from "@/data/templates";

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
          <svg
            className={`${size} ${gradientClass}`}
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
          </svg>
          <span className="text-[#666] text-xs font-bold">&gt;</span>
        </div>
      );
    case "feed":
      return (
        <div className="flex flex-col items-center gap-1">
          <div
            className={`${size} rounded-t-full ${gradientClass}`}
            style={{ clipPath: "ellipse(45% 40% at 50% 50%)" }}
          />
          <div className={`h-1.5 w-14 rounded-full ${gradientClass}`} />
        </div>
      );
    case "landscape":
      return (
        <div
          className={`h-8 w-14 rounded ${gradientClass}`}
        />
      );
    case "portrait":
      return (
        <svg
          className={`${size} ${gradientClass}`}
          viewBox="0 0 24 24"
          fill="currentColor"
        >
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
          <div
            className={`h-6 w-full rounded-t-full ${gradientClass}`}
          />
          <div className="h-0.5 w-12 bg-[#444] rounded mt-1" />
          <div className="h-0.5 w-10 bg-[#444] rounded mt-0.5" />
        </div>
      );
    case "banner":
      return (
        <div className="flex flex-col w-full gap-1">
          <div
            className={`h-5 w-full rounded-l ${gradientClass}`}
            style={{ borderTopRightRadius: "9999px", borderBottomRightRadius: "9999px" }}
          />
          <div className="flex gap-1 mt-0.5">
            <div className="h-2 w-2 rounded-full bg-[#444]" />
            <div className="h-0.5 flex-1 bg-[#444] rounded self-center" />
          </div>
        </div>
      );
    case "star":
      return (
        <div className="flex flex-col items-center gap-1">
          <svg
            className={`${size} ${gradientClass}`}
            viewBox="0 0 24 24"
            fill="currentColor"
          >
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
          <svg
            className={`${size} ${gradientClass}`}
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
          </svg>
          <div className="h-0.5 w-8 bg-[#444] rounded" />
        </div>
      );
    case "browser":
    default:
      return (
        <div className="flex items-start gap-2 w-full">
          <svg
            className={`w-8 h-8 shrink-0 ${gradientClass}`}
            viewBox="0 0 24 24"
            fill="currentColor"
          >
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
}: {
  template: TemplateItem;
  isPhoneFrame: boolean;
  isSelected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onSelect();
      }}
      onPointerDown={(e) => e.stopPropagation()}
      className={`flex-shrink-0 w-[140px] text-left group rounded-lg cursor-pointer select-none relative z-10 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0066ff] focus-visible:ring-offset-2 focus-visible:ring-offset-[#1a1a1a] ${
        isSelected ? "ring-2 ring-[#0066ff] ring-offset-2 ring-offset-[#1a1a1a]" : ""
      }`}
    >
      <div className={`rounded-lg bg-[#2a2a2a] overflow-hidden shadow-sm transition-all border ${
        isSelected ? "border-[#0066ff]" : "border-[#3a3a3a] group-hover:border-[#4a4a4a]"
      }`}>
        <div className="p-2 bg-[#333]">
          {isPhoneFrame ? (
            <div className="mx-auto w-20 h-36 rounded-lg bg-black overflow-hidden border border-[#444]">
              <div className="h-5 flex items-center justify-between px-1.5 border-b border-[#333]">
                <div className="w-2 h-2 rounded-full bg-[#555]" />
                <div className="h-1 w-8 bg-[#444] rounded" />
              </div>
              <div className="h-[7.5rem] flex items-center justify-center bg-black p-1">
                <TemplateIcon icon={template.icon} gradient={template.gradient} />
              </div>
              {template.icon === "carousel" && (
                <div className="flex justify-center gap-0.5 py-0.5">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div
                      key={i}
                      className={`w-1 h-1 rounded-full ${i === 1 ? "bg-[#666]" : "bg-[#444]"}`}
                    />
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="mx-auto w-24 h-28 rounded border border-[#444] bg-[#1a1a1a] overflow-hidden">
              <div className="h-5 bg-[#2a2a2a] flex items-center gap-1 px-1.5 border-b border-[#333]">
                <div className="w-1.5 h-1.5 rounded-full bg-[#555]" />
                <div className="w-1.5 h-1.5 rounded-full bg-[#555]" />
                <div className="w-1.5 h-1.5 rounded-full bg-[#555]" />
              </div>
              <div className="p-1.5 h-[5.5rem] flex items-center justify-center">
                <TemplateIcon icon={template.icon} gradient={template.gradient} />
              </div>
            </div>
          )}
        </div>
      </div>
      <div className="mt-2 px-0.5">
        <p className="text-sm text-gray-300 group-hover:text-white transition-colors truncate">
          {template.name}
        </p>
        <div className="mt-1 inline-flex items-center px-2 py-0.5 rounded-md bg-[#3a3a3a] border border-[#4a4a4a]">
          <span className="text-xs text-gray-400 font-mono">{template.aspectRatio}</span>
        </div>
      </div>
    </button>
  );
}

export default function TemplateGallery({ onSelectTemplate, selectedTemplateId = null }: TemplateGalleryProps) {
  return (
    <div className="space-y-6 mb-8">
      {TEMPLATE_CATEGORIES.map((category: TemplateCategory) => (
        <section key={category.id}>
          <h2 className="text-lg font-semibold text-white mb-3">
            {category.title}
          </h2>
          <div className="flex gap-4 overflow-x-auto pb-2 overflow-y-visible">
            {category.templates.map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
                isPhoneFrame={category.id === "instagram"}
                isSelected={selectedTemplateId === template.id}
                onSelect={() =>
                  onSelectTemplate(template.id, template.aspectRatio, template.promptHint)
                }
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
