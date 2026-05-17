import { useState } from 'react';
import { useEditor } from '../../store/editorStore';
import { SLIDE_FORMATS } from '../../types';
import { NumberField } from '../ui/NumberField';
import { cn } from '../../utils/cn';

export function CanvasSettingsPanel() {
  const slides = useEditor((s) => s.slides);
  const currentSlideId = useEditor((s) => s.currentSlideId);
  const slide = slides.find((s) => s.id === currentSlideId)!;
  const setSlideFormat = useEditor((s) => s.setSlideFormat);
  const setAllSlidesFormat = useEditor((s) => s.setAllSlidesFormat);
  const showGuides = useEditor((s) => s.showGuides);
  const showGrid = useEditor((s) => s.showGrid);
  const snapEnabled = useEditor((s) => s.snapEnabled);
  const showMinimap = useEditor((s) => s.showMinimap);
  const toggleGuides = useEditor((s) => s.toggleGuides);
  const toggleGrid = useEditor((s) => s.toggleGrid);
  const toggleSnap = useEditor((s) => s.toggleSnap);
  const toggleMinimap = useEditor((s) => s.toggleMinimap);

  const [customW, setCustomW] = useState(slide.width);
  const [customH, setCustomH] = useState(slide.height);
  const [applyAll, setApplyAll] = useState(false);

  const applyFormat = (w: number, h: number) => {
    if (applyAll) setAllSlidesFormat(w, h);
    else setSlideFormat(slide.id, w, h);
  };

  return (
    <div>
      <div className="panel-section">
        <div className="panel-heading">Slide format</div>
        <div className="grid grid-cols-2 gap-1.5">
          {SLIDE_FORMATS.map((f) => {
            const isActive = slide.width === f.width && slide.height === f.height;
            return (
              <button
                key={f.id}
                onClick={() => applyFormat(f.width, f.height)}
                className={cn(
                  'group rounded-lg border bg-white/[0.02] p-2 text-left transition-all hover:bg-white/[0.05]',
                  isActive ? 'border-white/30' : 'border-white/[0.06]',
                )}
              >
                <div className="mx-auto mb-1.5 flex items-end justify-center">
                  <div
                    className={cn(
                      'border',
                      isActive ? 'border-white/80 bg-white/10' : 'border-white/30',
                    )}
                    style={{
                      width: Math.min(28, (f.width / Math.max(f.width, f.height)) * 28),
                      height: Math.min(28, (f.height / Math.max(f.width, f.height)) * 28),
                    }}
                  />
                </div>
                <div className="text-center text-[10px] font-medium text-white">{f.label}</div>
                <div className="text-center text-[9px] text-ink-500">
                  {f.width}×{f.height}
                </div>
              </button>
            );
          })}
        </div>

        <div className="mt-3 space-y-2">
          <div className="text-[10px] uppercase tracking-wider text-ink-500">Custom</div>
          <div className="flex gap-1.5">
            <NumberField label="Width" value={customW} min={100} max={8000} onChange={setCustomW} suffix="px" />
            <NumberField label="Height" value={customH} min={100} max={8000} onChange={setCustomH} suffix="px" />
          </div>
          <button
            className="btn-outline w-full"
            onClick={() => applyFormat(customW, customH)}
          >
            Apply custom size
          </button>
        </div>

        <label className="mt-3 flex cursor-pointer items-center gap-2 text-[11px] text-ink-300">
          <input
            type="checkbox"
            checked={applyAll}
            onChange={(e) => setApplyAll(e.target.checked)}
            className="h-3.5 w-3.5 cursor-pointer accent-white"
          />
          Apply to all slides
        </label>
      </div>

      <div className="panel-section">
        <div className="panel-heading">Canvas</div>
        <div className="space-y-1.5">
          <Toggle label="Smart guides" value={showGuides} onChange={toggleGuides} />
          <Toggle label="Snap to elements" value={snapEnabled} onChange={toggleSnap} />
          <Toggle label="Show grid" value={showGrid} onChange={toggleGrid} />
          <Toggle label="Mini-map" value={showMinimap} onChange={toggleMinimap} />
        </div>
      </div>

      <div className="panel-section">
        <div className="panel-heading">Shortcuts</div>
        <div className="grid grid-cols-2 gap-x-2 gap-y-1.5 text-[10px] text-ink-300">
          {[
            ['Move', 'V'],
            ['Pan', 'H'],
            ['Text', 'T'],
            ['Rect', 'R'],
            ['Ellipse', 'O'],
            ['Line', 'L'],
            ['Crop', 'C'],
            ['Undo', '⌘Z'],
            ['Redo', '⌘⇧Z'],
            ['Duplicate', '⌘D'],
            ['Delete', '⌫'],
            ['Select all', '⌘A'],
            ['Zoom fit', '⌘0'],
            ['Bring fwd', '⌘]'],
            ['Send back', '⌘['],
            ['Nudge', '←↑→↓'],
          ].map(([k, v]) => (
            <div key={k} className="flex items-center justify-between rounded px-1 py-0.5">
              <span>{k}</span>
              <kbd className="rounded bg-white/[0.06] px-1 py-px font-mono text-[9px] text-ink-200">{v}</kbd>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: () => void }) {
  return (
    <button
      onClick={onChange}
      className="flex w-full items-center justify-between rounded-lg border hairline bg-white/[0.02] px-3 py-1.5 text-[11px] text-ink-200 hover:bg-white/[0.04]"
    >
      <span>{label}</span>
      <span
        className={cn(
          'relative inline-flex h-4 w-7 items-center rounded-full transition-colors',
          value ? 'bg-white' : 'bg-white/15',
        )}
      >
        <span
          className={cn(
            'absolute h-3 w-3 rounded-full transition-transform',
            value ? 'translate-x-3.5 bg-ink-950' : 'translate-x-0.5 bg-ink-300',
          )}
        />
      </span>
    </button>
  );
}
