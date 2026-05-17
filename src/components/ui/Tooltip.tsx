import { useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

interface Props {
  label: string;
  shortcut?: string;
  children: ReactNode;
  side?: 'bottom' | 'right' | 'left' | 'top';
}

export function Tooltip({ label, shortcut, children, side = 'bottom' }: Props) {
  const [show, setShow] = useState(false);
  const sideClass = {
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  }[side];

  return (
    <span
      className="relative inline-flex"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      {children}
      <AnimatePresence>
        {show && (
          <motion.span
            initial={{ opacity: 0, y: side === 'bottom' ? -4 : 4, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: side === 'bottom' ? -4 : 4 }}
            transition={{ duration: 0.12 }}
            className={`pointer-events-none absolute z-50 ${sideClass} whitespace-nowrap rounded-md glass-strong px-2 py-1 text-[10px] font-medium text-ink-100 shadow-lg`}
          >
            {label}
            {shortcut && (
              <span className="ml-2 rounded bg-white/10 px-1 py-px font-mono text-[9px] text-ink-300">
                {shortcut}
              </span>
            )}
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  );
}
