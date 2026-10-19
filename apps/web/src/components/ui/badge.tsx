import { ui } from '@/components/ui/styles';
import { cn } from '@/lib/utils';
export const badgeVariants = {
  default: '',
  success: ui['badge-success'],
  green: ui['badge-green'],
  warning: ui['badge-warning'],
  orange: ui['badge-orange'],
  danger: ui['badge-danger'],
  red: ui['badge-red'],
  destructive: ui['badge-destructive'],
  blue: ui['badge-blue'],
  secondary: ui['badge-secondary'],
  gray: ui['badge-gray'],
  outline: ui['badge-outline'],
} as const;
export type BadgeVariant = keyof typeof badgeVariants;
export function Badge({
  className,
  variant = 'default',
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & {
  variant?: BadgeVariant;
}) {
  return <span className={cn(ui.badge, badgeVariants[variant], className)} {...props} />;
}
