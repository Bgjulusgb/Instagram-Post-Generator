import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, AlertCircle, Loader2, Info, X } from 'lucide-react';
import { dismissToast, useToasts, type ToastTone } from '../../hooks/useToast';
import { cn } from '../../utils/cn';

const TONE_STYLE: Record<ToastTone, { ring: string; icon: React.ReactNode }> = {
  info: {
    ring: 'border-white/15',
    icon: <Info size={14} strokeWidth={1.5} className="text-ink-200" />,
  },
  success: {
    ring: 'border-emerald-400/30',
    icon: <CheckCircle2 size={14} strokeWidth={1.5} className="text-emerald-300" />,
  },
  error: {
    ring: 'border-rose-400/30',
    icon: <AlertCircle size={14} strokeWidth={1.5} className="text-rose-300" />,
  },
  loading: {
    ring: 'border-white/15',
    icon: <Loader2 size={14} strokeWidth={1.5} className="animate-spin text-ink-200" />,
  },
};

export function ToastViewport() {
  const toasts = useToasts();
  return (
    <div className="pointer-events-none fixed bottom-40 left-1/2 z-[2000] flex w-[min(420px,calc(100vw-2rem))] -translate-x-1/2 flex-col gap-2">
      <AnimatePresence initial={false}>
        {toasts.map((t) => {
          const tone = TONE_STYLE[t.tone];
          return (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, y: 12, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.96 }}
              transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
              className={cn(
                'pointer-events-auto flex items-start gap-2.5 rounded-xl glass-strong px-3 py-2.5 shadow-2xl',
                tone.ring,
              )}
              style={{ borderWidth: 1, borderStyle: 'solid' }}
            >
              <span className="mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center">
                {tone.icon}
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[12px] font-medium text-white">{t.title}</div>
                {t.message && (
                  <div className="mt-0.5 text-[11px] leading-snug text-ink-400">{t.message}</div>
                )}
              </div>
              <button
                className="icon-btn h-5 w-5 flex-shrink-0"
                onClick={() => dismissToast(t.id)}
              >
                <X size={10} strokeWidth={1.5} />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
