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
