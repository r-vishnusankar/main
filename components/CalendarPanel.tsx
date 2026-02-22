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
import { getBrandPromptSuffix } from "@/lib/brandKit";
import type { Slide } from "@/types/banner";

function generateId(): string {
  return `slide-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

interface CalendarPanelProps {
  onAddSlide: (slide: Slide) => void;
  productName: string;
  selectedEvent: Celebration | null;
  onSelectEvent: (event: Celebration | null) => void;
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export default function CalendarPanel({ onAddSlide, productName, selectedEvent, onSelectEvent }: CalendarPanelProps) {
  const [region, setRegion] = useState<RegionCode>("in");
  const [year, setYear] = useState(() => new Date().getFullYear());
  const [month, setMonth] = useState(() => new Date().getMonth());
  const [selectedDate, setSelectedDate] = useState<{ month: number; day: number } | null>(null);
  const [celebrations, setCelebrations] = useState<Celebration[]>([]);
  const [upcoming, setUpcoming] = useState<Celebration[]>([]);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const handleCreateBanner = async (celebrationName: string) => {
    const product = productName.trim() || "your product";
    const prompt = buildTextToImagePrompt(
      `Festive ${celebrationName} banner featuring ${product}, professional marketing banner, clean design`,
      "16:9",
      { brandPromptSuffix: getBrandPromptSuffix().trim() || undefined }
    );
    setError(null);
    setGenerating(true);
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

      // Save to assets automatically
      try {
        const useIndexedDB = await openDB().then(() => true).catch(() => false);
        if (useIndexedDB) {
          await saveAsset({
            id: `asset-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
            imageUrl,
            name: `${celebrationName} – ${product}`,
            uploadedAt: new Date().toISOString(),
          });
        } else {
          // Fallback to localStorage
          const storedAssets = localStorage.getItem("savedAssets");
          const assets = storedAssets ? JSON.parse(storedAssets) : [];
          assets.push({
            id: `asset-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
            imageUrl,
            name: `${celebrationName} – ${product}`,
            uploadedAt: new Date().toISOString(),
          });
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
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setGenerating(false);
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

  return (
    <div className="space-y-4">
      {selectedEvent && (
        <div className="flex items-center justify-between gap-2 p-2 rounded-lg bg-[#0066ff]/10 border border-[#0066ff]/30">
          <span className="text-sm text-gray-300 truncate">Using event: {selectedEvent.name}</span>
          <button
            type="button"
            onClick={() => onSelectEvent(null)}
            className="py-1 px-2 rounded text-xs font-medium text-[#0066ff] hover:bg-[#0066ff]/20 flex-shrink-0"
          >
            Clear
          </button>
        </div>
      )}
      {upcoming.length > 0 && (
        <div>
          <p className="text-sm font-medium text-gray-300 mb-2">Upcoming events (next 6 months)</p>
          <ul className="space-y-1.5 max-h-32 overflow-y-auto">
            {upcoming.map((c) => (
              <li
                key={c.date + c.name}
                className={`flex items-center justify-between gap-2 text-sm ${isEventSelected(c) ? "rounded bg-[#0066ff]/10 px-2 py-1" : ""}`}
              >
                <span className="text-gray-300 truncate">{c.name}</span>
                <span className="text-gray-500 text-xs flex-shrink-0">{formatEventDate(c.date)}</span>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => onSelectEvent({ name: c.name, date: c.date })}
                    className={`py-1 px-2 rounded text-xs font-medium hover:opacity-90 flex-shrink-0 ${
                      isEventSelected(c)
                        ? "bg-[#0066ff] text-white"
                        : "bg-[#3a3a3a] text-gray-300 hover:bg-[#4a4a4a]"
                    }`}
                  >
                    Select
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCreateBanner(c.name)}
                    disabled={generating}
                    className="py-1 px-2 rounded bg-[#0066ff] text-white text-xs font-medium hover:opacity-90 disabled:opacity-50 flex-shrink-0"
                  >
                    Create
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
      {monthEvents.length > 0 && (
        <div>
          <p className="text-sm font-medium text-gray-300 mb-2">Events in {MONTHS[month]} {year}</p>
          <ul className="space-y-1.5 max-h-32 overflow-y-auto">
            {monthEvents.map((c) => (
              <li
                key={c.date + c.name}
                className={`flex items-center justify-between gap-2 text-sm ${isEventSelected(c) ? "rounded bg-[#0066ff]/10 px-2 py-1" : ""}`}
              >
                <span className="text-gray-300 truncate">{c.name}</span>
                <span className="text-gray-500 text-xs flex-shrink-0">{formatEventDate(c.date)}</span>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => onSelectEvent({ name: c.name, date: c.date })}
                    className={`py-1 px-2 rounded text-xs font-medium hover:opacity-90 flex-shrink-0 ${
                      isEventSelected(c)
                        ? "bg-[#0066ff] text-white"
                        : "bg-[#3a3a3a] text-gray-300 hover:bg-[#4a4a4a]"
                    }`}
                  >
                    Select
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCreateBanner(c.name)}
                    disabled={generating}
                    className="py-1 px-2 rounded bg-[#0066ff] text-white text-xs font-medium hover:opacity-90 disabled:opacity-50 flex-shrink-0"
                  >
                    Create
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
      {monthEvents.length === 0 && (
        <p className="text-xs text-gray-500">No events in {MONTHS[month]} for {region === "in" ? "India" : "United States"}.</p>
      )}
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

      <div className="flex gap-2">
        <select
          value={month}
          onChange={(e) => setMonth(Number(e.target.value))}
          className="flex-1 px-2 py-1 bg-[#1a1a1a] border border-[#3a3a3a] rounded-lg text-white text-sm focus:outline-none focus:border-[#0066ff]"
        >
          {MONTHS.map((m, i) => (
            <option key={m} value={i}>
              {m}
            </option>
          ))}
        </select>
        <select
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
          className="w-24 px-2 py-1 bg-[#1a1a1a] border border-[#3a3a3a] rounded-lg text-white text-sm focus:outline-none focus:border-[#0066ff]"
        >
          {[year - 1, year, year + 1].map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-xs">
        {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
          <span key={d} className="font-medium text-gray-500 py-1">
            {d}
          </span>
        ))}
        {Array.from({ length: firstDay }, (_, i) => (
          <span key={`pad-${i}`} />
        ))}
        {Array.from({ length: daysInMonth }, (_, i) => {
          const day = i + 1;
          const selected =
            selectedDate?.month === month &&
            selectedDate?.day === day;
          const hasEvent = getCelebrationsForDate(region, month + 1, day).length > 0;
          return (
            <button
              key={day}
              type="button"
              onClick={() => setSelectedDate({ month, day })}
              className={`py-1.5 rounded text-sm transition-colors flex flex-col items-center gap-0.5 ${
                selected
                  ? "bg-[#0066ff] text-white"
                  : "text-gray-300 hover:bg-[#3a3a3a]"
              } ${isToday(day) ? "ring-2 ring-[#0066ff]" : ""}`}
            >
              <span>{day}</span>
              {hasEvent && <span className={`w-1 h-1 rounded-full ${selected ? "bg-white" : "bg-[#0066ff]"}`} />}
            </button>
          );
        })}
      </div>

      {celebrations.length > 0 && (
        <div>
          <p className="text-sm font-medium text-gray-300 mb-2">
            Celebrations on this date
          </p>
          <ul className="space-y-2">
            {celebrations.map((c) => (
              <li
                key={c.date + c.name}
                className={`flex items-center justify-between gap-2 ${isEventSelected(c) ? "rounded bg-[#0066ff]/10 px-2 py-1" : ""}`}
              >
                <span className="text-sm text-gray-300">{c.name}</span>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => onSelectEvent({ name: c.name, date: c.date })}
                    className={`py-1.5 px-2 rounded text-xs font-medium hover:opacity-90 flex-shrink-0 ${
                      isEventSelected(c)
                        ? "bg-[#0066ff] text-white"
                        : "bg-[#3a3a3a] text-gray-300 hover:bg-[#4a4a4a]"
                    }`}
                  >
                    Select
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCreateBanner(c.name)}
                    disabled={generating}
                    className="py-1.5 px-3 rounded bg-gradient-to-r from-[#0066ff] to-[#0052cc] text-white text-xs font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
                  >
                    {generating ? "Generating…" : "Create"}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm" role="alert">
          {error}
        </div>
      )}
    </div>
  );
}
