# creator-banner-carousel

Embeddable banner carousel component for use with [Creator Banner Creator](https://github.com/your-org/creator-banner-creator). Use this package to render exported banners on any React site.

## Install

```bash
npm install creator-banner-carousel
# or
yarn add creator-banner-carousel
# or
pnpm add creator-banner-carousel
```

**Peer dependencies:** `react` and `react-dom` (>= 18).

## Usage

### With exported config (banner-config.json)

After creating a banner in the Creator Banner Creator app, download the ZIP and use the included `banner-config.json`:

```tsx
import { BannerCarousel } from "creator-banner-carousel";
import config from "./banner-config.json";

export function MyBanner() {
  return <BannerCarousel config={config} />;
}
```

**Note:** `config.slides[].imageUrl` in the JSON are paths relative to the exported `index.html` (e.g. `images/slide-1.png`). Host those image files at the same relative paths on your server, or resolve the URLs before passing config (e.g. prefix with your CDN base URL).

### With image URLs only

```tsx
import { BannerCarousel } from "creator-banner-carousel";

export function MyBanner() {
  return (
    <BannerCarousel
      images={[
        "https://example.com/banner1.jpg",
        "https://example.com/banner2.jpg",
      ]}
      aspectRatio="16:9"
      autoplay
      autoplaySpeed={5}
    />
  );
}
```

### With slides (URLs + captions)

```tsx
import { BannerCarousel } from "creator-banner-carousel";

export function MyBanner() {
  return (
    <BannerCarousel
      images={["/img/1.jpg", "/img/2.jpg"]}
      slides={[
        { imageUrl: "/img/1.jpg", productName: "Product A", productLink: "/product-a" },
        { imageUrl: "/img/2.jpg", caption: "Summer sale" },
      ]}
      aspectRatio="3:1"
      autoplay
    />
  );
}
```

## Embed on non-React sites

For static or non-React sites, use the **downloaded ZIP** from Creator Banner Creator:

1. Create your banner in the app and click **Download banner**.
2. Unzip the file. You get `index.html`, `images/`, and `banner-config.json`.
3. Upload the entire folder to your web server (or CDN).
4. Link to `index.html` or embed it in an iframe:

```html
<iframe
  src="https://yoursite.com/banner/index.html"
  width="100%"
  height="0"
  style="border: none; aspect-ratio: 16/9; min-height: 200px;"
  title="Banner carousel"
></iframe>
```

No npm package is required for the iframe approach.

## API

| Prop | Type | Description |
|------|------|-------------|
| `config` | `BannerConfig` | Full config from exported `banner-config.json`. |
| `images` | `string[]` | Image URLs when not using `config`. |
| `aspectRatio` | `"16:9" \| "3:1" \| "4:1" \| "1:1"` | Used when `images` is provided. Default `"16:9"`. |
| `autoplay` | `boolean` | Default `true`. |
| `autoplaySpeed` | `number` | Seconds between slides. Default `5`. |
| `slides` | `SlideConfig[]` | Optional captions/product when using `images` (same order). |

Either pass `config` or `images` (and optionally `slides`). Providing both will prefer `config`.

## Types

```ts
interface BannerConfig {
  aspectRatio: "16:9" | "3:1" | "4:1" | "1:1";
  slides: { imageUrl: string; productName?: string; productLink?: string; caption?: string }[];
  autoplay?: boolean;
  autoplaySpeed?: number;
}

interface SlideConfig {
  imageUrl: string;
  productName?: string;
  productLink?: string;
  caption?: string;
}
```
