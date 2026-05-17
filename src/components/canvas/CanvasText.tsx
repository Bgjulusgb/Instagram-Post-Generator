import { useEffect, useRef } from 'react';
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

export function CanvasText({ element, onSelect, onChange, onDoubleClick, dragBoundFunc }: Props) {
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
        fill={element.fill}
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
