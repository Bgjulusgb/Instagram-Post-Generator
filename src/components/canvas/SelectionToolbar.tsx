import { useLayoutEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowUp,
  ArrowDown,
  Copy,
  Trash2,
  Lock,
  Unlock,
  Sparkles,
} from 'lucide-react';
import { useEditor } from '../../store/editorStore';
import { Tooltip } from '../ui/Tooltip';

interface Props {
  containerWidth: number;
  containerHeight: number;
  stageX: number;
  stageY: number;
  zoom: number;
}

/**
 * A Figma-style floating toolbar that sits just above the current selection,
 * surfacing the most common element actions without a trip to the side panel.
 * Position is computed from the selection's union bounding box in slide
 * coordinates, projected back to screen space.
 */
export function SelectionToolbar({ containerWidth, containerHeight, stageX, stageY, zoom }: Props) {
  const slide = useEditor((s) => s.slides.find((sl) => sl.id === s.currentSlideId)!);
  const selectedIds = useEditor((s) => s.selectedElementIds);
  const duplicate = useEditor((s) => s.duplicateElements);
  const remove = useEditor((s) => s.deleteElements);
  const reorder = useEditor((s) => s.reorderElement);
  const update = useEditor((s) => s.updateElement);

  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);

  useLayoutEffect(() => {
    if (selectedIds.length === 0) {
      setPos(null);
      return;
    }
    const els = slide.elements.filter((e) => selectedIds.includes(e.id));
    if (els.length === 0) {
      setPos(null);
      return;
    }
    const minX = Math.min(...els.map((e) => e.x));
    const minY = Math.min(...els.map((e) => e.y));
    const maxX = Math.max(...els.map((e) => e.x + e.width));
    const cx = (minX + maxX) / 2;
    const screenX = cx * zoom + stageX;
    const screenY = minY * zoom + stageY - 12;
    setPos({
      x: Math.max(40, Math.min(containerWidth - 40, screenX)),
      y: Math.max(60, screenY),
    });
  }, [selectedIds, slide.elements, zoom, stageX, stageY, containerWidth, containerHeight]);

  const els = slide.elements.filter((e) => selectedIds.includes(e.id));
  const allLocked = els.length > 0 && els.every((e) => e.locked);

  return (
    <AnimatePresence>
      {pos && els.length > 0 && (
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 4, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 4, scale: 0.96 }}
          transition={{ duration: 0.12, ease: [0.22, 1, 0.36, 1] }}
          className="pointer-events-auto absolute z-30 -translate-x-1/2 -translate-y-full"
          style={{ left: pos.x, top: pos.y }}
        >
          <div className="flex items-center gap-0.5 rounded-lg glass-strong px-1 py-1 shadow-2xl">
            <Tooltip label="Bring forward" shortcut="⌘]" side="top">
              <button
                onClick={() => selectedIds.forEach((id) => reorder(id, 'up'))}
                className="icon-btn h-7 w-7"
              >
                <ArrowUp size={13} strokeWidth={1.5} />
              </button>
            </Tooltip>
            <Tooltip label="Send backward" shortcut="⌘[" side="top">
              <button
                onClick={() => selectedIds.forEach((id) => reorder(id, 'down'))}
                className="icon-btn h-7 w-7"
              >
                <ArrowDown size={13} strokeWidth={1.5} />
              </button>
            </Tooltip>
            <div className="mx-0.5 h-4 w-px bg-white/[0.08]" />
            <Tooltip label="Duplicate" shortcut="⌘D" side="top">
              <button onClick={() => duplicate(selectedIds)} className="icon-btn h-7 w-7">
                <Copy size={13} strokeWidth={1.5} />
              </button>
            </Tooltip>
            <Tooltip label={allLocked ? 'Unlock' : 'Lock'} side="top">
              <button
                onClick={() => selectedIds.forEach((id) => update(id, { locked: !allLocked } as any))}
                className="icon-btn h-7 w-7"
              >
                {allLocked ? (
                  <Unlock size={13} strokeWidth={1.5} />
                ) : (
                  <Lock size={13} strokeWidth={1.5} />
                )}
              </button>
            </Tooltip>
            <Tooltip label="Auto-fit to slide" side="top">
              <button
                onClick={() => {
                  const stretch = useEditor.getState().alignToSlide;
                  stretch(selectedIds, 'center-h');
                  stretch(selectedIds, 'middle-v');
                }}
                className="icon-btn h-7 w-7"
              >
                <Sparkles size={13} strokeWidth={1.5} />
              </button>
            </Tooltip>
            <div className="mx-0.5 h-4 w-px bg-white/[0.08]" />
            <Tooltip label="Delete" shortcut="⌫" side="top">
              <button
                onClick={() => remove(selectedIds)}
                className="icon-btn h-7 w-7 hover:text-rose-300"
              >
                <Trash2 size={13} strokeWidth={1.5} />
              </button>
            </Tooltip>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
