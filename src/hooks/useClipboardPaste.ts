import { useEffect } from 'react';
import { createTextElement, useEditor } from '../store/editorStore';
import { importImageFile } from '../utils/importImage';

/**
 * Global clipboard handler:
 * - Pasting an image from the system clipboard adds it as an image element.
 * - Pasting text adds it as a text element.
 * Skipped when the focused element is an input / textarea.
 */
export function useClipboardPaste() {
  useEffect(() => {
    const onPaste = async (e: ClipboardEvent) => {
      const active = document.activeElement as HTMLElement | null;
      if (
        active &&
        (active.tagName === 'INPUT' ||
          active.tagName === 'TEXTAREA' ||
          active.isContentEditable)
      ) {
        return;
      }
      const cd = e.clipboardData;
      if (!cd) return;

      const slide = useEditor.getState().slides.find(
        (s) => s.id === useEditor.getState().currentSlideId,
      );
      if (!slide) return;

      for (const item of Array.from(cd.items)) {
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (!file) continue;
          e.preventDefault();
          // Goes through the unified processor → small preview + full
          // export source, just like a drag-and-drop import.
          await importImageFile(file);
          return;
        }
      }

      const text = cd.getData('text/plain');
      if (text && text.trim()) {
        e.preventDefault();
        const el = createTextElement(text.trim(), slide.width, slide.height);
        useEditor.getState().addElement(el);
      }
    };

    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  }, []);
}
