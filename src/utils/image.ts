/**
 * Loads an image file into a data URL and returns its natural dimensions.
 * Using a data URL ensures the source is fully self-contained, avoiding
 * any blob revocation issues during async export.
 */
export function loadImageFile(
  file: File,
): Promise<{ src: string; naturalWidth: number; naturalHeight: number }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const src = reader.result as string;
      const img = new Image();
      img.onload = () =>
        resolve({ src, naturalWidth: img.naturalWidth, naturalHeight: img.naturalHeight });
      img.onerror = reject;
      img.src = src;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function loadImageFromUrl(
  url: string,
): Promise<{ src: string; naturalWidth: number; naturalHeight: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () =>
      resolve({ src: url, naturalWidth: img.naturalWidth, naturalHeight: img.naturalHeight });
    img.onerror = reject;
    img.src = url;
  });
}

/**
 * Loads an image and resolves only once decoded. Cached results are not provided
 * by the browser automatically across many calls in tight loops, so we keep a
 * simple in-memory cache to avoid re-decoding the same data URLs.
 */
const imageCache = new Map<string, Promise<HTMLImageElement>>();
export function loadDecodedImage(src: string): Promise<HTMLImageElement> {
  const cached = imageCache.get(src);
  if (cached) return cached;
  const p = new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
  imageCache.set(src, p);
  return p;
}

/**
 * Compute the largest centered rectangle inside the image whose aspect ratio
 * matches the frame — i.e. a "cover" crop. Pan (0..1) controls the alignment
 * along whichever axis has slack. The result is in image-source pixel space.
 */
export function computeCoverCrop(
  frameW: number,
  frameH: number,
  naturalW: number,
  naturalH: number,
  pan: { x: number; y: number } = { x: 0.5, y: 0.5 },
): { x: number; y: number; width: number; height: number } {
  if (frameW <= 0 || frameH <= 0 || naturalW <= 0 || naturalH <= 0) {
    return { x: 0, y: 0, width: naturalW, height: naturalH };
  }
  const frameAspect = frameW / frameH;
  const imageAspect = naturalW / naturalH;
  let cropW: number;
  let cropH: number;
  if (imageAspect > frameAspect) {
    cropH = naturalH;
    cropW = naturalH * frameAspect;
  } else {
    cropW = naturalW;
    cropH = naturalW / frameAspect;
  }
  const panX = Math.max(0, Math.min(1, pan.x));
  const panY = Math.max(0, Math.min(1, pan.y));
  return {
    x: (naturalW - cropW) * panX,
    y: (naturalH - cropH) * panY,
    width: cropW,
    height: cropH,
  };
}

/**
 * For contain: returns the displayed image rectangle inside the frame
 * (the frame itself is bigger or equal). The image keeps its native aspect.
 */
export function computeContainRect(
  frameW: number,
  frameH: number,
  naturalW: number,
  naturalH: number,
): { x: number; y: number; width: number; height: number } {
  const frameAspect = frameW / frameH;
  const imageAspect = naturalW / naturalH;
  let w: number;
  let h: number;
  if (imageAspect > frameAspect) {
    w = frameW;
    h = frameW / imageAspect;
  } else {
    h = frameH;
    w = frameH * imageAspect;
  }
  return {
    x: (frameW - w) / 2,
    y: (frameH - h) / 2,
    width: w,
    height: h,
  };
}
