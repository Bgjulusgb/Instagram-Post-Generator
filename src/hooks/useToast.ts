import { useEffect, useState } from 'react';

/**
 * Tiny global toast bus. Components subscribe via `useToasts()`; producers
 * dispatch via the exported `toast()` helper from anywhere (including
 * outside React). Keeps notifications decoupled from UI placement.
 */

export type ToastTone = 'info' | 'success' | 'error' | 'loading';

export interface Toast {
  id: number;
  tone: ToastTone;
  title: string;
  message?: string;
  /** ms; 0 means persistent until dismissed by the producer */
  duration: number;
}

const listeners = new Set<(t: Toast[]) => void>();
let queue: Toast[] = [];
let nextId = 1;

function notify() {
  for (const l of listeners) l(queue);
}

export function pushToast(
  tone: ToastTone,
  title: string,
  message?: string,
  duration = 3000,
): number {
  const id = nextId++;
  queue = [...queue, { id, tone, title, message, duration }];
  notify();
  if (duration > 0) {
    setTimeout(() => dismissToast(id), duration);
  }
  return id;
}

export function updateToast(id: number, patch: Partial<Omit<Toast, 'id'>>) {
  queue = queue.map((t) => (t.id === id ? { ...t, ...patch } : t));
  notify();
  if (patch.duration && patch.duration > 0) {
    setTimeout(() => dismissToast(id), patch.duration);
  }
}

export function dismissToast(id: number) {
  queue = queue.filter((t) => t.id !== id);
  notify();
}

export const toast = {
  info: (title: string, message?: string, duration = 3000) =>
    pushToast('info', title, message, duration),
  success: (title: string, message?: string, duration = 2200) =>
    pushToast('success', title, message, duration),
  error: (title: string, message?: string, duration = 5000) =>
    pushToast('error', title, message, duration),
  loading: (title: string, message?: string) => pushToast('loading', title, message, 0),
  update: updateToast,
  dismiss: dismissToast,
};

export function useToasts(): Toast[] {
  const [list, setList] = useState<Toast[]>(queue);
  useEffect(() => {
    listeners.add(setList);
    return () => {
      listeners.delete(setList);
    };
  }, []);
  return list;
}
