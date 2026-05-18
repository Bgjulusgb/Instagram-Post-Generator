import { loadDecodedImage, loadImageFile } from './image';

/**
 * Two-tier image pipeline.
 *
 * Konva caches its image filters in a pixel buffer the size of the source
 * image, so a 24 MP photo creates a ~100 MB buffer the moment you toggle
 * an adjustment. That's what was killing the canvas. We solve it by always
 * producing two derivatives at import time:
 *
 *   - `previewSrc` — a small JPEG used for live canvas display. Capped at
 *     `MAX_PREVIEW_DIMENSION` so the cache buffer is bounded no matter how
 *     huge the original was.
 *   - `src` — a higher-resolution JPEG used for export. Capped at
 *     `MAX_SOURCE_DIMENSION` so the offscreen export renderer stays fast
 *     while still producing pixel-perfect output for any Instagram format
 *     (1080×1920 at 2× retina = 3840 px, comfortably under our cap).
 *
 * The original file is discarded after deriving both — keeping it would
 * blow IndexedDB quota and gives us nothing the export cap can't already
 * deliver.
 */

/** Canvas / live edit size cap. Bounds Konva's filter cache. */
export const MAX_PREVIEW_DIMENSION = 1800;

/** Export source cap. ≥ 1920 × 2 so even 9:16 stories export at retina. */
export const MAX_SOURCE_DIMENSION = 4000;

const PREVIEW_QUALITY = 0.9;
const SOURCE_QUALITY = 0.97;

export interface ProcessedImage {
  /** Export-quality source — used by the offscreen export renderer. */
  src: string;
  /** Lightweight preview — used by the on-screen Konva canvas. */
  previewSrc: string;
  /**
   * Natural dimensions of `src` (i.e. the resized export buffer). All
   * crop / pan math in the editor speaks in this coordinate system so
   * preview and export always agree.
   */
  naturalWidth: number;
  naturalHeight: number;
  /** Bytes saved vs the original file — surfaced in the UI as a hint. */
  originalBytes: number;
  sourceBytes: number;
  previewBytes: number;
}

interface RenderOptions {
  maxDim: number;
  quality: number;
  mimeType: 'image/jpeg' | 'image/webp' | 'image/png';
}

async function renderAt(
  img: HTMLImageElement,
  opts: RenderOptions,
): Promise<{ dataUrl: string; width: number; height: number }> {
  const w = img.naturalWidth;
  const h = img.naturalHeight;
  const longest = Math.max(w, h);
  const scale = longest > opts.maxDim ? opts.maxDim / longest : 1;
  const outW = Math.round(w * scale);
  const outH = Math.round(h * scale);

  const canvas = document.createElement('canvas');
  canvas.width = outW;
  canvas.height = outH;
  const ctx = canvas.getContext('2d', { alpha: opts.mimeType === 'image/png' });
  if (!ctx) throw new Error('Canvas unavailable');
  // High-quality downscale: trilinear is the browser's default, plus we
  // hint at "high" so Chromium uses Lanczos when downscaling sharply.
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, outW, outH);
  const dataUrl = canvas.toDataURL(opts.mimeType, opts.quality);
  return { dataUrl, width: outW, height: outH };
}

export async function processImageFile(file: File): Promise<ProcessedImage> {
  const original = await loadImageFile(file);
  const img = await loadDecodedImage(original.src);
  return processDecodedImage(img, file.size);
}

export async function processImageUrl(url: string): Promise<ProcessedImage> {
  const img = await loadDecodedImage(url);
  return processDecodedImage(img);
}

async function processDecodedImage(
  img: HTMLImageElement,
  originalBytes = 0,
): Promise<ProcessedImage> {
  // Decide whether the original is already small enough to use verbatim.
  // Small PNGs (logos, icons) stay PNG to keep their alpha channel.
  const longest = Math.max(img.naturalWidth, img.naturalHeight);
  const usePng = !!img.src && img.src.startsWith('data:image/png');
  const sourceMime = usePng ? 'image/png' : 'image/jpeg';

  let source: { dataUrl: string; width: number; height: number };
  if (longest <= MAX_SOURCE_DIMENSION && originalBytes > 0 && originalBytes < 4_000_000) {
    // Original is small — keep it byte-for-byte.
    source = { dataUrl: img.src, width: img.naturalWidth, height: img.naturalHeight };
  } else {
    source = await renderAt(img, {
      maxDim: MAX_SOURCE_DIMENSION,
      quality: SOURCE_QUALITY,
      mimeType: sourceMime,
    });
  }

  // Always re-encode the preview from the resized source so it's a
  // perfect downscale chain (avoids two consecutive resizes of the
  // original which would compound interpolation softening).
  const sourceImg = await loadDecodedImage(source.dataUrl);
  const preview =
    Math.max(source.width, source.height) <= MAX_PREVIEW_DIMENSION
      ? { dataUrl: source.dataUrl, width: source.width, height: source.height }
      : await renderAt(sourceImg, {
          maxDim: MAX_PREVIEW_DIMENSION,
          quality: PREVIEW_QUALITY,
          mimeType: 'image/jpeg',
        });

  return {
    src: source.dataUrl,
    previewSrc: preview.dataUrl,
    naturalWidth: source.width,
    naturalHeight: source.height,
    originalBytes,
    sourceBytes: estimateBytes(source.dataUrl),
    previewBytes: estimateBytes(preview.dataUrl),
  };
}

function estimateBytes(dataUrl: string): number {
  // data:[mime];base64,XXXX — payload length is approximately
  // (length - prefix) * 3/4.
  const i = dataUrl.indexOf(',');
  if (i < 0) return dataUrl.length;
  return Math.floor((dataUrl.length - i - 1) * 0.75);
}
