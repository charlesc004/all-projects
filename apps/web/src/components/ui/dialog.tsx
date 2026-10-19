'use client';
import { ui } from '@/components/ui/styles';
import * as React from 'react';
import * as Primitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
export const Dialog = Primitive.Root;
export const DialogTrigger = Primitive.Trigger;
export const DialogClose = Primitive.Close;
export const DialogContent = React.forwardRef<
  React.ElementRef<typeof Primitive.Content>,
  React.ComponentPropsWithoutRef<typeof Primitive.Content>
>(({ className, children, ...props }, ref) => (
  <Primitive.Portal>
    <Primitive.Overlay className={ui['dialog-overlay']} />
    <Primitive.Content ref={ref} className={cn(ui['dialog-content'], className)} {...props}>
      {children}
      <Primitive.Close className={ui['dialog-x']} aria-label="Close dialog">
        <X size={18} />
      </Primitive.Close>
    </Primitive.Content>
  </Primitive.Portal>
));
DialogContent.displayName = 'DialogContent';
export const DialogHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn(ui['dialog-header'], className)} {...props} />
);
export const DialogFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn(ui['dialog-footer'], className)} {...props} />
);
export const DialogTitle = React.forwardRef<
  React.ElementRef<typeof Primitive.Title>,
  React.ComponentPropsWithoutRef<typeof Primitive.Title>
>(({ className, ...props }, ref) => (
  <Primitive.Title ref={ref} className={cn(ui['dialog-title'], className)} {...props} />
));
DialogTitle.displayName = 'DialogTitle';
export const DialogDescription = React.forwardRef<
  React.ElementRef<typeof Primitive.Description>,
  React.ComponentPropsWithoutRef<typeof Primitive.Description>
>(({ className, ...props }, ref) => (
  <Primitive.Description ref={ref} className={cn(ui['dialog-description'], className)} {...props} />
));
DialogDescription.displayName = 'DialogDescription';
