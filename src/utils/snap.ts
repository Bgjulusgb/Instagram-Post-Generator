import type { AnyElement, GuideLine, Slide } from '../types';

const SNAP_TOLERANCE = 6;

interface SnapResult {
  x: number;
  y: number;
  guides: GuideLine[];
}

/**
 * Snap a moving element's position to peer elements, slide center, and slide edges.
 * Returns adjusted x/y plus the active guides for rendering.
 */
export function snapPosition(
  slide: Slide,
  movingId: string,
  proposed: { x: number; y: number; width: number; height: number },
  tolerance = SNAP_TOLERANCE,
): SnapResult {
  let snappedX = proposed.x;
  let snappedY = proposed.y;
  const guides: GuideLine[] = [];

  const peers = slide.elements.filter(
    (e) => e.id !== movingId && e.visible && !e.locked,
  );

  // Build snap targets for X axis: left, center, right
  const xTargets: { value: number; origin: 'left' | 'center' | 'right' }[] = [
    { value: 0, origin: 'left' },
    { value: slide.width / 2, origin: 'center' },
    { value: slide.width, origin: 'right' },
  ];
  peers.forEach((p) => {
    xTargets.push(
      { value: p.x, origin: 'left' },
      { value: p.x + p.width / 2, origin: 'center' },
      { value: p.x + p.width, origin: 'right' },
    );
  });

  const yTargets: { value: number; origin: 'top' | 'middle' | 'bottom' }[] = [
    { value: 0, origin: 'top' },
    { value: slide.height / 2, origin: 'middle' },
    { value: slide.height, origin: 'bottom' },
  ];
  peers.forEach((p) => {
    yTargets.push(
      { value: p.y, origin: 'top' },
      { value: p.y + p.height / 2, origin: 'middle' },
      { value: p.y + p.height, origin: 'bottom' },
    );
  });

  // Sources from moving element
  const xSources = [
    { value: proposed.x, anchor: 'left' as const },
    { value: proposed.x + proposed.width / 2, anchor: 'center' as const },
    { value: proposed.x + proposed.width, anchor: 'right' as const },
  ];
  const ySources = [
    { value: proposed.y, anchor: 'top' as const },
    { value: proposed.y + proposed.height / 2, anchor: 'middle' as const },
    { value: proposed.y + proposed.height, anchor: 'bottom' as const },
  ];

  let bestX: { diff: number; snap: number; line: number } | null = null;
  xSources.forEach((src) => {
    xTargets.forEach((t) => {
      const diff = t.value - src.value;
      if (Math.abs(diff) <= tolerance) {
        if (!bestX || Math.abs(diff) < Math.abs(bestX.diff)) {
          bestX = { diff, snap: snappedX + diff, line: t.value };
        }
      }
    });
  });
  if (bestX) {
    const b = bestX as { diff: number; snap: number; line: number };
    snappedX = b.snap;
    guides.push({ axis: 'x', position: b.line });
  }

  let bestY: { diff: number; snap: number; line: number } | null = null;
  ySources.forEach((src) => {
    yTargets.forEach((t) => {
      const diff = t.value - src.value;
      if (Math.abs(diff) <= tolerance) {
        if (!bestY || Math.abs(diff) < Math.abs(bestY.diff)) {
          bestY = { diff, snap: snappedY + diff, line: t.value };
        }
      }
    });
  });
  if (bestY) {
    const b = bestY as { diff: number; snap: number; line: number };
    snappedY = b.snap;
    guides.push({ axis: 'y', position: b.line });
  }

  return { x: snappedX, y: snappedY, guides };
}

export function getElementBounds(el: AnyElement) {
  return { x: el.x, y: el.y, width: el.width, height: el.height };
}
