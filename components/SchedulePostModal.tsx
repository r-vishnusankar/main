"use client";

import { useState, useEffect, useRef } from "react";

// ── Types ──────────────────────────────────────────────────────────────────────

export type ScheduleMode = "use_existing" | "auto_generate";

export interface SchedulePostPayload {
  mode: ScheduleMode;
  platforms: string[];
  scheduledAt: string; // UTC ISO
  // use_existing
  imageUrl?: string;
  socialCaption?: string;
  altText?: string;
  blogDescription?: string;
  // auto_generate
  imagePrompt?: string;
  autoGenerateType?: "image_caption" | "caption_only";
  aspectRatio?: string;
  tone?: string;
}

interface SchedulePostModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSchedule: (payload: SchedulePostPayload) => Promise<void>;
  /** If provided, pre-fills the "Use existing" mode fields */
  existingPost?: {
    imageUrl?: string;
    socialCaption?: string;
    altText?: string;
    blogDescription?: string;
  };
}

// ── Platform config ────────────────────────────────────────────────────────────

const PLATFORM_CONFIG = [
  {
    id: "facebook",
    label: "Facebook",
    icon: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
        <path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.41c0-3.025 1.792-4.697 4.533-4.697 1.312 0 2.686.236 2.686.236v2.97h-1.513c-1.491 0-1.956.93-1.956 1.886v2.267h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z" />
      </svg>
    ),
    color: "text-blue-500",
    bg: "bg-blue-500/10 border-blue-500/40",
    selectedBg: "bg-blue-500/20 border-blue-400",
  },
  {
    id: "instagram",
    label: "Instagram",
    icon: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
      </svg>
    ),
    color: "text-pink-500",
    bg: "bg-pink-500/10 border-pink-500/40",
    selectedBg: "bg-pink-500/20 border-pink-400",
  },
  {
    id: "linkedin",
    label: "LinkedIn",
    icon: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
      </svg>
    ),
    color: "text-sky-500",
    bg: "bg-sky-500/10 border-sky-500/40",
    selectedBg: "bg-sky-500/20 border-sky-400",
  },
  {
    id: "whatsapp",
    label: "WhatsApp",
    icon: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
      </svg>
    ),
    color: "text-green-500",
    bg: "bg-green-500/10 border-green-500/40",
    selectedBg: "bg-green-500/20 border-green-400",
  },
];

const TONE_OPTIONS = [
  { value: "professional", label: "Professional" },
  { value: "casual", label: "Casual" },
  { value: "promotional", label: "Promotional" },
  { value: "inspirational", label: "Inspirational" },
  { value: "informative", label: "Informative" },
];

const ASPECT_OPTIONS = [
  { value: "1:1", label: "1:1 Square" },
  { value: "16:9", label: "16:9 Landscape" },
  { value: "9:16", label: "9:16 Portrait" },
  { value: "4:5", label: "4:5 Feed" },
];

// ── Timezone helper ────────────────────────────────────────────────────────────

const TIMEZONES = [
  { value: "Asia/Kolkata", label: "IST (India)" },
  { value: "America/New_York", label: "EST (New York)" },
  { value: "America/Los_Angeles", label: "PST (Los Angeles)" },
  { value: "Europe/London", label: "GMT (London)" },
  { value: "Europe/Paris", label: "CET (Paris)" },
  { value: "Asia/Dubai", label: "GST (Dubai)" },
  { value: "Asia/Singapore", label: "SGT (Singapore)" },
  { value: "UTC", label: "UTC" },
];

function localToUtcISO(localValue: string, timezone: string): string | null {
  if (!localValue || localValue.length < 16) return null;
  try {
    // Parse as if it's in the given timezone
    const date = new Date(
      new Date(localValue).toLocaleString("en-US", { timeZone: timezone })
    );
    // Compute offset
    const utcDate = new Date(localValue);
    const tzDate = new Date(utcDate.toLocaleString("en-US", { timeZone: timezone }));
    const diff = utcDate.getTime() - tzDate.getTime();
    return new Date(new Date(localValue).getTime() + diff).toISOString();
  } catch {
    return new Date(localValue).toISOString();
  }
}

function formatScheduleSummary(
  localValue: string,
  timezone: string,
  mode: ScheduleMode,
  platforms: string[]
): string {
  if (!localValue) return "";
  try {
    const date = new Date(localValue);
    const formattedDate = date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      timeZone: timezone,
    });
    const formattedTime = date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: timezone,
    });
    const tzLabel = TIMEZONES.find((t) => t.value === timezone)?.label ?? timezone;
    const platformLabels = platforms
      .map((p) => PLATFORM_CONFIG.find((c) => c.id === p)?.label ?? p)
      .join(", ");
    const action = mode === "auto_generate" ? "Auto-generate and publish" : "Publish";
    return `${action} to ${platformLabels || "…"} on ${formattedDate} at ${formattedTime} ${tzLabel}`;
  } catch {
    return "";
  }
}

// ── Modal component ────────────────────────────────────────────────────────────

export default function SchedulePostModal({
  isOpen,
  onClose,
  onSchedule,
  existingPost,
}: SchedulePostModalProps) {
  const [step, setStep] = useState(1);
  const [mode, setMode] = useState<ScheduleMode>(existingPost?.imageUrl ? "use_existing" : "auto_generate");
  const [platforms, setPlatforms] = useState<string[]>(["facebook"]);
  const [scheduledDate, setScheduledDate] = useState("");
  const [timezone, setTimezone] = useState("Asia/Kolkata");
  const [imagePrompt, setImagePrompt] = useState("");
  const [autoGenerateType, setAutoGenerateType] = useState<"image_caption" | "caption_only">("image_caption");
  const [aspectRatio, setAspectRatio] = useState("1:1");
  const [tone, setTone] = useState("professional");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [configuredPlatforms, setConfiguredPlatforms] = useState<Record<string, boolean>>({});
  const overlayRef = useRef<HTMLDivElement>(null);

  // Load platform config status
  useEffect(() => {
    if (!isOpen) return;
    fetch("/api/platforms-status")
      .then((r) => r.json())
      .then((data) => setConfiguredPlatforms(data))
      .catch(() => {});
  }, [isOpen]);

  // Reset on open
  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setMode(existingPost?.imageUrl ? "use_existing" : "auto_generate");
      setPlatforms(["facebook"]);
      setScheduledDate("");
      setTimezone("Asia/Kolkata");
      setImagePrompt("");
      setAutoGenerateType("image_caption");
      setAspectRatio("1:1");
      setTone("professional");
      setError(null);
    }
  }, [isOpen, existingPost?.imageUrl]);

  if (!isOpen) return null;

  const togglePlatform = (id: string) => {
    setPlatforms((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  const canProceedStep1 = mode === "use_existing"
    ? !!existingPost?.imageUrl
    : imagePrompt.trim().length > 0;

  const canProceedStep2 = platforms.length > 0;

  const canConfirm = !!scheduledDate;

  const summary = formatScheduleSummary(scheduledDate, timezone, mode, platforms);

  const handleConfirm = async () => {
    setError(null);
    const scheduledAt = localToUtcISO(scheduledDate, timezone);
    if (!scheduledAt) {
      setError("Please pick a valid date and time.");
      return;
    }
    const now = new Date();
    if (new Date(scheduledAt) <= now) {
      setError("Scheduled time must be in the future.");
      return;
    }
    setSubmitting(true);
    try {
      const payload: SchedulePostPayload = {
        mode,
        platforms,
        scheduledAt,
        ...(mode === "use_existing"
          ? {
              imageUrl: existingPost?.imageUrl,
              socialCaption: existingPost?.socialCaption,
              altText: existingPost?.altText,
              blogDescription: existingPost?.blogDescription,
            }
          : {
              imagePrompt: imagePrompt.trim(),
              autoGenerateType,
              aspectRatio,
              tone,
            }),
      };
      await onSchedule(payload);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Scheduling failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
    >
      <div className="w-full max-w-[520px] bg-[#111] border border-[#2a2a2a] rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#2a2a2a]">
          <div>
            <h2 className="text-lg font-semibold text-white">Schedule Post</h2>
            <p className="text-xs text-gray-400 mt-0.5">Auto-publish at your chosen time</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-white hover:bg-[#2a2a2a] transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Step indicators */}
        <div className="flex items-center gap-0 px-6 pt-4 pb-0">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center flex-1 last:flex-none">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold border transition-colors ${
                  s < step
                    ? "bg-[#0066ff] border-[#0066ff] text-white"
                    : s === step
                    ? "bg-[#0066ff]/20 border-[#0066ff] text-[#0066ff]"
                    : "bg-[#1a1a1a] border-[#3a3a3a] text-gray-500"
                }`}
              >
                {s < step ? (
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  s
                )}
              </div>
              {s < 3 && (
                <div className={`h-px flex-1 mx-2 transition-colors ${s < step ? "bg-[#0066ff]" : "bg-[#2a2a2a]"}`} />
              )}
            </div>
          ))}
        </div>
        <div className="flex px-6 mt-1 mb-0">
          {["Content", "Platforms", "Schedule"].map((label, i) => (
            <div key={label} className={`text-[10px] font-medium transition-colors flex-1 last:flex-none ${step === i + 1 ? "text-[#0066ff]" : i + 1 < step ? "text-gray-400" : "text-gray-600"}`}>
              {label}
            </div>
          ))}
        </div>

        {/* Body */}
        <div className="px-6 py-5 min-h-[260px]">

          {/* ── Step 1: Content mode ── */}
          {step === 1 && (
            <div className="space-y-4">
              <p className="text-sm text-gray-300 font-medium">How should content be created?</p>

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setMode("use_existing")}
                  disabled={!existingPost?.imageUrl}
                  className={`p-4 rounded-xl border text-left transition-all ${
                    mode === "use_existing"
                      ? "bg-[#0066ff]/15 border-[#0066ff] text-white"
                      : existingPost?.imageUrl
                      ? "bg-[#1a1a1a] border-[#2a2a2a] text-gray-300 hover:border-[#3a3a3a]"
                      : "bg-[#111] border-[#1e1e1e] text-gray-600 cursor-not-allowed opacity-50"
                  }`}
                >
                  <div className="text-xl mb-2">📋</div>
                  <div className="text-sm font-medium mb-1">Use this post</div>
                  <div className="text-xs text-gray-400">Publish image and caption already filled in</div>
                  {!existingPost?.imageUrl && (
                    <div className="text-xs text-amber-400 mt-2">No post content yet</div>
                  )}
                </button>

                <button
                  onClick={() => setMode("auto_generate")}
                  className={`p-4 rounded-xl border text-left transition-all ${
                    mode === "auto_generate"
                      ? "bg-[#0066ff]/15 border-[#0066ff] text-white"
                      : "bg-[#1a1a1a] border-[#2a2a2a] text-gray-300 hover:border-[#3a3a3a]"
                  }`}
                >
                  <div className="text-xl mb-2">✨</div>
                  <div className="text-sm font-medium mb-1">Auto-generate</div>
                  <div className="text-xs text-gray-400">AI creates image, caption, and hashtags at scheduled time</div>
                </button>
              </div>

              {mode === "auto_generate" && (
                <div className="space-y-3 pt-1">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1.5">What should be generated?</label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setAutoGenerateType("image_caption")}
                        className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg border text-xs font-medium transition-all ${
                          autoGenerateType === "image_caption"
                            ? "bg-[#0066ff]/20 border-[#0066ff] text-white"
                            : "bg-[#1a1a1a] border-[#2a2a2a] text-gray-400 hover:border-[#3a3a3a]"
                        }`}
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        Image + Text
                      </button>
                      <button
                        type="button"
                        onClick={() => setAutoGenerateType("caption_only")}
                        className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg border text-xs font-medium transition-all ${
                          autoGenerateType === "caption_only"
                            ? "bg-[#0066ff]/20 border-[#0066ff] text-white"
                            : "bg-[#1a1a1a] border-[#2a2a2a] text-gray-400 hover:border-[#3a3a3a]"
                        }`}
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h10" />
                        </svg>
                        Text Only
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs text-gray-400 mb-1.5">
                      {autoGenerateType === "image_caption" ? "Describe the image to generate" : "Topic for AI text generation"}
                    </label>
                    <textarea
                      value={imagePrompt}
                      onChange={(e) => setImagePrompt(e.target.value)}
                      placeholder="Describe the image to generate (e.g. Diwali sale banner with golden lights and festive products)"
                      rows={3}
                      className="w-full px-3 py-2 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg text-white placeholder-gray-600 text-sm focus:outline-none focus:border-[#0066ff] resize-none"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-gray-400 mb-1.5">Aspect ratio</label>
                      <select
                        value={aspectRatio}
                        onChange={(e) => setAspectRatio(e.target.value)}
                        className="w-full px-3 py-2 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg text-white text-sm focus:outline-none focus:border-[#0066ff]"
                      >
                        {ASPECT_OPTIONS.map((o) => (
                          <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1.5">Caption tone</label>
                      <select
                        value={tone}
                        onChange={(e) => setTone(e.target.value)}
                        className="w-full px-3 py-2 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg text-white text-sm focus:outline-none focus:border-[#0066ff]"
                      >
                        {TONE_OPTIONS.map((o) => (
                          <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {mode === "use_existing" && existingPost?.socialCaption && (
                <div className="p-3 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg">
                  <p className="text-xs text-gray-400 mb-1">Caption preview</p>
                  <p className="text-sm text-gray-200 line-clamp-2">{existingPost.socialCaption}</p>
                </div>
              )}
            </div>
          )}

          {/* ── Step 2: Platform selection ── */}
          {step === 2 && (
            <div className="space-y-4">
              <p className="text-sm text-gray-300 font-medium">Select platforms to publish to</p>
              <div className="grid grid-cols-2 gap-3">
                {PLATFORM_CONFIG.map((p) => {
                  const isSelected = platforms.includes(p.id);
                  const isConfigured = configuredPlatforms[p.id] ?? false;
                  return (
                    <button
                      key={p.id}
                      onClick={() => togglePlatform(p.id)}
                      className={`p-4 rounded-xl border text-left transition-all ${
                        isSelected
                          ? p.selectedBg
                          : "bg-[#1a1a1a] border-[#2a2a2a] hover:border-[#3a3a3a]"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className={p.color}>{p.icon}</span>
                        <div className="flex items-center gap-1.5">
                          {isConfigured ? (
                            <span className="flex items-center gap-1 text-xs text-green-400 bg-green-400/10 px-1.5 py-0.5 rounded-full">
                              <span className="w-1.5 h-1.5 bg-green-400 rounded-full" />
                              Ready
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-xs text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded-full">
                              <span className="w-1.5 h-1.5 bg-amber-400 rounded-full" />
                              Setup
                            </span>
                          )}
                          {isSelected && (
                            <div className="w-4 h-4 bg-[#0066ff] rounded-full flex items-center justify-center">
                              <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                              </svg>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="text-sm font-medium text-white">{p.label}</div>
                      {!isConfigured && (
                        <div className="text-xs text-gray-500 mt-0.5">Add env vars to enable</div>
                      )}
                    </button>
                  );
                })}
              </div>
              {platforms.some((p) => !configuredPlatforms[p]) && (
                <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg text-xs text-amber-300">
                  Some selected platforms are not fully configured. They may fail at publish time. Add the required env vars in your Vercel project settings.
                </div>
              )}
            </div>
          )}

          {/* ── Step 3: Date/time picker ── */}
          {step === 3 && (
            <div className="space-y-4">
              <p className="text-sm text-gray-300 font-medium">When should this be published?</p>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-gray-400 mb-1.5">Date and time</label>
                  <input
                    type="datetime-local"
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                    min={new Date(Date.now() + 60_000).toISOString().slice(0, 16)}
                    className="w-full px-3 py-2 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg text-white text-sm focus:outline-none focus:border-[#0066ff] [color-scheme:dark]"
                  />
                </div>

                <div>
                  <label className="block text-xs text-gray-400 mb-1.5">Timezone</label>
                  <select
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                    className="w-full px-3 py-2 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg text-white text-sm focus:outline-none focus:border-[#0066ff]"
                  >
                    {TIMEZONES.map((tz) => (
                      <option key={tz.value} value={tz.value}>{tz.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {summary && (
                <div className="p-3 bg-[#0066ff]/10 border border-[#0066ff]/30 rounded-lg">
                  <p className="text-xs text-[#0066ff] font-medium mb-0.5">Confirmation</p>
                  <p className="text-sm text-gray-200">{summary}</p>
                </div>
              )}

              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-sm text-red-400">
                  {error}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-[#2a2a2a] bg-[#0d0d0d]">
          <button
            onClick={step === 1 ? onClose : () => setStep((s) => s - 1)}
            className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
          >
            {step === 1 ? "Cancel" : "Back"}
          </button>
          {step < 3 ? (
            <button
              onClick={() => setStep((s) => s + 1)}
              disabled={step === 1 ? !canProceedStep1 : !canProceedStep2}
              className="px-5 py-2 bg-[#0066ff] hover:bg-[#0052cc] disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors"
            >
              Next
            </button>
          ) : (
            <button
              onClick={handleConfirm}
              disabled={!canConfirm || submitting}
              className="px-5 py-2 bg-gradient-to-r from-[#0066ff] to-[#0052cc] hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg text-sm font-semibold transition-opacity flex items-center gap-2"
            >
              {submitting ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Scheduling…
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Schedule Post
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
