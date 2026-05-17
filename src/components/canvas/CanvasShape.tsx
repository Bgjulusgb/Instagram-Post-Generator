import { Ellipse, Group, Line, Rect, RegularPolygon, Star } from 'react-konva';
import Konva from 'konva';
import type { ShapeElement } from '../../types';

interface Props {
  element: ShapeElement;
  onSelect: (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => void;
  onChange: (patch: Partial<ShapeElement>) => void;
  dragBoundFunc?: (id: string, width: number, height: number) => (pos: { x: number; y: number }) => { x: number; y: number };
}

export function CanvasShape({ element, onSelect, onChange, dragBoundFunc }: Props) {
  const commonProps = {
    fill: element.fill,
    stroke: element.stroke?.color,
    strokeWidth: element.stroke?.width ?? 0,
    listening: !element.locked,
    perfectDrawEnabled: false,
  };

  let shapeNode: JSX.Element | null = null;
  if (element.shape === 'rect') {
    shapeNode = (
      <Rect
        width={element.width}
        height={element.height}
        cornerRadius={element.cornerRadius}
        {...commonProps}
      />
    );
  } else if (element.shape === 'ellipse') {
    shapeNode = (
      <Ellipse
        x={element.width / 2}
        y={element.height / 2}
        radiusX={element.width / 2}
        radiusY={element.height / 2}
        {...commonProps}
      />
    );
  } else if (element.shape === 'triangle') {
    shapeNode = (
      <RegularPolygon
        x={element.width / 2}
        y={element.height / 2}
        sides={3}
        radius={Math.min(element.width, element.height) / 2}
        {...commonProps}
      />
    );
  } else if (element.shape === 'star') {
    shapeNode = (
      <Star
        x={element.width / 2}
        y={element.height / 2}
        numPoints={5}
        innerRadius={Math.min(element.width, element.height) / 4}
        outerRadius={Math.min(element.width, element.height) / 2}
        {...commonProps}
      />
    );
  } else if (element.shape === 'line') {
    shapeNode = (
      <Line
        points={[0, element.height / 2, element.width, element.height / 2]}
        stroke={element.fill}
        strokeWidth={Math.max(2, element.height)}
        lineCap="round"
        listening={!element.locked}
      />
    );
  }

  return (
    <Group
      id={element.id}
      x={element.x}
      y={element.y}
      width={element.width}
      height={element.height}
      rotation={element.rotation}
      opacity={element.opacity}
      visible={element.visible}
      listening={!element.locked}
      draggable={!element.locked}
      globalCompositeOperation={element.blendMode === 'normal' ? undefined : (element.blendMode as any)}
      onMouseDown={onSelect}
      onTouchStart={onSelect}
      dragBoundFunc={dragBoundFunc?.(element.id, element.width, element.height)}
      onDragEnd={(e) => onChange({ x: e.target.x(), y: e.target.y() })}
      shadowColor={element.shadow?.color}
      shadowBlur={element.shadow?.blur}
      shadowOffsetX={element.shadow?.offsetX}
      shadowOffsetY={element.shadow?.offsetY}
      shadowOpacity={element.shadow?.opacity}
    >
      {shapeNode}
    </Group>
  );
}
