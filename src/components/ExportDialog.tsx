import { useEffect, useState } from 'react';
import { Modal } from './ui/Modal';
import { useEditor } from '../store/editorStore';
import { Slider } from './ui/Slider';
import { Loader2, Download } from 'lucide-react';
import {
  DEFAULT_EXPORT_OPTIONS,
  downloadBlob,
  exportSlideAsBlob,
  exportSlidesAsPdf,
  exportSlidesAsZip,
  formatExtension,
  renderSlide,
  type ExportFormat,
} from '../utils/export';
import { cn } from '../utils/cn';

interface Props {
  open: boolean;
  onClose: () => void;
}

type ExportScope = 'current' | 'all-zip' | 'all-pdf';

const FORMATS: { id: ExportFormat; label: string; description: string }[] = [
  { id: 'png', label: 'PNG', description: 'Lossless · supports transparency' },
  { id: 'jpg', label: 'JPG', description: 'Smaller · Instagram-ready' },
  { id: 'webp', label: 'WEBP', description: 'Modern · best quality/size' },
  { id: 'pdf', label: 'PDF', description: 'Print-ready vector container' },
];

export function ExportDialog({ open, onClose }: Props) {
  const slides = useEditor((s) => s.slides);
  const currentSlideId = useEditor((s) => s.currentSlideId);

  const [format, setFormat] = useState<ExportFormat>(DEFAULT_EXPORT_OPTIONS.format);
  const [scale, setScale] = useState(DEFAULT_EXPORT_OPTIONS.scale);
  const [quality, setQuality] = useState(DEFAULT_EXPORT_OPTIONS.quality);
  const [transparent, setTransparent] = useState(DEFAULT_EXPORT_OPTIONS.transparent);
  const [sharpen, setSharpen] = useState(DEFAULT_EXPORT_OPTIONS.sharpen);
  const [scope, setScope] = useState<ExportScope>('all-zip');
  const [progress, setProgress] = useState<{ done: number; total: number; current: string } | null>(
    null,
  );
  const [busy, setBusy] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const current = slides.find((s) => s.id === currentSlideId)!;
  const exportWidth = Math.round(current.width * scale);
  const exportHeight = Math.round(current.height * scale);

  // Build a live thumbnail preview of the current export settings.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      try {
        const previewScale = Math.min(1, 360 / current.width);
        const canvas = await renderSlide(current, {
          format,
          scale: previewScale,
          quality: 0.92,
          transparent,
          sharpen: false,
        });
        if (cancelled) return;
        canvas.toBlob((blob) => {
          if (cancelled || !blob) return;
          setPreviewUrl((prev) => {
            if (prev) URL.revokeObjectURL(prev);
            return URL.createObjectURL(blob);
          });
        });
      } catch (err) {
        console.warn('Preview render failed', err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, current, format, transparent]);

  useEffect(
    () => () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    },
    [previewUrl],
  );

  const handleExport = async () => {
    setBusy(true);
    setProgress({ done: 0, total: scope === 'current' ? 1 : slides.length, current: '' });
    try {
      const options = { format, scale, quality, transparent, sharpen };

      if (scope === 'current') {
        const blob = await exportSlideAsBlob(current, options);
        await downloadBlob(blob, `${sanitizeFilename(current.name)}.${formatExtension(format)}`);
      } else if (scope === 'all-pdf') {
        const blob = await exportSlidesAsPdf(slides, { ...options, format: 'pdf' }, setProgress);
        await downloadBlob(blob, `carousel-${Date.now()}.pdf`);
      } else {
        const blob = await exportSlidesAsZip(slides, options, setProgress);
        await downloadBlob(blob, `carousel-${Date.now()}.zip`);
      }
      onClose();
    } catch (err) {
      console.error(err);
      alert('Export failed: ' + String(err));
    } finally {
      setBusy(false);
      setProgress(null);
    }
  };

  return (
    <Modal
      open={open}
      onClose={busy ? () => {} : onClose}
      title="Export"
      description={`${slides.length} slide${slides.length === 1 ? '' : 's'} · ${exportWidth}×${exportHeight} px output`}
      size="lg"
      footer={
        <>
          <button className="btn-ghost" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button className="btn-solid" onClick={handleExport} disabled={busy}>
            {busy ? (
              <>
                <Loader2 size={13} className="animate-spin" />
                Exporting {progress ? `${progress.done}/${progress.total}` : ''}
              </>
            ) : (
              <>
                <Download size={13} strokeWidth={2} />
                Export {scope === 'current' ? 'slide' : `${slides.length} slides`}
              </>
            )}
          </button>
        </>
      }
    >
      <div className="grid gap-5 md:grid-cols-[1fr_220px]">
        <div className="space-y-5">
          <div>
            <SectionLabel>What to export</SectionLabel>
            <div className="mt-2 space-y-1.5">
              <Option
                active={scope === 'current'}
                label="Current slide only"
                description={`${current.name} · ${exportWidth}×${exportHeight}`}
                onClick={() => setScope('current')}
              />
              <Option
                active={scope === 'all-zip'}
                label="All slides as ZIP"
                description={`${slides.length} images · separate files`}
                onClick={() => setScope('all-zip')}
              />
              <Option
                active={scope === 'all-pdf'}
                label="All slides as PDF"
                description={`${slides.length} pages · single document`}
                onClick={() => {
                  setScope('all-pdf');
                  setFormat('pdf');
                }}
              />
            </div>
          </div>

          {scope !== 'all-pdf' && (
            <div>
              <SectionLabel>Format</SectionLabel>
              <div className="mt-2 grid grid-cols-3 gap-1.5">
                {FORMATS.filter((f) => f.id !== 'pdf').map((f) => (
                  <Option
                    key={f.id}
                    active={format === f.id}
                    label={f.label}
                    description={f.description}
                    onClick={() => setFormat(f.id)}
                  />
                ))}
              </div>
            </div>
          )}

          <div>
            <SectionLabel>Quality preset</SectionLabel>
            <div className="mt-2 grid grid-cols-3 gap-1.5">
              <Option
                active={
                  format === 'jpg' && Math.abs(scale - 2) < 0.05 && Math.abs(quality - 0.98) < 0.01 && sharpen
                }
                label="Instagram"
                description="JPG · 2× · sharpen on"
                onClick={() => {
                  setFormat('jpg');
                  setScale(2);
                  setQuality(0.98);
                  setSharpen(true);
                  setTransparent(false);
                }}
              />
              <Option
                active={format === 'png' && Math.abs(scale - 4) < 0.05}
                label="Print"
                description="PNG · 4× lossless"
                onClick={() => {
                  setFormat('png');
                  setScale(4);
                  setSharpen(false);
                }}
              />
              <Option
                active={format === 'webp' && Math.abs(scale - 2) < 0.05}
                label="Web"
                description="WEBP · 2× efficient"
                onClick={() => {
                  setFormat('webp');
                  setScale(2);
                  setQuality(0.92);
                  setSharpen(false);
                }}
              />
            </div>
          </div>

          <div>
            <SectionLabel>Resolution</SectionLabel>
            <div className="mt-2 grid grid-cols-3 gap-1.5">
              {[1, 2, 4].map((s) => (
                <button
                  key={s}
                  onClick={() => setScale(s)}
                  className={cn(
                    'rounded-lg border bg-white/[0.02] px-2 py-2 text-center transition-all hover:bg-white/[0.04]',
                    scale === s ? 'border-white/40 bg-white/[0.06]' : 'border-white/[0.06]',
                  )}
                >
                  <div className="text-[12px] font-medium text-white">{s}×</div>
                  <div className="text-[10px] text-ink-500">
                    {Math.round(current.width * s)}×{Math.round(current.height * s)}
                  </div>
                </button>
              ))}
            </div>
            <div className="mt-2">
              <Slider
                label="Custom"
                value={scale}
                min={0.5}
                max={6}
                step={0.1}
                onChange={setScale}
                format={(v) => `${v.toFixed(1)}×`}
              />
            </div>

            {(format === 'jpg' || format === 'webp') && (
              <div className="mt-4">
                <Slider
                  label="Quality"
                  value={quality}
                  min={0.3}
                  max={1}
                  step={0.01}
                  onChange={setQuality}
                  format={(v) => Math.round(v * 100) + '%'}
                />
              </div>
            )}
          </div>

          <div>
            <SectionLabel>Options</SectionLabel>
            <div className="mt-2 space-y-1.5">
              <Checkbox
                checked={transparent}
                onChange={setTransparent}
                label="Transparent background"
                description="PNG / WEBP only"
                disabled={format === 'jpg' || format === 'pdf'}
              />
              <Checkbox
                checked={sharpen}
                onChange={setSharpen}
                label="Sharpen"
                description="Subtle unsharp mask for crisp output"
              />
            </div>
          </div>
        </div>

        {/* Live preview */}
        <div>
          <SectionLabel>Preview</SectionLabel>
          <div className="mt-2 overflow-hidden rounded-xl border hairline bg-ink-950 p-2">
            <div
              className={cn(
                'relative w-full overflow-hidden rounded-md',
                transparent && 'checkerboard',
              )}
              style={{ aspectRatio: `${current.width} / ${current.height}` }}
            >
              {previewUrl ? (
                <img
                  src={previewUrl}
                  alt="Export preview"
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-[10px] text-ink-500">
                  Rendering…
                </div>
              )}
            </div>
            <div className="mt-2 space-y-1 text-[10px] text-ink-400">
              <div className="flex justify-between font-mono">
                <span>Output</span>
                <span className="text-white">
                  {exportWidth}×{exportHeight}
                </span>
              </div>
              <div className="flex justify-between font-mono">
                <span>Density</span>
                <span className="text-white">{Math.round(72 * scale)} dpi</span>
              </div>
              <div className="flex justify-between font-mono">
                <span>Format</span>
                <span className="uppercase text-white">{format}</span>
              </div>
            </div>
            <p className="mt-2 border-t hairline pt-2 text-[10px] leading-relaxed text-ink-500">
              Instagram uploads photos at 1080 px wide. 2× exports are
              retina-sharp for high-end phones.
            </p>
          </div>

          {busy && progress && (
            <div className="mt-3 rounded-xl border hairline bg-white/[0.02] p-3 text-[10px]">
              <div className="flex justify-between text-ink-300">
                <span>{progress.current || 'Rendering…'}</span>
                <span className="font-mono text-white">
                  {progress.done}/{progress.total}
                </span>
              </div>
              <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/[0.06]">
                <div
                  className="h-full bg-white transition-all duration-200"
                  style={{
                    width: `${Math.round((progress.done / Math.max(1, progress.total)) * 100)}%`,
                  }}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-z0-9_\-]+/gi, '_').slice(0, 60) || 'slide';
}

function SectionLabel({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'text-[10px] font-semibold uppercase tracking-[0.1em] text-ink-400',
        className,
      )}
    >
      {children}
    </div>
  );
}

function Option({
  active,
  label,
  description,
  onClick,
}: {
  active: boolean;
  label: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'block w-full rounded-lg border bg-white/[0.02] p-3 text-left transition-all hover:bg-white/[0.04]',
        active ? 'border-white/40 bg-white/[0.06]' : 'border-white/[0.06]',
      )}
    >
      <div className="text-[12px] font-medium text-white">{label}</div>
      <div className="text-[10px] text-ink-500">{description}</div>
    </button>
  );
}

function Checkbox({
  checked,
  onChange,
  label,
  description,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  description?: string;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={() => !disabled && onChange(!checked)}
      disabled={disabled}
      className={cn(
        'flex w-full items-center gap-2 rounded-lg border bg-white/[0.02] px-3 py-2 text-left transition-all',
        checked ? 'border-white/40 bg-white/[0.06]' : 'border-white/[0.06]',
        disabled && 'opacity-40',
      )}
    >
      <span
        className={cn(
          'flex h-4 w-4 flex-shrink-0 items-center justify-center rounded border',
          checked ? 'border-white bg-white' : 'border-white/20 bg-transparent',
        )}
      >
        {checked && (
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <path
              d="M2 5L4.5 7.5L8 3"
              stroke="#0a0a0a"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </span>
      <div className="flex-1">
        <div className="text-[11px] font-medium text-white">{label}</div>
        {description && <div className="text-[10px] text-ink-500">{description}</div>}
      </div>
    </button>
  );
}
