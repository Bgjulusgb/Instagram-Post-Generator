import { motion } from 'framer-motion';

/**
 * Splash shown for the brief moment between mount and the first storage
 * read finishing. Prevents the user from seeing a blank slide flash before
 * their saved project is restored.
 */
export function SplashScreen({ message }: { message?: string }) {
  return (
    <div className="flex h-full w-full items-center justify-center bg-ink-950">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className="flex flex-col items-center gap-3"
      >
        <div className="relative flex h-10 w-10 items-center justify-center rounded-2xl bg-white shadow-lg">
          <div className="absolute inset-[7px] rounded-[5px] border border-ink-950" />
          <div className="absolute inset-[7px] translate-x-[3px] translate-y-[1px] rounded-[5px] border border-ink-950 bg-white" />
        </div>
        <div className="text-[12px] font-medium tracking-tight text-white">Carousel Studio</div>
        <div className="text-[10px] uppercase tracking-[0.18em] text-ink-500">
          {message ?? 'Loading your work…'}
        </div>
      </motion.div>
    </div>
  );
}
