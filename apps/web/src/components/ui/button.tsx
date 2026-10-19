import { ui } from '@/components/ui/styles';
import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva } from 'class-variance-authority';
import { cn } from '@/lib/utils';
export const buttonVariants = cva(ui.btn, {
  variants: {
    variant: {
      default: ui['btn-default'],
      secondary: ui['btn-secondary'],
      outline: ui['btn-outline'],
      ghost: ui['btn-ghost'],
      destructive: ui['btn-destructive'],
    },
    size: {
      default: '',
      sm: ui['btn-sm'],
      lg: ui['btn-lg'],
      icon: ui['btn-icon'],
    },
  },
  defaultVariants: { variant: 'default', size: 'default' },
});
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean;
  variant?: 'default' | 'secondary' | 'outline' | 'ghost' | 'destructive';
  size?: 'default' | 'sm' | 'icon' | 'lg';
}
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'default', asChild, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp className={cn(buttonVariants({ variant, size }), className)} ref={ref} {...props} />
    );
  },
);
Button.displayName = 'Button';
