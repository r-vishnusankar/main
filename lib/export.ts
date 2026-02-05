import JSZip from "jszip";
import type { Slide, AspectRatio, BannerConfig } from "@/types/banner";

const RATIO_MAP: Record<AspectRatio, number> = {
  "16:9": 16 / 9,
  "3:1": 3,
  "4:1": 4,
  "1:1": 1,
};

async function blobFromUrl(url: string): Promise<Blob> {
  if (url.startsWith("data:")) {
    const [, mimePart, b64] = url.match(/^data:([^;]+);base64,(.+)$/) ?? [];
    const mime = mimePart ?? "image/png";
    const binary = atob(b64 ?? "");
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return new Blob([bytes], { type: mime });
  }
  const res = await fetch(url, { mode: "cors" });
  if (!res.ok) throw new Error(`Failed to fetch image: ${url}`);
  return res.blob();
}

async function getImageBlobs(slides: Slide[]): Promise<Blob[]> {
  const blobs: Blob[] = [];
  for (const slide of slides) {
    if (slide.imageBlob) {
      blobs.push(slide.imageBlob);
    } else {
      try {
        const blob = await blobFromUrl(slide.imageUrl);
        blobs.push(blob);
      } catch {
        blobs.push(new Blob());
      }
    }
  }
  return blobs;
}

function getCarouselHtml(
  imagePaths: string[],
  aspectRatio: AspectRatio,
  autoplay: boolean,
  autoplaySpeed: number,
  slides: { productName?: string; productLink?: string; caption?: string }[]
): string {
  const ratio = RATIO_MAP[aspectRatio];
  const ratioPercent = (1 / ratio) * 100;
  const pathsJson = JSON.stringify(imagePaths);
  const slidesDataJson = JSON.stringify(
    slides.map((s) => ({
      productName: s.productName,
      productLink: s.productLink,
      caption: s.caption,
    }))
  );
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Banner Carousel</title>
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; font-family: system-ui, sans-serif; }
    .carousel { position: relative; width: 100%; overflow: hidden; }
    .carousel::before { content: ""; display: block; padding-top: ${ratioPercent}%; }
    .carousel-inner { position: absolute; inset: 0; }
    .slide { position: absolute; inset: 0; opacity: 0; transition: opacity 0.3s; }
    .slide.active { opacity: 1; z-index: 1; }
    .slide img { width: 100%; height: 100%; object-fit: cover; display: block; }
    .slide-caption { position: absolute; bottom: 0; left: 0; right: 0; background: linear-gradient(transparent, rgba(0,0,0,0.7)); color: #fff; padding: 12px 16px; font-size: 14px; }
    .slide-caption a { color: #fff; font-weight: 600; }
    .dots { display: flex; justify-content: center; gap: 6px; padding: 12px; }
    .dot { width: 10px; height: 10px; border-radius: 50%; border: none; background: #ccc; cursor: pointer; }
    .dot.active { background: #333; }
    .arrows { position: absolute; top: 50%; transform: translateY(-50%); z-index: 2; background: rgba(255,255,255,0.8); border: none; width: 40px; height: 40px; border-radius: 50%; cursor: pointer; font-size: 20px; }
    .arrow-prev { left: 12px; }
    .arrow-next { right: 12px; }
  </style>
</head>
<body>
  <div class="carousel" id="carousel">
    <div class="carousel-inner" id="carouselInner"></div>
    <button type="button" class="arrows arrow-prev" id="prev" aria-label="Previous">&#10094;</button>
    <button type="button" class="arrows arrow-next" id="next" aria-label="Next">&#10095;</button>
  </div>
  <div class="dots" id="dots"></div>
  <script>
    (function() {
      var paths = ${pathsJson};
      var slidesData = ${slidesDataJson};
      var current = 0;
      var autoplay = ${autoplay};
      var autoplaySpeed = ${autoplaySpeed} * 1000;
      var timer = null;
      var inner = document.getElementById("carouselInner");
      var dotsEl = document.getElementById("dots");
      function render() {
        inner.innerHTML = paths.map(function(url, i) {
          var d = slidesData[i] || {};
          var cap = (d.productName ? '<a href="' + (d.productLink || '#') + '">' + d.productName + '</a>' : '') + (d.caption ? '<p>' + d.caption + '</p>' : '');
          return '<div class="slide' + (i === current ? ' active' : '') + '"><img src="' + url + '" alt=""><div class="slide-caption">' + cap + '</div></div>';
        }).join("");
        dotsEl.innerHTML = paths.map(function(_, i) {
          return '<button type="button" class="dot' + (i === current ? ' active' : '') + '" data-idx="' + i + '" aria-label="Slide ' + (i + 1) + '"></button>';
        }).join("");
        dotsEl.querySelectorAll(".dot").forEach(function(btn) {
          btn.addEventListener("click", function() { goTo(parseInt(btn.getAttribute("data-idx"), 10)); });
        });
      }
      function goTo(idx) {
        current = (idx + paths.length) % paths.length;
        inner.querySelectorAll(".slide").forEach(function(s, i) { s.classList.toggle("active", i === current); });
        dotsEl.querySelectorAll(".dot").forEach(function(d, i) { d.classList.toggle("active", i === current); });
      }
      document.getElementById("prev").onclick = function() { goTo(current - 1); resetTimer(); };
      document.getElementById("next").onclick = function() { goTo(current + 1); resetTimer(); };
      function resetTimer() {
        if (timer) clearInterval(timer);
        if (autoplay && paths.length > 1) timer = setInterval(function() { goTo(current + 1); }, autoplaySpeed);
      }
      render();
      resetTimer();
    })();
  </script>
</body>
</html>`;
}

export interface ExportOptions {
  slides: Slide[];
  aspectRatio: AspectRatio;
  autoplay: boolean;
  autoplaySpeed: number;
}

export async function buildBannerZip(options: ExportOptions): Promise<Blob> {
  const { slides, aspectRatio, autoplay, autoplaySpeed } = options;
  const blobs = await getImageBlobs(slides);
  const zip = new JSZip();
  const imagePaths: string[] = [];
  for (let i = 0; i < blobs.length; i++) {
    const name = `images/slide-${i + 1}.png`;
    imagePaths.push(name);
    zip.file(name, blobs[i], { binary: true });
  }
  const html = getCarouselHtml(
    imagePaths,
    aspectRatio,
    autoplay,
    autoplaySpeed,
    slides.map((s) => ({
      productName: s.productName,
      productLink: s.productLink,
      caption: s.caption,
    }))
  );
  zip.file("index.html", html);
  const config: BannerConfig = {
    aspectRatio,
    slides: slides.map((s, i) => ({
      imageUrl: imagePaths[i] ?? "",
      productName: s.productName,
      productLink: s.productLink,
      caption: s.caption,
    })),
    autoplay,
    autoplaySpeed,
  };
  zip.file("banner-config.json", JSON.stringify(config, null, 2));
  return zip.generateAsync({ type: "blob" });
}
