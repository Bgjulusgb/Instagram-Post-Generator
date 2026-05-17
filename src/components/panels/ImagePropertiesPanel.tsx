import type { ImageElement } from '../../types';
import { useEditor } from '../../store/editorStore';
import { Slider } from '../ui/Slider';
import { FILTER_PRESETS } from '../../utils/filters';
import { NumberField } from '../ui/NumberField';
import { RotateCcw } from 'lucide-react';

interface Props {
  element: ImageElement;
}

export function ImagePropertiesPanel({ element }: Props) {
  const updateElement = useEditor((s) => s.updateElement);
  const updateById = useEditor((s) => s.updateElementById);
  const applyPreset = useEditor((s) => s.applyPresetToImage);
  const resetAdjustments = useEditor((s) => s.resetAdjustments);
  const pushHistory = useEditor((s) => s.pushHistory);

  const adj = element.adjustments;
  const setAdj = (patch: Partial<typeof adj>) =>
    updateById<ImageElement>(element.id, (el) => {
      el.adjustments = { ...el.adjustments, ...patch };
    });

  return (
    <div>
      <div className="panel-section">
        <div className="panel-heading">Frame</div>
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

      <div className="panel-section">
        <div className="panel-heading">
          Adjustments
          <button
            className="rounded bg-white/[0.06] px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-ink-200 hover:bg-white/10"
            onClick={() => resetAdjustments(element.id)}
          >
            Reset
          </button>
        </div>

        <div className="space-y-2.5">
          <Slider label="Exposure" value={adj.exposure} min={-1} max={1} step={0.01} bipolar onChange={(v) => setAdj({ exposure: v })} onCommit={pushHistory} format={fmt} />
          <Slider label="Contrast" value={adj.contrast} min={-1} max={1} step={0.01} bipolar onChange={(v) => setAdj({ contrast: v })} onCommit={pushHistory} format={fmt} />
          <Slider label="Highlights" value={adj.highlights} min={-1} max={1} step={0.01} bipolar onChange={(v) => setAdj({ highlights: v })} onCommit={pushHistory} format={fmt} />
          <Slider label="Shadows" value={adj.shadows} min={-1} max={1} step={0.01} bipolar onChange={(v) => setAdj({ shadows: v })} onCommit={pushHistory} format={fmt} />
          <Slider label="Whites" value={adj.whites} min={-1} max={1} step={0.01} bipolar onChange={(v) => setAdj({ whites: v })} onCommit={pushHistory} format={fmt} />
          <Slider label="Blacks" value={adj.blacks} min={-1} max={1} step={0.01} bipolar onChange={(v) => setAdj({ blacks: v })} onCommit={pushHistory} format={fmt} />
          <div className="my-2 h-px bg-white/[0.06]" />
          <Slider label="Saturation" value={adj.saturation} min={-1} max={1} step={0.01} bipolar onChange={(v) => setAdj({ saturation: v })} onCommit={pushHistory} format={fmt} />
          <Slider label="Vibrance" value={adj.vibrance} min={-1} max={1} step={0.01} bipolar onChange={(v) => setAdj({ vibrance: v })} onCommit={pushHistory} format={fmt} />
          <Slider label="Temperature" value={adj.temperature} min={-1} max={1} step={0.01} bipolar onChange={(v) => setAdj({ temperature: v })} onCommit={pushHistory} format={fmt} />
          <Slider label="Tint" value={adj.tint} min={-1} max={1} step={0.01} bipolar onChange={(v) => setAdj({ tint: v })} onCommit={pushHistory} format={fmt} />
          <div className="my-2 h-px bg-white/[0.06]" />
          <Slider label="B&W" value={adj.grayscale} min={0} max={1} step={0.01} onChange={(v) => setAdj({ grayscale: v })} onCommit={pushHistory} format={(v) => Math.round(v * 100) + '%'} />
          <Slider label="Grain" value={adj.grain} min={0} max={1} step={0.01} onChange={(v) => setAdj({ grain: v })} onCommit={pushHistory} format={(v) => Math.round(v * 100) + '%'} />
          <Slider label="Blur" value={adj.blur} min={0} max={30} step={0.5} onChange={(v) => setAdj({ blur: v })} onCommit={pushHistory} unit="px" />
        </div>
      </div>

      <div className="panel-section">
        <div className="panel-heading">Presets</div>
        <div className="grid grid-cols-3 gap-1.5">
          {FILTER_PRESETS.map((p) => {
            const isActive = element.preset === p.id;
            return (
              <button
                key={p.id}
                onClick={() => applyPreset(element.id, p.adjustments, p.id)}
                className={`group rounded-lg border bg-white/[0.02] p-1.5 text-left transition-all hover:bg-white/[0.05] ${
                  isActive ? 'border-white/40' : 'border-white/[0.06]'
                }`}
              >
                <div
                  className="mb-1 aspect-square overflow-hidden rounded"
                  style={{
                    backgroundImage: `url(${element.src})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    filter: simulatePresetCss(p.adjustments),
                  }}
                />
                <div className="text-[10px] font-medium text-white">{p.name}</div>
                <div className="text-[9px] text-ink-500 line-clamp-1">{p.description}</div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="panel-section">
        <div className="panel-heading">Crop</div>
        {element.crop ? (
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-1.5">
              <NumberField
                label="X"
                value={element.crop.x}
                onChange={(v) =>
                  updateById<ImageElement>(element.id, (el) => {
                    if (el.crop) el.crop.x = v;
                  })
                }
              />
              <NumberField
                label="Y"
                value={element.crop.y}
                onChange={(v) =>
                  updateById<ImageElement>(element.id, (el) => {
                    if (el.crop) el.crop.y = v;
                  })
                }
              />
              <NumberField
                label="W"
                value={element.crop.width}
                onChange={(v) =>
                  updateById<ImageElement>(element.id, (el) => {
                    if (el.crop) el.crop.width = v;
                  })
                }
              />
              <NumberField
                label="H"
                value={element.crop.height}
                onChange={(v) =>
                  updateById<ImageElement>(element.id, (el) => {
                    if (el.crop) el.crop.height = v;
                  })
                }
              />
            </div>
            <button
              className="btn-outline w-full gap-1"
              onClick={() => updateElement(element.id, { crop: undefined } as any)}
            >
              <RotateCcw size={12} />
              Clear crop
            </button>
          </div>
        ) : (
          <button
            className="btn-outline w-full"
            onClick={() =>
              updateElement(element.id, {
                crop: { x: 0, y: 0, width: element.naturalWidth, height: element.naturalHeight },
              } as any)
            }
          >
            Add crop region
          </button>
        )}
      </div>
    </div>
  );
}

function fmt(v: number): string {
  return v === 0 ? '0' : (v * 100).toFixed(0);
}

function simulatePresetCss(adj: typeof FILTER_PRESETS[number]['adjustments']) {
  const parts: string[] = [];
  parts.push(`brightness(${1 + adj.exposure * 0.3})`);
  parts.push(`contrast(${1 + adj.contrast * 0.5})`);
  parts.push(`saturate(${1 + adj.saturation * 0.6})`);
  if (adj.grayscale > 0) parts.push(`grayscale(${adj.grayscale})`);
  return parts.join(' ');
}
