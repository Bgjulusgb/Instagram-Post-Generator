import { useEffect, useRef, useState } from 'react';
import { useEditor } from '../store/editorStore';

export type AutosaveStatus = 'idle' | 'pending' | 'saving' | 'saved' | 'error';

export interface AutosaveState {
  status: AutosaveStatus;
  error: string | null;
  lastSavedAt: number | null;
}

/**
 * Subscribes to the store's revision counter and persists the project on
 * a trailing-edge debounce. Errors are propagated rather than swallowed,
 * and an in-flight save guard prevents two save attempts from racing each
 * other if the user edits faster than the storage backend can flush.
 *
 * On `beforeunload` we kick off one last save — best-effort, since
 * IndexedDB writes may not complete before the tab closes, but
 * for the most common cases (small slide collections, fast disk)
 * it does land.
 */
export function useAutosave(debounceMs = 700): AutosaveState {
  const [status, setStatus] = useState<AutosaveStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);

  const timer = useRef<number | null>(null);
  const inFlight = useRef(false);
  const pendingRetryRev = useRef<number | null>(null);
  const savedTimer = useRef<number | null>(null);

  useEffect(() => {
    const flushNow = async () => {
      if (inFlight.current) {
        // Another save is currently running; remember the latest revision
        // so we can save again once it finishes.
        pendingRetryRev.current = useEditor.getState().revision;
        return;
      }
      inFlight.current = true;
      setStatus('saving');
      const result = await useEditor.getState().saveToStorage();
      inFlight.current = false;

      if (result.ok) {
        setError(null);
        setLastSavedAt(Date.now());
        setStatus('saved');
        if (savedTimer.current) window.clearTimeout(savedTimer.current);
        savedTimer.current = window.setTimeout(() => setStatus('idle'), 1600);
      } else {
        setError(result.error ?? 'Save failed');
        setStatus('error');
      }

      // If new edits landed during the save, fire another round.
      if (pendingRetryRev.current !== null) {
        pendingRetryRev.current = null;
        timer.current = window.setTimeout(flushNow, 200);
      }
    };

    const unsub = useEditor.subscribe(
      (s) => s.revision,
      (rev, prev) => {
        if (rev === prev) return;
        if (savedTimer.current) {
          window.clearTimeout(savedTimer.current);
          savedTimer.current = null;
        }
        setStatus('pending');
        setError(null);
        if (timer.current) window.clearTimeout(timer.current);
        timer.current = window.setTimeout(flushNow, debounceMs);
      },
    );

    const onBeforeUnload = () => {
      if (timer.current) window.clearTimeout(timer.current);
      // Fire the save synchronously enough that the browser dispatches it
      // before navigation begins. We can't await it, so this is best-effort.
      void useEditor.getState().saveToStorage();
    };
    window.addEventListener('beforeunload', onBeforeUnload);

    return () => {
      unsub();
      window.removeEventListener('beforeunload', onBeforeUnload);
      if (timer.current) window.clearTimeout(timer.current);
      if (savedTimer.current) window.clearTimeout(savedTimer.current);
    };
  }, [debounceMs]);

  return { status, error, lastSavedAt };
}
