/**
 * Resize/crop an image to fit the given aspect ratio (width/height).
 * Returns a blob (PNG) suitable for use as slide image.
 */
export async function resizeImageToAspect(
  file: File,
  aspectRatio: number
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const w = img.naturalWidth;
      const h = img.naturalHeight;
      const targetRatio = aspectRatio;
      const currentRatio = w / h;
      let sw: number, sh: number, sx: number, sy: number, dw: number, dh: number;
      if (currentRatio > targetRatio) {
        sh = h;
        sw = h * targetRatio;
        sx = (w - sw) / 2;
        sy = 0;
        dw = sw;
        dh = sh;
      } else {
        sw = w;
        sh = w / targetRatio;
        sx = 0;
        sy = (h - sh) / 2;
        dw = sw;
        dh = sh;
      }
      const canvas = document.createElement("canvas");
      canvas.width = dw;
      canvas.height = dh;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Canvas 2d not available"));
        return;
      }
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, dw, dh);
      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error("toBlob failed"));
        },
        "image/png",
        0.92
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Image load failed"));
    };
    img.src = url;
  });
}

export function getAspectRatioNumber(ratio: string): number {
  const [a, b] = ratio.split(":").map(Number);
  return a / b;
}

const MAX_IMAGE_DIMENSION_FOR_API = 1024;

/**
 * Resize a data URL so the longest side is at most maxPx. Use JPEG for smaller payload when sending to API.
 * Returns a data URL (image/jpeg).
 */
export function resizeDataUrlToMaxDimension(dataUrl: string, maxPx: number = MAX_IMAGE_DIMENSION_FOR_API): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const w = img.naturalWidth;
      const h = img.naturalHeight;
      const scale = w <= maxPx && h <= maxPx ? 1 : maxPx / Math.max(w, h);
      const dw = Math.round(w * scale);
      const dh = Math.round(h * scale);
      resolve(canvasToJpegDataUrl(img, dw, dh));
    };
    img.onerror = () => reject(new Error("Image load failed"));
    img.src = dataUrl;
  });
}

function canvasToJpegDataUrl(img: HTMLImageElement, dw: number, dh: number): string {
  const canvas = document.createElement("canvas");
  canvas.width = dw;
  canvas.height = dh;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2d not available");
  ctx.drawImage(img, 0, 0, dw, dh);
  return canvas.toDataURL("image/jpeg", 0.88);
}

/**
 * Resize/crop an image (data URL) to the given aspect ratio.
 * Returns a data URL (PNG) so the generated image matches the selected aspect ratio.
 */
export function resizeDataUrlToAspect(dataUrl: string, aspectRatio: string): Promise<string> {
  const ratioNum = getAspectRatioNumber(aspectRatio);
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const w = img.naturalWidth;
      const h = img.naturalHeight;
      const targetRatio = ratioNum;
      const currentRatio = w / h;
      let sw: number, sh: number, sx: number, sy: number, dw: number, dh: number;
      if (currentRatio > targetRatio) {
        sh = h;
        sw = h * targetRatio;
        sx = (w - sw) / 2;
        sy = 0;
        dw = sw;
        dh = sh;
      } else {
        sw = w;
        sh = w / targetRatio;
        sx = 0;
        sy = (h - sh) / 2;
        dw = sw;
        dh = sh;
      }
      const canvas = document.createElement("canvas");
      canvas.width = dw;
      canvas.height = dh;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Canvas 2d not available"));
        return;
      }
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, dw, dh);
      const resizedDataUrl = canvas.toDataURL("image/png", 0.92);
      resolve(resizedDataUrl);
    };
    img.onerror = () => reject(new Error("Image load failed"));
    img.src = dataUrl;
  });
}
