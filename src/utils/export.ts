import jsPDF from 'jspdf';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import type { Slide } from '../types';
import { preloadSlideImages, renderSlideOffscreen, waitForFonts } from './exportRenderer';

export type ExportFormat = 'png' | 'jpg' | 'webp' | 'pdf';

export interface ExportOptions {
  format: ExportFormat;
  /** Pixel ratio multiplier vs. slide native resolution (1, 2, 4) */
  scale: number;
  /** 0..1 quality for lossy formats */
  quality: number;
  /** Use transparent background (png/webp only) */
  transparent: boolean;
  /** Sharpening pass on the export */
  sharpen: boolean;
}

export const DEFAULT_EXPORT_OPTIONS: ExportOptions = {
  // PNG by default — lossless, max quality, Instagram accepts it for posts.
  format: 'png',
  // 2× pixel density covers Retina phones; Instagram itself caps inbound at
  // 1080 px wide and re-encodes, so 2× is the sweet spot vs file size.
  scale: 2,
  // Near-max JPEG/WEBP quality. We avoid 1.0 only to keep file size sane
  // for ZIP/PDF bundles; Instagram further re-encodes anything we upload.
  quality: 0.98,
  transparent: false,
  // Light unsharp mask compensates for Instagram's aggressive re-encode.
  sharpen: false,
};

/** Render a slide to an HTMLCanvasElement at the requested export resolution. */
export async function renderSlide(
  slide: Slide,
  options: ExportOptions,
): Promise<HTMLCanvasElement> {
  const transparent =
    options.transparent && options.format !== 'jpg' && options.format !== 'pdf';
  const canvas = await renderSlideOffscreen(slide, {
    pixelRatio: options.scale,
    transparent,
  });
  if (!transparent) {
    fillSolidBackground(canvas, '#000000');
  }
  if (options.sharpen) {
    applySharpen(canvas);
  }
  return canvas;
}

function fillSolidBackground(canvas: HTMLCanvasElement, color: string) {
  // Konva already drew the slide background; this pass guarantees a fully
  // opaque image for JPEG/PDF where transparency would otherwise read as black
  // banding from the canvas alpha channel.
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.save();
  ctx.globalCompositeOperation = 'destination-over';
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.restore();
}

/** Apply a light unsharp-mask style sharpening on a canvas */
function applySharpen(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const { width, height } = canvas;
  if (width === 0 || height === 0) return;
  const src = ctx.getImageData(0, 0, width, height);
  const dst = ctx.createImageData(width, height);
  const s = src.data;
  const d = dst.data;
  const k = [0, -1, 0, -1, 5, -1, 0, -1, 0];
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = (y * width + x) * 4;
      let r = 0;
      let g = 0;
      let b = 0;
      let ki = 0;
      for (let ky = -1; ky <= 1; ky++) {
        for (let kx = -1; kx <= 1; kx++) {
          const ni = ((y + ky) * width + (x + kx)) * 4;
          r += s[ni] * k[ki];
          g += s[ni + 1] * k[ki];
          b += s[ni + 2] * k[ki];
          ki++;
        }
      }
      d[idx] = Math.max(0, Math.min(255, r));
      d[idx + 1] = Math.max(0, Math.min(255, g));
      d[idx + 2] = Math.max(0, Math.min(255, b));
      d[idx + 3] = s[idx + 3];
    }
  }
  ctx.putImageData(dst, 0, 0);
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  format: ExportFormat,
  quality: number,
): Promise<Blob> {
  const mime = format === 'jpg' ? 'image/jpeg' : format === 'webp' ? 'image/webp' : 'image/png';
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('Canvas toBlob failed'))),
      mime,
      format === 'png' ? 1 : quality,
    );
  });
}

export async function exportSlideAsBlob(slide: Slide, options: ExportOptions): Promise<Blob> {
  await waitForFonts([slide]);
  await preloadSlideImages([slide]);
  const canvas = await renderSlide(slide, options);
  if (options.format === 'pdf') {
    return canvasToPdfBlob(canvas, slide);
  }
  return canvasToBlob(canvas, options.format, options.quality);
}

async function canvasToPdfBlob(canvas: HTMLCanvasElement, slide: Slide): Promise<Blob> {
  const orientation = slide.width >= slide.height ? 'landscape' : 'portrait';
  const pdf = new jsPDF({
    unit: 'px',
    format: [slide.width, slide.height],
    orientation,
    compress: true,
  });
  const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
  pdf.addImage(dataUrl, 'JPEG', 0, 0, slide.width, slide.height);
  return pdf.output('blob');
}

export interface BulkProgress {
  done: number;
  total: number;
  current: string;
}

export async function exportSlidesAsPdf(
  slides: Slide[],
  options: ExportOptions,
  onProgress?: (p: BulkProgress) => void,
): Promise<Blob> {
  if (slides.length === 0) throw new Error('No slides to export');
  await waitForFonts(slides);
  await preloadSlideImages(slides);

  const first = slides[0];
  const pdf = new jsPDF({
    unit: 'px',
    format: [first.width, first.height],
    orientation: first.width >= first.height ? 'landscape' : 'portrait',
    compress: true,
  });

  for (let i = 0; i < slides.length; i++) {
    const slide = slides[i];
    onProgress?.({ done: i, total: slides.length, current: slide.name });
    const canvas = await renderSlide(slide, { ...options, format: 'pdf', transparent: false });
    if (i > 0) {
      pdf.addPage(
        [slide.width, slide.height],
        slide.width >= slide.height ? 'landscape' : 'portrait',
      );
    }
    const dataUrl = canvas.toDataURL('image/jpeg', options.quality);
    pdf.addImage(dataUrl, 'JPEG', 0, 0, slide.width, slide.height);
  }
  onProgress?.({ done: slides.length, total: slides.length, current: '' });
  return pdf.output('blob');
}

export async function exportSlidesAsZip(
  slides: Slide[],
  options: ExportOptions,
  onProgress?: (p: BulkProgress) => void,
): Promise<Blob> {
  await waitForFonts(slides);
  await preloadSlideImages(slides);

  const zip = new JSZip();
  const ext = options.format;
  for (let i = 0; i < slides.length; i++) {
    const slide = slides[i];
    onProgress?.({ done: i, total: slides.length, current: slide.name });
    const blob = await exportSlideAsBlob(slide, options);
    const num = String(i + 1).padStart(2, '0');
    const safeName = slide.name.replace(/[^a-z0-9_-]+/gi, '_').slice(0, 40) || 'slide';
    zip.file(`${num}_${safeName}.${ext}`, blob);
  }
  onProgress?.({ done: slides.length, total: slides.length, current: '' });
  return zip.generateAsync({ type: 'blob', compression: 'STORE' });
}

/**
 * Save a blob to the user's machine. In Electron we route through the
 * native save dialog so the OS picks where the file lands. In the browser
 * we fall back to `file-saver`, which uses a hidden anchor + download attr.
 */
export async function downloadBlob(blob: Blob, filename: string): Promise<string | null> {
  const api = typeof window !== 'undefined' ? window.electronAPI : undefined;
  if (api?.isElectron) {
    const bytes = await blob.arrayBuffer();
    const m = /\.([a-z0-9]+)$/i.exec(filename);
    const ext = m ? m[1].toLowerCase() : 'bin';
    if (ext === 'zip' || ext === 'pdf') {
      return await api.saveBundleFile(bytes, ext, filename);
    }
    return await api.saveImageFile(bytes, ext, filename);
  }
  saveAs(blob, filename);
  return null;
}

export function formatExtension(format: ExportFormat): string {
  return format === 'pdf' ? 'pdf' : format;
}
