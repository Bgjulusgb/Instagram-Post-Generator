import { useEffect } from 'react';
import { useEditor, createImageElement, createTextElement } from '../store/editorStore';
import { loadImageFile } from '../utils/image';

/**
 * Global keyboard shortcut handler.
 * Skips key events that originate from form inputs.
 */
export function useKeyboardShortcuts() {
  const editor = useEditor();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return;
      }
      const meta = e.metaKey || e.ctrlKey;

      // Undo / Redo
      if (meta && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) editor.redo();
        else editor.undo();
        return;
      }
      if (meta && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        editor.redo();
        return;
      }

      // Duplicate / Delete
      if (meta && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        if (editor.selectedElementIds.length > 0)
          editor.duplicateElements(editor.selectedElementIds);
        return;
      }

      // Group / Ungroup
      if (meta && e.key.toLowerCase() === 'g') {
        e.preventDefault();
        if (e.shiftKey) editor.ungroupSelection();
        else editor.groupSelection();
        return;
      }

      // Help
      if (!meta && (e.key === '?' || (e.shiftKey && e.key === '/'))) {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent('carousel-studio:open-help'));
        return;
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (editor.selectedElementIds.length > 0) {
          e.preventDefault();
          editor.deleteElements(editor.selectedElementIds);
        }
        return;
      }

      // Select all
      if (meta && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        const slide = editor.slides.find((s) => s.id === editor.currentSlideId);
        if (slide) editor.selectMultipleElements(slide.elements.map((el) => el.id));
        return;
      }

      // Escape
      if (e.key === 'Escape') {
        editor.deselectAll();
        editor.setTool('select');
        return;
      }

      // Tools
      if (!meta) {
        switch (e.key.toLowerCase()) {
          case 'v':
            editor.setTool('select');
            return;
          case 't':
            editor.setTool('text');
            return;
          case 'r':
            editor.setTool('rect');
            return;
          case 'o':
            editor.setTool('ellipse');
            return;
          case 'l':
            editor.setTool('line');
            return;
          case 'c':
            editor.setTool('crop');
            return;
          case 'h':
            editor.setTool('hand');
            return;
        }
      }

      // Zoom
      if (meta && (e.key === '=' || e.key === '+')) {
        e.preventDefault();
        editor.setZoom(editor.zoom * 1.2);
        return;
      }
      if (meta && e.key === '-') {
        e.preventDefault();
        editor.setZoom(editor.zoom / 1.2);
        return;
      }
      if (meta && e.key === '0') {
        e.preventDefault();
        editor.setZoom(0.5);
        editor.setStageOffset(0, 0);
        return;
      }

      // Layer order
      if (meta && e.key === ']') {
        e.preventDefault();
        editor.selectedElementIds.forEach((id) =>
          editor.reorderElement(id, e.shiftKey ? 'top' : 'up'),
        );
        return;
      }
      if (meta && e.key === '[') {
        e.preventDefault();
        editor.selectedElementIds.forEach((id) =>
          editor.reorderElement(id, e.shiftKey ? 'bottom' : 'down'),
        );
        return;
      }

      // Nudge with arrows
      const nudge = e.shiftKey ? 10 : 1;
      if (editor.selectedElementIds.length > 0) {
        const slide = editor.slides.find((s) => s.id === editor.currentSlideId);
        if (!slide) return;
        const apply = (dx: number, dy: number) => {
          e.preventDefault();
          editor.selectedElementIds.forEach((id) => {
            const el = slide.elements.find((x) => x.id === id);
            if (!el || el.locked) return;
            editor.updateElement(id, { x: el.x + dx, y: el.y + dy });
          });
        };
        if (e.key === 'ArrowLeft') return apply(-nudge, 0);
        if (e.key === 'ArrowRight') return apply(nudge, 0);
        if (e.key === 'ArrowUp') return apply(0, -nudge);
        if (e.key === 'ArrowDown') return apply(0, nudge);
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [editor]);
}
