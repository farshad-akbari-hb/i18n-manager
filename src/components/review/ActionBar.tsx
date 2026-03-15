import { Check, X, Pencil } from 'lucide-react';

interface ActionBarProps {
  onApprove: () => void;
  onReject: () => void;
  onEdit: () => void;
  status: 'draft' | 'approved' | 'rejected';
}

export function ActionBar({ onApprove, onReject, onEdit, status }: ActionBarProps) {
  return (
    <div className="flex items-center gap-1 mt-1">
      {/* Approve button - show if not already approved */}
      {status !== 'approved' && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onApprove();
          }}
          className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-900 dark:text-green-200 dark:hover:bg-green-800"
          title="Approve (a)"
        >
          <Check className="h-3 w-3" />
          <span>Approve</span>
          <kbd className="ml-1 text-[10px] opacity-60">a</kbd>
        </button>
      )}

      {/* Revert to Draft button - show if approved */}
      {status === 'approved' && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onApprove(); // This will be handled to revert to draft
          }}
          className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded bg-muted text-muted-foreground hover:bg-muted/80"
          title="Revert to Draft"
        >
          <span>Revert</span>
        </button>
      )}

      {/* Reject button - show if not already rejected */}
      {status !== 'rejected' && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onReject();
          }}
          className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded bg-red-100 text-red-800 hover:bg-red-200 dark:bg-red-900 dark:text-red-200 dark:hover:bg-red-800"
          title="Reject (r)"
        >
          <X className="h-3 w-3" />
          <span>Reject</span>
          <kbd className="ml-1 text-[10px] opacity-60">r</kbd>
        </button>
      )}

      {/* Edit button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onEdit();
        }}
        className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded bg-muted text-muted-foreground hover:bg-muted/80"
        title="Edit (e)"
      >
        <Pencil className="h-3 w-3" />
        <span>Edit</span>
        <kbd className="ml-1 text-[10px] opacity-60">e</kbd>
      </button>
    </div>
  );
}
