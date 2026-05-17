import { useEffect, useRef, useState } from 'react';
import { Modal } from './ui/Modal';
import { useEditor } from '../store/editorStore';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Slide } from '../types';

interface Props {
  open: boolean;
  onClose: () => void;
}

/**
 * Instagram-style carousel preview. Renders each slide as a square-frame DOM
 * approximation (sufficient for layout review) with swipe / arrow nav.
 */
export function CarouselPreview({ open, onClose }: Props) {
  const slides = useEditor((s) => s.slides);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (open) setIndex(0);
  }, [open]);

  if (slides.length === 0) return null;

  return (
    <Modal open={open} onClose={onClose} title="Carousel preview" size="md">
      <div className="flex flex-col items-center gap-3">
        <div className="relative">
          <PhoneFrame>
            <div className="relative h-full w-full overflow-hidden">
              <AnimatePresence initial={false} mode="popLayout">
                <motion.div
                  key={slides[index].id}
                  initial={{ opacity: 0, x: 30 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -30 }}
                  transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
                  className="absolute inset-0"
                >
                  <SlideDomRender slide={slides[index]} />
                </motion.div>
              </AnimatePresence>

              {/* Pagination dots */}
              <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1">
                {slides.map((_, i) => (
                  <span
                    key={i}
                    className={`h-1.5 w-1.5 rounded-full transition-all ${
                      i === index ? 'w-4 bg-white' : 'bg-white/40'
                    }`}
                  />
                ))}
              </div>
            </div>
          </PhoneFrame>

          <button
            disabled={index === 0}
            onClick={() => setIndex((i) => Math.max(0, i - 1))}
            className="absolute -left-4 top-1/2 -translate-y-1/2 rounded-full border hairline glass p-2 text-white shadow-lg transition-all hover:scale-110 disabled:opacity-30"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            disabled={index === slides.length - 1}
            onClick={() => setIndex((i) => Math.min(slides.length - 1, i + 1))}
            className="absolute -right-4 top-1/2 -translate-y-1/2 rounded-full border hairline glass p-2 text-white shadow-lg transition-all hover:scale-110 disabled:opacity-30"
          >
            <ChevronRight size={16} />
          </button>
        </div>
        <div className="text-[11px] text-ink-400">
          Slide {index + 1} of {slides.length}
        </div>
      </div>
    </Modal>
  );
}

function PhoneFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative h-[480px] w-[280px] rounded-[42px] border border-white/10 bg-ink-950 p-2 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.8)]">
      <div className="absolute left-1/2 top-2 z-10 h-5 w-20 -translate-x-1/2 rounded-full bg-ink-950" />
      <div className="h-full w-full overflow-hidden rounded-[34px] bg-ink-900">{children}</div>
    </div>
  );
}

/**
 * DOM-only approximation: positions each element as a div for a quick preview.
 * Not pixel-perfect to Konva output but fast enough for swipe review.
 */
function SlideDomRender({ slide }: { slide: Slide }) {
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(() => {
      if (!ref.current) return;
      const w = ref.current.clientWidth;
      setScale(w / slide.width);
    });
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, [slide.width]);

  const bgStyle: React.CSSProperties = {};
  if (slide.background.kind === 'color') bgStyle.background = slide.background.color;
  if (slide.background.kind === 'gradient')
    bgStyle.background = `linear-gradient(${slide.background.angle}deg, ${slide.background.from}, ${slide.background.to})`;
  if (slide.background.kind === 'image') {
    bgStyle.backgroundImage = `url(${slide.background.src})`;
    bgStyle.backgroundSize = slide.panoramaGroupId
      ? `${100 * (slide.panoramaTotal ?? 1)}% 100%`
      : 'cover';
    bgStyle.backgroundPosition = slide.panoramaGroupId
      ? `${((slide.panoramaIndex ?? 0) / Math.max(1, (slide.panoramaTotal ?? 1) - 1)) * 100}% center`
      : 'center';
    if (slide.background.blur > 0) bgStyle.filter = `blur(${slide.background.blur * scale}px)`;
  }

  return (
    <div ref={ref} className="relative h-full w-full overflow-hidden" style={bgStyle}>
      <div
        className="absolute left-0 top-1/2 -translate-y-1/2 origin-top-left"
        style={{
          transform: `translateY(-50%) scale(${scale})`,
          width: slide.width,
          height: slide.height,
        }}
      >
        {slide.elements.map((el) => {
          const common: React.CSSProperties = {
            position: 'absolute',
            left: el.x,
            top: el.y,
            width: el.width,
            height: el.height,
            transform: `rotate(${el.rotation}deg)`,
            opacity: el.visible ? el.opacity : 0,
            mixBlendMode: el.blendMode === 'normal' ? 'normal' : (el.blendMode as any),
          };
          if (el.type === 'text') {
            return (
              <div
                key={el.id}
                style={{
                  ...common,
                  color: (el as any).fill,
                  fontFamily: (el as any).fontFamily,
                  fontSize: (el as any).fontSize,
                  fontWeight: (el as any).fontWeight,
                  fontStyle: (el as any).italic ? 'italic' : 'normal',
                  textDecoration: (el as any).underline ? 'underline' : 'none',
                  textAlign: (el as any).align,
                  lineHeight: (el as any).lineHeight,
                  letterSpacing: (el as any).letterSpacing,
                  whiteSpace: 'pre-wrap',
                  overflow: 'hidden',
                }}
              >
                {(el as any).text}
              </div>
            );
          }
          if (el.type === 'image') {
            return (
              <img
                key={el.id}
                src={(el as any).src}
                style={{
                  ...common,
                  objectFit: 'cover',
                  borderRadius: (el as any).cornerRadius,
                }}
              />
            );
          }
          if (el.type === 'shape') {
            const s = el as any;
            return (
              <div
                key={el.id}
                style={{
                  ...common,
                  background: s.fill,
                  borderRadius: s.shape === 'ellipse' ? '50%' : s.cornerRadius,
                  border: s.stroke ? `${s.stroke.width}px solid ${s.stroke.color}` : undefined,
                }}
              />
            );
          }
          return null;
        })}
      </div>
    </div>
  );
}
