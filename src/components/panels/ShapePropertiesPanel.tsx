import type { ShapeElement } from '../../types';
import { useEditor } from '../../store/editorStore';
import { Slider } from '../ui/Slider';
import { ColorInput } from '../ui/ColorInput';

interface Props {
  element: ShapeElement;
}

export function ShapePropertiesPanel({ element }: Props) {
  const updateElement = useEditor((s) => s.updateElement);

  return (
    <div>
      <div className="panel-section">
        <div className="panel-heading">Fill</div>
        <ColorInput value={element.fill} onChange={(v) => updateElement(element.id, { fill: v } as any)} />
        {element.shape === 'rect' && (
          <div className="mt-3">
            <Slider
              label="Corner radius"
              value={element.cornerRadius}
              min={0}
              max={Math.min(element.width, element.height) / 2}
              step={1}
              onChange={(v) => updateElement(element.id, { cornerRadius: v } as any)}
              unit="px"
            />
          </div>
        )}
      </div>

      <div className="panel-section">
        <div className="panel-heading">
          Stroke
          <button
            onClick={() => {
              if (element.stroke) updateElement(element.id, { stroke: undefined } as any);
              else updateElement(element.id, { stroke: { color: '#ffffff', width: 2 } } as any);
            }}
            className="rounded bg-white/[0.06] px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-ink-200 hover:bg-white/10"
          >
            {element.stroke ? 'Remove' : 'Add'}
          </button>
        </div>
        {element.stroke && (
          <div className="space-y-2">
            <ColorInput
              label="Color"
              value={element.stroke.color}
              onChange={(v) => updateElement(element.id, { stroke: { ...element.stroke!, color: v } } as any)}
            />
            <Slider
              label="Width"
              value={element.stroke.width}
              min={0}
              max={40}
              step={0.5}
              onChange={(v) => updateElement(element.id, { stroke: { ...element.stroke!, width: v } } as any)}
              unit="px"
            />
          </div>
        )}
      </div>
    </div>
  );
}
