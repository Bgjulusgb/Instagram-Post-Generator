import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { produce } from 'immer';
import { nanoid } from 'nanoid';
import type {
  AnyElement,
  BackgroundFill,
  ImageAdjustments,
  ImageElement,
  ImageFitMode,
  ShapeElement,
  ShapeKind,
  Slide,
  Snapshot,
  TextElement,
  ToolMode,
} from '../types';
import { DEFAULT_ADJUSTMENTS, SLIDE_FORMATS } from '../types';
import { computeCoverCrop } from '../utils/image';
import { storage } from '../utils/storage';

const MAX_HISTORY = 200;

function createBlankSlide(width = 1080, height = 1350, index = 1): Slide {
  return {
    id: nanoid(8),
    name: `Slide ${index}`,
    width,
    height,
    background: { kind: 'color', color: '#0a0a0a' },
    elements: [],
    backgroundLocked: false,
  };
}

function snapshot(slides: Slide[], currentSlideId: string): Snapshot {
  return {
    slides: JSON.parse(JSON.stringify(slides)),
    currentSlideId,
  };
}

interface EditorActions {
  // Slides
  addSlide: (format?: { width: number; height: number }) => void;
  duplicateSlide: (id: string) => void;
  deleteSlide: (id: string) => void;
  selectSlide: (id: string) => void;
  reorderSlides: (fromIndex: number, toIndex: number) => void;
  renameSlide: (id: string, name: string) => void;
  setAllSlidesFormat: (width: number, height: number) => void;
  setSlideFormat: (id: string, width: number, height: number) => void;

  // Elements
  addElement: (element: AnyElement, slideId?: string) => void;
  updateElement: (id: string, patch: Partial<AnyElement>) => void;
  updateElementById: <T extends AnyElement>(id: string, updater: (el: T) => void) => void;
  deleteElements: (ids: string[]) => void;
  duplicateElements: (ids: string[]) => void;
  reorderElement: (id: string, direction: 'up' | 'down' | 'top' | 'bottom') => void;
  alignElements: (ids: string[], align: 'left' | 'center-h' | 'right' | 'top' | 'middle-v' | 'bottom') => void;
  distributeElements: (ids: string[], axis: 'horizontal' | 'vertical') => void;
  alignToSlide: (ids: string[], align: 'left' | 'center-h' | 'right' | 'top' | 'middle-v' | 'bottom') => void;
  groupSelection: () => void;
  ungroupSelection: () => void;
  selectElement: (id: string | null, additive?: boolean) => void;
  selectMultipleElements: (ids: string[]) => void;
  deselectAll: () => void;

  // Background
  setBackground: (slideId: string, bg: BackgroundFill) => void;
  toggleBackgroundLock: (slideId: string) => void;
  applyPanoramaImage: (
    src: string,
    naturalWidth: number,
    naturalHeight: number,
    targetSlideIds: string[],
  ) => void;
  /** Re-cover-crop an image element to match its current frame aspect */
  reCoverImage: (id: string) => void;
  setImageFitMode: (id: string, mode: ImageFitMode) => void;
  setImagePan: (id: string, pan: { x: number; y: number }) => void;

  // History
  pushHistory: () => void;
  undo: () => void;
  redo: () => void;

  // Tool & Canvas
  setTool: (tool: ToolMode) => void;
  setZoom: (zoom: number) => void;
  setStageOffset: (x: number, y: number) => void;
  toggleRulers: () => void;
  toggleGuides: () => void;
  toggleGrid: () => void;
  toggleMinimap: () => void;
  toggleSnap: () => void;

  // Persistence — all storage I/O is async (IndexedDB / filesystem).
  loadFromStorage: () => Promise<{ ok: boolean; restored: boolean; error?: string }>;
  saveToStorage: () => Promise<{ ok: boolean; error?: string }>;
  loadProject: (slides: Slide[], currentSlideId?: string) => void;
  resetProject: () => void;

  // Image adjustments
  resetAdjustments: (id: string) => void;
  applyPresetToImage: (id: string, preset: ImageAdjustments, name?: string) => void;
}

export interface EditorState extends EditorActions {
  slides: Slide[];
  currentSlideId: string;
  selectedElementIds: string[];

  tool: ToolMode;
  zoom: number;
  stageOffset: { x: number; y: number };

  showRulers: boolean;
  showGuides: boolean;
  showGrid: boolean;
  showMinimap: boolean;
  snapEnabled: boolean;

  history: Snapshot[];
  future: Snapshot[];

  /** Bumped on every meaningful change to drive autosave & dependency-free subscribers */
  revision: number;

  /** Bumped only by successful saves; lets the UI distinguish "tried" from "saved" */
  lastSavedRevision: number;
  lastSavedAt: number | null;
  lastSaveError: string | null;
}

const initialSlide = createBlankSlide(SLIDE_FORMATS[0].width, SLIDE_FORMATS[0].height, 1);

export const useEditor = create<EditorState>()(
  subscribeWithSelector((set, get) => ({
    slides: [initialSlide],
    currentSlideId: initialSlide.id,
    selectedElementIds: [],

    tool: 'select',
    zoom: 0.5,
    stageOffset: { x: 0, y: 0 },

    showRulers: false,
    showGuides: true,
    showGrid: false,
    showMinimap: false,
    snapEnabled: true,

    history: [],
    future: [],
    revision: 0,
    lastSavedRevision: 0,
    lastSavedAt: null,
    lastSaveError: null,

    pushHistory: () => {
      set((state) =>
        produce(state, (draft) => {
          draft.history.push(snapshot(state.slides, state.currentSlideId));
          if (draft.history.length > MAX_HISTORY) draft.history.shift();
          draft.future = [];
        }),
      );
    },

    undo: () => {
      const { history } = get();
      if (history.length === 0) return;
      set((state) =>
        produce(state, (draft) => {
          const past = draft.history.pop();
          if (!past) return;
          draft.future.push(snapshot(state.slides, state.currentSlideId));
          draft.slides = past.slides;
          draft.currentSlideId = past.currentSlideId;
          draft.selectedElementIds = [];
          draft.revision++;
        }),
      );
    },

    redo: () => {
      const { future } = get();
      if (future.length === 0) return;
      set((state) =>
        produce(state, (draft) => {
          const next = draft.future.pop();
          if (!next) return;
          draft.history.push(snapshot(state.slides, state.currentSlideId));
          draft.slides = next.slides;
          draft.currentSlideId = next.currentSlideId;
          draft.selectedElementIds = [];
          draft.revision++;
        }),
      );
    },

    addSlide: (format) => {
      get().pushHistory();
      set((state) =>
        produce(state, (draft) => {
          const ref = draft.slides[draft.slides.length - 1] ?? draft.slides[0];
          const width = format?.width ?? ref?.width ?? 1080;
          const height = format?.height ?? ref?.height ?? 1350;
          const newSlide = createBlankSlide(width, height, draft.slides.length + 1);
          draft.slides.push(newSlide);
          draft.currentSlideId = newSlide.id;
          draft.selectedElementIds = [];
          draft.revision++;
        }),
      );
    },

    duplicateSlide: (id) => {
      get().pushHistory();
      set((state) =>
        produce(state, (draft) => {
          const idx = draft.slides.findIndex((s) => s.id === id);
          if (idx === -1) return;
          const original = draft.slides[idx];
          const copy: Slide = JSON.parse(JSON.stringify(original));
          copy.id = nanoid(8);
          copy.name = `${original.name} copy`;
          copy.elements = copy.elements.map((el) => ({ ...el, id: nanoid(8) }));
          draft.slides.splice(idx + 1, 0, copy);
          draft.currentSlideId = copy.id;
          draft.selectedElementIds = [];
          draft.revision++;
        }),
      );
    },

    deleteSlide: (id) => {
      const { slides } = get();
      if (slides.length <= 1) return;
      get().pushHistory();
      set((state) =>
        produce(state, (draft) => {
          const idx = draft.slides.findIndex((s) => s.id === id);
          if (idx === -1) return;
          draft.slides.splice(idx, 1);
          if (draft.currentSlideId === id) {
            draft.currentSlideId = draft.slides[Math.max(0, idx - 1)].id;
          }
          draft.selectedElementIds = [];
          draft.revision++;
        }),
      );
    },

    selectSlide: (id) => {
      set((state) =>
        produce(state, (draft) => {
          draft.currentSlideId = id;
          draft.selectedElementIds = [];
        }),
      );
    },

    reorderSlides: (fromIndex, toIndex) => {
      if (fromIndex === toIndex) return;
      get().pushHistory();
      set((state) =>
        produce(state, (draft) => {
          const [item] = draft.slides.splice(fromIndex, 1);
          draft.slides.splice(toIndex, 0, item);
          draft.revision++;
        }),
      );
    },

    renameSlide: (id, name) => {
      set((state) =>
        produce(state, (draft) => {
          const s = draft.slides.find((s) => s.id === id);
          if (s) s.name = name;
          draft.revision++;
        }),
      );
    },

    setAllSlidesFormat: (width, height) => {
      get().pushHistory();
      set((state) =>
        produce(state, (draft) => {
          draft.slides.forEach((slide) => {
            const sx = width / slide.width;
            const sy = height / slide.height;
            slide.width = width;
            slide.height = height;
            slide.elements.forEach((el) => {
              el.x *= sx;
              el.y *= sy;
              el.width *= sx;
              el.height *= sy;
              if (el.type === 'text') el.fontSize *= (sx + sy) / 2;
            });
          });
          draft.revision++;
        }),
      );
    },

    setSlideFormat: (id, width, height) => {
      get().pushHistory();
      set((state) =>
        produce(state, (draft) => {
          const slide = draft.slides.find((s) => s.id === id);
          if (!slide) return;
          const sx = width / slide.width;
          const sy = height / slide.height;
          slide.width = width;
          slide.height = height;
          slide.elements.forEach((el) => {
            el.x *= sx;
            el.y *= sy;
            el.width *= sx;
            el.height *= sy;
            if (el.type === 'text') el.fontSize *= (sx + sy) / 2;
          });
          draft.revision++;
        }),
      );
    },

    addElement: (element, slideId) => {
      get().pushHistory();
      set((state) =>
        produce(state, (draft) => {
          const sId = slideId ?? draft.currentSlideId;
          const slide = draft.slides.find((s) => s.id === sId);
          if (!slide) return;
          slide.elements.push(element);
          draft.selectedElementIds = [element.id];
          draft.revision++;
        }),
      );
    },

    updateElement: (id, patch) => {
      set((state) =>
        produce(state, (draft) => {
          const slide = draft.slides.find((s) => s.id === draft.currentSlideId);
          if (!slide) return;
          const el = slide.elements.find((e) => e.id === id);
          if (!el || el.locked) return;
          Object.assign(el, patch);
          draft.revision++;
        }),
      );
    },

    updateElementById: (id, updater) => {
      set((state) =>
        produce(state, (draft) => {
          const slide = draft.slides.find((s) => s.id === draft.currentSlideId);
          if (!slide) return;
          const el = slide.elements.find((e) => e.id === id) as any;
          if (!el) return;
          updater(el);
          draft.revision++;
        }),
      );
    },

    deleteElements: (ids) => {
      if (ids.length === 0) return;
      get().pushHistory();
      set((state) =>
        produce(state, (draft) => {
          const slide = draft.slides.find((s) => s.id === draft.currentSlideId);
          if (!slide) return;
          slide.elements = slide.elements.filter((e) => !ids.includes(e.id));
          draft.selectedElementIds = draft.selectedElementIds.filter((i) => !ids.includes(i));
          draft.revision++;
        }),
      );
    },

    duplicateElements: (ids) => {
      if (ids.length === 0) return;
      get().pushHistory();
      set((state) =>
        produce(state, (draft) => {
          const slide = draft.slides.find((s) => s.id === draft.currentSlideId);
          if (!slide) return;
          const newIds: string[] = [];
          ids.forEach((id) => {
            const el = slide.elements.find((e) => e.id === id);
            if (!el) return;
            const copy: AnyElement = JSON.parse(JSON.stringify(el));
            copy.id = nanoid(8);
            copy.x += 24;
            copy.y += 24;
            slide.elements.push(copy);
            newIds.push(copy.id);
          });
          draft.selectedElementIds = newIds;
          draft.revision++;
        }),
      );
    },

    alignElements: (ids, align) => {
      if (ids.length < 2) return;
      get().pushHistory();
      set((state) =>
        produce(state, (draft) => {
          const slide = draft.slides.find((s) => s.id === draft.currentSlideId);
          if (!slide) return;
          const els = slide.elements.filter((e) => ids.includes(e.id) && !e.locked);
          if (els.length < 2) return;
          // Compute the union bounding box of the selection
          const minX = Math.min(...els.map((e) => e.x));
          const minY = Math.min(...els.map((e) => e.y));
          const maxX = Math.max(...els.map((e) => e.x + e.width));
          const maxY = Math.max(...els.map((e) => e.y + e.height));
          const centerX = (minX + maxX) / 2;
          const centerY = (minY + maxY) / 2;
          els.forEach((el) => {
            if (align === 'left') el.x = minX;
            else if (align === 'right') el.x = maxX - el.width;
            else if (align === 'center-h') el.x = centerX - el.width / 2;
            else if (align === 'top') el.y = minY;
            else if (align === 'bottom') el.y = maxY - el.height;
            else if (align === 'middle-v') el.y = centerY - el.height / 2;
          });
          draft.revision++;
        }),
      );
    },

    alignToSlide: (ids, align) => {
      if (ids.length === 0) return;
      get().pushHistory();
      set((state) =>
        produce(state, (draft) => {
          const slide = draft.slides.find((s) => s.id === draft.currentSlideId);
          if (!slide) return;
          slide.elements
            .filter((e) => ids.includes(e.id) && !e.locked)
            .forEach((el) => {
              if (align === 'left') el.x = 0;
              else if (align === 'right') el.x = slide.width - el.width;
              else if (align === 'center-h') el.x = (slide.width - el.width) / 2;
              else if (align === 'top') el.y = 0;
              else if (align === 'bottom') el.y = slide.height - el.height;
              else if (align === 'middle-v') el.y = (slide.height - el.height) / 2;
            });
          draft.revision++;
        }),
      );
    },

    distributeElements: (ids, axis) => {
      if (ids.length < 3) return;
      get().pushHistory();
      set((state) =>
        produce(state, (draft) => {
          const slide = draft.slides.find((s) => s.id === draft.currentSlideId);
          if (!slide) return;
          const els = slide.elements.filter((e) => ids.includes(e.id) && !e.locked);
          if (els.length < 3) return;
          if (axis === 'horizontal') {
            els.sort((a, b) => a.x + a.width / 2 - (b.x + b.width / 2));
            const first = els[0];
            const last = els[els.length - 1];
            const startCenter = first.x + first.width / 2;
            const endCenter = last.x + last.width / 2;
            const step = (endCenter - startCenter) / (els.length - 1);
            els.forEach((el, i) => {
              const center = startCenter + step * i;
              el.x = center - el.width / 2;
            });
          } else {
            els.sort((a, b) => a.y + a.height / 2 - (b.y + b.height / 2));
            const first = els[0];
            const last = els[els.length - 1];
            const startCenter = first.y + first.height / 2;
            const endCenter = last.y + last.height / 2;
            const step = (endCenter - startCenter) / (els.length - 1);
            els.forEach((el, i) => {
              const center = startCenter + step * i;
              el.y = center - el.height / 2;
            });
          }
          draft.revision++;
        }),
      );
    },

    groupSelection: () => {
      // For v1 we represent a "group" as a shared name tag — sufficient for
      // co-selection and bulk operations without an explicit container node.
      const { selectedElementIds } = get();
      if (selectedElementIds.length < 2) return;
      get().pushHistory();
      const groupName = `Group ${Date.now().toString(36).slice(-4)}`;
      set((state) =>
        produce(state, (draft) => {
          const slide = draft.slides.find((s) => s.id === draft.currentSlideId);
          if (!slide) return;
          slide.elements
            .filter((e) => selectedElementIds.includes(e.id))
            .forEach((el) => {
              (el as any).groupId = groupName;
            });
          draft.revision++;
        }),
      );
    },

    ungroupSelection: () => {
      get().pushHistory();
      set((state) =>
        produce(state, (draft) => {
          const slide = draft.slides.find((s) => s.id === draft.currentSlideId);
          if (!slide) return;
          slide.elements
            .filter((e) => draft.selectedElementIds.includes(e.id))
            .forEach((el) => {
              delete (el as any).groupId;
            });
          draft.revision++;
        }),
      );
    },

    reorderElement: (id, direction) => {
      get().pushHistory();
      set((state) =>
        produce(state, (draft) => {
          const slide = draft.slides.find((s) => s.id === draft.currentSlideId);
          if (!slide) return;
          const idx = slide.elements.findIndex((e) => e.id === id);
          if (idx === -1) return;
          const [el] = slide.elements.splice(idx, 1);
          if (direction === 'top') slide.elements.push(el);
          else if (direction === 'bottom') slide.elements.unshift(el);
          else if (direction === 'up') slide.elements.splice(Math.min(idx + 1, slide.elements.length), 0, el);
          else slide.elements.splice(Math.max(idx - 1, 0), 0, el);
          draft.revision++;
        }),
      );
    },

    selectElement: (id, additive = false) => {
      set((state) =>
        produce(state, (draft) => {
          if (id === null) {
            draft.selectedElementIds = [];
            return;
          }
          if (additive) {
            if (draft.selectedElementIds.includes(id))
              draft.selectedElementIds = draft.selectedElementIds.filter((i) => i !== id);
            else draft.selectedElementIds.push(id);
          } else {
            draft.selectedElementIds = [id];
          }
        }),
      );
    },

    selectMultipleElements: (ids) => {
      set((state) =>
        produce(state, (draft) => {
          draft.selectedElementIds = ids;
        }),
      );
    },

    deselectAll: () => {
      set((state) =>
        produce(state, (draft) => {
          draft.selectedElementIds = [];
        }),
      );
    },

    setBackground: (slideId, bg) => {
      get().pushHistory();
      set((state) =>
        produce(state, (draft) => {
          const s = draft.slides.find((sl) => sl.id === slideId);
          if (s && !s.backgroundLocked) {
            s.background = bg;
            // Clear panorama linkage if a custom bg is set
            delete s.panoramaGroupId;
            delete s.panoramaIndex;
            delete s.panoramaTotal;
            draft.revision++;
          }
        }),
      );
    },

    toggleBackgroundLock: (slideId) => {
      set((state) =>
        produce(state, (draft) => {
          const s = draft.slides.find((sl) => sl.id === slideId);
          if (s) {
            s.backgroundLocked = !s.backgroundLocked;
            draft.revision++;
          }
        }),
      );
    },

    applyPanoramaImage: (src, naturalWidth, naturalHeight, targetSlideIds) => {
      get().pushHistory();
      set((state) =>
        produce(state, (draft) => {
          const groupId = nanoid(8);
          const targets = targetSlideIds
            .map((id) => draft.slides.find((s) => s.id === id))
            .filter((s): s is Slide => !!s && !s.backgroundLocked);
          if (targets.length === 0) return;

          // Sum each slide's width; height of the panorama strip is the
          // largest slide height so every slide has something to show.
          const totalW = targets.reduce((sum, s) => sum + s.width, 0);
          const stripH = Math.max(...targets.map((s) => s.height));

          // Cover-fit: scale image so it covers the whole strip without
          // letterboxing, then center any leftover slack.
          const scale = Math.max(totalW / naturalWidth, stripH / naturalHeight);
          const dispW = naturalWidth * scale;
          const dispH = naturalHeight * scale;
          const offsetX = (totalW - dispW) / 2;
          const offsetY = (stripH - dispH) / 2;

          let cursorX = 0;
          targets.forEach((slide, idx) => {
            const slideStartX = cursorX;
            cursorX += slide.width;

            // Map slide-space rectangle back into image-source pixel coords.
            // Clamp to image bounds to keep the crop valid.
            const cropX = (slideStartX - offsetX) / scale;
            const cropY = (0 - offsetY) / scale;
            const cropW = slide.width / scale;
            const cropH = slide.height / scale;

            slide.background = {
              kind: 'image',
              src,
              naturalWidth,
              naturalHeight,
              blur: 0,
              fitMode: 'cover',
              crop: {
                x: clamp(cropX, 0, naturalWidth),
                y: clamp(cropY, 0, naturalHeight),
                width: clamp(cropW, 1, naturalWidth),
                height: clamp(cropH, 1, naturalHeight),
              },
            };
            slide.panoramaGroupId = groupId;
            slide.panoramaIndex = idx;
            slide.panoramaTotal = targets.length;
          });
          draft.revision++;
        }),
      );
    },

    reCoverImage: (id) => {
      set((state) =>
        produce(state, (draft) => {
          const slide = draft.slides.find((s) => s.id === draft.currentSlideId);
          if (!slide) return;
          const el = slide.elements.find((e) => e.id === id) as ImageElement | undefined;
          if (!el || el.type !== 'image') return;
          el.crop = computeCoverCrop(el.width, el.height, el.naturalWidth, el.naturalHeight, el.pan);
          draft.revision++;
        }),
      );
    },

    setImageFitMode: (id, mode) => {
      get().pushHistory();
      set((state) =>
        produce(state, (draft) => {
          const slide = draft.slides.find((s) => s.id === draft.currentSlideId);
          if (!slide) return;
          const el = slide.elements.find((e) => e.id === id) as ImageElement | undefined;
          if (!el || el.type !== 'image') return;
          el.fitMode = mode;
          if (mode === 'cover') {
            el.crop = computeCoverCrop(el.width, el.height, el.naturalWidth, el.naturalHeight, el.pan);
          } else if (mode === 'fill') {
            el.crop = { x: 0, y: 0, width: el.naturalWidth, height: el.naturalHeight };
          }
          draft.revision++;
        }),
      );
    },

    setImagePan: (id, pan) => {
      set((state) =>
        produce(state, (draft) => {
          const slide = draft.slides.find((s) => s.id === draft.currentSlideId);
          if (!slide) return;
          const el = slide.elements.find((e) => e.id === id) as ImageElement | undefined;
          if (!el || el.type !== 'image') return;
          el.pan = { x: clamp(pan.x, 0, 1), y: clamp(pan.y, 0, 1) };
          if (el.fitMode === 'cover') {
            el.crop = computeCoverCrop(el.width, el.height, el.naturalWidth, el.naturalHeight, el.pan);
          }
          draft.revision++;
        }),
      );
    },

    setTool: (tool) => set({ tool }),

    setZoom: (zoom) =>
      set({ zoom: Math.max(0.05, Math.min(8, zoom)) }),

    setStageOffset: (x, y) => set({ stageOffset: { x, y } }),

    toggleRulers: () => set((s) => ({ showRulers: !s.showRulers })),
    toggleGuides: () => set((s) => ({ showGuides: !s.showGuides })),
    toggleGrid: () => set((s) => ({ showGrid: !s.showGrid })),
    toggleMinimap: () => set((s) => ({ showMinimap: !s.showMinimap })),
    toggleSnap: () => set((s) => ({ snapEnabled: !s.snapEnabled })),

    saveToStorage: async () => {
      const { slides, currentSlideId, revision } = get();
      try {
        await storage.saveAutosave({
          version: 1,
          updatedAt: Date.now(),
          slides,
          currentSlideId,
        });
        set({
          lastSavedRevision: revision,
          lastSavedAt: Date.now(),
          lastSaveError: null,
        });
        return { ok: true };
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        // Quota-exceeded errors have a recognizable shape on some browsers
        const friendly =
          /quota|QuotaExceededError|disk full|ENOSPC/i.test(msg)
            ? 'Storage is full. Free up space or export your project to a file.'
            : msg;
        set({ lastSaveError: friendly });
        return { ok: false, error: friendly };
      }
    },

    loadFromStorage: async () => {
      try {
        const data = await storage.loadAutosave();
        if (!data || !Array.isArray(data.slides) || data.slides.length === 0) {
          return { ok: true, restored: false };
        }
        const migrated = data.slides.map(migrateSlide);
        const restoreId =
          (data.currentSlideId && migrated.find((s) => s.id === data.currentSlideId)?.id) ||
          migrated[0].id;
        set({
          slides: migrated,
          currentSlideId: restoreId,
          selectedElementIds: [],
          history: [],
          future: [],
          revision: 0,
          lastSavedRevision: 0,
          lastSavedAt: data.updatedAt ?? null,
          lastSaveError: null,
        });
        return { ok: true, restored: true };
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        set({ lastSaveError: `Could not read saved project: ${msg}` });
        return { ok: false, restored: false, error: msg };
      }
    },

    loadProject: (slides, currentSlideId) => {
      if (!Array.isArray(slides) || slides.length === 0) return;
      const migrated = slides.map(migrateSlide);
      const restoreId =
        (currentSlideId && migrated.find((s) => s.id === currentSlideId)?.id) || migrated[0].id;
      set({
        slides: migrated,
        currentSlideId: restoreId,
        selectedElementIds: [],
        history: [],
        future: [],
        revision: get().revision + 1,
      });
    },

    resetProject: () => {
      const fresh = createBlankSlide(SLIDE_FORMATS[0].width, SLIDE_FORMATS[0].height, 1);
      set({
        slides: [fresh],
        currentSlideId: fresh.id,
        selectedElementIds: [],
        history: [],
        future: [],
        revision: get().revision + 1,
        lastSavedRevision: get().revision + 1,
        lastSavedAt: null,
        lastSaveError: null,
      });
      // Wipe the persisted copy too — keeps the next reload consistent
      void storage.clearAutosave().catch(() => {});
    },

    resetAdjustments: (id) => {
      get().pushHistory();
      set((state) =>
        produce(state, (draft) => {
          const slide = draft.slides.find((s) => s.id === draft.currentSlideId);
          if (!slide) return;
          const el = slide.elements.find((e) => e.id === id);
          if (!el || el.type !== 'image') return;
          (el as ImageElement).adjustments = { ...DEFAULT_ADJUSTMENTS };
          (el as ImageElement).preset = undefined;
          draft.revision++;
        }),
      );
    },

    applyPresetToImage: (id, preset, name) => {
      get().pushHistory();
      set((state) =>
        produce(state, (draft) => {
          const slide = draft.slides.find((s) => s.id === draft.currentSlideId);
          if (!slide) return;
          const el = slide.elements.find((e) => e.id === id) as ImageElement | undefined;
          if (!el || el.type !== 'image') return;
          el.adjustments = { ...preset };
          el.preset = name;
          draft.revision++;
        }),
      );
    },
  })),
);

// Helpers ----------------------------------------------------

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

/** Migrate a slide loaded from storage to the current schema. */
function migrateSlide(raw: any): Slide {
  const slide = { ...raw } as Slide;
  // Background image now requires fitMode + crop
  if (slide.background?.kind === 'image') {
    const bg = slide.background as any;
    if (!bg.fitMode) bg.fitMode = 'cover';
    if (!bg.crop) {
      bg.crop = computeCoverCrop(
        slide.width,
        slide.height,
        bg.naturalWidth,
        bg.naturalHeight,
      );
    }
  }
  slide.elements = (slide.elements ?? []).map((el: any) => {
    if (el.type === 'image') {
      if (!el.fitMode) el.fitMode = 'cover';
      if (!el.pan) el.pan = { x: 0.5, y: 0.5 };
      if (!el.crop) {
        el.crop = computeCoverCrop(
          el.width,
          el.height,
          el.naturalWidth,
          el.naturalHeight,
          el.pan,
        );
      }
      if (!el.adjustments) el.adjustments = { ...DEFAULT_ADJUSTMENTS };
    }
    return el;
  });
  return slide;
}

export function createImageElement(
  src: string,
  naturalWidth: number,
  naturalHeight: number,
  fitWidth: number,
  fitHeight: number,
): ImageElement {
  // Default: fit the image inside ~80% of the slide *without* distortion.
  // The frame keeps the image's native aspect ratio so the photo is always
  // shown undistorted before the user resizes it.
  const ratio = naturalWidth / naturalHeight;
  let w = fitWidth * 0.8;
  let h = w / ratio;
  if (h > fitHeight * 0.8) {
    h = fitHeight * 0.8;
    w = h * ratio;
  }
  const pan = { x: 0.5, y: 0.5 };
  return {
    id: nanoid(8),
    type: 'image',
    name: 'Image',
    x: (fitWidth - w) / 2,
    y: (fitHeight - h) / 2,
    width: w,
    height: h,
    rotation: 0,
    opacity: 1,
    locked: false,
    visible: true,
    blendMode: 'normal',
    src,
    naturalWidth,
    naturalHeight,
    fitMode: 'cover',
    pan,
    crop: computeCoverCrop(w, h, naturalWidth, naturalHeight, pan),
    cornerRadius: 0,
    adjustments: { ...DEFAULT_ADJUSTMENTS },
  };
}

export function createTextElement(text: string, fitWidth: number, fitHeight: number): TextElement {
  const fontSize = Math.round(fitWidth * 0.06);
  const width = fitWidth * 0.7;
  const height = fontSize * 1.4;
  return {
    id: nanoid(8),
    type: 'text',
    name: 'Text',
    x: (fitWidth - width) / 2,
    y: (fitHeight - height) / 2,
    width,
    height,
    rotation: 0,
    opacity: 1,
    locked: false,
    visible: true,
    blendMode: 'normal',
    text,
    fontFamily: 'Inter',
    fontSize,
    fontWeight: 600,
    italic: false,
    underline: false,
    fill: '#ffffff',
    align: 'center',
    lineHeight: 1.2,
    letterSpacing: 0,
    autoResize: true,
  };
}

export function createShapeElement(
  shape: ShapeKind,
  fitWidth: number,
  fitHeight: number,
): ShapeElement {
  const size = Math.min(fitWidth, fitHeight) * 0.3;
  return {
    id: nanoid(8),
    type: 'shape',
    name: shape.charAt(0).toUpperCase() + shape.slice(1),
    x: (fitWidth - size) / 2,
    y: (fitHeight - size) / 2,
    width: size,
    height: shape === 'line' ? 4 : size,
    rotation: 0,
    opacity: 1,
    locked: false,
    visible: true,
    blendMode: 'normal',
    shape,
    fill: '#ffffff',
    cornerRadius: shape === 'rect' ? 16 : 0,
  };
}
