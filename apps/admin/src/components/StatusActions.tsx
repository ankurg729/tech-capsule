import type { ContentStatus } from '@techcapsule/contracts';
import type { StatusAction } from '@/lib/queries';
import { Button } from './ui';

const ACTIONS: Record<
  ContentStatus,
  { action: StatusAction; label: string; variant: 'primary' | 'secondary' | 'danger' }[]
> = {
  draft: [
    { action: 'publish', label: 'Publish', variant: 'primary' },
    { action: 'archive', label: 'Archive', variant: 'danger' },
  ],
  published: [
    { action: 'unpublish', label: 'Unpublish (back to draft)', variant: 'secondary' },
    { action: 'archive', label: 'Archive', variant: 'danger' },
  ],
  archived: [
    { action: 'unpublish', label: 'Restore as draft', variant: 'secondary' },
    { action: 'publish', label: 'Publish', variant: 'primary' },
  ],
};

const CONFIRM: Partial<Record<StatusAction, string>> = {
  archive: 'Archive this item? It will be hidden from learners.',
  unpublish: 'Move this item back to draft? Learners will no longer see it.',
};

export function StatusActions({
  status,
  onAction,
  pending,
  disabled,
}: {
  status: ContentStatus;
  onAction: (action: StatusAction) => void;
  pending: StatusAction | null;
  disabled?: boolean;
}) {
  return (
    <div className="row gap-sm">
      {ACTIONS[status].map(({ action, label, variant }) => (
        <Button
          key={action}
          variant={variant}
          busy={pending === action}
          disabled={disabled || (pending !== null && pending !== action)}
          onClick={() => {
            const question = status === 'draft' && action === 'unpublish' ? null : CONFIRM[action];
            if (question && !window.confirm(question)) return;
            onAction(action);
          }}
        >
          {label}
        </Button>
      ))}
    </div>
  );
}
