import { useId, useRef } from 'react';
import { cn } from '../../utils/cn';

interface Props {
  label?: string;
  value: string;
  onChange: (v: string) => void;
  className?: string;
}

export function ColorInput({ label, value, onChange, className }: Props) {
  const id = useId();
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className={cn('flex items-center gap-2', className)}>
      {label && (
        <label htmlFor={id} className="field-label flex-1">
          {label}
        </label>
      )}
      <div
        className="relative h-7 w-7 cursor-pointer overflow-hidden rounded-md border hairline checkerboard"
        onClick={() => inputRef.current?.click()}
      >
        <div className="absolute inset-0" style={{ background: value }} />
        <input
          ref={inputRef}
          id={id}
          type="color"
          value={normalizeColor(value)}
          onChange={(e) => onChange(e.target.value)}
          className="absolute inset-0 cursor-pointer opacity-0"
        />
      </div>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="input-base h-7 w-24 px-2 font-mono text-[11px] uppercase"
      />
    </div>
  );
}

function normalizeColor(v: string): string {
  if (v.startsWith('#') && (v.length === 7 || v.length === 4)) return v;
  return '#ffffff';
}
