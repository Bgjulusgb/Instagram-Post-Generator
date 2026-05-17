import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { produce } from 'immer';
import { nanoid } from 'nanoid';
import type {
  AnyElement,
  BackgroundFill,
  ImageAdjustments,
  ImageElement,
  ShapeElement,
  ShapeKind,
  Slide,
  Snapshot,
  TextElement,
  ToolMode,
} from '../types';
import { DEFAULT_ADJUSTMENTS, SLIDE_FORMATS } from '../types';

const STORAGE_KEY = 'carousel-studio:project';
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

  // Persistence
  loadFromStorage: () => void;
  saveToStorage: () => void;
  loadProject: (slides: Slide[]) => void;
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
          targetSlideIds.forEach((sid, idx) => {
            const slide = draft.slides.find((s) => s.id === sid);
            if (!slide || slide.backgroundLocked) return;
            slide.background = {
              kind: 'image',
              src,
              naturalWidth,
              naturalHeight,
              blur: 0,
            };
            slide.panoramaGroupId = groupId;
            slide.panoramaIndex = idx;
            slide.panoramaTotal = targetSlideIds.length;
          });
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

    saveToStorage: () => {
      try {
        const { slides } = get();
        const data = {
          version: 1,
          updatedAt: Date.now(),
          slides,
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      } catch {
        // ignore quota errors
      }
    },

    loadFromStorage: () => {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return;
        const data = JSON.parse(raw);
        if (Array.isArray(data.slides) && data.slides.length > 0) {
          set({
            slides: data.slides,
            currentSlideId: data.slides[0].id,
            selectedElementIds: [],
            history: [],
            future: [],
          });
        }
      } catch {
        // ignore parse errors
      }
    },

    loadProject: (slides) => {
      if (!Array.isArray(slides) || slides.length === 0) return;
      set({
        slides,
        currentSlideId: slides[0].id,
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
      });
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

export function createImageElement(
  src: string,
  naturalWidth: number,
  naturalHeight: number,
  fitWidth: number,
  fitHeight: number,
): ImageElement {
  const ratio = naturalWidth / naturalHeight;
  let w = fitWidth * 0.8;
  let h = w / ratio;
  if (h > fitHeight * 0.8) {
    h = fitHeight * 0.8;
    w = h * ratio;
  }
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
