import Konva from 'konva';
import type { AnyElement, ImageElement, ShapeElement, Slide, TextElement } from '../types';
import { computeContainRect, loadDecodedImage } from './image';

/**
 * Renders a single slide to an offscreen Konva stage and returns the canvas.
 *
 * This pipeline is fully independent of the on-screen editor: it does not
 * touch the currently selected slide, does not depend on React rendering
 * cycles, and waits for every image to fully decode before rendering. That
 * gives deterministic, repeatable exports.
 *
 * `pixelRatio` controls the absolute output density. The stage itself is sized
 * to `slide.width × slide.height` in CSS pixels and `pixelRatio` is forwarded
 * to `stage.toCanvas` so the final bitmap is `slide.width * pixelRatio` wide.
 */
export async function renderSlideOffscreen(
  slide: Slide,
  options: {
    pixelRatio: number;
    transparent: boolean;
  },
): Promise<HTMLCanvasElement> {
  // Container is detached from layout to avoid reflow / scrollbar flicker.
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.left = '-99999px';
  container.style.top = '-99999px';
  container.style.width = `${slide.width}px`;
  container.style.height = `${slide.height}px`;
  container.style.pointerEvents = 'none';
  document.body.appendChild(container);

  try {
    const stage = new Konva.Stage({
      container,
      width: slide.width,
      height: slide.height,
    });
    const layer = new Konva.Layer({
      // Hard-clip to slide bounds so elements that overflow during editing
      // don't bleed into the export.
      clipFunc: (ctx) => {
        ctx.rect(0, 0, slide.width, slide.height);
      },
    });
    stage.add(layer);

    await drawBackground(layer, slide);
    for (const el of slide.elements) {
      if (!el.visible) continue;
      if (el.type === 'image') await drawImage(layer, el as ImageElement);
      else if (el.type === 'text') drawText(layer, el as TextElement);
      else if (el.type === 'shape') drawShape(layer, el as ShapeElement);
    }

    // Force a synchronous redraw before reading the canvas
    layer.draw();

    return stage.toCanvas({
      pixelRatio: options.pixelRatio,
      width: slide.width,
      height: slide.height,
      x: 0,
      y: 0,
      mimeType: options.transparent ? 'image/png' : 'image/png',
    }) as HTMLCanvasElement;
  } finally {
    // Always clean up. Konva caches some references but destroy releases them.
    try {
      container.remove();
    } catch {
      // ignore
    }
  }
}

async function drawBackground(layer: Konva.Layer, slide: Slide) {
  const bg = slide.background;
  if (bg.kind === 'color') {
    layer.add(
      new Konva.Rect({
        x: 0,
        y: 0,
        width: slide.width,
        height: slide.height,
        fill: bg.color,
        listening: false,
      }),
    );
    return;
  }
  if (bg.kind === 'gradient') {
    const angle = (bg.angle * Math.PI) / 180;
    const dx = Math.cos(angle);
    const dy = Math.sin(angle);
    const cx = slide.width / 2;
    const cy = slide.height / 2;
    const r = Math.max(slide.width, slide.height) / 2;
    layer.add(
      new Konva.Rect({
        x: 0,
        y: 0,
        width: slide.width,
        height: slide.height,
        fillLinearGradientStartPoint: { x: cx - dx * r, y: cy - dy * r },
        fillLinearGradientEndPoint: { x: cx + dx * r, y: cy + dy * r },
        fillLinearGradientColorStops: [0, bg.from, 1, bg.to],
        listening: false,
      }),
    );
    return;
  }
  if (bg.kind === 'image') {
    const img = await loadDecodedImage(bg.src);
    const node = new Konva.Image({
      image: img,
      x: 0,
      y: 0,
      width: slide.width,
      height: slide.height,
      crop: bg.crop,
      listening: false,
    });
    layer.add(node);
    if (bg.blur > 0) {
      try {
        node.cache({ pixelRatio: 1 });
        node.filters([Konva.Filters.Blur]);
        node.blurRadius(bg.blur);
      } catch {
        // ignore
      }
    }
  }
}

async function drawImage(layer: Konva.Layer, el: ImageElement) {
  const img = await loadDecodedImage(el.src);

  const group = new Konva.Group({
    x: el.x,
    y: el.y,
    width: el.width,
    height: el.height,
    rotation: el.rotation,
    opacity: el.opacity,
    globalCompositeOperation: el.blendMode === 'normal' ? 'source-over' : (el.blendMode as any),
    shadowColor: el.shadow?.color,
    shadowBlur: el.shadow?.blur,
    shadowOffsetX: el.shadow?.offsetX,
    shadowOffsetY: el.shadow?.offsetY,
    shadowOpacity: el.shadow?.opacity,
    clipFunc:
      el.cornerRadius > 0
        ? (ctx) => {
            const r = Math.min(el.cornerRadius, el.width / 2, el.height / 2);
            ctx.beginPath();
            ctx.moveTo(r, 0);
            ctx.lineTo(el.width - r, 0);
            ctx.arcTo(el.width, 0, el.width, r, r);
            ctx.lineTo(el.width, el.height - r);
            ctx.arcTo(el.width, el.height, el.width - r, el.height, r);
            ctx.lineTo(r, el.height);
            ctx.arcTo(0, el.height, 0, el.height - r, r);
            ctx.lineTo(0, r);
            ctx.arcTo(0, 0, r, 0, r);
            ctx.closePath();
          }
        : undefined,
  });

  let draw: { x: number; y: number; width: number; height: number; crop: typeof el.crop };
  if (el.fitMode === 'contain') {
    const fit = computeContainRect(el.width, el.height, el.naturalWidth, el.naturalHeight);
    draw = {
      ...fit,
      crop: { x: 0, y: 0, width: el.naturalWidth, height: el.naturalHeight },
    };
  } else if (el.fitMode === 'fill') {
    draw = {
      x: 0,
      y: 0,
      width: el.width,
      height: el.height,
      crop: { x: 0, y: 0, width: el.naturalWidth, height: el.naturalHeight },
    };
  } else {
    draw = {
      x: 0,
      y: 0,
      width: el.width,
      height: el.height,
      crop: el.crop,
    };
  }

  const node = new Konva.Image({
    image: img,
    x: draw.x,
    y: draw.y,
    width: draw.width,
    height: draw.height,
    crop: draw.crop,
    listening: false,
  });
  group.add(node);
  layer.add(group);

  // Apply Lightroom-style adjustments via Konva filters. The cache pixelRatio
  // matters: a higher value means the cached buffer is sharper, but eats RAM.
  // We use 1.0 here because the parent stage's own pixelRatio handles the
  // export resolution multiplier.
  const adj = el.adjustments;
  const filters = [
    Konva.Filters.Brighten,
    Konva.Filters.Contrast,
    Konva.Filters.HSL,
  ];
  if (adj.blur > 0) filters.push(Konva.Filters.Blur);
  if (adj.grayscale > 0) filters.push(Konva.Filters.Grayscale);
  try {
    node.cache({ pixelRatio: 1 });
    node.filters(filters as any);
    node.brightness(adj.exposure * 0.4);
    node.contrast(adj.contrast * 80);
    node.saturation(adj.saturation + adj.vibrance * 0.5);
    node.hue(adj.temperature * 12 + adj.tint * 6);
    node.luminance(adj.shadows * 0.15 + adj.highlights * -0.05);
    if (adj.blur > 0) node.blurRadius(adj.blur);
  } catch {
    // ignore filter setup errors
  }
}

function drawText(layer: Konva.Layer, el: TextElement) {
  const group = new Konva.Group({
    x: el.x,
    y: el.y,
    rotation: el.rotation,
    opacity: el.opacity,
    globalCompositeOperation: el.blendMode === 'normal' ? 'source-over' : (el.blendMode as any),
    shadowColor: el.shadow?.color,
    shadowBlur: el.shadow?.blur,
    shadowOffsetX: el.shadow?.offsetX,
    shadowOffsetY: el.shadow?.offsetY,
    shadowOpacity: el.shadow?.opacity,
  });
  const fontStyle = `${el.italic ? 'italic ' : ''}${el.fontWeight}`;
  const textProps: Konva.TextConfig = {
    text: el.text,
    width: el.width,
    fontSize: el.fontSize,
    fontFamily: el.fontFamily,
    fontStyle,
    align: el.align,
    lineHeight: el.lineHeight,
    letterSpacing: el.letterSpacing,
    textDecoration: el.underline ? 'underline' : undefined,
    stroke: el.stroke?.color,
    strokeWidth: el.stroke?.width,
    fillAfterStrokeEnabled: true,
    wrap: 'word',
    listening: false,
  };
  if (el.gradient) {
    const a = (el.gradient.angle * Math.PI) / 180;
    const dx = Math.cos(a);
    const dy = Math.sin(a);
    const r = Math.max(el.width, el.height) / 2;
    textProps.fillLinearGradientStartPoint = {
      x: el.width / 2 - dx * r,
      y: el.height / 2 - dy * r,
    };
    textProps.fillLinearGradientEndPoint = {
      x: el.width / 2 + dx * r,
      y: el.height / 2 + dy * r,
    };
    textProps.fillLinearGradientColorStops = [0, el.gradient.from, 1, el.gradient.to];
  } else {
    textProps.fill = el.fill;
  }
  const textNode = new Konva.Text(textProps);
  group.add(textNode);
  layer.add(group);
}

function drawShape(layer: Konva.Layer, el: ShapeElement) {
  const group = new Konva.Group({
    x: el.x,
    y: el.y,
    rotation: el.rotation,
    opacity: el.opacity,
    globalCompositeOperation: el.blendMode === 'normal' ? 'source-over' : (el.blendMode as any),
    shadowColor: el.shadow?.color,
    shadowBlur: el.shadow?.blur,
    shadowOffsetX: el.shadow?.offsetX,
    shadowOffsetY: el.shadow?.offsetY,
    shadowOpacity: el.shadow?.opacity,
  });
  const common = {
    fill: el.fill,
    stroke: el.stroke?.color,
    strokeWidth: el.stroke?.width ?? 0,
    listening: false,
  };
  let shapeNode: Konva.Shape | null = null;
  if (el.shape === 'rect') {
    shapeNode = new Konva.Rect({
      width: el.width,
      height: el.height,
      cornerRadius: el.cornerRadius,
      ...common,
    });
  } else if (el.shape === 'ellipse') {
    shapeNode = new Konva.Ellipse({
      x: el.width / 2,
      y: el.height / 2,
      radiusX: el.width / 2,
      radiusY: el.height / 2,
      ...common,
    });
  } else if (el.shape === 'triangle') {
    shapeNode = new Konva.RegularPolygon({
      x: el.width / 2,
      y: el.height / 2,
      sides: 3,
      radius: Math.min(el.width, el.height) / 2,
      ...common,
    });
  } else if (el.shape === 'star') {
    shapeNode = new Konva.Star({
      x: el.width / 2,
      y: el.height / 2,
      numPoints: 5,
      innerRadius: Math.min(el.width, el.height) / 4,
      outerRadius: Math.min(el.width, el.height) / 2,
      ...common,
    });
  } else if (el.shape === 'line') {
    shapeNode = new Konva.Line({
      points: [0, el.height / 2, el.width, el.height / 2],
      stroke: el.fill,
      strokeWidth: Math.max(2, el.height),
      lineCap: 'round',
      listening: false,
    });
  }
  if (shapeNode) group.add(shapeNode);
  layer.add(group);
}

/** Pre-load every image source in a set of slides. Called before the bulk
 *  export so progress reporting accurately reflects render time, not decode time. */
export async function preloadSlideImages(slides: Slide[]): Promise<void> {
  const sources = new Set<string>();
  for (const slide of slides) {
    if (slide.background.kind === 'image') sources.add(slide.background.src);
    for (const el of slide.elements) {
      if (el.type === 'image') sources.add(el.src);
    }
  }
  await Promise.all(Array.from(sources).map((s) => loadDecodedImage(s).catch(() => null)));
}

/** Wait until all referenced fonts are ready (Google Fonts on first export). */
export async function waitForFonts(slides: Slide[]): Promise<void> {
  const families = new Set<string>();
  for (const slide of slides) {
    for (const el of slide.elements) {
      if (el.type === 'text') families.add(el.fontFamily);
    }
  }
  try {
    await Promise.all(
      Array.from(families).map((f) =>
        document.fonts.load(`12px "${f}"`).catch(() => null),
      ),
    );
    await document.fonts.ready;
  } catch {
    // ignore
  }
}

export type { AnyElement };
