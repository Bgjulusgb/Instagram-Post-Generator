# Carousel Studio

A professional Instagram Carousel & Slide Editor for creators and
photographers — built with React, Konva, Zustand, Framer Motion and
Tailwind. Ships both as a browser app and a packaged desktop app
(Windows installer, macOS DMG, Linux AppImage) via Electron.

## Run in the browser

```bash
npm install
npm run dev      # open http://localhost:5173
npm run build    # static build into dist/
npm run preview  # preview the static build
```

## Build the desktop app (Windows / macOS / Linux)

The app ships with an Electron shell and `electron-builder` config that
produces native installers.

```bash
npm install

# Run the desktop app in development (hot reload + native menus)
npm run electron:dev

# Build installers for the current OS
npm run dist

# Or target a specific OS
npm run dist:win     # ➜ release/Carousel-Studio-Setup-1.0.0.exe (NSIS installer)
                     # ➜ release/Carousel-Studio-Setup-1.0.0.exe (portable, no install needed)
npm run dist:mac     # ➜ release/Carousel-Studio-1.0.0-arm64.dmg (also x64)
npm run dist:linux   # ➜ release/Carousel-Studio-1.0.0.AppImage
```

> **Windows builds:** electron-builder produces an NSIS installer (.exe)
> that the end user double-clicks to install. It places shortcuts on the
> desktop and in the Start menu. A portable `.exe` (no install required)
> is also produced.
>
> **Cross-compilation:** Building Windows installers from macOS/Linux
> requires Wine (`brew install --cask wine-stable` or `apt install wine`).
> The most reliable path is to build on Windows directly.

### Where data lives

- **Browser** — autosave is stored in IndexedDB under the database
  `carousel-studio` (megabytes of headroom, way past localStorage's 5 MB).
- **Desktop** — autosave is `autosave.json` inside the platform's user
  data directory:
  - Windows: `%APPDATA%/Carousel Studio/autosave.json`
  - macOS: `~/Library/Application Support/Carousel Studio/autosave.json`
  - Linux: `~/.config/Carousel Studio/autosave.json`

Both backends are wired through the same async storage interface, so
behavior is identical from the UI's point of view.

## Stack

- **React 18** + **TypeScript** + **Vite**
- **Konva.js** + **react-konva** for the high-performance canvas
- **Zustand** + **Immer** for state & history
- **Framer Motion** for fluid micro-animations
- **Tailwind CSS** for the dark Apple/Figma-style UI
- **jsPDF**, **JSZip**, **file-saver** for exports
- **Electron** + **electron-builder** for the desktop packaging

## What's inside

### Editor

- Konva-based canvas with smooth zoom, pan and infinite undo
- Smart drag & drop with continuous snapping to edges, peers and centerlines
- Multi-select via marquee + Shift-click
- Transformer with rotate / scale / drag handles (image selections keep
  ratio automatically to prevent stretching)
- Inline text editing via double-click
- Layers panel with lock / visibility / reorder
- Floating Figma-style action bar above the active selection

### Slides

- Unlimited slides with drag-to-reorder thumbnails (real image previews)
- Native Instagram formats (1080×1350, 1080×1080, 1920×1080, 9:16, …)
- Custom canvas sizes with proportional layout adjustment
- Panorama: split one image across multiple slides — cover-fit math, no
  stretching, per-slide crop computed from the strip dimensions
- Per-slide background lock, inline rename, grid overview modal

### Image studio

- Non-destructive Lightroom-style adjustments: exposure, contrast,
  highlights, shadows, whites, blacks, saturation, vibrance, temperature,
  tint, blur, grain, B&W
- Cover / contain / stretch fit modes with a pan-pad for repositioning
  the photo inside the frame
- Replace photo on an element while preserving frame / crop / adjustments
- One-click film & monochrome presets (Mono, Noir, Silver, Kodak, Portra,
  Cinema, Glacier, Fade, Lumen)
- Automatic 6-color palette extraction — copy to clipboard, double-click
  to set as slide background

### Typography

- Curated Google Fonts (Inter, Playfair, DM Serif, Space Grotesk, Bebas
  Neue, Cormorant) + custom font upload (woff/woff2/ttf/otf)
- Weight, italic, underline, alignment, line height, letter spacing
- Optional outline stroke and two-stop gradient fill

### Tools

- Alignment & distribute toolbar (multi-select / align-to-slide)
- Group / ungroup (⌘G / ⌘⇧G)
- Eyedropper color picker (Chrome/Edge EyeDropper API) + persistent
  recent-colors history
- Clipboard paste: ⌘V drops images or text as new elements
- Drag-and-drop image files anywhere on the canvas
- Mini-map with viewport indicator, smart guides, optional grid

### Export

- PNG, JPG, WEBP, PDF
- 1×, 2×, 4× scale (Retina-ready)
- Live preview of the export
- Adjustable quality, transparent background, optional unsharp-mask
- Single slide, ZIP of all slides, or single multi-page PDF
- Deterministic offscreen renderer — no race conditions, no missing
  filters, fonts pre-loaded before render

### Project

- Autosave to **IndexedDB** (browser) or **filesystem** (desktop) with
  explicit error reporting and a `beforeunload` flush
- Save/load JSON project files (native dialogs on desktop)
- Infinite undo / redo (⌘Z / ⌘⇧Z)

### Keyboard shortcuts (press `?` to see them all)

| Action            | Shortcut |
| ----------------- | -------- |
| Move tool         | V        |
| Pan tool          | H        |
| Text tool         | T        |
| Rect / Ellipse / Line | R / O / L |
| Crop              | C        |
| Undo / Redo       | ⌘Z / ⌘⇧Z |
| Duplicate         | ⌘D       |
| Group / Ungroup   | ⌘G / ⌘⇧G |
| Select all        | ⌘A       |
| Delete            | ⌫        |
| Zoom in / out / fit | ⌘+ / ⌘- / ⌘0 |
| Bring forward / send back | ⌘] / ⌘[ |
| Bring to front / send to back | ⌘⇧] / ⌘⇧[ |
| Nudge (10× with Shift) | ←↑→↓ |
| Help              | ?        |

## Project layout

```
electron/        # Electron main + preload (CommonJS)
src/
  components/
    canvas/      # Konva canvas + element renderers + minimap + selection bar
    panels/      # Left/right sidebar panels
    ui/          # Reusable atoms (Slider, Tooltip, Modal, ColorInput, …)
    Editor.tsx   # Top-level layout
  hooks/         # Keyboard, autosave, image loader, clipboard paste
  store/         # Zustand editor store (history, slides, elements)
  types/         # TypeScript model (incl. electronAPI typings)
  utils/         # filters, export, snap, project I/O, storage, palette
electron-builder.json  # Cross-platform packaging config
```
