import { useState } from 'react';
import { Modal } from './ui/Modal';
import { useEditor } from '../store/editorStore';
import type { ImageElement, Slide } from '../types';
import { cssCropStyle } from '../utils/cssCrop';
import { computeContainRect } from '../utils/image';
import { Plus, Copy, Trash2 } from 'lucide-react';
import { cn } from '../utils/cn';

interface Props {
  open: boolean;
  onClose: () => void;
}

/**
 * Full-screen grid overview of every slide in the carousel. Useful for
 * narrative review at a glance, jumping to a slide, or bulk operations.
 */
export function SlidesGridModal({ open, onClose }: Props) {
  const slides = useEditor((s) => s.slides);
  const currentSlideId = useEditor((s) => s.currentSlideId);
  const selectSlide = useEditor((s) => s.selectSlide);
  const duplicateSlide = useEditor((s) => s.duplicateSlide);
  const deleteSlide = useEditor((s) => s.deleteSlide);
  const addSlide = useEditor((s) => s.addSlide);
  const [zoom, setZoom] = useState(1);

  const cardWidth = 220 * zoom;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Carousel overview"
      description={`${slides.length} slide${slides.length === 1 ? '' : 's'} — click to open, drag from the bottom strip to reorder`}
      size="lg"
      footer={
        <>
          <div className="mr-auto flex items-center gap-2">
            <span className="text-[10px] uppercase tracking-wider text-ink-500">Size</span>
            <input
              type="range"
              min={0.6}
              max={2}
              step={0.05}
              value={zoom}
              onChange={(e) => setZoom(parseFloat(e.target.value))}
              className="range w-28"
            />
          </div>
          <button
            className="btn-outline"
            onClick={() => {
              addSlide();
            }}
          >
            <Plus size={12} strokeWidth={1.5} /> Add slide
          </button>
          <button className="btn-solid" onClick={onClose}>
            Done
          </button>
        </>
      }
    >
      <div
        className="grid gap-4 pb-2"
        style={{
          gridTemplateColumns: `repeat(auto-fill, minmax(${cardWidth}px, 1fr))`,
        }}
      >
        {slides.map((slide, i) => (
          <div
            key={slide.id}
            className={cn(
              'group relative overflow-hidden rounded-xl border transition-all hover:scale-[1.01]',
              slide.id === currentSlideId
                ? 'border-white/40 shadow-[0_0_0_2px_rgba(255,255,255,0.18)]'
                : 'border-white/[0.08]',
            )}
          >
            <button
              className="block w-full"
              onClick={() => {
                selectSlide(slide.id);
                onClose();
              }}
            >
              <SlideCardPreview slide={slide} />
            </button>
            <div className="flex items-center justify-between border-t hairline bg-ink-950/80 px-2 py-1.5">
              <div className="flex items-center gap-1.5">
                <span className="rounded bg-white/[0.08] px-1.5 py-0.5 font-mono text-[9px] text-ink-200">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span className="truncate text-[11px] font-medium text-white">{slide.name}</span>
              </div>
              <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                <button
                  className="icon-btn h-6 w-6"
                  onClick={(e) => {
                    e.stopPropagation();
                    duplicateSlide(slide.id);
                  }}
                >
                  <Copy size={11} strokeWidth={1.5} />
                </button>
                {slides.length > 1 && (
                  <button
                    className="icon-btn h-6 w-6 hover:text-rose-300"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteSlide(slide.id);
                    }}
                  >
                    <Trash2 size={11} strokeWidth={1.5} />
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </Modal>
  );
}

function SlideCardPreview({ slide }: { slide: Slide }) {
  const bgStyle: React.CSSProperties = {};
  if (slide.background.kind === 'color') bgStyle.background = slide.background.color;
  if (slide.background.kind === 'gradient')
    bgStyle.background = `linear-gradient(${slide.background.angle}deg, ${slide.background.from}, ${slide.background.to})`;
  if (slide.background.kind === 'image') {
    const bg = slide.background;
    const css = cssCropStyle(bg.crop, { width: bg.naturalWidth, height: bg.naturalHeight });
    bgStyle.backgroundImage = `url(${bg.previewSrc || bg.src})`;
    bgStyle.backgroundRepeat = 'no-repeat';
    bgStyle.backgroundSize = css.backgroundSize;
    bgStyle.backgroundPosition = css.backgroundPosition;
    if (bg.blur > 0) bgStyle.filter = `blur(${bg.blur}px)`;
  }

  return (
    <div
      className="relative w-full overflow-hidden"
      style={{
        aspectRatio: `${slide.width} / ${slide.height}`,
        ...bgStyle,
      }}
    >
      {slide.elements.map((el) => {
        if (!el.visible) return null;
        const common: React.CSSProperties = {
          position: 'absolute',
          left: `${(el.x / slide.width) * 100}%`,
          top: `${(el.y / slide.height) * 100}%`,
          width: `${(el.width / slide.width) * 100}%`,
          height: `${(el.height / slide.height) * 100}%`,
          transform: el.rotation ? `rotate(${el.rotation}deg)` : undefined,
          opacity: el.opacity,
          mixBlendMode: el.blendMode === 'normal' ? 'normal' : (el.blendMode as any),
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
                  src={img.previewSrc || img.src}
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
              src={img.previewSrc || img.src}
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
          return (
            <div
              key={el.id}
              style={{
                ...common,
                color: t.fill,
                fontFamily: t.fontFamily,
                fontSize: `${(t.fontSize / slide.width) * 100}cqw`,
                fontWeight: t.fontWeight,
                fontStyle: t.italic ? 'italic' : 'normal',
                textDecoration: t.underline ? 'underline' : 'none',
                textAlign: t.align,
                lineHeight: t.lineHeight,
                letterSpacing: `${(t.letterSpacing / slide.width) * 100}cqw`,
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
              border: s.stroke ? `${s.stroke.width}px solid ${s.stroke.color}` : undefined,
            }}
          />
        );
      })}
    </div>
  );
}
