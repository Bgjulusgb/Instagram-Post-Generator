import { Eye, EyeOff, Lock, Unlock, Trash2, Type, Image as ImageIcon, Square } from 'lucide-react';
import { useEditor } from '../../store/editorStore';
import { cn } from '../../utils/cn';

export function LayersPanel() {
  const slides = useEditor((s) => s.slides);
  const currentSlideId = useEditor((s) => s.currentSlideId);
  const slide = slides.find((s) => s.id === currentSlideId)!;
  const selectedIds = useEditor((s) => s.selectedElementIds);
  const selectElement = useEditor((s) => s.selectElement);
  const updateElement = useEditor((s) => s.updateElement);
  const deleteElements = useEditor((s) => s.deleteElements);

  // Render top-most first (which is the last in array)
  const reversed = [...slide.elements].reverse();

  return (
    <div>
      <div className="panel-section">
        <div className="panel-heading">
          Layers <span className="text-ink-500">{slide.elements.length}</span>
        </div>
        {reversed.length === 0 ? (
          <div className="rounded-xl border border-dashed border-white/[0.08] px-3 py-6 text-center text-[10px] text-ink-500">
            No layers yet. Add elements from Design or Media.
          </div>
        ) : (
          <div className="space-y-1">
            {reversed.map((el) => {
              const isSelected = selectedIds.includes(el.id);
              return (
                <div
                  key={el.id}
                  onClick={(e) => selectElement(el.id, e.shiftKey)}
                  className={cn(
                    'flex items-center gap-1.5 rounded-lg border px-1.5 py-1.5 text-[11px] transition-colors',
                    isSelected
                      ? 'border-white/30 bg-white/[0.06] text-white'
                      : 'border-transparent text-ink-300 hover:bg-white/[0.04]',
                  )}
                >
                  <span className="text-ink-400">
                    {el.type === 'image' && <ImageIcon size={12} strokeWidth={1.5} />}
                    {el.type === 'text' && <Type size={12} strokeWidth={1.5} />}
                    {el.type === 'shape' && <Square size={12} strokeWidth={1.5} />}
                  </span>
                  <span className="flex-1 truncate">
                    {el.type === 'text' ? (el as any).text || 'Text' : el.name}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      updateElement(el.id, { visible: !el.visible });
                    }}
                    className="icon-btn h-6 w-6"
                  >
                    {el.visible ? <Eye size={12} strokeWidth={1.5} /> : <EyeOff size={12} strokeWidth={1.5} />}
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      updateElement(el.id, { locked: !el.locked } as any);
                    }}
                    className="icon-btn h-6 w-6"
                  >
                    {el.locked ? <Lock size={12} strokeWidth={1.5} /> : <Unlock size={12} strokeWidth={1.5} />}
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteElements([el.id]);
                    }}
                    className="icon-btn h-6 w-6 text-ink-500 hover:text-rose-300"
                  >
                    <Trash2 size={12} strokeWidth={1.5} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
