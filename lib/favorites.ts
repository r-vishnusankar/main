/**
 * Favorites: list of asset/banner IDs stored in localStorage (no schema change).
 */

const STORAGE_KEY = "bannerCreatorFavoriteIds";

export function getFavoriteIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === "string") : [];
  } catch {
    return [];
  }
}

export function setFavoriteIds(ids: string[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  } catch {
    // ignore
  }
}

export function isFavorite(id: string): boolean {
  return getFavoriteIds().includes(id);
}

export function toggleFavorite(id: string): boolean {
  const ids = getFavoriteIds();
  const idx = ids.indexOf(id);
  if (idx >= 0) {
    ids.splice(idx, 1);
    setFavoriteIds(ids);
    return false;
  }
  ids.push(id);
  setFavoriteIds(ids);
  return true;
}
