import { useEffect, useState } from 'react';

/**
 * Loads an HTMLImageElement from a URL. Mirrors `use-image`'s interface
 * but with explicit cross-origin handling for canvas export.
 */
export function useHtmlImage(src: string | undefined): HTMLImageElement | undefined {
  const [image, setImage] = useState<HTMLImageElement | undefined>(undefined);
  useEffect(() => {
    if (!src) {
      setImage(undefined);
      return;
    }
    let cancelled = false;
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      if (!cancelled) setImage(img);
    };
    img.onerror = () => {
      if (!cancelled) setImage(undefined);
    };
    img.src = src;
    return () => {
      cancelled = true;
    };
  }, [src]);
  return image;
}
