import { cn } from '../../utils/cn';

interface Props {
  label?: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  onChange: (v: number) => void;
  className?: string;
  suffix?: string;
}

export function NumberField({ label, value, min, max, step = 1, onChange, className, suffix }: Props) {
  return (
    <label className={cn('flex flex-1 flex-col gap-1', className)}>
      {label && <span className="field-label">{label}</span>}
      <div className="relative">
        <input
          type="number"
          className="input-base h-7 w-full pr-6 font-mono text-[11px]"
          value={Number.isFinite(value) ? Math.round(value * 100) / 100 : 0}
          min={min}
          max={max}
          step={step}
          onChange={(e) => {
            const v = parseFloat(e.target.value);
            if (!Number.isNaN(v)) onChange(v);
          }}
        />
        {suffix && (
          <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[9px] uppercase text-ink-500">
            {suffix}
          </span>
        )}
      </div>
    </label>
  );
}
