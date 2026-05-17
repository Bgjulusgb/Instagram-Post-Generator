import type { AnyElement, BlendMode } from '../../types';
import { useEditor } from '../../store/editorStore';
import { Slider } from '../ui/Slider';
import { NumberField } from '../ui/NumberField';
import { Lock, Unlock, Eye, EyeOff } from 'lucide-react';

interface Props {
  element: AnyElement;
}

const BLEND_MODES: BlendMode[] = [
  'normal',
  'multiply',
  'screen',
  'overlay',
  'darken',
  'lighten',
  'color-dodge',
  'color-burn',
  'soft-light',
  'hard-light',
  'difference',
  'exclusion',
];

export function CommonPropertiesPanel({ element }: Props) {
  const updateElement = useEditor((s) => s.updateElement);
  const updateById = useEditor((s) => s.updateElementById);

  return (
    <div>
      <div className="panel-section">
        <div className="panel-heading">Transform</div>
        <div className="grid grid-cols-2 gap-1.5">
          <NumberField label="X" value={element.x} onChange={(v) => updateElement(element.id, { x: v })} suffix="px" />
          <NumberField label="Y" value={element.y} onChange={(v) => updateElement(element.id, { y: v })} suffix="px" />
          <NumberField
            label="Width"
            value={element.width}
            onChange={(v) => updateElement(element.id, { width: Math.max(10, v) })}
            suffix="px"
          />
          <NumberField
            label="Height"
            value={element.height}
            onChange={(v) => updateElement(element.id, { height: Math.max(10, v) })}
            suffix="px"
          />
        </div>
        <div className="mt-2">
          <Slider
            label="Rotation"
            value={element.rotation}
            min={-180}
            max={180}
            step={1}
            unit="°"
            bipolar
            onChange={(v) => updateElement(element.id, { rotation: v })}
          />
        </div>

        <div className="mt-3 flex gap-1.5">
          <button
            onClick={() => updateElement(element.id, { locked: !element.locked } as any)}
            className="btn-outline flex-1 gap-1.5"
          >
            {element.locked ? <Lock size={12} /> : <Unlock size={12} />}
            {element.locked ? 'Locked' : 'Unlocked'}
          </button>
          <button
            onClick={() => updateElement(element.id, { visible: !element.visible } as any)}
            className="btn-outline flex-1 gap-1.5"
          >
            {element.visible ? <Eye size={12} /> : <EyeOff size={12} />}
            {element.visible ? 'Visible' : 'Hidden'}
          </button>
        </div>
      </div>

      <div className="panel-section">
        <div className="panel-heading">Appearance</div>
        <Slider
          label="Opacity"
          value={element.opacity}
          min={0}
          max={1}
          step={0.01}
          onChange={(v) => updateElement(element.id, { opacity: v })}
          format={(v) => Math.round(v * 100) + '%'}
        />
        <div className="mt-2.5">
          <label className="field-label">Blend mode</label>
          <select
            className="input-base mt-1 h-7 capitalize"
            value={element.blendMode}
            onChange={(e) => updateElement(element.id, { blendMode: e.target.value as BlendMode } as any)}
          >
            {BLEND_MODES.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="panel-section">
        <div className="panel-heading">
          Shadow
          <button
            onClick={() => {
              if (element.shadow) updateElement(element.id, { shadow: undefined } as any);
              else
                updateElement(element.id, {
                  shadow: { color: '#000000', blur: 20, offsetX: 0, offsetY: 8, opacity: 0.4 },
                } as any);
            }}
            className="rounded bg-white/[0.06] px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-ink-200 hover:bg-white/10"
          >
            {element.shadow ? 'Remove' : 'Add'}
          </button>
        </div>
        {element.shadow && (
          <div className="space-y-2">
            <Slider
              label="Blur"
              value={element.shadow.blur}
              min={0}
              max={120}
              step={1}
              onChange={(v) =>
                updateById(element.id, (el) => {
                  if (el.shadow) el.shadow.blur = v;
                })
              }
            />
            <Slider
              label="Offset Y"
              value={element.shadow.offsetY}
              min={-60}
              max={60}
              step={1}
              bipolar
              onChange={(v) =>
                updateById(element.id, (el) => {
                  if (el.shadow) el.shadow.offsetY = v;
                })
              }
            />
            <Slider
              label="Offset X"
              value={element.shadow.offsetX}
              min={-60}
              max={60}
              step={1}
              bipolar
              onChange={(v) =>
                updateById(element.id, (el) => {
                  if (el.shadow) el.shadow.offsetX = v;
                })
              }
            />
            <Slider
              label="Opacity"
              value={element.shadow.opacity}
              min={0}
              max={1}
              step={0.01}
              onChange={(v) =>
                updateById(element.id, (el) => {
                  if (el.shadow) el.shadow.opacity = v;
                })
              }
              format={(v) => Math.round(v * 100) + '%'}
            />
          </div>
        )}
      </div>
    </div>
  );
}
