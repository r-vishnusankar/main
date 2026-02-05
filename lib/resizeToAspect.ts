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
