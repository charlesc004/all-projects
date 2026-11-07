import { cn } from '@/lib/utils';
/** SVG width accepts continuous data without generating classes or inline CSS at runtime. */
export function DataBar({
  value,
  total,
  minPercent = 0,
  className,
}: {
  value: number;
  total: number;
  minPercent?: number;
  className?: string;
}) {
  const percent = Math.min(100, Math.max(minPercent, total > 0 ? (value / total) * 100 : 0));
  return (
    <svg
      aria-hidden="true"
      width={`${percent}%`}
      height="100%"
      className={cn('block shrink', className)}
    />
  );
}
