import { useRef, useState } from 'react';
import { Plus, Copy, Trash2, GripVertical } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useEditor } from '../store/editorStore';
import type { Slide } from '../types';
import { cn } from '../utils/cn';
import { Tooltip } from './ui/Tooltip';

/**
 * Horizontal strip of slide thumbnails at the bottom of the editor.
 * Supports click-to-select, drag-to-reorder, and per-slide actions.
 */
export function SlidesPanel() {
  const slides = useEditor((s) => s.slides);
  const currentSlideId = useEditor((s) => s.currentSlideId);
  const selectSlide = useEditor((s) => s.selectSlide);
  const reorderSlides = useEditor((s) => s.reorderSlides);
  const addSlide = useEditor((s) => s.addSlide);
  const duplicateSlide = useEditor((s) => s.duplicateSlide);
  const deleteSlide = useEditor((s) => s.deleteSlide);

  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  return (
    <div className="z-30 flex h-32 flex-shrink-0 items-stretch gap-2 border-t hairline glass px-3 py-3">
      <div className="flex flex-1 items-center gap-2 overflow-x-auto pr-1">
        {slides.map((slide, i) => (
          <SlideThumb
            key={slide.id}
            slide={slide}
            index={i}
            active={slide.id === currentSlideId}
            isDragOver={hoverIndex === i && dragIndex !== null}
            onClick={() => selectSlide(slide.id)}
            onDuplicate={() => duplicateSlide(slide.id)}
            onDelete={() => deleteSlide(slide.id)}
            onDragStart={() => setDragIndex(i)}
            onDragEnter={() => setHoverIndex(i)}
            onDragEnd={() => {
              if (dragIndex !== null && hoverIndex !== null) {
                reorderSlides(dragIndex, hoverIndex);
              }
              setDragIndex(null);
              setHoverIndex(null);
            }}
            canDelete={slides.length > 1}
          />
        ))}
      </div>

      <div className="flex flex-shrink-0 flex-col items-stretch gap-2">
        <Tooltip label="Add slide" side="top">
          <button
            onClick={() => addSlide()}
            className="flex h-full min-h-[80px] w-20 flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-white/10 bg-white/[0.02] text-ink-300 transition-all hover:border-white/20 hover:bg-white/[0.05] hover:text-white"
          >
            <Plus size={16} strokeWidth={1.5} />
            <span className="text-[10px]">Add slide</span>
          </button>
        </Tooltip>
      </div>
    </div>
  );
}

interface SlideThumbProps {
  slide: Slide;
  index: number;
  active: boolean;
  isDragOver: boolean;
  canDelete: boolean;
  onClick: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onDragStart: () => void;
  onDragEnter: () => void;
  onDragEnd: () => void;
}

function SlideThumb({
  slide,
  index,
  active,
  isDragOver,
  canDelete,
  onClick,
  onDuplicate,
  onDelete,
  onDragStart,
  onDragEnter,
  onDragEnd,
}: SlideThumbProps) {
  const ref = useRef<HTMLDivElement>(null);
  // Compute a tiny preview height that fits in 80px tall
  const aspect = slide.height / slide.width;
  const thumbHeight = 80;
  const thumbWidth = thumbHeight / aspect;

  return (
    <motion.div
      ref={ref}
      layout
      transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
      draggable
      onDragStart={(e) => {
        (e as unknown as DragEvent).dataTransfer?.setData('text/plain', slide.id);
        onDragStart();
      }}
      onDragEnter={onDragEnter}
      onDragOver={(e) => e.preventDefault()}
      onDragEnd={onDragEnd}
      className={cn(
        'group relative flex-shrink-0 cursor-grab transition-transform active:cursor-grabbing',
        isDragOver && 'scale-105',
      )}
      onClick={onClick}
    >
      <div
        className={cn(
          'relative overflow-hidden rounded-lg border transition-all',
          active ? 'border-white shadow-[0_0_0_2px_rgba(255,255,255,0.16)]' : 'border-white/[0.08] hover:border-white/20',
        )}
        style={{
          width: thumbWidth,
          height: thumbHeight,
        }}
      >
        <SlideThumbPreview slide={slide} />
        <div className="pointer-events-none absolute bottom-0.5 left-1 rounded bg-black/60 px-1 py-px font-mono text-[8px] text-white/80">
          {String(index + 1).padStart(2, '0')}
        </div>
        {slide.panoramaGroupId && (
          <div className="pointer-events-none absolute top-0.5 right-0.5 rounded bg-black/60 px-1 py-px text-[8px] uppercase tracking-wider text-white/80">
            P{(slide.panoramaIndex ?? 0) + 1}
          </div>
        )}
      </div>

      <AnimatePresence>
        {active && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            className="absolute -top-7 left-1/2 flex -translate-x-1/2 items-center gap-0.5 rounded-md glass-strong px-1 py-0.5 shadow-lg"
          >
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDuplicate();
              }}
              className="icon-btn h-5 w-5"
              title="Duplicate"
            >
              <Copy size={10} strokeWidth={1.5} />
            </button>
            {canDelete && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                }}
                className="icon-btn h-5 w-5 hover:text-rose-300"
                title="Delete"
              >
                <Trash2 size={10} strokeWidth={1.5} />
              </button>
            )}
            <span className="px-1 text-ink-400">
              <GripVertical size={9} strokeWidth={1.5} />
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function SlideThumbPreview({ slide }: { slide: Slide }) {
  const bg = slide.background;
  const style: React.CSSProperties = {};
  if (bg.kind === 'color') style.background = bg.color;
  if (bg.kind === 'gradient')
    style.background = `linear-gradient(${bg.angle}deg, ${bg.from}, ${bg.to})`;
  if (bg.kind === 'image') {
    style.backgroundImage = `url(${bg.src})`;
    style.backgroundSize = 'cover';
    style.backgroundPosition = slide.panoramaGroupId
      ? `${((slide.panoramaIndex ?? 0) / Math.max(1, (slide.panoramaTotal ?? 1) - 1)) * 100}% center`
      : 'center';
    style.backgroundSize = slide.panoramaGroupId
      ? `${100 * (slide.panoramaTotal ?? 1)}% 100%`
      : 'cover';
  }

  return (
    <div className="relative h-full w-full" style={style}>
      {/* Lightweight visual indicators of elements */}
      {slide.elements.slice(0, 12).map((el) => {
        const left = (el.x / slide.width) * 100;
        const top = (el.y / slide.height) * 100;
        const width = (el.width / slide.width) * 100;
        const height = (el.height / slide.height) * 100;
        return (
          <div
            key={el.id}
            className="absolute"
            style={{
              left: `${left}%`,
              top: `${top}%`,
              width: `${width}%`,
              height: `${height}%`,
              background:
                el.type === 'text'
                  ? 'rgba(255,255,255,0.35)'
                  : el.type === 'image'
                    ? 'rgba(255,255,255,0.2)'
                    : (el as any).fill ?? 'rgba(255,255,255,0.4)',
              opacity: el.visible ? el.opacity * 0.9 : 0,
              transform: el.rotation ? `rotate(${el.rotation}deg)` : undefined,
            }}
          />
        );
      })}
    </div>
  );
}
