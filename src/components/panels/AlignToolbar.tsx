import {
  AlignStartVertical,
  AlignCenterVertical,
  AlignEndVertical,
  AlignStartHorizontal,
  AlignCenterHorizontal,
  AlignEndHorizontal,
  AlignHorizontalDistributeCenter,
  AlignVerticalDistributeCenter,
  Frame,
} from 'lucide-react';
import { useEditor } from '../../store/editorStore';
import { cn } from '../../utils/cn';
import { Tooltip } from '../ui/Tooltip';

/**
 * Alignment & distribution tools. Shown in the right sidebar whenever at
 * least one element is selected. Aligning within the selection requires 2+,
 * distributing requires 3+, aligning to the slide works with any selection.
 */
export function AlignToolbar() {
  const selectedIds = useEditor((s) => s.selectedElementIds);
  const align = useEditor((s) => s.alignElements);
  const distribute = useEditor((s) => s.distributeElements);
  const alignToSlide = useEditor((s) => s.alignToSlide);

  const canAlignSelection = selectedIds.length >= 2;
  const canDistribute = selectedIds.length >= 3;

  const onAlign = (
    a: 'left' | 'center-h' | 'right' | 'top' | 'middle-v' | 'bottom',
    toSlide: boolean,
  ) => {
    if (toSlide || selectedIds.length === 1) alignToSlide(selectedIds, a);
    else align(selectedIds, a);
  };

  return (
    <div className="panel-section">
      <div className="panel-heading">
        Alignment
        <span className="rounded bg-white/[0.06] px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-ink-400">
          {selectedIds.length === 1 ? 'to slide' : 'to selection'}
        </span>
      </div>
      <div className="space-y-1.5">
        <Row>
          <Btn
            tooltip="Align left"
            icon={<AlignStartVertical size={13} strokeWidth={1.5} />}
            onClick={() => onAlign('left', false)}
          />
          <Btn
            tooltip="Center horizontally"
            icon={<AlignCenterVertical size={13} strokeWidth={1.5} />}
            onClick={() => onAlign('center-h', false)}
          />
          <Btn
            tooltip="Align right"
            icon={<AlignEndVertical size={13} strokeWidth={1.5} />}
            onClick={() => onAlign('right', false)}
          />
          <div className="mx-0.5 w-px bg-white/[0.06]" />
          <Btn
            tooltip="Align top"
            icon={<AlignStartHorizontal size={13} strokeWidth={1.5} />}
            onClick={() => onAlign('top', false)}
          />
          <Btn
            tooltip="Center vertically"
            icon={<AlignCenterHorizontal size={13} strokeWidth={1.5} />}
            onClick={() => onAlign('middle-v', false)}
          />
          <Btn
            tooltip="Align bottom"
            icon={<AlignEndHorizontal size={13} strokeWidth={1.5} />}
            onClick={() => onAlign('bottom', false)}
          />
        </Row>

        <Row>
          <Btn
            tooltip="Distribute horizontally"
            icon={<AlignHorizontalDistributeCenter size={13} strokeWidth={1.5} />}
            onClick={() => distribute(selectedIds, 'horizontal')}
            disabled={!canDistribute}
          />
          <Btn
            tooltip="Distribute vertically"
            icon={<AlignVerticalDistributeCenter size={13} strokeWidth={1.5} />}
            onClick={() => distribute(selectedIds, 'vertical')}
            disabled={!canDistribute}
          />
          <div className="mx-0.5 w-px bg-white/[0.06]" />
          <Btn
            tooltip="Center to slide"
            icon={<Frame size={13} strokeWidth={1.5} />}
            onClick={() => {
              alignToSlide(selectedIds, 'center-h');
              alignToSlide(selectedIds, 'middle-v');
            }}
          />
        </Row>
      </div>

      {canAlignSelection ? null : (
        <div className="mt-2 text-[10px] text-ink-500">
          Selecting two or more elements unlocks pairwise alignment. Three or
          more enable distribution.
        </div>
      )}
    </div>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return <div className="flex items-center gap-1 rounded-lg border hairline bg-white/[0.02] p-1">{children}</div>;
}

function Btn({
  tooltip,
  icon,
  onClick,
  disabled,
  active,
}: {
  tooltip: string;
  icon: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
}) {
  return (
    <Tooltip label={tooltip} side="top">
      <button
        onClick={onClick}
        disabled={disabled}
        className={cn('icon-btn h-7 w-7', active && 'icon-btn-active')}
      >
        {icon}
      </button>
    </Tooltip>
  );
}
