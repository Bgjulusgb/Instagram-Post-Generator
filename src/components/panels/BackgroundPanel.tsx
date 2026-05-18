import { useRef } from 'react';
import { Lock, Unlock, Layers as LayersIcon } from 'lucide-react';
import { useEditor } from '../../store/editorStore';
import { computeCoverCrop } from '../../utils/image';
import { processImageFile } from '../../utils/imagePreview';
import { toast } from '../../hooks/useToast';
import { ColorInput } from '../ui/ColorInput';
import { Slider } from '../ui/Slider';
import { cn } from '../../utils/cn';

const GRADIENT_PRESETS: { from: string; to: string; angle: number; label: string }[] = [
  { from: '#0a0a0a', to: '#2a2a2a', angle: 135, label: 'Charcoal' },
  { from: '#ffffff', to: '#9ca3af', angle: 135, label: 'Silver' },
  { from: '#fee7c4', to: '#f0a07b', angle: 135, label: 'Sand' },
  { from: '#d4d0c4', to: '#5b5544', angle: 135, label: 'Stone' },
  { from: '#000000', to: '#4f1d1d', angle: 180, label: 'Burgundy' },
  { from: '#0a0a0a', to: '#0c2236', angle: 135, label: 'Midnight' },
  { from: '#f1eee7', to: '#cabea1', angle: 135, label: 'Linen' },
  { from: '#0c1923', to: '#1d3a52', angle: 135, label: 'Slate' },
];

const SOLID_PRESETS = ['#000000', '#ffffff', '#0a0a0a', '#f7f7f5', '#1c1c1e', '#5b5544', '#e1d8c4', '#cf9b66', '#3b3b3b', '#cbd5d1'];

export function BackgroundPanel() {
  const slides = useEditor((s) => s.slides);
  const currentSlideId = useEditor((s) => s.currentSlideId);
  const slide = slides.find((s) => s.id === currentSlideId)!;
  const setBackground = useEditor((s) => s.setBackground);
  const toggleLock = useEditor((s) => s.toggleBackgroundLock);
  const applyPanorama = useEditor((s) => s.applyPanoramaImage);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const panoramaInputRef = useRef<HTMLInputElement>(null);

  const onUpload = async (file: File) => {
    const toastId = file.size > 2_500_000 ? toast.loading('Processing image…') : null;
    try {
      const { src, previewSrc, naturalWidth, naturalHeight } = await processImageFile(file);
      const crop = computeCoverCrop(slide.width, slide.height, naturalWidth, naturalHeight);
      setBackground(slide.id, {
        kind: 'image',
        src,
        previewSrc,
        naturalWidth,
        naturalHeight,
        blur: 0,
        fitMode: 'cover',
        crop,
      });
      if (toastId !== null)
        toast.update(toastId, { tone: 'success', title: 'Background set', duration: 1800 });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (toastId !== null)
        toast.update(toastId, { tone: 'error', title: 'Background failed', message: msg });
      else toast.error('Background failed', msg);
    }
  };

  const onPanorama = async (file: File) => {
    const toastId = toast.loading('Processing panorama…');
    try {
      const { src, previewSrc, naturalWidth, naturalHeight } = await processImageFile(file);
      const targetIds = slides.map((s) => s.id);
      applyPanorama({ src, previewSrc, naturalWidth, naturalHeight }, targetIds);
      toast.update(toastId, {
        tone: 'success',
        title: 'Panorama applied',
        message: `Split across ${targetIds.length} slide${targetIds.length === 1 ? '' : 's'}`,
        duration: 2400,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.update(toastId, { tone: 'error', title: 'Panorama failed', message: msg });
    }
  };

  const bg = slide.background;

  return (
    <div>
      <div className="panel-section">
        <div className="panel-heading">
          Background
          <button
            onClick={() => toggleLock(slide.id)}
            className="icon-btn h-6 w-6"
            title={slide.backgroundLocked ? 'Unlock background' : 'Lock background'}
          >
            {slide.backgroundLocked ? <Lock size={12} strokeWidth={1.5} /> : <Unlock size={12} strokeWidth={1.5} />}
          </button>
        </div>

        {/* Solid colors */}
        <div className="mb-3">
          <div className="mb-1.5 text-[10px] uppercase tracking-wider text-ink-500">Solid</div>
          <div className="grid grid-cols-5 gap-1.5">
            {SOLID_PRESETS.map((c) => (
              <button
                key={c}
                onClick={() => setBackground(slide.id, { kind: 'color', color: c })}
                className={cn(
                  'aspect-square rounded-md border transition-transform hover:scale-105',
                  bg.kind === 'color' && bg.color === c ? 'border-white/60' : 'border-white/10',
                )}
                style={{ background: c }}
              />
            ))}
          </div>
          <div className="mt-2">
            <ColorInput
              value={bg.kind === 'color' ? bg.color : '#000000'}
              onChange={(v) => setBackground(slide.id, { kind: 'color', color: v })}
              label="Custom"
            />
          </div>
        </div>

        {/* Gradients */}
        <div className="mb-3">
          <div className="mb-1.5 text-[10px] uppercase tracking-wider text-ink-500">Gradient</div>
          <div className="grid grid-cols-4 gap-1.5">
            {GRADIENT_PRESETS.map((g) => (
              <button
                key={g.label}
                title={g.label}
                onClick={() =>
                  setBackground(slide.id, { kind: 'gradient', from: g.from, to: g.to, angle: g.angle })
                }
                className="aspect-square overflow-hidden rounded-md border hairline transition-transform hover:scale-105"
                style={{ background: `linear-gradient(${g.angle}deg, ${g.from}, ${g.to})` }}
              />
            ))}
          </div>
          {bg.kind === 'gradient' && (
            <div className="mt-2 space-y-2">
              <ColorInput label="From" value={bg.from} onChange={(v) => setBackground(slide.id, { ...bg, from: v })} />
              <ColorInput label="To" value={bg.to} onChange={(v) => setBackground(slide.id, { ...bg, to: v })} />
              <Slider
                label="Angle"
                value={bg.angle}
                min={0}
                max={360}
                step={1}
                unit="°"
                onChange={(v) => setBackground(slide.id, { ...bg, angle: v })}
              />
            </div>
          )}
        </div>

        {/* Image bg */}
        <div className="mb-3">
          <div className="mb-1.5 flex items-center justify-between text-[10px] uppercase tracking-wider text-ink-500">
            <span>Image</span>
          </div>
          <div className="flex gap-1.5">
            <button onClick={() => fileInputRef.current?.click()} className="btn-outline flex-1">
              Upload image
            </button>
            <button
              onClick={() => panoramaInputRef.current?.click()}
              className="btn-outline flex-1 gap-1"
              title="Split across slides"
            >
              <LayersIcon size={12} />
              Panorama
            </button>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onUpload(f);
              e.target.value = '';
            }}
          />
          <input
            ref={panoramaInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onPanorama(f);
              e.target.value = '';
            }}
          />

          {bg.kind === 'image' && (
            <div className="mt-2 space-y-2">
              <div className="relative aspect-video overflow-hidden rounded-lg border hairline">
                <img src={bg.src} className="h-full w-full object-cover" />
                {slide.panoramaGroupId && (
                  <div className="absolute bottom-1 right-1 rounded bg-black/60 px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-white">
                    Panorama {(slide.panoramaIndex ?? 0) + 1}/{slide.panoramaTotal}
                  </div>
                )}
              </div>
              <Slider
                label="Blur"
                value={bg.blur}
                min={0}
                max={40}
                step={0.5}
                onChange={(v) => setBackground(slide.id, { ...bg, blur: v })}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
