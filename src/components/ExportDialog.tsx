import { useState } from 'react';
import { Modal } from './ui/Modal';
import { useEditor } from '../store/editorStore';
import { Slider } from './ui/Slider';
import { Loader2, Download } from 'lucide-react';
import Konva from 'konva';
import {
  DEFAULT_EXPORT_OPTIONS,
  downloadBlob,
  exportSlideAsBlob,
  exportSlidesAsPdf,
  exportSlidesAsZip,
  formatExtension,
  type ExportFormat,
} from '../utils/export';
import { cn } from '../utils/cn';

interface Props {
  open: boolean;
  onClose: () => void;
  stageRef: React.MutableRefObject<Konva.Stage | null>;
}

type ExportScope = 'current' | 'all-zip' | 'all-pdf';

const FORMATS: { id: ExportFormat; label: string; description: string }[] = [
  { id: 'png', label: 'PNG', description: 'Lossless · supports transparency' },
  { id: 'jpg', label: 'JPG', description: 'Smaller · Instagram-ready' },
  { id: 'webp', label: 'WEBP', description: 'Modern · best quality/size' },
  { id: 'pdf', label: 'PDF', description: 'Print-ready vector container' },
];

export function ExportDialog({ open, onClose, stageRef }: Props) {
  const slides = useEditor((s) => s.slides);
  const currentSlideId = useEditor((s) => s.currentSlideId);
  const selectSlide = useEditor((s) => s.selectSlide);

  const [format, setFormat] = useState<ExportFormat>(DEFAULT_EXPORT_OPTIONS.format);
  const [scale, setScale] = useState(DEFAULT_EXPORT_OPTIONS.scale);
  const [quality, setQuality] = useState(DEFAULT_EXPORT_OPTIONS.quality);
  const [transparent, setTransparent] = useState(DEFAULT_EXPORT_OPTIONS.transparent);
  const [sharpen, setSharpen] = useState(DEFAULT_EXPORT_OPTIONS.sharpen);
  const [scope, setScope] = useState<ExportScope>('all-zip');
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [busy, setBusy] = useState(false);

  const current = slides.find((s) => s.id === currentSlideId)!;
  const exportWidth = Math.round(current.width * scale);
  const exportHeight = Math.round(current.height * scale);

  const handleExport = async () => {
    if (!stageRef.current) return;
    setBusy(true);
    setProgress({ done: 0, total: scope === 'current' ? 1 : slides.length });
    try {
      const options = {
        format,
        scale,
        quality,
        transparent,
        sharpen,
      };

      if (scope === 'current') {
        const blob = await exportSlideAsBlob(stageRef.current, current, options);
        downloadBlob(
          blob,
          `${current.name}.${formatExtension(format)}`,
        );
      } else if (scope === 'all-pdf') {
        const blob = await exportSlidesAsPdf(stageRef.current, slides, { ...options, format: 'pdf' }, async (sid) => {
          selectSlide(sid);
        });
        downloadBlob(blob, `carousel-${Date.now()}.pdf`);
      } else {
        const blob = await exportSlidesAsZip(
          stageRef.current,
          slides,
          options,
          async (sid) => selectSlide(sid),
          (done, total) => setProgress({ done, total }),
        );
        downloadBlob(blob, `carousel-${Date.now()}.zip`);
      }
      // restore
      selectSlide(currentSlideId);
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
      onClose={onClose}
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
      <div className="grid gap-5 md:grid-cols-2">
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

          {scope !== 'all-pdf' && (
            <>
              <SectionLabel className="mt-5">Format</SectionLabel>
              <div className="mt-2 grid grid-cols-2 gap-1.5">
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
            </>
          )}
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

          <SectionLabel className="mt-5">Options</SectionLabel>
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

          <div className="mt-5 rounded-xl border hairline bg-white/[0.02] p-3 text-[11px] text-ink-300">
            <div className="text-[10px] uppercase tracking-wider text-ink-500">
              Output preview
            </div>
            <div className="mt-1 font-mono text-white">
              {exportWidth} × {exportHeight} px @ {Math.round(72 * scale)} dpi
            </div>
            <div className="mt-1 text-[10px] text-ink-500">
              Instagram uploads photos at 1080 px wide. Use 2× for retina-sharp uploads.
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}

function SectionLabel({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('text-[10px] font-semibold uppercase tracking-[0.1em] text-ink-400', className)}>
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
            <path d="M2 5L4.5 7.5L8 3" stroke="#0a0a0a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
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
