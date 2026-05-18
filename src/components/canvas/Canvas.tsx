import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Layer, Line, Rect, Stage, Transformer } from 'react-konva';
import Konva from 'konva';
import { motion } from 'framer-motion';
import {
  createShapeElement,
  createTextElement,
  useEditor,
} from '../../store/editorStore';
import { CanvasBackground } from './CanvasBackground';
import { CanvasImage } from './CanvasImage';
import { CanvasShape } from './CanvasShape';
import { CanvasText } from './CanvasText';
import { MiniMap } from './MiniMap';
import { SelectionToolbar } from './SelectionToolbar';
import { snapPosition } from '../../utils/snap';
import { importImageFiles } from '../../utils/importImage';
import type { AnyElement, GuideLine } from '../../types';

export function Canvas() {
  const slide = useEditor((s) => s.slides.find((sl) => sl.id === s.currentSlideId)!);
  const selectedIds = useEditor((s) => s.selectedElementIds);
  const zoom = useEditor((s) => s.zoom);
  const offset = useEditor((s) => s.stageOffset);
  const tool = useEditor((s) => s.tool);
  const showGuides = useEditor((s) => s.showGuides);
  const showGrid = useEditor((s) => s.showGrid);
  const snapEnabled = useEditor((s) => s.snapEnabled);

  const selectElement = useEditor((s) => s.selectElement);
  const updateElement = useEditor((s) => s.updateElement);
  const addElement = useEditor((s) => s.addElement);
  const pushHistory = useEditor((s) => s.pushHistory);
  const setZoom = useEditor((s) => s.setZoom);
  const setStageOffset = useEditor((s) => s.setStageOffset);
  const setTool = useEditor((s) => s.setTool);
  const deselectAll = useEditor((s) => s.deselectAll);
  const selectMultiple = useEditor((s) => s.selectMultipleElements);
  const reCoverImage = useEditor((s) => s.reCoverImage);

  // Lock the Transformer aspect ratio when only images are selected so photos
  // never stretch with the resize handles. Text/shapes keep free resize.
  const selectedElements = slide.elements.filter((e) => selectedIds.includes(e.id));
  const allImages = selectedElements.length > 0 && selectedElements.every((e) => e.type === 'image');
  const transformerKeepRatio = allImages;
  const transformerAnchors = allImages
    ? ['top-left', 'top-right', 'bottom-left', 'bottom-right']
    : [
        'top-left',
        'top-center',
        'top-right',
        'middle-right',
        'middle-left',
        'bottom-left',
        'bottom-center',
        'bottom-right',
      ];

  const stageRef = useRef<Konva.Stage>(null);
  const transformerRef = useRef<Konva.Transformer>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [containerSize, setContainerSize] = useState({ width: 1, height: 1 });
  const [guides, setGuides] = useState<GuideLine[]>([]);
  const [selectionBox, setSelectionBox] = useState<{ x: number; y: number; width: number; height: number } | null>(
    null,
  );
  const [dropActive, setDropActive] = useState(false);
  const selectionStart = useRef<{ x: number; y: number } | null>(null);
  const editingTextId = useRef<string | null>(null);

  // Track container size
  useLayoutEffect(() => {
    if (!containerRef.current) return;
    const el = containerRef.current;
    const ro = new ResizeObserver((entries) => {
      const cr = entries[0].contentRect;
      setContainerSize({ width: cr.width, height: cr.height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Auto-fit on slide change if zoom is at default-ish
  useEffect(() => {
    if (containerSize.width < 10 || containerSize.height < 10) return;
    const padding = 80;
    const fitW = (containerSize.width - padding * 2) / slide.width;
    const fitH = (containerSize.height - padding * 2) / slide.height;
    const fit = Math.min(fitW, fitH);
    // Only auto-fit when slide aspect would put it out of view
    if (zoom > fit * 2 || zoom < fit * 0.2) {
      setZoom(fit);
      setStageOffset(0, 0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slide.id, containerSize.width, containerSize.height]);

  // Attach transformer to current selection
  useEffect(() => {
    const stage = stageRef.current;
    const tr = transformerRef.current;
    if (!stage || !tr) return;
    if (selectedIds.length === 0) {
      tr.nodes([]);
      tr.getLayer()?.batchDraw();
      return;
    }
    const nodes: Konva.Node[] = [];
    selectedIds.forEach((id) => {
      const n = stage.findOne(`#${id}`);
      if (n) nodes.push(n);
    });
    tr.nodes(nodes);
    tr.getLayer()?.batchDraw();
  }, [selectedIds, slide.elements]);

  // Mouse wheel zoom (with ctrl) or pan
  const handleWheel = (e: Konva.KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();
    const stage = stageRef.current;
    if (!stage) return;
    if (e.evt.ctrlKey || e.evt.metaKey) {
      const scaleBy = 1.05;
      const oldScale = zoom;
      const pointer = stage.getPointerPosition();
      if (!pointer) return;
      const direction = e.evt.deltaY > 0 ? -1 : 1;
      const newScale = direction > 0 ? oldScale * scaleBy : oldScale / scaleBy;
      const mousePointTo = {
        x: (pointer.x - offset.x - containerSize.width / 2) / oldScale,
        y: (pointer.y - offset.y - containerSize.height / 2) / oldScale,
      };
      setZoom(newScale);
      const finalScale = Math.max(0.05, Math.min(8, newScale));
      const newOffset = {
        x: pointer.x - mousePointTo.x * finalScale - containerSize.width / 2,
        y: pointer.y - mousePointTo.y * finalScale - containerSize.height / 2,
      };
      setStageOffset(newOffset.x, newOffset.y);
    } else {
      setStageOffset(offset.x - e.evt.deltaX, offset.y - e.evt.deltaY);
    }
  };

  // Stage position = container center + offset
  const stageX = containerSize.width / 2 + offset.x - (slide.width * zoom) / 2;
  const stageY = containerSize.height / 2 + offset.y - (slide.height * zoom) / 2;

  const handleStageMouseDown = (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
    // Clicks on stage background deselect & may start a marquee or insert shape
    const isStage = e.target === e.target.getStage();
    const isBackground = e.target.getClassName?.() === 'Rect' && !e.target.id();

    if (!isStage && !isBackground) return;

    // Insert shape/text on click if tool != select/hand
    if (tool === 'text') {
      const pos = e.target.getStage()?.getPointerPosition();
      if (!pos) return;
      const local = stageToLocal(pos, { stageX, stageY, zoom });
      const el = createTextElement('Double-click to edit', slide.width, slide.height);
      el.x = local.x - el.width / 2;
      el.y = local.y - el.height / 2;
      addElement(el);
      setTool('select');
      return;
    }
    if (tool === 'rect' || tool === 'ellipse' || tool === 'line') {
      const pos = e.target.getStage()?.getPointerPosition();
      if (!pos) return;
      const local = stageToLocal(pos, { stageX, stageY, zoom });
      const el = createShapeElement(tool, slide.width, slide.height);
      el.x = local.x - el.width / 2;
      el.y = local.y - el.height / 2;
      addElement(el);
      setTool('select');
      return;
    }

    // Marquee selection
    if (tool === 'select') {
      const pos = e.target.getStage()?.getPointerPosition();
      if (!pos) return;
      const local = stageToLocal(pos, { stageX, stageY, zoom });
      selectionStart.current = local;
      setSelectionBox({ x: local.x, y: local.y, width: 0, height: 0 });
      deselectAll();
    }
  };

  const handleStageMouseMove = (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
    if (!selectionStart.current) return;
    const pos = e.target.getStage()?.getPointerPosition();
    if (!pos) return;
    const local = stageToLocal(pos, { stageX, stageY, zoom });
    const start = selectionStart.current;
    const box = {
      x: Math.min(start.x, local.x),
      y: Math.min(start.y, local.y),
      width: Math.abs(local.x - start.x),
      height: Math.abs(local.y - start.y),
    };
    setSelectionBox(box);
  };

  const handleStageMouseUp = () => {
    if (selectionBox && selectionStart.current) {
      // Find elements intersecting box
      const inside = slide.elements
        .filter((el) => el.visible && !el.locked)
        .filter((el) => {
          const ex2 = el.x + el.width;
          const ey2 = el.y + el.height;
          const sx2 = selectionBox.x + selectionBox.width;
          const sy2 = selectionBox.y + selectionBox.height;
          return el.x < sx2 && ex2 > selectionBox.x && el.y < sy2 && ey2 > selectionBox.y;
        })
        .map((el) => el.id);
      if (inside.length > 0) selectMultiple(inside);
    }
    selectionStart.current = null;
    setSelectionBox(null);
  };

  // Drag-and-drop snapping wrapper
  const handleElementChange = (id: string, patch: Partial<AnyElement>) => {
    const el = slide.elements.find((e) => e.id === id);
    if (!el) {
      updateElement(id, patch);
      return;
    }
    if (snapEnabled && (patch.x !== undefined || patch.y !== undefined)) {
      const proposed = {
        x: patch.x ?? el.x,
        y: patch.y ?? el.y,
        width: el.width,
        height: el.height,
      };
      const result = snapPosition(slide, id, proposed);
      updateElement(id, { ...patch, x: result.x, y: result.y });
      // Clear guides shortly after drop
      window.setTimeout(() => setGuides([]), 350);
    } else {
      updateElement(id, patch);
    }
  };

  /**
   * Builds a Konva dragBoundFunc per element. The function returns the snapped
   * position in *stage* coordinates while the user drags, so Konva renders the
   * element exactly at the snap target frame-by-frame. Side effect: updates
   * the on-screen guides only when the active guide set changes.
   */
  const makeDragBound = (id: string, width: number, height: number) => {
    return (pos: { x: number; y: number }) => {
      if (!snapEnabled) {
        return pos;
      }
      // Stage coords → slide coords (account for stage origin + zoom)
      const slideX = (pos.x - stageX) / zoom;
      const slideY = (pos.y - stageY) / zoom;
      const result = snapPosition(slide, id, { x: slideX, y: slideY, width, height });
      // Update guides only when set changes to avoid render thrash
      setGuides((prev) => {
        if (
          prev.length === result.guides.length &&
          prev.every((g, i) => g.axis === result.guides[i]?.axis && g.position === result.guides[i]?.position)
        ) {
          return prev;
        }
        return result.guides;
      });
      return {
        x: result.x * zoom + stageX,
        y: result.y * zoom + stageY,
      };
    };
  };

  // Inline text editor overlay
  const editTextElement = (id: string) => {
    const stage = stageRef.current;
    if (!stage) return;
    const el = slide.elements.find((e) => e.id === id);
    if (!el || el.type !== 'text') return;
    editingTextId.current = id;
    const node = stage.findOne(`#${id}`) as Konva.Group | undefined;
    if (!node) return;
    const textNode = node.findOne('Text') as Konva.Text;
    const absPos = node.getAbsolutePosition();
    const stageBox = stage.container().getBoundingClientRect();

    const textarea = document.createElement('textarea');
    document.body.appendChild(textarea);
    textarea.value = el.text;
    const styleObj = {
      position: 'absolute',
      top: `${stageBox.top + absPos.y}px`,
      left: `${stageBox.left + absPos.x}px`,
      width: `${el.width * zoom}px`,
      minHeight: `${el.height * zoom}px`,
      fontSize: `${el.fontSize * zoom}px`,
      lineHeight: String(el.lineHeight),
      letterSpacing: `${el.letterSpacing * zoom}px`,
      fontFamily: el.fontFamily,
      fontWeight: String(el.fontWeight),
      fontStyle: el.italic ? 'italic' : 'normal',
      textDecoration: el.underline ? 'underline' : 'none',
      color: el.fill,
      background: 'transparent',
      border: '1px solid rgba(255,255,255,0.4)',
      outline: 'none',
      padding: '0',
      margin: '0',
      overflow: 'hidden',
      resize: 'none',
      textAlign: el.align,
      zIndex: '9999',
      transformOrigin: 'left top',
      transform: el.rotation ? `rotate(${el.rotation}deg)` : '',
    } as const;
    Object.assign(textarea.style, styleObj);
    textarea.focus();
    textarea.select();
    textNode.visible(false);
    node.getLayer()?.batchDraw();

    const close = () => {
      pushHistory();
      updateElement(id, { text: textarea.value });
      textNode.visible(true);
      node.getLayer()?.batchDraw();
      textarea.remove();
      editingTextId.current = null;
    };
    textarea.addEventListener('blur', close, { once: true });
    textarea.addEventListener('keydown', (ev) => {
      if (ev.key === 'Enter' && !ev.shiftKey) {
        ev.preventDefault();
        textarea.blur();
      }
      if (ev.key === 'Escape') {
        ev.preventDefault();
        textarea.blur();
      }
    });
  };

  // Render rulers / grid
  const renderGrid = () => {
    if (!showGrid) return null;
    const step = 100;
    const lines: JSX.Element[] = [];
    for (let x = step; x < slide.width; x += step) {
      lines.push(
        <Line
          key={`gx-${x}`}
          points={[x, 0, x, slide.height]}
          stroke="rgba(255,255,255,0.05)"
          strokeWidth={1 / zoom}
          listening={false}
        />,
      );
    }
    for (let y = step; y < slide.height; y += step) {
      lines.push(
        <Line
          key={`gy-${y}`}
          points={[0, y, slide.width, y]}
          stroke="rgba(255,255,255,0.05)"
          strokeWidth={1 / zoom}
          listening={false}
        />,
      );
    }
    return lines;
  };

  // Drag images straight onto the canvas — much friendlier than a button.
  const handleDropFiles = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDropActive(false);
    const files = Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith('image/'));
    if (files.length === 0) return;
    await importImageFiles(files);
  };

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full overflow-hidden"
      style={{
        backgroundImage:
          'radial-gradient(circle at center, rgba(255,255,255,0.025) 1px, transparent 1px)',
        backgroundSize: '24px 24px',
        backgroundPosition: 'center',
        cursor: tool === 'hand' ? 'grab' : tool === 'select' ? 'default' : 'crosshair',
      }}
      onDragOver={(e) => {
        e.preventDefault();
        if (e.dataTransfer.types.includes('Files')) setDropActive(true);
      }}
      onDragLeave={(e) => {
        // Only clear when leaving the canvas wrapper, not on inner enters
        if (e.currentTarget === e.target) setDropActive(false);
      }}
      onDrop={handleDropFiles}
    >
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="absolute inset-0"
      >
        <Stage
          ref={stageRef}
          width={containerSize.width}
          height={containerSize.height}
          onWheel={handleWheel}
          onMouseDown={handleStageMouseDown}
          onTouchStart={handleStageMouseDown}
          onMouseMove={handleStageMouseMove}
          onTouchMove={handleStageMouseMove}
          onMouseUp={handleStageMouseUp}
          onTouchEnd={handleStageMouseUp}
          draggable={tool === 'hand'}
          onDragEnd={(e) => {
            if (tool !== 'hand') return;
            const node = e.target as Konva.Stage;
            const newOffsetX = node.x() - (containerSize.width / 2 - (slide.width * zoom) / 2);
            const newOffsetY = node.y() - (containerSize.height / 2 - (slide.height * zoom) / 2);
            setStageOffset(newOffsetX, newOffsetY);
            // Reset stage position to prevent drift
            node.position({ x: stageX, y: stageY });
          }}
          x={stageX}
          y={stageY}
          scaleX={zoom}
          scaleY={zoom}
        >
          {/* Drop shadow underlay */}
          <Layer listening={false}>
            <Rect
              x={-30}
              y={-30}
              width={slide.width + 60}
              height={slide.height + 60}
              shadowBlur={60}
              shadowColor="rgba(0,0,0,0.6)"
              shadowOpacity={1}
              fill="rgba(0,0,0,0)"
            />
          </Layer>

          {/* Main export layer — clipped to slide bounds */}
          <Layer name="export-layer" clipFunc={(ctx) => {
            ctx.rect(0, 0, slide.width, slide.height);
          }}>
            <CanvasBackground slide={slide} />
            {slide.elements.map((el) =>
              !el.visible ? null : el.type === 'image' ? (
                <CanvasImage
                  key={el.id}
                  element={el}
                  slide={slide}
                  isSelected={selectedIds.includes(el.id)}
                  onSelect={(e) => {
                    e.cancelBubble = true;
                    selectElement(el.id, e.evt.shiftKey);
                  }}
                  onChange={(patch) => handleElementChange(el.id, patch)}
                  dragBoundFunc={makeDragBound}
                />
              ) : el.type === 'text' ? (
                <CanvasText
                  key={el.id}
                  element={el}
                  onSelect={(e) => {
                    e.cancelBubble = true;
                    selectElement(el.id, e.evt.shiftKey);
                  }}
                  onChange={(patch) => handleElementChange(el.id, patch)}
                  onDoubleClick={() => editTextElement(el.id)}
                  dragBoundFunc={makeDragBound}
                />
              ) : (
                <CanvasShape
                  key={el.id}
                  element={el}
                  onSelect={(e) => {
                    e.cancelBubble = true;
                    selectElement(el.id, e.evt.shiftKey);
                  }}
                  onChange={(patch) => handleElementChange(el.id, patch)}
                  dragBoundFunc={makeDragBound}
                />
              ),
            )}
          </Layer>

          {/* Overlay layer: borders, guides, selection box, transformer */}
          <Layer listening={true}>
            {/* Slide frame */}
            <Rect
              x={0}
              y={0}
              width={slide.width}
              height={slide.height}
              stroke="rgba(255,255,255,0.16)"
              strokeWidth={1 / zoom}
              listening={false}
            />
            {renderGrid()}
            {showGuides &&
              guides.map((g, i) => (
                <Line
                  key={i}
                  points={
                    g.axis === 'x'
                      ? [g.position, -100, g.position, slide.height + 100]
                      : [-100, g.position, slide.width + 100, g.position]
                  }
                  stroke="#f06292"
                  strokeWidth={1 / zoom}
                  listening={false}
                />
              ))}

            {selectionBox && (
              <Rect
                x={selectionBox.x}
                y={selectionBox.y}
                width={selectionBox.width}
                height={selectionBox.height}
                stroke="rgba(255,255,255,0.6)"
                strokeWidth={1 / zoom}
                fill="rgba(255,255,255,0.04)"
                listening={false}
              />
            )}

            <Transformer
              ref={transformerRef}
              ignoreStroke
              rotateEnabled
              keepRatio={transformerKeepRatio}
              enabledAnchors={transformerAnchors}
              anchorSize={8}
              anchorCornerRadius={2}
              borderStroke="#ffffff"
              borderStrokeWidth={1 / zoom}
              anchorStroke="#ffffff"
              anchorFill="#0a0a0a"
              rotateAnchorOffset={28 / zoom}
              padding={2 / zoom}
              boundBoxFunc={(_oldBox, newBox) => {
                if (Math.abs(newBox.width) < 10 || Math.abs(newBox.height) < 10) {
                  return _oldBox;
                }
                return newBox;
              }}
              onTransformStart={() => pushHistory()}
              onTransformEnd={() => {
                // Commit width/height to element data
                const stage = stageRef.current;
                if (!stage) return;
                selectedIds.forEach((id) => {
                  const node = stage.findOne(`#${id}`);
                  if (!node) return;
                  const scaleX = node.scaleX();
                  const scaleY = node.scaleY();
                  const el = slide.elements.find((e) => e.id === id);
                  if (!el) return;
                  const newWidth = Math.max(10, el.width * scaleX);
                  const newHeight = Math.max(10, el.height * scaleY);
                  const newRotation = node.rotation();
                  node.scaleX(1);
                  node.scaleY(1);
                  updateElement(id, {
                    x: node.x(),
                    y: node.y(),
                    width: newWidth,
                    height: newHeight,
                    rotation: newRotation,
                  });
                  if (el.type === 'text') {
                    // For text, scale font size with the average scale
                    updateElement(id, {
                      fontSize: Math.max(8, (el as any).fontSize * ((scaleX + scaleY) / 2)),
                    });
                  }
                  if (el.type === 'image') {
                    // Re-cover the crop so the photo never stretches in its new frame
                    reCoverImage(id);
                  }
                });
              }}
            />
          </Layer>
        </Stage>
      </motion.div>

      {/* Floating help */}
      <div className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 select-none text-[10px] uppercase tracking-[0.18em] text-ink-500">
        {slide.width} × {slide.height}
      </div>

      <SelectionToolbar
        containerWidth={containerSize.width}
        containerHeight={containerSize.height}
        stageX={stageX}
        stageY={stageY}
        zoom={zoom}
      />

      <MiniMap containerWidth={containerSize.width} containerHeight={containerSize.height} />

      {dropActive && (
        <div className="pointer-events-none absolute inset-4 flex items-center justify-center rounded-2xl border-2 border-dashed border-white/40 bg-white/[0.04] backdrop-blur-sm">
          <div className="rounded-xl glass-strong px-4 py-3 text-center">
            <div className="text-[12px] font-medium text-white">Drop to add photo</div>
            <div className="mt-0.5 text-[10px] text-ink-400">
              Multiple files supported — each becomes its own element
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function stageToLocal(
  pos: { x: number; y: number },
  ctx: { stageX: number; stageY: number; zoom: number },
) {
  return {
    x: (pos.x - ctx.stageX) / ctx.zoom,
    y: (pos.y - ctx.stageY) / ctx.zoom,
  };
}
