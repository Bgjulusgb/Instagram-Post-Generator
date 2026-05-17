import { useRef, useState } from 'react';
import { Plus, Copy, Trash2, GripVertical } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useEditor } from '../store/editorStore';
import type { ImageElement, Slide } from '../types';
import { cn } from '../utils/cn';
import { cssCropStyle } from '../utils/cssCrop';
import { computeContainRect } from '../utils/image';
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
  const renameSlide = useEditor((s) => s.renameSlide);

  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  return (
    <div className="z-30 flex h-36 flex-shrink-0 items-stretch gap-2 border-t hairline glass px-3 py-3">
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
            onRename={(name) => renameSlide(slide.id, name)}
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
  onRename: (name: string) => void;
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
  onRename,
  onDragStart,
  onDragEnter,
  onDragEnd,
}: SlideThumbProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [editing, setEditing] = useState(false);
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
      <div
        className="mt-1 text-center"
        onDoubleClick={(e) => {
          e.stopPropagation();
          setEditing(true);
        }}
      >
        {editing ? (
          <input
            autoFocus
            defaultValue={slide.name}
            onBlur={(e) => {
              onRename(e.target.value.trim() || slide.name);
              setEditing(false);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
              if (e.key === 'Escape') setEditing(false);
            }}
            onClick={(e) => e.stopPropagation()}
            className="w-full rounded bg-white/10 px-1 text-center text-[9px] text-white outline-none ring-1 ring-white/30"
          />
        ) : (
          <div className="truncate px-1 text-[9px] text-ink-400">{slide.name}</div>
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
    style.backgroundRepeat = 'no-repeat';
    const css = cssCropStyle(bg.crop, {
      width: bg.naturalWidth,
      height: bg.naturalHeight,
    });
    style.backgroundSize = css.backgroundSize;
    style.backgroundPosition = css.backgroundPosition;
  }

  return (
    <div className="relative h-full w-full overflow-hidden" style={style}>
      {slide.elements.slice(0, 16).map((el) => {
        if (!el.visible) return null;
        const common: React.CSSProperties = {
          position: 'absolute',
          left: `${(el.x / slide.width) * 100}%`,
          top: `${(el.y / slide.height) * 100}%`,
          width: `${(el.width / slide.width) * 100}%`,
          height: `${(el.height / slide.height) * 100}%`,
          opacity: el.opacity,
          transform: el.rotation ? `rotate(${el.rotation}deg)` : undefined,
        };
        if (el.type === 'image') {
          const img = el as ImageElement;
          if (img.fitMode === 'contain') {
            const fit = computeContainRect(img.width, img.height, img.naturalWidth, img.naturalHeight);
            return (
              <div
                key={el.id}
                style={{
                  ...common,
                  overflow: 'hidden',
                  borderRadius: `${(img.cornerRadius / Math.min(img.width, img.height)) * 50}%`,
                }}
              >
                <img
                  src={img.src}
                  alt=""
                  style={{
                    position: 'absolute',
                    left: `${(fit.x / img.width) * 100}%`,
                    top: `${(fit.y / img.height) * 100}%`,
                    width: `${(fit.width / img.width) * 100}%`,
                    height: `${(fit.height / img.height) * 100}%`,
                  }}
                />
              </div>
            );
          }
          return (
            <img
              key={el.id}
              src={img.src}
              alt=""
              style={{
                ...common,
                objectFit: img.fitMode === 'fill' ? 'fill' : 'cover',
                objectPosition: `${img.pan.x * 100}% ${img.pan.y * 100}%`,
                borderRadius: `${(img.cornerRadius / Math.min(img.width, img.height)) * 50}%`,
              }}
            />
          );
        }
        if (el.type === 'text') {
          const t = el as any;
          // Approximate text by rendering thin lines based on word count to
          // keep the thumbnail readable at very small sizes.
          return (
            <div
              key={el.id}
              style={{
                ...common,
                color: t.fill,
                background: 'transparent',
                fontSize: `${Math.max(2, (t.fontSize / slide.width) * 100)}cqw`,
                fontFamily: t.fontFamily,
                fontWeight: t.fontWeight,
                fontStyle: t.italic ? 'italic' : 'normal',
                textDecoration: t.underline ? 'underline' : 'none',
                textAlign: t.align,
                lineHeight: t.lineHeight,
                whiteSpace: 'pre-wrap',
                overflow: 'hidden',
                containerType: 'inline-size',
              }}
            >
              {t.text}
            </div>
          );
        }
        const s = el as any;
        return (
          <div
            key={el.id}
            style={{
              ...common,
              background: s.fill,
              borderRadius:
                s.shape === 'ellipse'
                  ? '50%'
                  : `${(s.cornerRadius / Math.min(s.width, s.height)) * 50}%`,
            }}
          />
        );
      })}
    </div>
  );
}
