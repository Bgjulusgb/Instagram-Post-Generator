export type ElementType = 'image' | 'text' | 'shape';

export type ShapeKind = 'rect' | 'ellipse' | 'line' | 'triangle' | 'star';

export type BlendMode =
  | 'normal'
  | 'multiply'
  | 'screen'
  | 'overlay'
  | 'darken'
  | 'lighten'
  | 'color-dodge'
  | 'color-burn'
  | 'soft-light'
  | 'hard-light'
  | 'difference'
  | 'exclusion';

export interface BaseElement {
  id: string;
  type: ElementType;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  opacity: number; // 0..1
  locked: boolean;
  visible: boolean;
  blendMode: BlendMode;
  shadow?: {
    color: string;
    blur: number;
    offsetX: number;
    offsetY: number;
    opacity: number;
  };
}

export interface ImageAdjustments {
  exposure: number; // -1..1
  contrast: number; // -1..1
  highlights: number; // -1..1
  shadows: number; // -1..1
  whites: number; // -1..1
  blacks: number; // -1..1
  saturation: number; // -1..1
  vibrance: number; // -1..1
  temperature: number; // -1..1 (blue<->yellow)
  tint: number; // -1..1 (green<->magenta)
  grain: number; // 0..1
  blur: number; // 0..30
  grayscale: number; // 0..1
}

export const DEFAULT_ADJUSTMENTS: ImageAdjustments = {
  exposure: 0,
  contrast: 0,
  highlights: 0,
  shadows: 0,
  whites: 0,
  blacks: 0,
  saturation: 0,
  vibrance: 0,
  temperature: 0,
  tint: 0,
  grain: 0,
  blur: 0,
  grayscale: 0,
};

export interface ImageElement extends BaseElement {
  type: 'image';
  /** Export-quality source. Capped at MAX_SOURCE_DIMENSION during import. */
  src: string;
  /**
   * Live-canvas preview. Capped at MAX_PREVIEW_DIMENSION. The on-screen
   * renderer uses this so Konva's filter cache stays small even when the
   * user dropped a 24 MP photo. Optional for backward-compatibility with
   * pre-preview projects; the renderer falls back to `src` if missing.
   */
  previewSrc?: string;
  naturalWidth: number;
  naturalHeight: number;
  /** How the image is fitted inside the element frame */
  fitMode: ImageFitMode;
  /**
   * Crop in image-source pixel space. Always defined — its width/height ratio
   * matches the element frame's aspect ratio when fitMode is 'cover'/'contain'
   * so the image never stretches.
   */
  crop: { x: number; y: number; width: number; height: number };
  /** Pan position 0..1 used to recompute the crop on resize while keeping focus */
  pan: { x: number; y: number };
  cornerRadius: number;
  adjustments: ImageAdjustments;
  /** Optional filter preset name */
  preset?: string;
}

export type ImageFitMode = 'cover' | 'contain' | 'fill';

export type TextAlign = 'left' | 'center' | 'right' | 'justify';
export type FontWeight = 300 | 400 | 500 | 600 | 700 | 800;

export interface TextElement extends BaseElement {
  type: 'text';
  text: string;
  fontFamily: string;
  fontSize: number;
  fontWeight: FontWeight;
  italic: boolean;
  underline: boolean;
  fill: string;
  align: TextAlign;
  lineHeight: number;
  letterSpacing: number;
  stroke?: { color: string; width: number };
  /** Gradient fill (overrides solid fill if present) */
  gradient?: { from: string; to: string; angle: number };
  /** Curved text along an arc */
  curve?: { radius: number };
  autoResize: boolean;
}

export interface ShapeElement extends BaseElement {
  type: 'shape';
  shape: ShapeKind;
  fill: string;
  stroke?: { color: string; width: number };
  cornerRadius: number;
  gradient?: { from: string; to: string; angle: number };
}

export type AnyElement = ImageElement | TextElement | ShapeElement;

export type BackgroundFill =
  | { kind: 'color'; color: string }
  | { kind: 'gradient'; from: string; to: string; angle: number }
  | {
      kind: 'image';
      /** Export-quality source. */
      src: string;
      /** Optional canvas preview — falls back to `src` for old projects. */
      previewSrc?: string;
      naturalWidth: number;
      naturalHeight: number;
      blur: number;
      /**
       * Crop in image-source pixel space. Pre-computed for cover fit so the
       * background never stretches. Required for both single-image and
       * panorama-split backgrounds.
       */
      crop: { x: number; y: number; width: number; height: number };
      fitMode: ImageFitMode;
    };

export interface Slide {
  id: string;
  name: string;
  width: number;
  height: number;
  background: BackgroundFill;
  /** If set, this slide is part of a panorama group sharing the same background image */
  panoramaGroupId?: string;
  /** Index within the panorama group */
  panoramaIndex?: number;
  /** Total slides in panorama group */
  panoramaTotal?: number;
  elements: AnyElement[];
  backgroundLocked: boolean;
}

export type SlideFormat = {
  id: string;
  label: string;
  width: number;
  height: number;
  description: string;
};

export const SLIDE_FORMATS: SlideFormat[] = [
  { id: 'portrait', label: 'Portrait', width: 1080, height: 1350, description: 'Feed 4:5' },
  { id: 'square', label: 'Square', width: 1080, height: 1080, description: 'Feed 1:1' },
  { id: 'story', label: 'Story', width: 1080, height: 1920, description: '9:16' },
  { id: 'reel', label: 'Reel Cover', width: 1080, height: 1920, description: '9:16' },
  { id: 'landscape', label: 'Landscape', width: 1920, height: 1080, description: '16:9' },
];

export interface Project {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  slides: Slide[];
  version: 1;
}

export interface Snapshot {
  slides: Slide[];
  currentSlideId: string;
}

export type ToolMode = 'select' | 'text' | 'rect' | 'ellipse' | 'line' | 'crop' | 'hand';

export type GuideLine = {
  axis: 'x' | 'y';
  position: number;
};
