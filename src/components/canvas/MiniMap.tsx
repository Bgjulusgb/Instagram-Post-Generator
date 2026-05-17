import { useEditor } from '../../store/editorStore';

interface Props {
  containerWidth: number;
  containerHeight: number;
}

/**
 * Floating mini-map that mirrors the active slide and overlays a viewport
 * indicator. Compact, non-interactive, can be hidden via toggle.
 */
export function MiniMap({ containerWidth, containerHeight }: Props) {
  const slide = useEditor((s) => s.slides.find((sl) => sl.id === s.currentSlideId)!);
  const zoom = useEditor((s) => s.zoom);
  const offset = useEditor((s) => s.stageOffset);
  const showMinimap = useEditor((s) => s.showMinimap);

  if (!showMinimap) return null;

  const mapMax = 120;
  const aspect = slide.height / slide.width;
  const mapW = aspect > 1 ? mapMax / aspect : mapMax;
  const mapH = aspect > 1 ? mapMax : mapMax * aspect;

  // Compute viewport rect in slide coords
  const viewportW = containerWidth / zoom;
  const viewportH = containerHeight / zoom;
  const viewportX = -offset.x / zoom + (slide.width - viewportW) / 2;
  const viewportY = -offset.y / zoom + (slide.height - viewportH) / 2;

  const scaleX = mapW / slide.width;
  const scaleY = mapH / slide.height;

  const vx = Math.max(0, viewportX * scaleX);
  const vy = Math.max(0, viewportY * scaleY);
  const vw = Math.min(mapW - vx, viewportW * scaleX);
  const vh = Math.min(mapH - vy, viewportH * scaleY);

  const bgStyle: React.CSSProperties = {};
  if (slide.background.kind === 'color') bgStyle.background = slide.background.color;
  if (slide.background.kind === 'gradient')
    bgStyle.background = `linear-gradient(${slide.background.angle}deg, ${slide.background.from}, ${slide.background.to})`;
  if (slide.background.kind === 'image') {
    bgStyle.backgroundImage = `url(${slide.background.src})`;
    bgStyle.backgroundSize = 'cover';
    bgStyle.backgroundPosition = 'center';
  }

  return (
    <div className="pointer-events-none absolute bottom-3 right-3 rounded-lg border hairline glass-strong p-1.5 shadow-2xl">
      <div className="relative overflow-hidden rounded" style={{ width: mapW, height: mapH, ...bgStyle }}>
        {slide.elements.slice(0, 32).map((el) => (
          <div
            key={el.id}
            className="absolute"
            style={{
              left: `${(el.x / slide.width) * 100}%`,
              top: `${(el.y / slide.height) * 100}%`,
              width: `${(el.width / slide.width) * 100}%`,
              height: `${(el.height / slide.height) * 100}%`,
              background:
                el.type === 'text'
                  ? 'rgba(255,255,255,0.4)'
                  : el.type === 'image'
                    ? 'rgba(255,255,255,0.22)'
                    : (el as any).fill ?? 'rgba(255,255,255,0.4)',
              opacity: el.opacity * 0.95,
              transform: el.rotation ? `rotate(${el.rotation}deg)` : undefined,
            }}
          />
        ))}
        {/* viewport indicator */}
        {vw > 0 && vh > 0 && vx < mapW && vy < mapH && (
          <div
            className="absolute border border-white/80"
            style={{ left: vx, top: vy, width: vw, height: vh, boxShadow: '0 0 0 9999px rgba(0,0,0,0.4) inset' }}
          />
        )}
      </div>
      <div className="mt-1 text-center font-mono text-[8px] uppercase tracking-wider text-ink-500">
        {Math.round(zoom * 100)}%
      </div>
    </div>
  );
}
