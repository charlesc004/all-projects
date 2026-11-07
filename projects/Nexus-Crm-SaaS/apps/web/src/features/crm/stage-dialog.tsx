'use client';

import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { FieldsForm } from '@/components/forms/record-form';
import { CrmRecord, dealStages, FormField, label } from './types';
import { useCrmInvalidation } from './common';

export function StageDialog({
  deal,
  stage,
  onClose,
}: {
  deal?: CrmRecord;
  stage?: string;
  onClose: () => void;
}) {
  const invalidate = useCrmInvalidation();
  const mutation = useMutation({
    mutationFn: (values: Record<string, string>) =>
      api.patch(`/deals/${deal?.id}/stage`, {
        stage: values.stage || stage,
        ...((values.stage || stage) === 'LOST' ? { lostReason: values.lostReason } : {}),
      }),
    onSuccess: () => {
      void invalidate();
      toast.success('Deal stage updated');
      onClose();
    },
  });
  const formFields: FormField[] =
    stage === 'WON'
      ? []
      : stage === 'LOST'
        ? [
            {
              key: 'lostReason',
              label: 'Why was this deal lost?',
              type: 'textarea',
              required: true,
            },
          ]
        : [
            {
              key: 'stage',
              label: 'New stage',
              type: 'select',
              options: dealStages.filter((s) => s !== 'LOST' && s !== 'WON'),
              required: true,
            },
          ];
  return (
    <Dialog
      open={!!stage}
      onOpenChange={(open) => {
        if (!open && !mutation.isPending) {
          mutation.reset();
          onClose();
        }
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {stage === 'WON'
              ? 'Mark deal as won?'
              : stage === 'LOST'
                ? 'Mark deal as lost?'
                : 'Update deal stage'}
          </DialogTitle>
          <DialogDescription>
            {stage === 'WON' || stage === 'LOST'
              ? `“${deal?.title}” will be closed as ${label(stage).toLowerCase()}. Closed deals cannot be reopened.`
              : 'Move this opportunity to the next step in your sales process.'}
          </DialogDescription>
        </DialogHeader>
        {stage && (
          <FieldsForm
            key={`${deal?.id}-${stage}`}
            formFields={formFields}
            initial={{ stage: stage || '', lostReason: '' }}
            onSubmit={(values) => mutation.mutate(values)}
            pending={mutation.isPending}
            error={mutation.error?.message}
            submitLabel={
              stage === 'WON' || stage === 'LOST'
                ? `Confirm ${label(stage).toLowerCase()}`
                : 'Update stage'
            }
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
