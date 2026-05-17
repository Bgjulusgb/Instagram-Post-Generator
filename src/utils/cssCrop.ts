/**
 * Translates a Konva-style image crop ({ x, y, width, height } in image pixel
 * space) into CSS `background-size` / `background-position` values so DOM
 * thumbnails can mirror the canvas crop pixel-for-pixel.
 */
export function cssCropStyle(
  crop: { x: number; y: number; width: number; height: number },
  natural: { width: number; height: number },
): { backgroundSize: string; backgroundPosition: string } {
  const scaleX = (natural.width / Math.max(1, crop.width)) * 100;
  const scaleY = (natural.height / Math.max(1, crop.height)) * 100;
  const posX =
    natural.width > crop.width
      ? (crop.x / (natural.width - crop.width)) * 100
      : 0;
  const posY =
    natural.height > crop.height
      ? (crop.y / (natural.height - crop.height)) * 100
      : 0;
  return {
    backgroundSize: `${scaleX}% ${scaleY}%`,
    backgroundPosition: `${posX}% ${posY}%`,
  };
}
