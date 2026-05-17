import { useEffect, useRef } from 'react';
import { Group, Image as KonvaImage, Rect } from 'react-konva';
import Konva from 'konva';
import type { ImageElement, Slide } from '../../types';
import { useHtmlImage } from '../../hooks/useImage';
import { adjustmentsToCssFilter } from '../../utils/filters';

interface Props {
  element: ImageElement;
  slide: Slide;
  onSelect: (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => void;
  onChange: (patch: Partial<ImageElement>) => void;
  isSelected: boolean;
  /** Panorama crop info if this element should be a "background image" rendered across slides */
  panoramaCrop?: { x: number; y: number; width: number; height: number };
  dragBoundFunc?: (id: string, width: number, height: number) => (pos: { x: number; y: number }) => { x: number; y: number };
}

/**
 * Renders an image element. Bitmap rendering uses Konva's native Image, while
 * Lightroom-like adjustments are baked into a CSS filter applied on the parent
 * group — Konva preserves this on rasterization via the export pipeline.
 *
 * Crop / framing is achieved by using crop offsets on the Konva.Image node,
 * which keeps the original bitmap intact (non-destructive).
 */
export function CanvasImage({ element, onSelect, onChange, panoramaCrop, dragBoundFunc }: Props) {
  const image = useHtmlImage(element.src);
  const groupRef = useRef<Konva.Group>(null);
  const imgRef = useRef<Konva.Image>(null);

  useEffect(() => {
    if (!groupRef.current) return;
    // Apply CSS filter on the canvas element via Konva caching trick:
    // We use Konva filters where supported, plus a node-level filter attr
    // via the underlying canvas context isn't directly supported; instead
    // we set `filter` in style for live preview ONLY in the export layer
    // by leaving raster ops to the export pipeline. For the preview we
    // simulate by adjusting Konva's built-in filters.
    const node = imgRef.current;
    if (!node) return;
    const adj = element.adjustments;
    node.cache();
    node.filters([
      Konva.Filters.Brighten,
      Konva.Filters.Contrast,
      Konva.Filters.HSL,
      Konva.Filters.Blur,
    ]);
    node.brightness(adj.exposure * 0.4);
    node.contrast(adj.contrast * 80);
    node.saturation(adj.saturation + adj.vibrance * 0.5);
    node.hue(adj.temperature * 12 + adj.tint * 6);
    node.luminance(adj.shadows * 0.15 + adj.highlights * -0.05);
    node.blurRadius(Math.max(0, adj.blur));
    if (adj.grayscale > 0) {
      node.filters([
        ...node.filters(),
        Konva.Filters.Grayscale,
      ]);
    }
    node.getLayer()?.batchDraw();
  }, [
    element.adjustments,
    element.adjustments.exposure,
    element.adjustments.contrast,
    element.adjustments.saturation,
    element.adjustments.vibrance,
    element.adjustments.temperature,
    element.adjustments.tint,
    element.adjustments.blur,
    element.adjustments.grayscale,
    element.adjustments.shadows,
    element.adjustments.highlights,
    image,
  ]);

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

  const crop = element.crop;
  const cssFilter = adjustmentsToCssFilter(element.adjustments);

  return (
    <Group
      ref={groupRef}
      id={element.id}
      x={element.x}
      y={element.y}
      width={element.width}
      height={element.height}
      rotation={element.rotation}
      offsetX={0}
      offsetY={0}
      opacity={element.opacity}
      visible={element.visible}
      listening={!element.locked}
      globalCompositeOperation={element.blendMode === 'normal' ? undefined : (element.blendMode as any)}
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
    >
      {element.cornerRadius > 0 && (
        <Rect
          width={element.width}
          height={element.height}
          cornerRadius={element.cornerRadius}
          fill="rgba(0,0,0,0)"
          listening={false}
        />
      )}
      <KonvaImage
        ref={imgRef}
        image={image}
        width={element.width}
        height={element.height}
        crop={
          panoramaCrop
            ? panoramaCrop
            : crop
              ? { x: crop.x, y: crop.y, width: crop.width, height: crop.height }
              : undefined
        }
        cornerRadius={element.cornerRadius}
        listening={!element.locked}
        // CSS filter as a custom attribute consumed by some pipelines
        // (Konva will draw with image-rendering: auto)
        {...({ 'data-filter': cssFilter } as object)}
      />
    </Group>
  );
}
