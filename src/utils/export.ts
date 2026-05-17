import jsPDF from 'jspdf';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import Konva from 'konva';
import type { Slide } from '../types';

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
  format: 'png',
  scale: 2,
  quality: 0.96,
  transparent: false,
  sharpen: false,
};

/**
 * Render a slide's Konva Stage clone to a Canvas at the requested pixel ratio.
 * The clone approach avoids disturbing on-screen state (zoom/selection/transform handles).
 */
export async function renderStageToCanvas(
  stage: Konva.Stage,
  slide: Slide,
  options: { scale: number; transparent: boolean },
): Promise<HTMLCanvasElement> {
  const layer = stage.findOne<Konva.Layer>('.export-layer');
  if (!layer) throw new Error('Export layer not found');

  const pixelRatio = options.scale; // already absolute scale
  const dataUrl = layer.toDataURL({
    x: 0,
    y: 0,
    width: slide.width,
    height: slide.height,
    pixelRatio,
    mimeType: 'image/png',
    quality: 1,
  });

  const img = await loadImage(dataUrl);
  const canvas = document.createElement('canvas');
  canvas.width = slide.width * pixelRatio;
  canvas.height = slide.height * pixelRatio;
  const ctx = canvas.getContext('2d')!;
  if (!options.transparent) {
    // Fill base color first to avoid alpha banding on JPEG/PDF
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  ctx.drawImage(img, 0, 0);
  return canvas;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

/** Apply a light unsharp-mask style sharpening on a canvas */
function applySharpen(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d')!;
  const { width, height } = canvas;
  const src = ctx.getImageData(0, 0, width, height);
  const dst = ctx.createImageData(width, height);
  const s = src.data;
  const d = dst.data;
  // 3x3 sharpen kernel
  const k = [0, -1, 0, -1, 5, -1, 0, -1, 0];
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = (y * width + x) * 4;
      let r = 0,
        g = 0,
        b = 0;
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

/** Convert a canvas to a Blob with the chosen format */
function canvasToBlob(
  canvas: HTMLCanvasElement,
  format: ExportFormat,
  quality: number,
): Promise<Blob> {
  const mime =
    format === 'jpg' ? 'image/jpeg' : format === 'webp' ? 'image/webp' : 'image/png';
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('Canvas toBlob failed'))),
      mime,
      format === 'png' ? 1 : quality,
    );
  });
}

export async function exportSlideAsBlob(
  stage: Konva.Stage,
  slide: Slide,
  options: ExportOptions,
): Promise<Blob> {
  const transparent = options.transparent && options.format !== 'jpg' && options.format !== 'pdf';
  const canvas = await renderStageToCanvas(stage, slide, {
    scale: options.scale,
    transparent,
  });
  if (options.sharpen) applySharpen(canvas);
  if (options.format === 'pdf') {
    return await canvasToPdfBlob(canvas, slide);
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

export async function exportSlidesAsPdf(
  stage: Konva.Stage,
  slides: Slide[],
  options: ExportOptions,
  onSlideChange: (slideId: string) => Promise<void>,
): Promise<Blob> {
  if (slides.length === 0) throw new Error('No slides to export');
  const first = slides[0];
  const orientation = first.width >= first.height ? 'landscape' : 'portrait';
  const pdf = new jsPDF({
    unit: 'px',
    format: [first.width, first.height],
    orientation,
    compress: true,
  });

  for (let i = 0; i < slides.length; i++) {
    const slide = slides[i];
    await onSlideChange(slide.id);
    await waitFrame();
    const canvas = await renderStageToCanvas(stage, slide, {
      scale: options.scale,
      transparent: false,
    });
    if (options.sharpen) applySharpen(canvas);
    if (i > 0) {
      pdf.addPage([slide.width, slide.height], slide.width >= slide.height ? 'landscape' : 'portrait');
    }
    const dataUrl = canvas.toDataURL('image/jpeg', options.quality);
    pdf.addImage(dataUrl, 'JPEG', 0, 0, slide.width, slide.height);
  }
  return pdf.output('blob');
}

export async function exportSlidesAsZip(
  stage: Konva.Stage,
  slides: Slide[],
  options: ExportOptions,
  onSlideChange: (slideId: string) => Promise<void>,
  onProgress?: (done: number, total: number) => void,
): Promise<Blob> {
  const zip = new JSZip();
  const ext = options.format;
  for (let i = 0; i < slides.length; i++) {
    const slide = slides[i];
    await onSlideChange(slide.id);
    await waitFrame();
    const blob = await exportSlideAsBlob(stage, slide, options);
    const num = String(i + 1).padStart(2, '0');
    const safeName = slide.name.replace(/[^a-z0-9_-]+/gi, '_').slice(0, 40) || 'slide';
    zip.file(`${num}_${safeName}.${ext === 'pdf' ? 'pdf' : ext}`, blob);
    onProgress?.(i + 1, slides.length);
  }
  return zip.generateAsync({ type: 'blob', compression: 'STORE' });
}

export function downloadBlob(blob: Blob, filename: string) {
  saveAs(blob, filename);
}

function waitFrame(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
}

export function formatExtension(format: ExportFormat): string {
  return format === 'pdf' ? 'pdf' : format;
}
