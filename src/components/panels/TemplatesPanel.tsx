import { useEditor } from '../../store/editorStore';
import type { AnyElement, Slide } from '../../types';
import { nanoid } from 'nanoid';

interface Template {
  id: string;
  name: string;
  description: string;
  background: Slide['background'];
  buildElements: (slide: { width: number; height: number }) => AnyElement[];
}

const TEMPLATES: Template[] = [
  {
    id: 'cover-editorial',
    name: 'Editorial cover',
    description: 'Serif title with index',
    background: { kind: 'color', color: '#0a0a0a' },
    buildElements: (s) => [
      {
        id: nanoid(8),
        type: 'text',
        name: 'Issue',
        x: s.width * 0.08,
        y: s.height * 0.12,
        width: s.width * 0.84,
        height: s.height * 0.05,
        rotation: 0,
        opacity: 1,
        locked: false,
        visible: true,
        blendMode: 'normal',
        text: 'ISSUE 04 — APRIL',
        fontFamily: 'Inter',
        fontSize: s.width * 0.024,
        fontWeight: 500,
        italic: false,
        underline: false,
        fill: '#a1a1aa',
        align: 'left',
        lineHeight: 1.1,
        letterSpacing: s.width * 0.006,
        autoResize: true,
      },
      {
        id: nanoid(8),
        type: 'text',
        name: 'Headline',
        x: s.width * 0.08,
        y: s.height * 0.32,
        width: s.width * 0.84,
        height: s.height * 0.4,
        rotation: 0,
        opacity: 1,
        locked: false,
        visible: true,
        blendMode: 'normal',
        text: 'Notes on\nLight & Form',
        fontFamily: 'Playfair Display',
        fontSize: s.width * 0.13,
        fontWeight: 600,
        italic: false,
        underline: false,
        fill: '#fafafa',
        align: 'left',
        lineHeight: 1,
        letterSpacing: -s.width * 0.002,
        autoResize: true,
      },
      {
        id: nanoid(8),
        type: 'text',
        name: 'Byline',
        x: s.width * 0.08,
        y: s.height * 0.86,
        width: s.width * 0.84,
        height: s.height * 0.05,
        rotation: 0,
        opacity: 1,
        locked: false,
        visible: true,
        blendMode: 'normal',
        text: 'A field study by you →',
        fontFamily: 'Inter',
        fontSize: s.width * 0.026,
        fontWeight: 400,
        italic: false,
        underline: false,
        fill: '#d4d4d8',
        align: 'left',
        lineHeight: 1.2,
        letterSpacing: 0,
        autoResize: true,
      },
    ],
  },
  {
    id: 'quote-large',
    name: 'Quote slide',
    description: 'Italic serif quote',
    background: { kind: 'color', color: '#f7f7f5' },
    buildElements: (s) => [
      {
        id: nanoid(8),
        type: 'text',
        name: 'Quote',
        x: s.width * 0.1,
        y: s.height * 0.3,
        width: s.width * 0.8,
        height: s.height * 0.5,
        rotation: 0,
        opacity: 1,
        locked: false,
        visible: true,
        blendMode: 'normal',
        text: '"The best camera is the one\nthat\'s with you."',
        fontFamily: 'Playfair Display',
        fontSize: s.width * 0.075,
        fontWeight: 400,
        italic: true,
        underline: false,
        fill: '#0a0a0a',
        align: 'center',
        lineHeight: 1.2,
        letterSpacing: 0,
        autoResize: true,
      },
      {
        id: nanoid(8),
        type: 'text',
        name: 'Attribution',
        x: s.width * 0.2,
        y: s.height * 0.78,
        width: s.width * 0.6,
        height: s.height * 0.05,
        rotation: 0,
        opacity: 1,
        locked: false,
        visible: true,
        blendMode: 'normal',
        text: '— Chase Jarvis',
        fontFamily: 'Inter',
        fontSize: s.width * 0.026,
        fontWeight: 500,
        italic: false,
        underline: false,
        fill: '#525252',
        align: 'center',
        lineHeight: 1,
        letterSpacing: 0,
        autoResize: true,
      },
    ],
  },
  {
    id: 'number-cover',
    name: 'Number cover',
    description: 'Oversized chapter mark',
    background: { kind: 'color', color: '#0a0a0a' },
    buildElements: (s) => [
      {
        id: nanoid(8),
        type: 'text',
        name: 'Number',
        x: s.width * 0.05,
        y: s.height * 0.1,
        width: s.width * 0.9,
        height: s.height * 0.7,
        rotation: 0,
        opacity: 1,
        locked: false,
        visible: true,
        blendMode: 'normal',
        text: '01',
        fontFamily: 'Bebas Neue',
        fontSize: s.width * 0.7,
        fontWeight: 400,
        italic: false,
        underline: false,
        fill: '#fafafa',
        align: 'center',
        lineHeight: 0.95,
        letterSpacing: 0,
        autoResize: true,
      },
      {
        id: nanoid(8),
        type: 'text',
        name: 'Label',
        x: s.width * 0.1,
        y: s.height * 0.82,
        width: s.width * 0.8,
        height: s.height * 0.05,
        rotation: 0,
        opacity: 1,
        locked: false,
        visible: true,
        blendMode: 'normal',
        text: 'CHAPTER — THE BEGINNING',
        fontFamily: 'Inter',
        fontSize: s.width * 0.024,
        fontWeight: 500,
        italic: false,
        underline: false,
        fill: '#a1a1aa',
        align: 'center',
        lineHeight: 1,
        letterSpacing: s.width * 0.008,
        autoResize: true,
      },
    ],
  },
  {
    id: 'minimal-end',
    name: 'Outro slide',
    description: 'CTA with subtle mark',
    background: { kind: 'gradient', from: '#0a0a0a', to: '#1c1c1e', angle: 135 },
    buildElements: (s) => [
      {
        id: nanoid(8),
        type: 'text',
        name: 'Outro',
        x: s.width * 0.1,
        y: s.height * 0.4,
        width: s.width * 0.8,
        height: s.height * 0.2,
        rotation: 0,
        opacity: 1,
        locked: false,
        visible: true,
        blendMode: 'normal',
        text: 'Save this for later →',
        fontFamily: 'Inter',
        fontSize: s.width * 0.08,
        fontWeight: 700,
        italic: false,
        underline: false,
        fill: '#fafafa',
        align: 'center',
        lineHeight: 1.1,
        letterSpacing: -s.width * 0.001,
        autoResize: true,
      },
      {
        id: nanoid(8),
        type: 'text',
        name: 'Handle',
        x: s.width * 0.1,
        y: s.height * 0.62,
        width: s.width * 0.8,
        height: s.height * 0.05,
        rotation: 0,
        opacity: 1,
        locked: false,
        visible: true,
        blendMode: 'normal',
        text: '@your.handle',
        fontFamily: 'Inter',
        fontSize: s.width * 0.03,
        fontWeight: 400,
        italic: false,
        underline: false,
        fill: '#a1a1aa',
        align: 'center',
        lineHeight: 1,
        letterSpacing: 0,
        autoResize: true,
      },
    ],
  },
  {
    id: 'photo-caption',
    name: 'Photo + caption',
    description: 'Subtle bottom caption',
    background: { kind: 'color', color: '#000000' },
    buildElements: (s) => [
      {
        id: nanoid(8),
        type: 'shape',
        shape: 'rect',
        name: 'Card',
        x: s.width * 0.08,
        y: s.height * 0.78,
        width: s.width * 0.84,
        height: s.height * 0.12,
        rotation: 0,
        opacity: 0.85,
        locked: false,
        visible: true,
        blendMode: 'normal',
        fill: '#0a0a0a',
        cornerRadius: 16,
        stroke: { color: 'rgba(255,255,255,0.1)', width: 1 },
      },
      {
        id: nanoid(8),
        type: 'text',
        name: 'Title',
        x: s.width * 0.1,
        y: s.height * 0.81,
        width: s.width * 0.8,
        height: s.height * 0.04,
        rotation: 0,
        opacity: 1,
        locked: false,
        visible: true,
        blendMode: 'normal',
        text: 'Reykjavik — March',
        fontFamily: 'Inter',
        fontSize: s.width * 0.034,
        fontWeight: 600,
        italic: false,
        underline: false,
        fill: '#fafafa',
        align: 'left',
        lineHeight: 1.1,
        letterSpacing: 0,
        autoResize: true,
      },
      {
        id: nanoid(8),
        type: 'text',
        name: 'Subline',
        x: s.width * 0.1,
        y: s.height * 0.855,
        width: s.width * 0.8,
        height: s.height * 0.03,
        rotation: 0,
        opacity: 1,
        locked: false,
        visible: true,
        blendMode: 'normal',
        text: 'Shot on Leica Q2, f/2.8 — 1/640s',
        fontFamily: 'Inter',
        fontSize: s.width * 0.022,
        fontWeight: 400,
        italic: false,
        underline: false,
        fill: '#a1a1aa',
        align: 'left',
        lineHeight: 1.1,
        letterSpacing: 0,
        autoResize: true,
      },
    ],
  },
];

export function TemplatesPanel() {
  const slides = useEditor((s) => s.slides);
  const currentSlideId = useEditor((s) => s.currentSlideId);
  const slide = slides.find((s) => s.id === currentSlideId)!;
  const addElement = useEditor((s) => s.addElement);
  const setBackground = useEditor((s) => s.setBackground);
  const deleteElements = useEditor((s) => s.deleteElements);

  const applyTemplate = (tpl: Template) => {
    // Clear current slide, set background, add elements
    deleteElements(slide.elements.map((e) => e.id));
    setBackground(slide.id, tpl.background);
    tpl.buildElements({ width: slide.width, height: slide.height }).forEach((el) => addElement(el));
  };

  return (
    <div>
      <div className="panel-section">
        <div className="panel-heading">Templates</div>
        <div className="grid gap-2">
          {TEMPLATES.map((tpl) => (
            <button
              key={tpl.id}
              onClick={() => applyTemplate(tpl)}
              className="group flex items-center gap-3 rounded-xl border hairline bg-white/[0.02] p-2.5 text-left transition-all hover:bg-white/[0.05]"
            >
              <TemplatePreview tpl={tpl} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-[11px] font-medium text-white">{tpl.name}</div>
                <div className="truncate text-[10px] text-ink-500">{tpl.description}</div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function TemplatePreview({ tpl }: { tpl: Template }) {
  const bg =
    tpl.background.kind === 'color'
      ? tpl.background.color
      : tpl.background.kind === 'gradient'
        ? `linear-gradient(${tpl.background.angle}deg, ${tpl.background.from}, ${tpl.background.to})`
        : '#0a0a0a';
  return (
    <div className="relative h-14 w-12 flex-shrink-0 overflow-hidden rounded-md border hairline" style={{ background: bg }}>
      {tpl.id === 'cover-editorial' && (
        <>
          <div className="absolute left-1 right-1 top-1.5 h-0.5 bg-white/40" />
          <div className="absolute left-1 right-1 top-4 h-2 bg-white/80" />
          <div className="absolute left-1 right-3 top-6.5 h-2 bg-white/80" />
        </>
      )}
      {tpl.id === 'quote-large' && (
        <>
          <div className="absolute left-1 right-1 top-3.5 h-1.5 bg-black/60" />
          <div className="absolute left-2 right-2 top-6 h-1.5 bg-black/40" />
          <div className="absolute left-1 right-3 top-8.5 h-1.5 bg-black/60" />
        </>
      )}
      {tpl.id === 'number-cover' && (
        <div className="absolute inset-0 flex items-center justify-center text-[20px] font-bold text-white">
          01
        </div>
      )}
      {tpl.id === 'minimal-end' && (
        <div className="absolute inset-0 flex items-center justify-center text-[8px] font-bold text-white">
          Save →
        </div>
      )}
      {tpl.id === 'photo-caption' && (
        <div className="absolute bottom-1 left-1 right-1 h-3 rounded-sm bg-white/10" />
      )}
    </div>
  );
}
