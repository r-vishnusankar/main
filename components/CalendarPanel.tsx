"use client";

import { useState, useEffect } from "react";
import {
  getCelebrationsForDate,
  getCelebrationsForMonth,
  getUpcomingCelebrations,
  getRegionFromLocale,
  REGIONS,
  UPCOMING_DAYS,
  type RegionCode,
  type Celebration,
} from "@/lib/calendar";
import { saveAsset, openDB } from "@/lib/indexedDB";
import { buildTextToImagePrompt } from "@/lib/imagePrompt";
import type { Slide } from "@/types/banner";

function generateId(): string {
  return `slide-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

interface CalendarPanelProps {
  onAddSlide: (slide: Slide) => void;
  productName: string;
  selectedEvent: Celebration | null;
  onSelectEvent: (event: Celebration | null) => void;
  /** Live brand kit suffix from parent state so it's always up-to-date */
  brandPromptSuffix?: string;
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/* ── Small success toast ── */
function SuccessToast({ name, onClose }: { name: string; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 4000);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[200] flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-2xl border border-white/10 bg-[#1a2a1a]/95 backdrop-blur-xl animate-in slide-in-from-bottom-4 fade-in duration-300"
      role="status"
    >
      {/* Checkmark circle */}
      <span className="flex-shrink-0 w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
        <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
        </svg>
      </span>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-white">Image created!</p>
        <p className="text-xs text-gray-400 truncate max-w-[220px]">{name} banner saved to Gallery</p>
      </div>
      <button
        type="button"
        onClick={onClose}
        className="flex-shrink-0 ml-1 p-1 rounded-lg hover:bg-white/10 text-gray-500 hover:text-white transition-colors"
        aria-label="Dismiss"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

export default function CalendarPanel({
  onAddSlide,
  productName,
  selectedEvent,
  onSelectEvent,
  brandPromptSuffix = "",
}: CalendarPanelProps) {
  const [region, setRegion] = useState<RegionCode>("in");
  const [year, setYear] = useState(() => new Date().getFullYear());
  const [month, setMonth] = useState(() => new Date().getMonth());
  const [selectedDate, setSelectedDate] = useState<{ month: number; day: number } | null>(null);
  const [celebrations, setCelebrations] = useState<Celebration[]>([]);
  const [upcoming, setUpcoming] = useState<Celebration[]>([]);
  const [generating, setGenerating] = useState(false);
  const [generatingFor, setGeneratingFor] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successName, setSuccessName] = useState<string | null>(null);

  useEffect(() => {
    try {
      const code = getRegionFromLocale(
        typeof navigator !== "undefined" ? navigator.language : "en-IN"
      );
      setRegion(code);
    } catch {
      setRegion("in");
    }
  }, []);

  useEffect(() => {
    if (!selectedDate) {
      setCelebrations([]);
      return;
    }
    const list = getCelebrationsForDate(
      region,
      selectedDate.month + 1,
      selectedDate.day
    );
    setCelebrations(list);
  }, [region, selectedDate]);

  useEffect(() => {
    setUpcoming(getUpcomingCelebrations(region, new Date(), UPCOMING_DAYS));
  }, [region]);

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();
  const monthEvents = getCelebrationsForMonth(region, month);

  const handleCreateBanner = async (celebrationName: string, dateLabel?: string) => {
    const product = productName.trim() || "your product";
    const dateContext = dateLabel ? ` on ${dateLabel}` : "";
    const basePrompt = `Festive ${celebrationName}${dateContext} banner featuring ${product}, professional marketing banner, clean design`;
    const prompt = buildTextToImagePrompt(basePrompt, "16:9", {
      brandPromptSuffix: brandPromptSuffix.trim() || undefined,
    });

    setError(null);
    setGenerating(true);
    setGeneratingFor(celebrationName);
    try {
      const res = await fetch("/api/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, aspectRatio: "16:9" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to generate image");
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

      // Save as generated image so it appears in Gallery
      try {
        const useIndexedDB = await openDB().then(() => true).catch(() => false);
        const assetRecord = {
          id: `asset-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
          imageUrl,
          name: `${celebrationName}${dateContext} – ${product}`,
          uploadedAt: new Date().toISOString(),
          type: "generated" as const,
          prompt: basePrompt,
          aspectRatio: "16:9",
        };
        if (useIndexedDB) {
          await saveAsset(assetRecord);
        } else {
          const storedAssets = localStorage.getItem("savedAssets");
          const assets = storedAssets ? JSON.parse(storedAssets) : [];
          assets.push(assetRecord);
          localStorage.setItem("savedAssets", JSON.stringify(assets));
        }
      } catch (err) {
        console.warn("Failed to save celebration banner to assets:", err);
      }

      onAddSlide({
        id: generateId(),
        imageUrl,
        caption: `${celebrationName} – ${product}`,
      });

      // Show success toast
      setSuccessName(celebrationName);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setGenerating(false);
      setGeneratingFor(null);
    }
  };

  const today = new Date();
  const isToday = (day: number) =>
    year === today.getFullYear() &&
    month === today.getMonth() &&
    day === today.getDate();

  const formatEventDate = (dateKey: string) => {
    const [mm, dd] = dateKey.split("-").map(Number);
    return `${MONTHS[mm - 1]} ${dd}`;
  };

  const isEventSelected = (c: Celebration) =>
    selectedEvent?.name === c.name && selectedEvent?.date === c.date;

  /** Human-readable label for the currently selected calendar date */
  const selectedDateLabel =
    selectedDate
      ? `${MONTHS[selectedDate.month]} ${selectedDate.day}, ${year}`
      : undefined;

  /* ── Shared row for an event in a list ── */
  const EventRow = ({
    c,
    dateLabel,
    compact = false,
  }: {
    c: Celebration;
    dateLabel?: string;
    compact?: boolean;
  }) => {
    const selected = isEventSelected(c);
    const isGeneratingThis = generatingFor === c.name;
    return (
      <li
        className={`flex items-center justify-between gap-2 text-sm transition-colors rounded-lg ${
          selected ? "bg-[#0066ff]/10 px-2 py-1" : compact ? "" : "px-0 py-0.5"
        }`}
      >
        <span className="text-gray-300 truncate">{c.name}</span>
        <span className="text-gray-500 text-xs flex-shrink-0">{dateLabel ?? formatEventDate(c.date)}</span>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {/* Select — toggle button (outline ↔ filled blue) */}
          <button
            type="button"
            onClick={() => onSelectEvent(selected ? null : { name: c.name, date: c.date })}
            className={`py-1 px-2.5 rounded-lg text-xs font-medium transition-all border ${
              selected
                ? "bg-[#0066ff] border-[#0066ff] text-white"
                : "bg-transparent border-[#4a4a4a] text-gray-400 hover:border-gray-300 hover:text-white"
            }`}
          >
            {selected ? "✓ Selected" : "Select"}
          </button>

          {/* Create — always a distinct purple/action button */}
          <button
            type="button"
            onClick={() => handleCreateBanner(c.name, dateLabel ?? formatEventDate(c.date))}
            disabled={generating}
            className="py-1 px-2.5 rounded-lg text-xs font-medium bg-[#7c3aed] hover:bg-[#6d28d9] text-white border border-[#7c3aed] disabled:opacity-40 transition-colors flex items-center gap-1"
          >
            {isGeneratingThis ? (
              <>
                <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                Creating…
              </>
            ) : (
              <>✦ Create</>
            )}
          </button>
        </div>
      </li>
    );
  };

  return (
    <div className="space-y-4">
      {/* Selected event indicator */}
      {selectedEvent && (
        <div className="flex items-center justify-between gap-2 p-2 rounded-lg bg-[#0066ff]/10 border border-[#0066ff]/30">
          <span className="text-sm text-gray-300 truncate">
            Using event: <span className="text-white font-medium">{selectedEvent.name}</span>
          </span>
          <button
            type="button"
            onClick={() => onSelectEvent(null)}
            className="py-1 px-2 rounded text-xs font-medium text-[#0066ff] hover:bg-[#0066ff]/20 flex-shrink-0"
          >
            Clear
          </button>
        </div>
      )}

      {/* Upcoming events */}
      {upcoming.length > 0 && (
        <div>
          <p className="text-sm font-medium text-gray-300 mb-2">Upcoming events (next 6 months)</p>
          <ul className="space-y-1.5 max-h-40 overflow-y-auto">
            {upcoming.map((c) => (
              <EventRow key={c.date + c.name} c={c} compact />
            ))}
          </ul>
        </div>
      )}

      {/* Month events */}
      {monthEvents.length > 0 && (
        <div>
          <p className="text-sm font-medium text-gray-300 mb-2">Events in {MONTHS[month]} {year}</p>
          <ul className="space-y-1.5 max-h-40 overflow-y-auto">
            {monthEvents.map((c) => (
              <EventRow key={c.date + c.name} c={c} compact />
            ))}
          </ul>
        </div>
      )}
      {monthEvents.length === 0 && (
        <p className="text-xs text-gray-500">No events in {MONTHS[month]} for {region === "in" ? "India" : "United States"}.</p>
      )}

      {/* Region */}
      <div>
        <label className="block text-xs text-gray-400 mb-2">Region</label>
        <select
          value={region}
          onChange={(e) => setRegion(e.target.value as RegionCode)}
          className="w-full px-3 py-2 bg-[#1a1a1a] border border-[#3a3a3a] rounded-lg text-white text-sm focus:outline-none focus:border-[#0066ff]"
        >
          {REGIONS.map((r) => (
            <option key={r.code} value={r.code}>
              {r.label}
            </option>
          ))}
        </select>
      </div>

      {/* Month / Year selectors */}
      <div className="flex gap-2">
        <select
          value={month}
          onChange={(e) => setMonth(Number(e.target.value))}
          className="flex-1 px-2 py-1 bg-[#1a1a1a] border border-[#3a3a3a] rounded-lg text-white text-sm focus:outline-none focus:border-[#0066ff]"
        >
          {MONTHS.map((m, i) => (
            <option key={m} value={i}>{m}</option>
          ))}
        </select>
        <select
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
          className="w-24 px-2 py-1 bg-[#1a1a1a] border border-[#3a3a3a] rounded-lg text-white text-sm focus:outline-none focus:border-[#0066ff]"
        >
          {[year - 1, year, year + 1].map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1 text-center text-xs">
        {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
          <span key={d} className="font-medium text-gray-500 py-1">{d}</span>
        ))}
        {Array.from({ length: firstDay }, (_, i) => (
          <span key={`pad-${i}`} />
        ))}
        {Array.from({ length: daysInMonth }, (_, i) => {
          const day = i + 1;
          const isSelected = selectedDate?.month === month && selectedDate?.day === day;
          const hasEvent = getCelebrationsForDate(region, month + 1, day).length > 0;
          return (
            <button
              key={day}
              type="button"
              onClick={() => setSelectedDate({ month, day })}
              className={`py-1.5 rounded text-sm transition-colors flex flex-col items-center gap-0.5 ${
                isSelected ? "bg-[#0066ff] text-white" : "text-gray-300 hover:bg-[#3a3a3a]"
              } ${isToday(day) ? "ring-2 ring-[#0066ff]" : ""}`}
            >
              <span>{day}</span>
              {hasEvent && (
                <span className={`w-1 h-1 rounded-full ${isSelected ? "bg-white" : "bg-[#0066ff]"}`} />
              )}
            </button>
          );
        })}
      </div>

      {/* Celebrations on selected date — with date label passed to Create */}
      {celebrations.length > 0 && selectedDateLabel && (
        <div>
          <p className="text-sm font-medium text-gray-300 mb-2">
            Celebrations on {selectedDateLabel}
          </p>
          <ul className="space-y-2">
            {celebrations.map((c) => (
              <EventRow key={c.date + c.name} c={c} dateLabel={selectedDateLabel} />
            ))}
          </ul>
        </div>
      )}

      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm" role="alert">
          {error}
        </div>
      )}

      {/* Success toast */}
      {successName && (
        <SuccessToast name={successName} onClose={() => setSuccessName(null)} />
      )}
    </div>
  );
}
