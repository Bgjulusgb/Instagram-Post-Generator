import { memo, useEffect, useRef } from 'react';
import { Group, Text as KonvaText } from 'react-konva';
import Konva from 'konva';
import type { TextElement } from '../../types';

interface Props {
  element: TextElement;
  onSelect: (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => void;
  onChange: (patch: Partial<TextElement>) => void;
  onDoubleClick?: () => void;
  dragBoundFunc?: (id: string, width: number, height: number) => (pos: { x: number; y: number }) => { x: number; y: number };
}

function CanvasTextInner({ element, onSelect, onChange, onDoubleClick, dragBoundFunc }: Props) {
  const textRef = useRef<Konva.Text>(null);

  useEffect(() => {
    if (!element.autoResize) return;
    const node = textRef.current;
    if (!node) return;
    // Auto height to fit content
    const newHeight = node.height();
    if (Math.abs(newHeight - element.height) > 2) {
      onChange({ height: newHeight });
    }
  }, [element.text, element.fontSize, element.lineHeight, element.width, element.autoResize]);

  const fontStyle = `${element.italic ? 'italic ' : ''}${element.fontWeight}`;

  return (
    <Group
      id={element.id}
      x={element.x}
      y={element.y}
      rotation={element.rotation}
      opacity={element.opacity}
      visible={element.visible}
      listening={!element.locked}
      draggable={!element.locked}
      globalCompositeOperation={element.blendMode === 'normal' ? undefined : (element.blendMode as any)}
      onMouseDown={onSelect}
      onTouchStart={onSelect}
      onDblClick={onDoubleClick}
      onDblTap={onDoubleClick}
      dragBoundFunc={dragBoundFunc?.(element.id, element.width, element.height)}
      onDragEnd={(e) => onChange({ x: e.target.x(), y: e.target.y() })}
      shadowColor={element.shadow?.color}
      shadowBlur={element.shadow?.blur}
      shadowOffsetX={element.shadow?.offsetX}
      shadowOffsetY={element.shadow?.offsetY}
      shadowOpacity={element.shadow?.opacity}
    >
      <KonvaText
        ref={textRef}
        text={element.text}
        width={element.width}
        fontSize={element.fontSize}
        fontFamily={element.fontFamily}
        fontStyle={fontStyle}
        fill={element.gradient ? undefined : element.fill}
        // Linear gradient text uses the element's bounding box as the gradient
        // span — start/end derived from the configured angle.
        fillLinearGradientStartPoint={
          element.gradient ? gradientStart(element.gradient.angle, element.width, element.height) : undefined
        }
        fillLinearGradientEndPoint={
          element.gradient ? gradientEnd(element.gradient.angle, element.width, element.height) : undefined
        }
        fillLinearGradientColorStops={
          element.gradient ? [0, element.gradient.from, 1, element.gradient.to] : undefined
        }
        align={element.align}
        lineHeight={element.lineHeight}
        letterSpacing={element.letterSpacing}
        textDecoration={element.underline ? 'underline' : undefined}
        stroke={element.stroke?.color}
        strokeWidth={element.stroke?.width}
        fillAfterStrokeEnabled={true}
        wrap="word"
        listening={!element.locked}
        perfectDrawEnabled={false}
      />
    </Group>
  );
}

function gradientStart(angle: number, w: number, h: number) {
  const a = (angle * Math.PI) / 180;
  const dx = Math.cos(a);
  const dy = Math.sin(a);
  const r = Math.max(w, h) / 2;
  return { x: w / 2 - dx * r, y: h / 2 - dy * r };
}
function gradientEnd(angle: number, w: number, h: number) {
  const a = (angle * Math.PI) / 180;
  const dx = Math.cos(a);
  const dy = Math.sin(a);
  const r = Math.max(w, h) / 2;
  return { x: w / 2 + dx * r, y: h / 2 + dy * r };
}

/**
 * React.memo bails out on shallow-equal props. Combined with stable callbacks
 * derived in the Canvas, this saves dozens of re-renders per second when only
 * one element is moving on a slide with many siblings.
 */
export const CanvasText = memo(CanvasTextInner);
