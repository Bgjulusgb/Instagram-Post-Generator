import { useEditor } from '../store/editorStore';
import { ImagePropertiesPanel } from './panels/ImagePropertiesPanel';
import { TextPropertiesPanel } from './panels/TextPropertiesPanel';
import { ShapePropertiesPanel } from './panels/ShapePropertiesPanel';
import { CommonPropertiesPanel } from './panels/CommonPropertiesPanel';
import { AlignToolbar } from './panels/AlignToolbar';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowUpDown, ArrowUpToLine, ArrowDownToLine, Copy, Trash2 } from 'lucide-react';

export function RightSidebar() {
  const slides = useEditor((s) => s.slides);
  const currentSlideId = useEditor((s) => s.currentSlideId);
  const slide = slides.find((s) => s.id === currentSlideId)!;
  const selectedIds = useEditor((s) => s.selectedElementIds);
  const reorderElement = useEditor((s) => s.reorderElement);
  const duplicateElements = useEditor((s) => s.duplicateElements);
  const deleteElements = useEditor((s) => s.deleteElements);

  const selectedElements = slide.elements.filter((e) => selectedIds.includes(e.id));
  const single = selectedElements.length === 1 ? selectedElements[0] : null;

  return (
    <div className="z-30 flex h-full w-80 flex-shrink-0 flex-col border-l hairline glass">
      <div className="flex h-12 flex-shrink-0 items-center border-b hairline px-3.5">
        <h3 className="text-[12px] font-medium text-white">
          {single ? `${single.type[0].toUpperCase()}${single.type.slice(1)} properties` : selectedElements.length > 1 ? `${selectedElements.length} selected` : 'Slide'}
        </h3>
      </div>

      {selectedElements.length > 0 && (
        <div className="flex items-center gap-1 border-b hairline px-2.5 py-2">
          <button
            onClick={() => selectedIds.forEach((id) => reorderElement(id, 'up'))}
            className="icon-btn h-7 w-7"
            title="Bring forward"
          >
            <ArrowUpDown size={13} strokeWidth={1.5} />
          </button>
          <button
            onClick={() => selectedIds.forEach((id) => reorderElement(id, 'top'))}
            className="icon-btn h-7 w-7"
            title="Bring to front"
          >
            <ArrowUpToLine size={13} strokeWidth={1.5} />
          </button>
          <button
            onClick={() => selectedIds.forEach((id) => reorderElement(id, 'bottom'))}
            className="icon-btn h-7 w-7"
            title="Send to back"
          >
            <ArrowDownToLine size={13} strokeWidth={1.5} />
          </button>
          <div className="mx-1 h-4 w-px bg-white/[0.06]" />
          <button
            onClick={() => duplicateElements(selectedIds)}
            className="icon-btn h-7 w-7"
            title="Duplicate"
          >
            <Copy size={13} strokeWidth={1.5} />
          </button>
          <button
            onClick={() => deleteElements(selectedIds)}
            className="icon-btn h-7 w-7 hover:text-rose-300"
            title="Delete"
          >
            <Trash2 size={13} strokeWidth={1.5} />
          </button>
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto">
        <AnimatePresence mode="wait">
          <motion.div
            key={single?.id ?? 'none'}
            initial={{ opacity: 0, x: 8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 8 }}
            transition={{ duration: 0.14 }}
          >
            {single && <CommonPropertiesPanel element={single} />}
            {single?.type === 'image' && <ImagePropertiesPanel element={single} />}
            {single?.type === 'text' && <TextPropertiesPanel element={single} />}
            {single?.type === 'shape' && <ShapePropertiesPanel element={single} />}
            {selectedElements.length > 0 && <AlignToolbar />}
            {selectedElements.length === 0 && <EmptyStatePanel />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

function EmptyStatePanel() {
  return (
    <div className="px-4 py-6">
      <div className="rounded-xl border hairline bg-white/[0.02] p-4">
        <div className="text-[11px] font-medium text-white">Nothing selected</div>
        <div className="mt-1 text-[10px] leading-relaxed text-ink-500">
          Click an element on the canvas to edit its properties. Hold Shift to select multiple.
          Double-click text to edit inline.
        </div>
      </div>
      <div className="mt-4 space-y-2">
        <div className="field-label">Tips</div>
        <Tip text="Press V to switch to the move tool." />
        <Tip text="Hold ⌘ and scroll to zoom precisely." />
        <Tip text="Drag a marquee on the canvas to select multiple elements." />
        <Tip text="Use ⌘D to duplicate any selection." />
      </div>
    </div>
  );
}

function Tip({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-2 rounded-lg border hairline bg-white/[0.02] px-3 py-2">
      <div className="mt-1 h-1 w-1 rounded-full bg-white/40" />
      <span className="text-[10px] leading-relaxed text-ink-300">{text}</span>
    </div>
  );
}
