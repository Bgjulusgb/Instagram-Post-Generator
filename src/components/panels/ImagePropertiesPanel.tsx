import { useEffect, useRef, useState } from 'react';
import type { ImageElement, ImageFitMode } from '../../types';
import { useEditor } from '../../store/editorStore';
import { Slider } from '../ui/Slider';
import { FILTER_PRESETS } from '../../utils/filters';
import { extractPalette } from '../../utils/palette';
import { loadImageFile } from '../../utils/image';
import { Maximize2, Minimize2, Move, RotateCcw, Pipette, RefreshCw } from 'lucide-react';
import { cn } from '../../utils/cn';

interface Props {
  element: ImageElement;
}

export function ImagePropertiesPanel({ element }: Props) {
  const updateElement = useEditor((s) => s.updateElement);
  const updateById = useEditor((s) => s.updateElementById);
  const applyPreset = useEditor((s) => s.applyPresetToImage);
  const resetAdjustments = useEditor((s) => s.resetAdjustments);
  const setImageFitMode = useEditor((s) => s.setImageFitMode);
  const setImagePan = useEditor((s) => s.setImagePan);
  const pushHistory = useEditor((s) => s.pushHistory);
  const replaceFileRef = useRef<HTMLInputElement>(null);

  // Replace just the photo source on the existing element. Frame, crop, and
  // adjustments are preserved (with a re-cover-crop so aspect stays correct).
  const replaceImage = async (file: File) => {
    try {
      const data = await loadImageFile(file);
      updateById<ImageElement>(element.id, (el) => {
        el.src = data.src;
        el.naturalWidth = data.naturalWidth;
        el.naturalHeight = data.naturalHeight;
      });
      // After updating naturalWidth/Height we must re-cover-crop so the new
      // photo isn't pinned to old crop coordinates that may no longer exist.
      setImageFitMode(element.id, element.fitMode);
    } catch {
      // ignore
    }
  };

  const adj = element.adjustments;
  const setAdj = (patch: Partial<typeof adj>) =>
    updateById<ImageElement>(element.id, (el) => {
      el.adjustments = { ...el.adjustments, ...patch };
    });

  const fitModes: { v: ImageFitMode; label: string; icon: React.ReactNode; description: string }[] = [
    { v: 'cover', label: 'Cover', icon: <Maximize2 size={12} strokeWidth={1.5} />, description: 'Fills frame, photo never stretches' },
    { v: 'contain', label: 'Contain', icon: <Minimize2 size={12} strokeWidth={1.5} />, description: 'Whole photo, with letterbox' },
    { v: 'fill', label: 'Stretch', icon: <Move size={12} strokeWidth={1.5} />, description: 'Stretches to fit (legacy)' },
  ];

  return (
    <div>
      <div className="panel-section">
        <div className="panel-heading">Frame</div>
        <Slider
          label="Corner radius"
          value={element.cornerRadius}
          min={0}
          max={Math.min(element.width, element.height) / 2}
          step={1}
          onChange={(v) => updateElement(element.id, { cornerRadius: v } as any)}
          unit="px"
        />

        <div className="mt-3">
          <div className="field-label">Fit mode</div>
          <div className="mt-1 grid grid-cols-3 gap-1">
            {fitModes.map((m) => (
              <button
                key={m.v}
                onClick={() => setImageFitMode(element.id, m.v)}
                title={m.description}
                className={cn(
                  'flex flex-col items-center gap-1 rounded-md border px-1 py-1.5 text-[10px] transition-all',
                  element.fitMode === m.v
                    ? 'border-white/40 bg-white/10 text-white'
                    : 'border-white/[0.06] text-ink-300 hover:bg-white/[0.04]',
                )}
              >
                {m.icon}
                {m.label}
              </button>
            ))}
          </div>
        </div>

        {element.fitMode === 'cover' && (
          <div className="mt-3">
            <div className="field-label">Position inside frame</div>
            <PanPad
              pan={element.pan}
              onChange={(p) => setImagePan(element.id, p)}
              onCommit={pushHistory}
            />
          </div>
        )}
      </div>

      <div className="panel-section">
        <div className="panel-heading">
          Adjustments
          <button
            className="rounded bg-white/[0.06] px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-ink-200 hover:bg-white/10"
            onClick={() => resetAdjustments(element.id)}
          >
            Reset
          </button>
        </div>

        <div className="space-y-2.5">
          <Slider label="Exposure" value={adj.exposure} min={-1} max={1} step={0.01} bipolar onChange={(v) => setAdj({ exposure: v })} onCommit={pushHistory} format={fmt} />
          <Slider label="Contrast" value={adj.contrast} min={-1} max={1} step={0.01} bipolar onChange={(v) => setAdj({ contrast: v })} onCommit={pushHistory} format={fmt} />
          <Slider label="Highlights" value={adj.highlights} min={-1} max={1} step={0.01} bipolar onChange={(v) => setAdj({ highlights: v })} onCommit={pushHistory} format={fmt} />
          <Slider label="Shadows" value={adj.shadows} min={-1} max={1} step={0.01} bipolar onChange={(v) => setAdj({ shadows: v })} onCommit={pushHistory} format={fmt} />
          <Slider label="Whites" value={adj.whites} min={-1} max={1} step={0.01} bipolar onChange={(v) => setAdj({ whites: v })} onCommit={pushHistory} format={fmt} />
          <Slider label="Blacks" value={adj.blacks} min={-1} max={1} step={0.01} bipolar onChange={(v) => setAdj({ blacks: v })} onCommit={pushHistory} format={fmt} />
          <div className="my-2 h-px bg-white/[0.06]" />
          <Slider label="Saturation" value={adj.saturation} min={-1} max={1} step={0.01} bipolar onChange={(v) => setAdj({ saturation: v })} onCommit={pushHistory} format={fmt} />
          <Slider label="Vibrance" value={adj.vibrance} min={-1} max={1} step={0.01} bipolar onChange={(v) => setAdj({ vibrance: v })} onCommit={pushHistory} format={fmt} />
          <Slider label="Temperature" value={adj.temperature} min={-1} max={1} step={0.01} bipolar onChange={(v) => setAdj({ temperature: v })} onCommit={pushHistory} format={fmt} />
          <Slider label="Tint" value={adj.tint} min={-1} max={1} step={0.01} bipolar onChange={(v) => setAdj({ tint: v })} onCommit={pushHistory} format={fmt} />
          <div className="my-2 h-px bg-white/[0.06]" />
          <Slider label="B&W" value={adj.grayscale} min={0} max={1} step={0.01} onChange={(v) => setAdj({ grayscale: v })} onCommit={pushHistory} format={(v) => Math.round(v * 100) + '%'} />
          <Slider label="Grain" value={adj.grain} min={0} max={1} step={0.01} onChange={(v) => setAdj({ grain: v })} onCommit={pushHistory} format={(v) => Math.round(v * 100) + '%'} />
          <Slider label="Blur" value={adj.blur} min={0} max={30} step={0.5} onChange={(v) => setAdj({ blur: v })} onCommit={pushHistory} unit="px" />
        </div>
      </div>

      <div className="panel-section">
        <div className="panel-heading">Presets</div>
        <div className="grid grid-cols-3 gap-1.5">
          {FILTER_PRESETS.map((p) => {
            const isActive = element.preset === p.id;
            return (
              <button
                key={p.id}
                onClick={() => applyPreset(element.id, p.adjustments, p.id)}
                className={`group rounded-lg border bg-white/[0.02] p-1.5 text-left transition-all hover:bg-white/[0.05] ${
                  isActive ? 'border-white/40' : 'border-white/[0.06]'
                }`}
              >
                <div
                  className="mb-1 aspect-square overflow-hidden rounded"
                  style={{
                    backgroundImage: `url(${element.src})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    filter: simulatePresetCss(p.adjustments),
                  }}
                />
                <div className="text-[10px] font-medium text-white">{p.name}</div>
                <div className="text-[9px] text-ink-500 line-clamp-1">{p.description}</div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="panel-section">
        <div className="panel-heading">
          Photo
          <button
            onClick={() => replaceFileRef.current?.click()}
            className="rounded bg-white/[0.06] px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-ink-200 hover:bg-white/10"
            title="Replace photo while keeping frame & adjustments"
          >
            <RefreshCw size={9} className="inline" /> Replace
          </button>
          <input
            ref={replaceFileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) replaceImage(f);
              e.target.value = '';
            }}
          />
        </div>
        <div
          className="relative aspect-video overflow-hidden rounded-lg border hairline bg-ink-900"
          onDragOver={(e) => {
            e.preventDefault();
            e.currentTarget.classList.add('border-white/40');
          }}
          onDragLeave={(e) => e.currentTarget.classList.remove('border-white/40')}
          onDrop={(e) => {
            e.preventDefault();
            e.currentTarget.classList.remove('border-white/40');
            const f = Array.from(e.dataTransfer.files).find((f) => f.type.startsWith('image/'));
            if (f) replaceImage(f);
          }}
        >
          <img src={element.src} alt="Source" className="h-full w-full object-cover" />
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-1.5 text-[9px] text-white/80">
            Drop a new image here to replace
          </div>
        </div>
      </div>

      <PalettePanel src={element.src} />

      <div className="panel-section">
        <div className="panel-heading">
          Source image
          <button
            className="rounded bg-white/[0.06] px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-ink-200 hover:bg-white/10"
            onClick={() => setImageFitMode(element.id, 'cover')}
            title="Reset crop to cover the frame"
          >
            <RotateCcw size={9} className="inline" /> Reset
          </button>
        </div>
        <div className="space-y-1 text-[10px] text-ink-400">
          <div className="flex justify-between font-mono">
            <span>Original</span>
            <span className="text-white">
              {element.naturalWidth}×{element.naturalHeight}
            </span>
          </div>
          <div className="flex justify-between font-mono">
            <span>Crop</span>
            <span className="text-white">
              {Math.round(element.crop.width)}×{Math.round(element.crop.height)}
            </span>
          </div>
          <div className="flex justify-between font-mono">
            <span>Frame</span>
            <span className="text-white">
              {Math.round(element.width)}×{Math.round(element.height)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function PalettePanel({ src }: { src: string }) {
  const [colors, setColors] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const setBackground = useEditor((s) => s.setBackground);
  const currentSlideId = useEditor((s) => s.currentSlideId);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    extractPalette(src, 6)
      .then((c) => {
        if (!cancelled) setColors(c);
      })
      .catch(() => {
        // ignore
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [src]);

  const copy = (c: string) => {
    if (navigator.clipboard) navigator.clipboard.writeText(c).catch(() => {});
  };

  const applyToBackground = (c: string) => {
    setBackground(currentSlideId, { kind: 'color', color: c });
  };

  if (loading && colors.length === 0) {
    return (
      <div className="panel-section">
        <div className="panel-heading">Palette</div>
        <div className="text-[10px] text-ink-500">Extracting colors…</div>
      </div>
    );
  }
  if (colors.length === 0) return null;

  return (
    <div className="panel-section">
      <div className="panel-heading">
        Palette
        <span className="text-ink-500">click to copy</span>
      </div>
      <div className="grid grid-cols-6 gap-1">
        {colors.map((c) => (
          <button
            key={c}
            onClick={() => copy(c)}
            onDoubleClick={() => applyToBackground(c)}
            title={`${c.toUpperCase()} — click to copy, double-click as background`}
            className="group flex aspect-square flex-col items-center justify-center rounded-md border hairline transition-transform hover:scale-105"
            style={{ background: c }}
          >
            <Pipette
              size={11}
              strokeWidth={1.5}
              className="opacity-0 transition-opacity group-hover:opacity-100"
              style={{ color: getContrastColor(c) }}
            />
          </button>
        ))}
      </div>
      <div className="mt-1.5 grid grid-cols-6 gap-1">
        {colors.map((c) => (
          <span
            key={`${c}-label`}
            className="truncate text-center font-mono text-[8px] text-ink-500"
          >
            {c.replace('#', '').slice(0, 4)}
          </span>
        ))}
      </div>
      <div className="mt-1 text-[9px] text-ink-500">Click to copy · double-click to set as slide background</div>
    </div>
  );
}

function getContrastColor(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? '#000' : '#fff';
}

function PanPad({
  pan,
  onChange,
  onCommit,
}: {
  pan: { x: number; y: number };
  onChange: (p: { x: number; y: number }) => void;
  onCommit: () => void;
}) {
  const onPointer = (e: React.PointerEvent<HTMLDivElement>, commit = false) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
    onChange({ x, y });
    if (commit) onCommit();
  };
  return (
    <div
      className="relative mt-1 h-20 w-full cursor-crosshair rounded-md border hairline bg-white/[0.03]"
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        onPointer(e, false);
      }}
      onPointerMove={(e) => {
        if (e.buttons === 1) onPointer(e, false);
      }}
      onPointerUp={(e) => {
        e.currentTarget.releasePointerCapture(e.pointerId);
        onCommit();
      }}
    >
      <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 opacity-30">
        {Array.from({ length: 9 }).map((_, i) => (
          <div key={i} className="border-r border-b border-white/10 last:border-r-0" />
        ))}
      </div>
      <div
        className="absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-ink-950 shadow-lg"
        style={{ left: `${pan.x * 100}%`, top: `${pan.y * 100}%` }}
      />
    </div>
  );
}

function fmt(v: number): string {
  return v === 0 ? '0' : (v * 100).toFixed(0);
}

function simulatePresetCss(adj: typeof FILTER_PRESETS[number]['adjustments']) {
  const parts: string[] = [];
  parts.push(`brightness(${1 + adj.exposure * 0.3})`);
  parts.push(`contrast(${1 + adj.contrast * 0.5})`);
  parts.push(`saturate(${1 + adj.saturation * 0.6})`);
  if (adj.grayscale > 0) parts.push(`grayscale(${adj.grayscale})`);
  return parts.join(' ');
}
