import { useId } from 'react';
import { cn } from '../../utils/cn';

interface Props {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  onCommit?: () => void;
  format?: (v: number) => string;
  unit?: string;
  className?: string;
  bipolar?: boolean;
}

/**
 * Minimal slider with a bipolar visual indicator for adjustment-style sliders
 * (where 0 is the neutral reset point).
 */
export function Slider({
  label,
  value,
  min,
  max,
  step = 0.01,
  onChange,
  onCommit,
  format,
  unit,
  className,
  bipolar = false,
}: Props) {
  const id = useId();
  const display = format ? format(value) : value.toFixed(step < 1 ? 2 : 0);
  const range = max - min;
  const fillStart = bipolar ? 50 : 0;
  const fillEnd = bipolar ? 50 + (value / Math.max(Math.abs(min), Math.abs(max))) * 50 : ((value - min) / range) * 100;

  return (
    <div className={cn('space-y-1', className)}>
      <div className="flex items-center justify-between">
        <label htmlFor={id} className="field-label">
          {label}
        </label>
        <span className="font-mono text-[10px] text-ink-200">
          {display}
          {unit ?? ''}
        </span>
      </div>
      <div className="relative h-3">
        <div className="absolute inset-x-0 top-1/2 h-[3px] -translate-y-1/2 rounded-full bg-white/[0.08]" />
        <div
          className="absolute top-1/2 h-[3px] -translate-y-1/2 rounded-full bg-white/80"
          style={{
            left: `${Math.min(fillStart, fillEnd)}%`,
            width: `${Math.abs(fillEnd - fillStart)}%`,
          }}
        />
        <input
          id={id}
          className="range absolute inset-0 h-3 w-full opacity-100"
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          onMouseUp={onCommit}
          onTouchEnd={onCommit}
        />
      </div>
    </div>
  );
}
