import { cn } from '@/lib/utils';
import type { DevLabel } from '@/types/development.types';
import { contrastText } from '@/lib/development';

export function LabelChip({
  label,
  small,
  active = true,
  onClick,
  className,
}: {
  label: DevLabel;
  small?: boolean;
  active?: boolean;
  onClick?: () => void;
  className?: string;
}) {
  const Tag = onClick ? 'button' : 'span';
  return (
    <Tag
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      title={label.name}
      style={{ backgroundColor: label.color, color: contrastText(label.color) }}
      className={cn(
        'inline-flex max-w-full items-center truncate rounded-md font-semibold leading-none transition-opacity',
        small ? 'h-2 min-w-8 px-0 text-[0px]' : 'px-2 py-1 text-[11px]',
        !active && 'opacity-30 hover:opacity-60',
        onClick && 'cursor-pointer',
        className,
      )}
    >
      {label.name}
    </Tag>
  );
}
