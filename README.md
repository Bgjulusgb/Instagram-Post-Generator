# Carousel Studio

A professional Instagram Carousel & Slide Editor for creators and
photographers — built with React, Konva, Zustand, Framer Motion and
Tailwind. Designed in the spirit of Figma, Canva and Adobe Express, with
a strong focus on photographic image quality and editorial typography.

## Quick start

```bash
npm install
npm run dev
```

Open the URL shown in the terminal (usually `http://localhost:5173/`).

```bash
npm run build    # production build into dist/
npm run preview  # preview the production build
```

## Stack

- **React 18** + **TypeScript** + **Vite**
- **Konva.js** + **react-konva** for the high-performance canvas
- **Zustand** + **Immer** for state & history
- **Framer Motion** for fluid micro-animations
- **Tailwind CSS** for the dark Apple/Figma-style UI
- **jsPDF**, **JSZip**, **file-saver** for exports

## What's inside

### Editor

- Konva-based canvas with smooth zoom, pan and infinite undo
- Smart drag & drop with continuous snapping to edges, peers and centerlines
- Multi-select via marquee + Shift-click
- Transformer with rotate / scale / drag handles
- Inline text editing via double-click
- Layers panel with lock / visibility / reorder

### Slides

- Unlimited slides with drag-to-reorder thumbnails
- Native Instagram formats (1080×1350, 1080×1080, 1920×1080, 9:16, …)
- Custom canvas sizes with proportional layout adjustment
- Panorama: split one image across multiple slides
- Per-slide background lock

### Image studio

- Non-destructive Lightroom-style adjustments: exposure, contrast,
  highlights, shadows, whites, blacks, saturation, vibrance, temperature,
  tint, blur, grain, B&W
- One-click film & monochrome presets (Mono, Noir, Silver, Kodak, Portra,
  Cinema, Glacier, Fade, Lumen)
- Crop, corner radius, blend modes, opacity, drop shadow

### Typography

- Curated Google Fonts (Inter, Playfair, DM Serif, Space Grotesk, Bebas
  Neue, Cormorant) + custom font upload (woff/woff2/ttf/otf)
- Weight, italic, underline, alignment, line height, letter spacing
- Optional outline stroke

### Backgrounds

- Solid colors, gradients, image fills, panorama splits, blur

### Export

- PNG, JPG, WEBP, PDF
- 1×, 2×, 4× scale (Retina-ready)
- Adjustable quality, transparent background, optional sharpening
- Single slide, ZIP of all slides, or single multi-page PDF

### Project

- Autosave to `localStorage`
- Save/load JSON project files
- Infinite undo / redo (⌘Z / ⌘⇧Z)

### Keyboard shortcuts

| Action            | Shortcut |
| ----------------- | -------- |
| Move tool         | V        |
| Pan tool          | H        |
| Text tool         | T        |
| Rect / Ellipse / Line | R / O / L |
| Crop              | C        |
| Undo / Redo       | ⌘Z / ⌘⇧Z |
| Duplicate         | ⌘D       |
| Select all        | ⌘A       |
| Delete            | ⌫        |
| Zoom in / out / fit | ⌘+ / ⌘- / ⌘0 |
| Bring forward / send back | ⌘] / ⌘[ |
| Bring to front / send to back | ⌘⇧] / ⌘⇧[ |
| Nudge (10× with Shift) | ←↑→↓ |

## Project layout

```
src/
  components/
    canvas/      # Konva canvas + element renderers + minimap
    panels/      # Left/right sidebar panels (design, layers, properties…)
    ui/          # Reusable atoms (Slider, Tooltip, Modal, …)
    Editor.tsx   # Top-level layout
  hooks/         # Keyboard, autosave, image loader
  store/         # Zustand editor store (history, slides, elements)
  types/         # TypeScript model
  utils/         # filters, export, snap, project I/O
```
