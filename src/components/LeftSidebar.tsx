import { useRef, useState } from 'react';
import {
  MousePointer2,
  Hand,
  Type,
  Square,
  Circle as CircleIcon,
  Minus,
  Crop,
  Image as ImageIcon,
  Layers,
  Palette,
  Settings2,
  Sparkles,
  Plus,
  Triangle,
  Star,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useEditor, createImageElement } from '../store/editorStore';
import { loadImageFile } from '../utils/image';
import { Tooltip } from './ui/Tooltip';
import type { ToolMode } from '../types';
import { cn } from '../utils/cn';
import { LayersPanel } from './panels/LayersPanel';
import { BackgroundPanel } from './panels/BackgroundPanel';
import { TemplatesPanel } from './panels/TemplatesPanel';
import { CanvasSettingsPanel } from './panels/CanvasSettingsPanel';

type TabId = 'design' | 'media' | 'layers' | 'background' | 'templates' | 'settings';

const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: 'design', label: 'Design', icon: <Sparkles size={16} strokeWidth={1.5} /> },
  { id: 'media', label: 'Media', icon: <ImageIcon size={16} strokeWidth={1.5} /> },
  { id: 'background', label: 'Background', icon: <Palette size={16} strokeWidth={1.5} /> },
  { id: 'layers', label: 'Layers', icon: <Layers size={16} strokeWidth={1.5} /> },
  { id: 'templates', label: 'Templates', icon: <Sparkles size={16} strokeWidth={1.5} /> },
  { id: 'settings', label: 'Settings', icon: <Settings2 size={16} strokeWidth={1.5} /> },
];

const TOOLS: { id: ToolMode; icon: React.ReactNode; label: string; shortcut: string }[] = [
  { id: 'select', icon: <MousePointer2 size={15} strokeWidth={1.5} />, label: 'Move', shortcut: 'V' },
  { id: 'hand', icon: <Hand size={15} strokeWidth={1.5} />, label: 'Pan', shortcut: 'H' },
  { id: 'text', icon: <Type size={15} strokeWidth={1.5} />, label: 'Text', shortcut: 'T' },
  { id: 'rect', icon: <Square size={15} strokeWidth={1.5} />, label: 'Rectangle', shortcut: 'R' },
  { id: 'ellipse', icon: <CircleIcon size={15} strokeWidth={1.5} />, label: 'Ellipse', shortcut: 'O' },
  { id: 'line', icon: <Minus size={15} strokeWidth={1.5} />, label: 'Line', shortcut: 'L' },
  { id: 'crop', icon: <Crop size={15} strokeWidth={1.5} />, label: 'Crop', shortcut: 'C' },
];

export function LeftSidebar() {
  const [activeTab, setActiveTab] = useState<TabId>('design');
  const tool = useEditor((s) => s.tool);
  const setTool = useEditor((s) => s.setTool);

  return (
    <div className="z-30 flex h-full flex-shrink-0 border-r hairline glass">
      {/* Tool rail */}
      <div className="flex w-14 flex-col items-center gap-1 border-r hairline py-2">
        {TOOLS.map((t) => (
          <Tooltip key={t.id} label={t.label} shortcut={t.shortcut} side="right">
            <button
              className={cn('icon-btn h-9 w-9', tool === t.id && 'icon-btn-active')}
              onClick={() => setTool(t.id)}
            >
              {t.icon}
            </button>
          </Tooltip>
        ))}
        <div className="my-1 h-px w-7 bg-white/[0.06]" />
        {TABS.map((t) => (
          <Tooltip key={t.id} label={t.label} side="right">
            <button
              className={cn('icon-btn h-9 w-9', activeTab === t.id && 'icon-btn-active')}
              onClick={() => setActiveTab(t.id)}
            >
              {t.icon}
            </button>
          </Tooltip>
        ))}
      </div>

      {/* Panel */}
      <div className="w-72 flex-shrink-0 overflow-y-auto">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -8 }}
            transition={{ duration: 0.16 }}
          >
            {activeTab === 'design' && <DesignPanel />}
            {activeTab === 'media' && <MediaPanel />}
            {activeTab === 'background' && <BackgroundPanel />}
            {activeTab === 'layers' && <LayersPanel />}
            {activeTab === 'templates' && <TemplatesPanel />}
            {activeTab === 'settings' && <CanvasSettingsPanel />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

function DesignPanel() {
  const addElement = useEditor((s) => s.addElement);
  const slides = useEditor((s) => s.slides);
  const currentSlideId = useEditor((s) => s.currentSlideId);
  const slide = slides.find((s) => s.id === currentSlideId)!;

  const insertText = (text: string, fontFamily: string, fontWeight: number, fontSize: number, italic = false) => {
    const fitW = slide.width;
    const fitH = slide.height;
    addElement({
      id: Math.random().toString(36).slice(2, 10),
      type: 'text',
      name: 'Text',
      x: (fitW - fitW * 0.7) / 2,
      y: (fitH - fontSize * 1.4) / 2,
      width: fitW * 0.7,
      height: fontSize * 1.4,
      rotation: 0,
      opacity: 1,
      locked: false,
      visible: true,
      blendMode: 'normal',
      text,
      fontFamily,
      fontSize,
      fontWeight: fontWeight as any,
      italic,
      underline: false,
      fill: '#ffffff',
      align: 'center',
      lineHeight: 1.2,
      letterSpacing: 0,
      autoResize: true,
    });
  };

  const insertShape = (kind: 'rect' | 'ellipse' | 'triangle' | 'star' | 'line') => {
    const size = Math.min(slide.width, slide.height) * 0.4;
    addElement({
      id: Math.random().toString(36).slice(2, 10),
      type: 'shape',
      name: kind.charAt(0).toUpperCase() + kind.slice(1),
      x: (slide.width - size) / 2,
      y: (slide.height - size) / 2,
      width: size,
      height: kind === 'line' ? 6 : size,
      rotation: 0,
      opacity: 1,
      locked: false,
      visible: true,
      blendMode: 'normal',
      shape: kind,
      fill: '#ffffff',
      cornerRadius: kind === 'rect' ? 24 : 0,
    });
  };

  return (
    <div>
      <div className="panel-section">
        <div className="panel-heading">Quick text</div>
        <div className="grid gap-1.5">
          <TextPreset
            text="Heading"
            family="Playfair Display"
            weight={600}
            sizeRatio={0.12}
            slideW={slide.width}
            onAdd={() => insertText('Add a heading', 'Playfair Display', 600, slide.width * 0.12)}
          />
          <TextPreset
            text="Display"
            family="Bebas Neue"
            weight={400}
            sizeRatio={0.15}
            slideW={slide.width}
            onAdd={() => insertText('DISPLAY', 'Bebas Neue', 400, slide.width * 0.18)}
          />
          <TextPreset
            text="Subhead"
            family="Inter"
            weight={500}
            sizeRatio={0.06}
            slideW={slide.width}
            onAdd={() => insertText('A clean subhead', 'Inter', 500, slide.width * 0.06)}
          />
          <TextPreset
            text="Caption"
            family="Inter"
            weight={400}
            sizeRatio={0.035}
            slideW={slide.width}
            onAdd={() => insertText('Small caption text', 'Inter', 400, slide.width * 0.035)}
          />
          <TextPreset
            text="Editorial"
            family="Cormorant Garamond"
            weight={400}
            sizeRatio={0.1}
            italic
            slideW={slide.width}
            onAdd={() =>
              insertText(
                'an editorial moment',
                'Cormorant Garamond',
                400,
                slide.width * 0.1,
                true,
              )
            }
          />
        </div>
      </div>

      <div className="panel-section">
        <div className="panel-heading">Shapes</div>
        <div className="grid grid-cols-5 gap-1.5">
          {[
            { k: 'rect', i: <Square size={16} strokeWidth={1.5} /> },
            { k: 'ellipse', i: <CircleIcon size={16} strokeWidth={1.5} /> },
            { k: 'triangle', i: <Triangle size={16} strokeWidth={1.5} /> },
            { k: 'star', i: <Star size={16} strokeWidth={1.5} /> },
            { k: 'line', i: <Minus size={16} strokeWidth={1.5} /> },
          ].map(({ k, i }) => (
            <button
              key={k}
              onClick={() => insertShape(k as any)}
              className="aspect-square rounded-lg border hairline bg-white/[0.02] text-ink-200 transition-all hover:scale-[1.04] hover:bg-white/[0.06] hover:text-white"
            >
              <span className="flex h-full w-full items-center justify-center">{i}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="panel-section">
        <div className="panel-heading">Recipes</div>
        <div className="space-y-2">
          <RecipeCard
            title="Big quote slide"
            description="Editorial serif on solid backdrop"
            onApply={() => {
              insertText('"A photograph is the\\npause of a story."', 'Playfair Display', 600, slide.width * 0.08);
            }}
          />
          <RecipeCard
            title="Title + caption"
            description="Headline with supporting line"
            onApply={() => {
              insertText('Field Notes', 'Inter', 700, slide.width * 0.11);
              setTimeout(() => insertText('Volume 04 — Iceland', 'Inter', 400, slide.width * 0.04), 30);
            }}
          />
          <RecipeCard
            title="Number cover"
            description="Oversized index"
            onApply={() => {
              insertText('01', 'Bebas Neue', 400, slide.width * 0.5);
            }}
          />
        </div>
      </div>
    </div>
  );
}

function TextPreset({
  text,
  family,
  weight,
  sizeRatio,
  slideW,
  italic,
  onAdd,
}: {
  text: string;
  family: string;
  weight: number;
  sizeRatio: number;
  slideW: number;
  italic?: boolean;
  onAdd: () => void;
}) {
  return (
    <button
      onClick={onAdd}
      className="group flex items-center justify-between rounded-lg border hairline bg-white/[0.02] px-3 py-2.5 text-left text-ink-100 transition-all hover:bg-white/[0.05]"
    >
      <span
        style={{
          fontFamily: family,
          fontWeight: weight,
          fontStyle: italic ? 'italic' : 'normal',
          fontSize: Math.min(20, slideW * sizeRatio * 0.3),
        }}
      >
        {text}
      </span>
      <Plus size={12} className="opacity-50 transition-opacity group-hover:opacity-100" />
    </button>
  );
}

function RecipeCard({
  title,
  description,
  onApply,
}: {
  title: string;
  description: string;
  onApply: () => void;
}) {
  return (
    <button
      onClick={onApply}
      className="group block w-full rounded-xl border hairline bg-white/[0.02] p-3 text-left transition-all hover:bg-white/[0.05]"
    >
      <div className="text-[11px] font-medium text-white">{title}</div>
      <div className="text-[10px] text-ink-500">{description}</div>
    </button>
  );
}

function MediaPanel() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const slides = useEditor((s) => s.slides);
  const currentSlideId = useEditor((s) => s.currentSlideId);
  const slide = slides.find((s) => s.id === currentSlideId)!;
  const addElement = useEditor((s) => s.addElement);
  const [recents, setRecents] = useState<{ src: string; w: number; h: number }[]>([]);

  const onFiles = async (files: FileList | null) => {
    if (!files) return;
    for (const file of Array.from(files)) {
      try {
        const data = await loadImageFile(file);
        const el = createImageElement(
          data.src,
          data.naturalWidth,
          data.naturalHeight,
          slide.width,
          slide.height,
        );
        addElement(el);
        setRecents((r) => [{ src: data.src, w: data.naturalWidth, h: data.naturalHeight }, ...r].slice(0, 24));
      } catch (err) {
        console.warn('Failed to load image', err);
      }
    }
  };

  return (
    <div>
      <div className="panel-section">
        <div className="panel-heading">Upload media</div>

        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            onFiles(e.dataTransfer.files);
          }}
          className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-white/10 bg-white/[0.02] px-4 py-8 text-center"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-full border hairline bg-white/[0.04]">
            <ImageIcon size={18} strokeWidth={1.5} className="text-ink-300" />
          </div>
          <div className="text-[11px] font-medium text-white">Drop images here</div>
          <div className="text-[10px] text-ink-500">PNG, JPG, WEBP — high resolution</div>
          <button className="btn-outline mt-1" onClick={() => fileInputRef.current?.click()}>
            Browse files
          </button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*"
            className="hidden"
            onChange={(e) => onFiles(e.target.files)}
          />
        </div>
      </div>

      {recents.length > 0 && (
        <div className="panel-section">
          <div className="panel-heading">
            Recent uploads <span className="text-ink-500">{recents.length}</span>
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            {recents.map((r, i) => (
              <button
                key={i}
                onClick={() => {
                  const el = createImageElement(r.src, r.w, r.h, slide.width, slide.height);
                  addElement(el);
                }}
                className="group relative aspect-square overflow-hidden rounded-lg border hairline bg-ink-900"
              >
                <img
                  src={r.src}
                  className="absolute inset-0 h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
                  draggable={false}
                />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
