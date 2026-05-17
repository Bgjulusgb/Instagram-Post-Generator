import { useEffect, useRef, useState } from 'react';
import {
  Undo2,
  Redo2,
  ZoomIn,
  ZoomOut,
  Maximize,
  Download,
  Save,
  FolderOpen,
  Sparkles,
  HelpCircle,
  ChevronDown,
  AlertCircle,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useEditor } from '../store/editorStore';
import { Tooltip } from './ui/Tooltip';
import { exportProjectFile, importProjectFile } from '../utils/project';
import { downloadBlob } from '../utils/export';
import { isElectron } from '../utils/storage';
import type { AutosaveState } from '../hooks/useAutosave';
import { cn } from '../utils/cn';

interface Props {
  saveState: AutosaveState;
  onOpenExport: () => void;
}

export function Topbar({ saveState, onOpenExport }: Props) {
  // Listen for menu actions from the Electron native menu so the desktop
  // app's File menu drives the same save/open code paths as the in-app menu.
  useEffect(() => {
    const onSave = async () => {
      const blob = exportProjectFile(useEditor.getState().slides);
      if (isElectron && window.electronAPI) {
        const json = await blob.text();
        await window.electronAPI.saveProjectFile(json, 'carousel-project.json');
      } else {
        await downloadBlob(blob, 'carousel-project.json');
      }
    };
    const onOpen = async () => {
      if (isElectron && window.electronAPI) {
        const opened = await window.electronAPI.openProjectFile();
        if (!opened) return;
        try {
          const data = JSON.parse(opened.content);
          if (Array.isArray(data.slides)) {
            useEditor.getState().loadProject(data.slides, data.currentSlideId);
          }
        } catch {
          alert('Invalid project file');
        }
      }
    };
    window.addEventListener('carousel-studio:save-project', onSave);
    window.addEventListener('carousel-studio:open-project', onOpen);
    return () => {
      window.removeEventListener('carousel-studio:save-project', onSave);
      window.removeEventListener('carousel-studio:open-project', onOpen);
    };
  }, []);

  const zoom = useEditor((s) => s.zoom);
  const setZoom = useEditor((s) => s.setZoom);
  const undo = useEditor((s) => s.undo);
  const redo = useEditor((s) => s.redo);
  const history = useEditor((s) => s.history);
  const future = useEditor((s) => s.future);
  const setStageOffset = useEditor((s) => s.setStageOffset);
  const slides = useEditor((s) => s.slides);
  const loadProject = useEditor((s) => s.loadProject);

  const [menuOpen, setMenuOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="relative z-40 flex h-12 flex-shrink-0 items-center justify-between border-b hairline glass px-3">
      {/* Brand */}
      <div className="flex items-center gap-2">
        <div className="relative flex h-7 w-7 items-center justify-center rounded-lg bg-white">
          <div className="absolute inset-[5px] rounded-[3px] border border-ink-950" />
          <div className="absolute inset-[5px] translate-x-[3px] translate-y-[1px] rounded-[3px] border border-ink-950 bg-white" />
        </div>
        <div className="flex flex-col leading-none">
          <span className="text-[12px] font-semibold tracking-tight text-white">
            Carousel Studio
          </span>
          <span className="text-[9px] uppercase tracking-[0.16em] text-ink-500">
            Instagram Editor
          </span>
        </div>

        <button
          onClick={() => setMenuOpen((m) => !m)}
          className="ml-2 flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] text-ink-300 hover:bg-white/5 hover:text-white"
        >
          File
          <ChevronDown size={11} />
        </button>
        <AnimatePresence>
          {menuOpen && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.12 }}
              className="absolute left-3 top-full mt-1 w-56 overflow-hidden rounded-xl glass-strong shadow-2xl"
              onMouseLeave={() => setMenuOpen(false)}
            >
              <FileMenuItem
                icon={<Save size={13} />}
                label="Save project file"
                shortcut="JSON"
                onClick={async () => {
                  setMenuOpen(false);
                  const blob = exportProjectFile(slides);
                  if (isElectron && window.electronAPI) {
                    const json = await blob.text();
                    const saved = await window.electronAPI.saveProjectFile(
                      json,
                      'carousel-project.json',
                    );
                    if (saved) {
                      // no-op; native dialog already confirmed it
                    }
                  } else {
                    downloadBlob(blob, 'carousel-project.json');
                  }
                }}
              />
              <FileMenuItem
                icon={<FolderOpen size={13} />}
                label="Open project file"
                onClick={async () => {
                  setMenuOpen(false);
                  if (isElectron && window.electronAPI) {
                    const opened = await window.electronAPI.openProjectFile();
                    if (!opened) return;
                    try {
                      const data = JSON.parse(opened.content);
                      if (Array.isArray(data.slides)) {
                        loadProject(data.slides, data.currentSlideId);
                      } else {
                        alert('That file does not look like a Carousel Studio project.');
                      }
                    } catch (err) {
                      alert('Could not parse project file: ' + String(err));
                    }
                  } else {
                    fileInputRef.current?.click();
                  }
                }}
              />
              <div className="my-1 h-px bg-white/[0.06]" />
              <FileMenuItem
                icon={<Download size={13} />}
                label="Export images…"
                shortcut="⌘E"
                onClick={() => {
                  onOpenExport();
                  setMenuOpen(false);
                }}
              />
              <FileMenuItem
                icon={<Sparkles size={13} />}
                label="New blank project"
                onClick={() => {
                  if (confirm('Start a new project? Unsaved changes will be lost.')) {
                    useEditor.getState().resetProject();
                  }
                  setMenuOpen(false);
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json"
          className="hidden"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            try {
              const slides = await importProjectFile(file);
              loadProject(slides);
            } catch (err) {
              alert('Invalid project file');
            }
            e.target.value = '';
          }}
        />
      </div>

      {/* Center: Undo/redo */}
      <div className="absolute left-1/2 flex -translate-x-1/2 items-center gap-1">
        <Tooltip label="Undo" shortcut="⌘Z">
          <button className="icon-btn" onClick={undo} disabled={history.length === 0}>
            <Undo2 size={15} strokeWidth={1.5} />
          </button>
        </Tooltip>
        <Tooltip label="Redo" shortcut="⌘⇧Z">
          <button className="icon-btn" onClick={redo} disabled={future.length === 0}>
            <Redo2 size={15} strokeWidth={1.5} />
          </button>
        </Tooltip>

        <div className="mx-2 h-5 w-px bg-white/[0.06]" />

        <div className="flex items-center gap-1 rounded-lg bg-white/[0.04] px-1.5 py-0.5">
          <Tooltip label="Zoom out" shortcut="⌘-">
            <button className="icon-btn h-6 w-6" onClick={() => setZoom(zoom / 1.2)}>
              <ZoomOut size={12} strokeWidth={1.5} />
            </button>
          </Tooltip>
          <ZoomPicker zoom={zoom} setZoom={setZoom} resetOffset={() => setStageOffset(0, 0)} />
          <Tooltip label="Zoom in" shortcut="⌘+">
            <button className="icon-btn h-6 w-6" onClick={() => setZoom(zoom * 1.2)}>
              <ZoomIn size={12} strokeWidth={1.5} />
            </button>
          </Tooltip>
          <Tooltip label="Fit to screen" shortcut="⌘0">
            <button
              className="icon-btn h-6 w-6"
              onClick={() => {
                setZoom(0.5);
                setStageOffset(0, 0);
              }}
            >
              <Maximize size={12} strokeWidth={1.5} />
            </button>
          </Tooltip>
        </div>
      </div>

      {/* Right */}
      <div className="flex items-center gap-3">
        <SaveStatus state={saveState} />
        <Tooltip label="Keyboard shortcuts" shortcut="?">
          <button
            className="icon-btn"
            onClick={() => window.dispatchEvent(new CustomEvent('carousel-studio:open-help'))}
          >
            <HelpCircle size={14} strokeWidth={1.5} />
          </button>
        </Tooltip>
        <button className="btn-solid" onClick={onOpenExport}>
          <Download size={13} strokeWidth={2} />
          Export
        </button>
      </div>
    </div>
  );
}

function FileMenuItem({
  icon,
  label,
  shortcut,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  shortcut?: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-2 px-3 py-2 text-left text-[12px] text-ink-200 transition-colors hover:bg-white/5 hover:text-white"
    >
      <span className="flex h-5 w-5 items-center justify-center text-ink-400">{icon}</span>
      <span className="flex-1">{label}</span>
      {shortcut && (
        <span className="rounded bg-white/5 px-1.5 py-0.5 font-mono text-[9px] text-ink-400">
          {shortcut}
        </span>
      )}
    </button>
  );
}

function ZoomPicker({
  zoom,
  setZoom,
  resetOffset,
}: {
  zoom: number;
  setZoom: (z: number) => void;
  resetOffset: () => void;
}) {
  const [open, setOpen] = useState(false);
  const popRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (popRef.current && !popRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const presets = [
    { label: '25%', v: 0.25 },
    { label: '50%', v: 0.5 },
    { label: '75%', v: 0.75 },
    { label: '100%', v: 1 },
    { label: '150%', v: 1.5 },
    { label: '200%', v: 2 },
    { label: '400%', v: 4 },
  ];

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex min-w-[4rem] items-center justify-center gap-0.5 rounded-md px-1.5 py-0.5 font-mono text-[11px] text-ink-200 hover:bg-white/[0.06]"
      >
        {Math.round(zoom * 100)}%
        <ChevronDown size={10} strokeWidth={1.5} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            ref={popRef}
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.12 }}
            className="absolute left-1/2 top-full z-50 mt-1.5 w-40 -translate-x-1/2 overflow-hidden rounded-xl glass-strong shadow-2xl"
          >
            {presets.map((p) => (
              <button
                key={p.label}
                onClick={() => {
                  setZoom(p.v);
                  setOpen(false);
                }}
                className={cn(
                  'flex w-full items-center justify-between px-3 py-1.5 text-left text-[11px] transition-colors hover:bg-white/[0.06]',
                  Math.abs(zoom - p.v) < 0.01 ? 'text-white' : 'text-ink-300',
                )}
              >
                <span>{p.label}</span>
                {Math.abs(zoom - p.v) < 0.01 && <span className="text-[9px] text-ink-500">·</span>}
              </button>
            ))}
            <div className="border-t hairline">
              <button
                onClick={() => {
                  resetOffset();
                  setOpen(false);
                }}
                className="flex w-full items-center gap-1 px-3 py-1.5 text-left text-[11px] text-ink-300 transition-colors hover:bg-white/[0.06]"
              >
                Reset view
                <span className="ml-auto rounded bg-white/[0.06] px-1 py-px font-mono text-[9px]">
                  ⌘0
                </span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SaveStatus({ state }: { state: AutosaveState }) {
  const backend = isElectron ? 'Disk' : 'IndexedDB';
  const text =
    state.status === 'saving'
      ? 'Saving…'
      : state.status === 'pending'
        ? 'Unsaved changes…'
        : state.status === 'saved'
          ? 'All changes saved'
          : state.status === 'error'
            ? 'Save failed'
            : `Autosave · ${backend}`;
  const dotClass =
    state.status === 'error'
      ? 'bg-rose-400'
      : state.status === 'saving' || state.status === 'pending'
        ? 'bg-amber-300 animate-pulse'
        : 'bg-emerald-400/80';

  const lastSaved = state.lastSavedAt
    ? new Date(state.lastSavedAt).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })
    : null;

  const tooltip = state.error
    ? state.error
    : lastSaved
      ? `Last saved ${lastSaved} · ${backend}`
      : `Autosave ready · ${backend}`;

  return (
    <Tooltip label={tooltip} side="bottom">
      <div
        className={cn(
          'flex items-center gap-1.5 text-[10px]',
          state.status === 'error' ? 'text-rose-300' : 'text-ink-500',
        )}
      >
        {state.status === 'error' ? (
          <AlertCircle size={11} strokeWidth={1.5} />
        ) : (
          <span className={cn('h-1.5 w-1.5 rounded-full transition-colors', dotClass)} />
        )}
        {text}
      </div>
    </Tooltip>
  );
}
