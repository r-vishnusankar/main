/**
 * Lightweight validation for generated images to reject junk (too small, empty, or broken).
 * Uses only Buffer/byte inspection to avoid adding image lib dependencies.
 */

const MIN_BYTES = 500;
const MIN_DIMENSION = 64;

/**
 * Read PNG width/height from IHDR (bytes 16-23). Returns null if not a valid PNG.
 */
function getPngDimensions(buffer: Buffer): { width: number; height: number } | null {
  if (buffer.length < 24) return null;
  const signature = buffer.subarray(0, 8);
  const pngSig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  if (!signature.equals(pngSig)) return null;
  const width = buffer.readUInt32BE(16);
  const height = buffer.readUInt32BE(20);
  if (width === 0 || height === 0 || width > 16384 || height > 16384) return null;
  return { width, height };
}

/**
 * JPEG: find SOF0 (0xff 0xc0) and read dimensions (height at +5, width at +7). Returns null if not found.
 */
function getJpegDimensions(buffer: Buffer): { width: number; height: number } | null {
  if (buffer.length < 20 || buffer[0] !== 0xff || buffer[1] !== 0xd8) return null;
  let i = 2;
  while (i < buffer.length - 9) {
    if (buffer[i] !== 0xff) {
      i++;
      continue;
    }
    const marker = buffer[i + 1];
    if (marker === 0xc0 || marker === 0xc2) {
      const height = buffer.readUInt16BE(i + 5);
      const width = buffer.readUInt16BE(i + 7);
      if (width > 0 && height > 0 && width <= 16384 && height <= 16384)
        return { width, height };
      return null;
    }
    const segmentLength = buffer.readUInt16BE(i + 2);
    i += 2 + segmentLength;
  }
  return null;
}

export interface ValidateResult {
  ok: boolean;
  reason?: string;
}

/**
 * Validate that the image data looks like a real image (not empty, not too small).
 * Accepts data URL or raw base64 string.
 */
export function validateGeneratedImage(dataUrlOrBase64: string): ValidateResult {
  let base64: string;
  if (dataUrlOrBase64.startsWith("data:")) {
    const match = dataUrlOrBase64.match(/^data:[^;]+;base64,(.+)$/);
    if (!match) return { ok: false, reason: "Invalid data URL" };
    base64 = match[1];
  } else {
    base64 = dataUrlOrBase64;
  }
  let buffer: Buffer;
  try {
    buffer = Buffer.from(base64, "base64");
  } catch {
    return { ok: false, reason: "Invalid base64" };
  }
  if (buffer.length < MIN_BYTES) {
    return { ok: false, reason: "Image data too small" };
  }
  const png = getPngDimensions(buffer);
  if (png) {
    if (png.width < MIN_DIMENSION || png.height < MIN_DIMENSION) {
      return { ok: false, reason: `Image dimensions too small (${png.width}x${png.height})` };
    }
    return { ok: true };
  }
  const jpeg = getJpegDimensions(buffer);
  if (jpeg) {
    if (jpeg.width < MIN_DIMENSION || jpeg.height < MIN_DIMENSION) {
      return { ok: false, reason: `Image dimensions too small (${jpeg.width}x${jpeg.height})` };
    }
    return { ok: true };
  }
  return { ok: false, reason: "Unrecognized or corrupt image format" };
}
