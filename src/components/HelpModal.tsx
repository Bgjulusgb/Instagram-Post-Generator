import { Modal } from './ui/Modal';

interface Props {
  open: boolean;
  onClose: () => void;
}

interface Section {
  title: string;
  items: { label: string; keys: string[] }[];
}

const SECTIONS: Section[] = [
  {
    title: 'Tools',
    items: [
      { label: 'Move', keys: ['V'] },
      { label: 'Pan canvas', keys: ['H'] },
      { label: 'Text', keys: ['T'] },
      { label: 'Rectangle', keys: ['R'] },
      { label: 'Ellipse', keys: ['O'] },
      { label: 'Line', keys: ['L'] },
      { label: 'Crop', keys: ['C'] },
      { label: 'Escape — deselect', keys: ['Esc'] },
    ],
  },
  {
    title: 'Editing',
    items: [
      { label: 'Undo', keys: ['⌘', 'Z'] },
      { label: 'Redo', keys: ['⌘', '⇧', 'Z'] },
      { label: 'Duplicate', keys: ['⌘', 'D'] },
      { label: 'Group / Ungroup', keys: ['⌘', 'G'] },
      { label: 'Select all', keys: ['⌘', 'A'] },
      { label: 'Delete selection', keys: ['⌫'] },
      { label: 'Nudge 1 px', keys: ['←', '↑', '→', '↓'] },
      { label: 'Nudge 10 px', keys: ['⇧', '←↑→↓'] },
    ],
  },
  {
    title: 'View',
    items: [
      { label: 'Zoom in', keys: ['⌘', '+'] },
      { label: 'Zoom out', keys: ['⌘', '-'] },
      { label: 'Fit to screen', keys: ['⌘', '0'] },
      { label: 'Wheel zoom', keys: ['⌘', 'Scroll'] },
      { label: 'Pan', keys: ['Scroll'] },
    ],
  },
  {
    title: 'Layers & paste',
    items: [
      { label: 'Bring forward / send back', keys: ['⌘', '] / ['] },
      { label: 'To front / to back', keys: ['⌘', '⇧', '] / ['] },
      { label: 'Paste image from clipboard', keys: ['⌘', 'V'] },
      { label: 'Drop image on canvas', keys: ['drag'] },
    ],
  },
];

export function HelpModal({ open, onClose }: Props) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Keyboard shortcuts"
      description="A quick reference. Press ? from anywhere to open this."
      size="lg"
    >
      <div className="grid gap-4 md:grid-cols-2">
        {SECTIONS.map((s) => (
          <div key={s.title}>
            <div className="text-[10px] font-semibold uppercase tracking-[0.1em] text-ink-400">
              {s.title}
            </div>
            <div className="mt-2 space-y-1.5">
              {s.items.map((it) => (
                <div
                  key={it.label}
                  className="flex items-center justify-between rounded-md border hairline bg-white/[0.02] px-3 py-1.5 text-[11px] text-ink-200"
                >
                  <span>{it.label}</span>
                  <span className="flex items-center gap-0.5">
                    {it.keys.map((k, i) => (
                      <kbd
                        key={i}
                        className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-[9px] text-white"
                      >
                        {k}
                      </kbd>
                    ))}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-5 rounded-xl border hairline bg-white/[0.02] p-3 text-[10px] leading-relaxed text-ink-400">
        <span className="text-white">Pro tip: </span>
        Drag images straight from Finder / Explorer onto the canvas, or paste
        an image from your clipboard with ⌘V. Pasted text becomes a text element
        in one click.
      </div>
    </Modal>
  );
}
