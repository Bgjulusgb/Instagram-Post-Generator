import { useEffect, useRef, useState } from 'react';
import { useEditor } from '../store/editorStore';

/**
 * Subscribes to store revisions and writes to localStorage after a debounce.
 * Returns "saving" status for UI feedback.
 */
export function useAutosave(debounceMs = 800) {
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const timer = useRef<number | null>(null);

  useEffect(() => {
    const unsub = useEditor.subscribe(
      (s) => s.revision,
      () => {
        setStatus('saving');
        if (timer.current) window.clearTimeout(timer.current);
        timer.current = window.setTimeout(() => {
          useEditor.getState().saveToStorage();
          setStatus('saved');
          window.setTimeout(() => setStatus('idle'), 1400);
        }, debounceMs);
      },
    );
    return () => {
      unsub();
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, [debounceMs]);

  return status;
}
