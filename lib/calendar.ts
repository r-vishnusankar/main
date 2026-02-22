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

/** Get all celebrations in a given month (for the selected month/year in the calendar). month is 0-indexed (0 = January). */
export function getCelebrationsForMonth(
  region: RegionCode,
  month: number
): Celebration[] {
  const names = regionData[region];
  if (!names) return [];
  const mm = String(month + 1).padStart(2, "0");
  const result: Celebration[] = [];
  for (const [dateKey, name] of Object.entries(names)) {
    if (dateKey.startsWith(mm + "-")) result.push({ date: dateKey, name });
  }
  result.sort((a, b) => a.date.localeCompare(b.date));
  return result;
}

/** Number of days ahead for "upcoming events" (6 months). */
export const UPCOMING_DAYS = 180;

/** Get upcoming celebrations in the next N days for a region (for "upcoming events" list). */
export function getUpcomingCelebrations(
  region: RegionCode,
  fromDate: Date,
  daysAhead: number = UPCOMING_DAYS
): Celebration[] {
  const names = regionData[region];
  if (!names) return [];
  const end = new Date(fromDate);
  end.setDate(end.getDate() + daysAhead);
  const years = [fromDate.getFullYear(), fromDate.getFullYear() + 1];
  const withTime: { c: Celebration; time: number }[] = [];
  for (const [dateKey, name] of Object.entries(names)) {
    const [mm, dd] = dateKey.split("-").map(Number);
    for (const year of years) {
      const eventDate = new Date(year, mm - 1, dd);
      if (eventDate >= fromDate && eventDate <= end) {
        withTime.push({ c: { date: dateKey, name }, time: eventDate.getTime() });
        break;
      }
    }
  }
  withTime.sort((a, b) => a.time - b.time);
  return withTime.map((x) => x.c);
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
