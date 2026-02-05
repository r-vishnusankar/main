import inData from "@/data/in.json";
import usData from "@/data/us.json";

export type RegionCode = "in" | "us";

export interface Celebration {
  date: string; // MM-DD
  name: string;
}

const regionData: Record<RegionCode, Record<string, string>> = {
  in: inData as Record<string, string>,
  us: usData as Record<string, string>,
};

export function getCelebrationsForDate(
  region: RegionCode,
  month: number,
  day: number
): Celebration[] {
  const mm = String(month).padStart(2, "0");
  const dd = String(day).padStart(2, "0");
  const key = `${mm}-${dd}`;
  const names = regionData[region];
  if (!names) return [];
  const name = names[key];
  if (!name) return [];
  return [{ date: key, name }];
}

export function getRegionFromLocale(locale: string): RegionCode {
  const lower = locale.toLowerCase();
  if (lower.includes("in") || lower === "hi" || lower.startsWith("en-in")) return "in";
  if (lower.includes("us") || lower.startsWith("en-us")) return "us";
  return "in";
}

export const REGIONS: { code: RegionCode; label: string }[] = [
  { code: "in", label: "India" },
  { code: "us", label: "United States" },
];
