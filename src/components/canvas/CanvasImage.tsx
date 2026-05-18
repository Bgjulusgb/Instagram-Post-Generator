import { memo, useEffect, useMemo, useRef } from 'react';
import { Group, Image as KonvaImage, Rect } from 'react-konva';
import Konva from 'konva';
import type { ImageElement, Slide } from '../../types';
import { useHtmlImage } from '../../hooks/useImage';
import { computeContainRect } from '../../utils/image';

interface Props {
  element: ImageElement;
  slide: Slide;
  onSelect: (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => void;
  onChange: (patch: Partial<ImageElement>) => void;
  isSelected: boolean;
  dragBoundFunc?: (
    id: string,
    width: number,
    height: number,
  ) => (pos: { x: number; y: number }) => { x: number; y: number };
}

/**
 * Image element renderer. Konva's `crop` parameter is always set so the
 * image is never stretched: width/height ratio of the crop matches the
 * frame, so the rendered image always preserves the photo's aspect.
 *
 * Adjustments are applied via Konva's native filter pipeline using a cached
 * pixel buffer, which guarantees the same output is produced for both the
 * on-screen preview and the offscreen export renderer.
 */
function CanvasImageInner({ element, onSelect, onChange, dragBoundFunc }: Props) {
  // Live canvas uses the downscaled preview when one exists (bounded filter
  // cache, no jank). Export uses element.src directly via the offscreen
  // renderer so quality is preserved.
  const image = useHtmlImage(element.previewSrc || element.src);
  const groupRef = useRef<Konva.Group>(null);
  const imgRef = useRef<Konva.Image>(null);

  // Derive the actual draw rectangle for the image inside its frame.
  // For 'cover' / 'fill' we draw at the full frame size with a crop that
  // matches the frame aspect — no stretching.
  // For 'contain' we shrink the drawn image so it fits inside the frame
  // and is letterboxed.
  //
  // Crops are stored in source-pixel space (element.naturalWidth/Height).
  // When we display the lower-resolution preview the loaded bitmap is
  // smaller, so we scale the crop rect onto whichever bitmap actually
  // rendered. The export renderer uses `src` directly so its crop is 1:1.
  const draw = useMemo(() => {
    if (!image) return null;
    const imgScale = image.naturalWidth / element.naturalWidth;
    if (element.fitMode === 'contain') {
      const fit = computeContainRect(
        element.width,
        element.height,
        element.naturalWidth,
        element.naturalHeight,
      );
      return {
        x: fit.x,
        y: fit.y,
        width: fit.width,
        height: fit.height,
        crop: { x: 0, y: 0, width: image.naturalWidth, height: image.naturalHeight },
      };
    }
    if (element.fitMode === 'fill') {
      return {
        x: 0,
        y: 0,
        width: element.width,
        height: element.height,
        crop: { x: 0, y: 0, width: image.naturalWidth, height: image.naturalHeight },
      };
    }
    return {
      x: 0,
      y: 0,
      width: element.width,
      height: element.height,
      crop: {
        x: element.crop.x * imgScale,
        y: element.crop.y * imgScale,
        width: element.crop.width * imgScale,
        height: element.crop.height * imgScale,
      },
    };
  }, [
    image,
    element.fitMode,
    element.width,
    element.height,
    element.naturalWidth,
    element.naturalHeight,
    element.crop,
  ]);

  // Apply Lightroom-style preview filters via Konva's cache + filter pipeline.
  // Cache is invalidated whenever adjustments, crop or geometry change.
  useEffect(() => {
    const node = imgRef.current;
    if (!node || !image) return;
    const adj = element.adjustments;
    try {
      node.cache({ pixelRatio: 1.5 });
    } catch {
      return;
    }
    const filters = [
      Konva.Filters.Brighten,
      Konva.Filters.Contrast,
      Konva.Filters.HSL,
    ];
    if (adj.blur > 0) filters.push(Konva.Filters.Blur);
    if (adj.grayscale > 0) filters.push(Konva.Filters.Grayscale);
    node.filters(filters as any);
    node.brightness(adj.exposure * 0.4);
    node.contrast(adj.contrast * 80);
    node.saturation(adj.saturation + adj.vibrance * 0.5);
    node.hue(adj.temperature * 12 + adj.tint * 6);
    node.luminance(adj.shadows * 0.15 + adj.highlights * -0.05);
    if (adj.blur > 0) node.blurRadius(adj.blur);
    node.getLayer()?.batchDraw();
  }, [image, draw, element.adjustments]);

  if (!image) {
    return (
      <Rect
        x={element.x}
        y={element.y}
        width={element.width}
        height={element.height}
        rotation={element.rotation}
        fill="rgba(255,255,255,0.04)"
        stroke="rgba(255,255,255,0.15)"
        dash={[6, 6]}
        listening={true}
        onMouseDown={onSelect}
        onTouchStart={onSelect}
        id={element.id}
      />
    );
  }

  return (
    <Group
      ref={groupRef}
      id={element.id}
      x={element.x}
      y={element.y}
      width={element.width}
      height={element.height}
      rotation={element.rotation}
      opacity={element.opacity}
      visible={element.visible}
      listening={!element.locked}
      globalCompositeOperation={
        element.blendMode === 'normal' ? undefined : (element.blendMode as any)
      }
      draggable={!element.locked}
      onMouseDown={onSelect}
      onTouchStart={onSelect}
      dragBoundFunc={dragBoundFunc?.(element.id, element.width, element.height)}
      onDragEnd={(e) => {
        onChange({ x: e.target.x(), y: e.target.y() });
      }}
      shadowColor={element.shadow?.color}
      shadowBlur={element.shadow?.blur}
      shadowOffsetX={element.shadow?.offsetX}
      shadowOffsetY={element.shadow?.offsetY}
      shadowOpacity={element.shadow?.opacity}
      clipFunc={
        element.cornerRadius > 0
          ? (ctx) => {
              const r = Math.min(element.cornerRadius, element.width / 2, element.height / 2);
              ctx.beginPath();
              ctx.moveTo(r, 0);
              ctx.lineTo(element.width - r, 0);
              ctx.arcTo(element.width, 0, element.width, r, r);
              ctx.lineTo(element.width, element.height - r);
              ctx.arcTo(element.width, element.height, element.width - r, element.height, r);
              ctx.lineTo(r, element.height);
              ctx.arcTo(0, element.height, 0, element.height - r, r);
              ctx.lineTo(0, r);
              ctx.arcTo(0, 0, r, 0, r);
              ctx.closePath();
            }
          : undefined
      }
    >
      {draw && (
        <KonvaImage
          ref={imgRef}
          image={image}
          x={draw.x}
          y={draw.y}
          width={draw.width}
          height={draw.height}
          crop={draw.crop}
          listening={!element.locked}
        />
      )}
    </Group>
  );
}

export const CanvasImage = memo(CanvasImageInner);
