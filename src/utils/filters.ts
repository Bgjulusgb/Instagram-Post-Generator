import type { ImageAdjustments } from '../types';

/**
 * Converts Lightroom-style adjustments to a CSS filter string.
 * This is used for live preview on Konva Image elements.
 *
 * Note: CSS filters approximate true Lightroom math; the high-fidelity
 * exporter applies the same shape via canvas pixel manipulation for fidelity.
 */
export function adjustmentsToCssFilter(adj: ImageAdjustments): string {
  const parts: string[] = [];

  const brightness = 1 + adj.exposure * 0.5;
  parts.push(`brightness(${brightness.toFixed(3)})`);

  const contrast = 1 + adj.contrast * 0.6;
  parts.push(`contrast(${contrast.toFixed(3)})`);

  const sat = 1 + adj.saturation * 0.8 + adj.vibrance * 0.4;
  parts.push(`saturate(${Math.max(0, sat).toFixed(3)})`);

  if (adj.grayscale > 0) parts.push(`grayscale(${adj.grayscale.toFixed(3)})`);

  // Temperature shifts hue slightly (warm <-> cool)
  if (adj.temperature !== 0) {
    const deg = adj.temperature * -10;
    parts.push(`hue-rotate(${deg}deg)`);
  }

  if (adj.blur > 0) parts.push(`blur(${adj.blur.toFixed(2)}px)`);

  return parts.join(' ');
}

/** Apply high-fidelity adjustments directly to ImageData for export */
export function applyAdjustmentsToImageData(imgData: ImageData, adj: ImageAdjustments): ImageData {
  const data = imgData.data;

  const exposure = adj.exposure;
  const contrast = adj.contrast;
  const highlights = adj.highlights;
  const shadows = adj.shadows;
  const whites = adj.whites;
  const blacks = adj.blacks;
  const saturation = adj.saturation;
  const vibrance = adj.vibrance;
  const temperature = adj.temperature;
  const tint = adj.tint;
  const grayscale = adj.grayscale;
  const grain = adj.grain;

  for (let i = 0; i < data.length; i += 4) {
    let r = data[i] / 255;
    let g = data[i + 1] / 255;
    let b = data[i + 2] / 255;

    // Exposure (multiplicative)
    const expMul = Math.pow(2, exposure);
    r *= expMul;
    g *= expMul;
    b *= expMul;

    // Contrast around 0.5
    if (contrast !== 0) {
      const c = 1 + contrast;
      r = (r - 0.5) * c + 0.5;
      g = (g - 0.5) * c + 0.5;
      b = (b - 0.5) * c + 0.5;
    }

    // Luminance for region targeting
    const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;

    // Highlights / Shadows
    if (highlights !== 0) {
      const w = Math.pow(Math.max(0, Math.min(1, (lum - 0.5) * 2)), 1.5);
      const f = 1 + highlights * 0.5;
      r = r * (1 - w) + r * f * w;
      g = g * (1 - w) + g * f * w;
      b = b * (1 - w) + b * f * w;
    }
    if (shadows !== 0) {
      const w = Math.pow(Math.max(0, Math.min(1, (0.5 - lum) * 2)), 1.5);
      const f = 1 + shadows * 0.5;
      r = r * (1 - w) + r * f * w;
      g = g * (1 - w) + g * f * w;
      b = b * (1 - w) + b * f * w;
    }

    // Whites / Blacks (push extremes)
    if (whites !== 0) {
      const w = Math.pow(Math.max(0, Math.min(1, (lum - 0.7) / 0.3)), 2);
      r += whites * 0.25 * w;
      g += whites * 0.25 * w;
      b += whites * 0.25 * w;
    }
    if (blacks !== 0) {
      const w = Math.pow(Math.max(0, Math.min(1, (0.3 - lum) / 0.3)), 2);
      r += blacks * 0.25 * w;
      g += blacks * 0.25 * w;
      b += blacks * 0.25 * w;
    }

    // Saturation
    if (saturation !== 0) {
      const gray = 0.2989 * r + 0.587 * g + 0.114 * b;
      const s = 1 + saturation;
      r = gray + (r - gray) * s;
      g = gray + (g - gray) * s;
      b = gray + (b - gray) * s;
    }

    // Vibrance: boost less-saturated pixels more
    if (vibrance !== 0) {
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      const sat = max - min;
      const gray = 0.2989 * r + 0.587 * g + 0.114 * b;
      const amt = vibrance * (1 - sat);
      r = gray + (r - gray) * (1 + amt);
      g = gray + (g - gray) * (1 + amt);
      b = gray + (b - gray) * (1 + amt);
    }

    // Temperature (yellow<->blue), Tint (magenta<->green)
    if (temperature !== 0) {
      r += temperature * 0.08;
      b -= temperature * 0.08;
    }
    if (tint !== 0) {
      g -= tint * 0.06;
      r += tint * 0.03;
      b += tint * 0.03;
    }

    // Grayscale
    if (grayscale > 0) {
      const gray = 0.2989 * r + 0.587 * g + 0.114 * b;
      r = r * (1 - grayscale) + gray * grayscale;
      g = g * (1 - grayscale) + gray * grayscale;
      b = b * (1 - grayscale) + gray * grayscale;
    }

    // Grain (noise)
    if (grain > 0) {
      const n = (Math.random() - 0.5) * grain * 0.3;
      r += n;
      g += n;
      b += n;
    }

    data[i] = Math.max(0, Math.min(255, r * 255));
    data[i + 1] = Math.max(0, Math.min(255, g * 255));
    data[i + 2] = Math.max(0, Math.min(255, b * 255));
  }

  return imgData;
}

/** Preset definitions: collections of adjustments mimicking film looks */
export interface FilterPreset {
  id: string;
  name: string;
  description: string;
  adjustments: ImageAdjustments;
}

import { DEFAULT_ADJUSTMENTS } from '../types';

export const FILTER_PRESETS: FilterPreset[] = [
  {
    id: 'original',
    name: 'Original',
    description: 'Neutral',
    adjustments: { ...DEFAULT_ADJUSTMENTS },
  },
  {
    id: 'mono',
    name: 'Mono',
    description: 'Pure black & white',
    adjustments: {
      ...DEFAULT_ADJUSTMENTS,
      grayscale: 1,
      contrast: 0.15,
    },
  },
  {
    id: 'noir',
    name: 'Noir',
    description: 'High-contrast B&W',
    adjustments: {
      ...DEFAULT_ADJUSTMENTS,
      grayscale: 1,
      contrast: 0.45,
      blacks: -0.25,
      whites: 0.2,
      grain: 0.15,
    },
  },
  {
    id: 'silver',
    name: 'Silver',
    description: 'Soft monochrome',
    adjustments: {
      ...DEFAULT_ADJUSTMENTS,
      grayscale: 1,
      contrast: -0.1,
      shadows: 0.15,
      highlights: -0.1,
    },
  },
  {
    id: 'kodak',
    name: 'Kodak',
    description: 'Warm film tones',
    adjustments: {
      ...DEFAULT_ADJUSTMENTS,
      temperature: 0.25,
      saturation: 0.1,
      contrast: 0.12,
      vibrance: 0.15,
      grain: 0.06,
    },
  },
  {
    id: 'portra',
    name: 'Portra',
    description: 'Skin-friendly portrait',
    adjustments: {
      ...DEFAULT_ADJUSTMENTS,
      temperature: 0.12,
      tint: 0.08,
      saturation: -0.05,
      vibrance: 0.2,
      highlights: -0.1,
      shadows: 0.1,
    },
  },
  {
    id: 'fade',
    name: 'Fade',
    description: 'Matte fade',
    adjustments: {
      ...DEFAULT_ADJUSTMENTS,
      contrast: -0.2,
      blacks: 0.2,
      saturation: -0.1,
      shadows: 0.2,
    },
  },
  {
    id: 'cinematic',
    name: 'Cinema',
    description: 'Teal & orange',
    adjustments: {
      ...DEFAULT_ADJUSTMENTS,
      temperature: 0.18,
      tint: -0.08,
      contrast: 0.25,
      saturation: 0.05,
      shadows: -0.12,
      highlights: -0.05,
    },
  },
  {
    id: 'cold',
    name: 'Glacier',
    description: 'Cool steel tones',
    adjustments: {
      ...DEFAULT_ADJUSTMENTS,
      temperature: -0.25,
      tint: -0.05,
      contrast: 0.18,
      saturation: -0.15,
    },
  },
  {
    id: 'bright',
    name: 'Lumen',
    description: 'Light & airy',
    adjustments: {
      ...DEFAULT_ADJUSTMENTS,
      exposure: 0.12,
      shadows: 0.25,
      whites: 0.15,
      vibrance: 0.15,
    },
  },
];
