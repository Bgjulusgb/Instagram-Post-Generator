import { useEffect, useRef } from 'react';
import { Group, Image as KonvaImage, Rect } from 'react-konva';
import Konva from 'konva';
import type { Slide } from '../../types';
import { useHtmlImage } from '../../hooks/useImage';

interface Props {
  slide: Slide;
}

/**
 * Renders a slide's background fill. Panorama slides project a portion of a
 * larger shared image based on `panoramaIndex` / `panoramaTotal`.
 */
export function CanvasBackground({ slide }: Props) {
  const bg = slide.background;
  const imgSrc = bg.kind === 'image' ? bg.src : undefined;
  const image = useHtmlImage(imgSrc);
  const imgNode = useRef<Konva.Image>(null);

  useEffect(() => {
    if (!imgNode.current || !image) return;
    if (bg.kind === 'image' && bg.blur > 0) {
      imgNode.current.cache();
      imgNode.current.filters([Konva.Filters.Blur]);
      imgNode.current.blurRadius(bg.blur);
      imgNode.current.getLayer()?.batchDraw();
    } else {
      imgNode.current.clearCache();
      imgNode.current.filters([]);
      imgNode.current.getLayer()?.batchDraw();
    }
  }, [bg, image]);

  if (bg.kind === 'color') {
    return <Rect x={0} y={0} width={slide.width} height={slide.height} fill={bg.color} listening={false} />;
  }

  if (bg.kind === 'gradient') {
    const angle = (bg.angle * Math.PI) / 180;
    const dx = Math.cos(angle);
    const dy = Math.sin(angle);
    const cx = slide.width / 2;
    const cy = slide.height / 2;
    const r = Math.max(slide.width, slide.height) / 2;
    return (
      <Rect
        x={0}
        y={0}
        width={slide.width}
        height={slide.height}
        fillLinearGradientStartPoint={{ x: cx - dx * r, y: cy - dy * r }}
        fillLinearGradientEndPoint={{ x: cx + dx * r, y: cy + dy * r }}
        fillLinearGradientColorStops={[0, bg.from, 1, bg.to]}
        listening={false}
      />
    );
  }

  if (bg.kind === 'image' && image) {
    let crop: { x: number; y: number; width: number; height: number } | undefined;

    if (slide.panoramaGroupId && slide.panoramaTotal && slide.panoramaIndex != null) {
      // Distribute the natural image evenly across the panorama group.
      const part = bg.naturalWidth / slide.panoramaTotal;
      crop = {
        x: part * slide.panoramaIndex,
        y: 0,
        width: part,
        height: bg.naturalHeight,
      };
    }

    return (
      <Group listening={false}>
        <KonvaImage
          ref={imgNode}
          image={image}
          width={slide.width}
          height={slide.height}
          crop={crop}
          listening={false}
        />
      </Group>
    );
  }

  return <Rect x={0} y={0} width={slide.width} height={slide.height} fill="#0a0a0a" listening={false} />;
}
