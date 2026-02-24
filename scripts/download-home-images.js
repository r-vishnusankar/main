/**
 * Downloads fashion, cosmetic, and sale promo images for home preview cards.
 * Uses Unsplash API (free key from https://unsplash.com/developers).
 *
 * 1. Add to .env.local: UNSPLASH_ACCESS_KEY=your_key
 * 2. Run: node scripts/download-home-images.js
 */

const fs = require("fs");
const path = require("path");

const OUT_DIR = path.join(__dirname, "../public/home-previews");

// Load .env.local from project root
try {
  const envPath = path.resolve(__dirname, "../.env.local");
  if (fs.existsSync(envPath)) {
    const env = fs.readFileSync(envPath, "utf8");
    env.split("\n").forEach((line) => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith("#")) {
        const eq = trimmed.indexOf("=");
        if (eq > 0) {
          const key = trimmed.slice(0, eq).trim();
          const val = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
          process.env[key] = val;
        }
      }
    });
  }
} catch (_) {}

const UNSPLASH_KEY = process.env.UNSPLASH_ACCESS_KEY;

// Slot -> { query, orientation? } for Unsplash search
const SLOT_QUERIES = {
  "hero-main": { query: "fashion store clothing display", orientation: "landscape" },
  "hero-square-1": { query: "elegant dress fashion woman", orientation: "squarish" },
  "hero-portrait-1": { query: "fashion dress product portrait", orientation: "portrait" },
  "homepage-banner": { query: "fashion sale banner", orientation: "landscape" },
  "product-card": { query: "cosmetic makeup product", orientation: "portrait" },
  "instagram-post": { query: "fashion dress instagram", orientation: "squarish" },
  "sale-promo": { query: "sale discount shopping promo", orientation: "landscape" },
  "product-banner": { query: "cosmetic beauty product", orientation: "landscape" },
  "step-1": { query: "fashion product upload", orientation: "landscape" },
  "step-2": { query: "cosmetic product template", orientation: "landscape" },
  "step-3": { query: "fashion sale publish", orientation: "landscape" },
};

async function searchUnsplash(query, perPage = 1, orientation = "landscape") {
  const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=${perPage}&orientation=${orientation}`;
  const res = await fetch(url, {
    headers: { Authorization: `Client-ID ${UNSPLASH_KEY}` },
  });
  if (!res.ok) throw new Error(`Unsplash API ${res.status}`);
  const data = await res.json();
  return data.results?.[0];
}

async function downloadImage(url, filepath) {
  const res = await fetch(url, { redirect: "follow" });
  if (!res.ok) throw new Error(`Download ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(filepath, buf);
}

async function main() {
  if (!UNSPLASH_KEY) {
    console.log(`
No UNSPLASH_ACCESS_KEY found.

1. Get a free key: https://unsplash.com/developers
2. Add to .env.local: UNSPLASH_ACCESS_KEY=your_key
3. Run again: node scripts/download-home-images.js

Or manually download fashion/cosmetic/sale images from:
- https://unsplash.com/s/photos/fashion-dress
- https://unsplash.com/s/photos/cosmetic
- https://unsplash.com/s/photos/sale-promo

Save them to public/home-previews/ with names: hero-main.jpg, product-card.jpg, etc.
`);
    process.exit(1);
  }

  console.log("Downloading fashion, cosmetic & sale images from Unsplash...\n");

  for (const [slot, { query, orientation = "landscape" }] of Object.entries(SLOT_QUERIES)) {
    try {
      const photo = await searchUnsplash(query, 1, orientation);
      if (!photo?.urls?.regular) {
        console.log(`✗ ${slot}: No results for "${query}"`);
        continue;
      }
      await downloadImage(photo.urls.regular, path.join(OUT_DIR, `${slot}.jpg`));
      console.log(`✓ ${slot}.jpg (${query})`);
    } catch (e) {
      console.error(`✗ ${slot}: ${e.message}`);
    }
  }

  console.log("\nDone. Refresh the app to see the images.");
}

main();
