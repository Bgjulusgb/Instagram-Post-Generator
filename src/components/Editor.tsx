import { useEffect, useState } from 'react';
import { Topbar } from './Topbar';
import { LeftSidebar } from './LeftSidebar';
import { RightSidebar } from './RightSidebar';
import { SlidesPanel } from './SlidesPanel';
import { Canvas } from './canvas/Canvas';
import { ExportDialog } from './ExportDialog';
import { CarouselPreview } from './CarouselPreview';
import { SlidesGridModal } from './SlidesGridModal';
import { HelpModal } from './HelpModal';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import { useClipboardPaste } from '../hooks/useClipboardPaste';
import { useAutosave } from '../hooks/useAutosave';
import { useEditor } from '../store/editorStore';
import { Eye, LayoutGrid } from 'lucide-react';
import { Tooltip } from './ui/Tooltip';
import { motion } from 'framer-motion';

export function Editor() {
  const [exportOpen, setExportOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [gridOpen, setGridOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);

  useEffect(() => {
    const handler = () => setHelpOpen(true);
    window.addEventListener('carousel-studio:open-help', handler as EventListener);
    return () =>
      window.removeEventListener('carousel-studio:open-help', handler as EventListener);
  }, []);
  useKeyboardShortcuts();
  useClipboardPaste();
  const saveStatus = useAutosave();
  const loadFromStorage = useEditor((s) => s.loadFromStorage);

  useEffect(() => {
    loadFromStorage();
  }, [loadFromStorage]);

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-ink-950">
      <Topbar saveStatus={saveStatus} onOpenExport={() => setExportOpen(true)} />

      <div className="flex min-h-0 flex-1">
        <LeftSidebar />

        <main className="relative min-w-0 flex-1">
          <Canvas />

          {/* Floating preview / overview buttons */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="pointer-events-none absolute right-4 top-4 flex items-center gap-2"
          >
            <Tooltip label="Carousel overview" side="bottom">
              <button
                className="pointer-events-auto flex items-center gap-1.5 rounded-lg glass-strong px-3 py-1.5 text-[11px] font-medium text-white shadow-lg transition-all hover:scale-[1.02]"
                onClick={() => setGridOpen(true)}
              >
                <LayoutGrid size={13} strokeWidth={1.5} />
                Overview
              </button>
            </Tooltip>
            <Tooltip label="Preview as Instagram carousel" side="bottom">
              <button
                className="pointer-events-auto flex items-center gap-1.5 rounded-lg glass-strong px-3 py-1.5 text-[11px] font-medium text-white shadow-lg transition-all hover:scale-[1.02]"
                onClick={() => setPreviewOpen(true)}
              >
                <Eye size={13} strokeWidth={1.5} />
                Preview
              </button>
            </Tooltip>
          </motion.div>
        </main>

        <RightSidebar />
      </div>

      <SlidesPanel />

      <ExportDialog open={exportOpen} onClose={() => setExportOpen(false)} />
      <CarouselPreview open={previewOpen} onClose={() => setPreviewOpen(false)} />
      <SlidesGridModal open={gridOpen} onClose={() => setGridOpen(false)} />
      <HelpModal open={helpOpen} onClose={() => setHelpOpen(false)} />
    </div>
  );
}
