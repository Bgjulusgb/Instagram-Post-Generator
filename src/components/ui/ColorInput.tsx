import { useEffect, useId, useRef, useState } from 'react';
import { Pipette } from 'lucide-react';
import { cn } from '../../utils/cn';
import { Tooltip } from './Tooltip';

interface Props {
  label?: string;
  value: string;
  onChange: (v: string) => void;
  className?: string;
}

const RECENT_KEY = 'carousel-studio:recent-colors';
const SWATCHES = ['#ffffff', '#000000', '#fafafa', '#f7f7f5', '#1c1c1e', '#0a0a0a', '#cf9b66', '#9ca3af', '#3b3b3b', '#cabea1'];

function loadRecents(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    if (!raw) return [];
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v.filter((x) => typeof x === 'string').slice(0, 10) : [];
  } catch {
    return [];
  }
}

function saveRecent(color: string) {
  try {
    const current = loadRecents().filter((c) => c.toLowerCase() !== color.toLowerCase());
    const next = [color, ...current].slice(0, 10);
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {
    // ignore
  }
}

export function ColorInput({ label, value, onChange, className }: Props) {
  const id = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [recents, setRecents] = useState<string[]>([]);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) setRecents(loadRecents());
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!popoverRef.current) return;
      if (!popoverRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  const commit = (v: string) => {
    onChange(v);
    saveRecent(v);
  };

  const pickFromEyedropper = async () => {
    // Chrome / Edge only — modern EyeDropper API.
    const EyeDropper = (window as any).EyeDropper;
    if (!EyeDropper) {
      alert('Your browser does not support the eyedropper. Try Chrome or Edge.');
      return;
    }
    try {
      const picker = new EyeDropper();
      const result = await picker.open();
      if (result?.sRGBHex) commit(result.sRGBHex);
    } catch {
      // user cancelled
    }
  };

  return (
    <div className={cn('relative flex items-center gap-2', className)}>
      {label && (
        <label htmlFor={id} className="field-label flex-1">
          {label}
        </label>
      )}
      <div
        className="relative h-7 w-7 cursor-pointer overflow-hidden rounded-md border hairline checkerboard"
        onClick={() => setOpen((o) => !o)}
      >
        <div className="absolute inset-0" style={{ background: value }} />
      </div>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={(e) => saveRecent(e.target.value)}
        className="input-base h-7 w-24 px-2 font-mono text-[11px] uppercase"
      />

      {open && (
        <div
          ref={popoverRef}
          className="absolute right-0 top-full z-50 mt-2 w-56 rounded-xl glass-strong p-3 shadow-2xl"
        >
          <input
            ref={inputRef}
            id={id}
            type="color"
            value={normalizeColor(value)}
            onChange={(e) => commit(e.target.value)}
            className="block h-9 w-full cursor-pointer rounded-md border hairline bg-transparent"
          />
          <div className="mt-2 flex items-center justify-between">
            <span className="text-[9px] uppercase tracking-wider text-ink-500">Swatches</span>
            <Tooltip label="Pick from screen" side="left">
              <button
                className="icon-btn h-6 w-6"
                onClick={pickFromEyedropper}
                title="Eyedropper"
              >
                <Pipette size={12} strokeWidth={1.5} />
              </button>
            </Tooltip>
          </div>
          <div className="mt-1 grid grid-cols-10 gap-1">
            {SWATCHES.map((c) => (
              <button
                key={c}
                onClick={() => commit(c)}
                className="aspect-square rounded-sm border hairline transition-transform hover:scale-110"
                style={{ background: c }}
              />
            ))}
          </div>
          {recents.length > 0 && (
            <>
              <div className="mt-2 text-[9px] uppercase tracking-wider text-ink-500">Recent</div>
              <div className="mt-1 grid grid-cols-10 gap-1">
                {recents.map((c) => (
                  <button
                    key={c}
                    onClick={() => commit(c)}
                    className="aspect-square rounded-sm border hairline transition-transform hover:scale-110"
                    style={{ background: c }}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function normalizeColor(v: string): string {
  if (v.startsWith('#') && (v.length === 7 || v.length === 4)) return v;
  return '#ffffff';
}
