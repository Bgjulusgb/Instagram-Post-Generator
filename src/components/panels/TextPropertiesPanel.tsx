import type { TextElement, FontWeight, TextAlign } from '../../types';
import { useEditor } from '../../store/editorStore';
import { Slider } from '../ui/Slider';
import { ColorInput } from '../ui/ColorInput';
import {
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Bold,
  Italic,
  Underline,
  Plus,
} from 'lucide-react';
import { cn } from '../../utils/cn';
import { useRef } from 'react';

interface Props {
  element: TextElement;
}

const FONT_FAMILIES = [
  'Inter',
  'Playfair Display',
  'DM Serif Display',
  'Space Grotesk',
  'Bebas Neue',
  'Cormorant Garamond',
  'JetBrains Mono',
];

const FONT_WEIGHTS: { v: FontWeight; label: string }[] = [
  { v: 300, label: 'Light' },
  { v: 400, label: 'Regular' },
  { v: 500, label: 'Medium' },
  { v: 600, label: 'SemiBold' },
  { v: 700, label: 'Bold' },
  { v: 800, label: 'Heavy' },
];

const ALIGNS: { v: TextAlign; icon: React.ReactNode }[] = [
  { v: 'left', icon: <AlignLeft size={13} strokeWidth={1.5} /> },
  { v: 'center', icon: <AlignCenter size={13} strokeWidth={1.5} /> },
  { v: 'right', icon: <AlignRight size={13} strokeWidth={1.5} /> },
  { v: 'justify', icon: <AlignJustify size={13} strokeWidth={1.5} /> },
];

export function TextPropertiesPanel({ element }: Props) {
  const updateElement = useEditor((s) => s.updateElement);
  const fontFileRef = useRef<HTMLInputElement>(null);

  const loadCustomFont = async (file: File) => {
    const name = file.name.replace(/\.[^.]+$/, '').replace(/[^a-z0-9]+/gi, '_');
    const buf = await file.arrayBuffer();
    const font = new FontFace(name, buf);
    await font.load();
    document.fonts.add(font);
    updateElement(element.id, { fontFamily: name });
  };

  return (
    <div>
      <div className="panel-section">
        <div className="panel-heading">Content</div>
        <textarea
          className="input-base min-h-[64px] resize-y leading-snug"
          value={element.text}
          onChange={(e) => updateElement(element.id, { text: e.target.value } as any)}
          placeholder="Type your text…"
        />
      </div>

      <div className="panel-section">
        <div className="panel-heading">
          Font
          <button onClick={() => fontFileRef.current?.click()} className="icon-btn h-6 w-6">
            <Plus size={12} strokeWidth={1.5} />
          </button>
          <input
            ref={fontFileRef}
            type="file"
            accept=".woff,.woff2,.ttf,.otf"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) loadCustomFont(f);
              e.target.value = '';
            }}
          />
        </div>
        <select
          className="input-base h-7"
          value={element.fontFamily}
          onChange={(e) => updateElement(element.id, { fontFamily: e.target.value } as any)}
          style={{ fontFamily: element.fontFamily }}
        >
          {FONT_FAMILIES.map((f) => (
            <option key={f} value={f} style={{ fontFamily: f }}>
              {f}
            </option>
          ))}
        </select>
        <div className="mt-2 grid grid-cols-3 gap-1">
          {FONT_WEIGHTS.map((w) => (
            <button
              key={w.v}
              onClick={() => updateElement(element.id, { fontWeight: w.v } as any)}
              className={cn(
                'rounded-md border px-1 py-1.5 text-[10px] transition-all',
                element.fontWeight === w.v
                  ? 'border-white/40 bg-white/10 text-white'
                  : 'border-white/[0.06] text-ink-300 hover:bg-white/[0.04]',
              )}
              style={{ fontFamily: element.fontFamily, fontWeight: w.v }}
            >
              {w.label}
            </button>
          ))}
        </div>

        <div className="mt-3 flex gap-1">
          <button
            onClick={() => updateElement(element.id, { fontWeight: element.fontWeight >= 700 ? 400 : 700 } as any)}
            className={cn('icon-btn h-7 w-7', element.fontWeight >= 700 && 'icon-btn-active')}
          >
            <Bold size={13} strokeWidth={2} />
          </button>
          <button
            onClick={() => updateElement(element.id, { italic: !element.italic } as any)}
            className={cn('icon-btn h-7 w-7', element.italic && 'icon-btn-active')}
          >
            <Italic size={13} strokeWidth={1.5} />
          </button>
          <button
            onClick={() => updateElement(element.id, { underline: !element.underline } as any)}
            className={cn('icon-btn h-7 w-7', element.underline && 'icon-btn-active')}
          >
            <Underline size={13} strokeWidth={1.5} />
          </button>
          <div className="mx-1 h-7 w-px bg-white/[0.06]" />
          {ALIGNS.map((a) => (
            <button
              key={a.v}
              onClick={() => updateElement(element.id, { align: a.v } as any)}
              className={cn('icon-btn h-7 w-7', element.align === a.v && 'icon-btn-active')}
            >
              {a.icon}
            </button>
          ))}
        </div>
      </div>

      <div className="panel-section">
        <div className="panel-heading">Style</div>
        <div className="space-y-2.5">
          <Slider
            label="Size"
            value={element.fontSize}
            min={8}
            max={500}
            step={1}
            onChange={(v) => updateElement(element.id, { fontSize: v } as any)}
            unit="px"
          />
          <Slider
            label="Line height"
            value={element.lineHeight}
            min={0.7}
            max={3}
            step={0.05}
            onChange={(v) => updateElement(element.id, { lineHeight: v } as any)}
          />
          <Slider
            label="Letter spacing"
            value={element.letterSpacing}
            min={-20}
            max={80}
            step={0.5}
            bipolar
            onChange={(v) => updateElement(element.id, { letterSpacing: v } as any)}
            unit="px"
          />
        </div>
        <div className="mt-3">
          <ColorInput label="Color" value={element.fill} onChange={(v) => updateElement(element.id, { fill: v } as any)} />
        </div>
      </div>

      <div className="panel-section">
        <div className="panel-heading">
          Outline
          <button
            onClick={() => {
              if (element.stroke) updateElement(element.id, { stroke: undefined } as any);
              else updateElement(element.id, { stroke: { color: '#000000', width: 1 } } as any);
            }}
            className="rounded bg-white/[0.06] px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-ink-200 hover:bg-white/10"
          >
            {element.stroke ? 'Remove' : 'Add'}
          </button>
        </div>
        {element.stroke && (
          <div className="space-y-2">
            <ColorInput
              label="Stroke"
              value={element.stroke.color}
              onChange={(v) =>
                updateElement(element.id, { stroke: { ...element.stroke!, color: v } } as any)
              }
            />
            <Slider
              label="Width"
              value={element.stroke.width}
              min={0}
              max={20}
              step={0.5}
              onChange={(v) =>
                updateElement(element.id, { stroke: { ...element.stroke!, width: v } } as any)
              }
              unit="px"
            />
          </div>
        )}
      </div>
    </div>
  );
}
