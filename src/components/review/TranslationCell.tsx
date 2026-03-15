import { useState, useMemo, useEffect } from 'react';
import { Check, X, Link2, AlertCircle } from 'lucide-react';
import { ActionBar } from './ActionBar';

interface TranslationCellProps {
  value: string;
  interpolations: string[];
  isSource?: boolean;
  status?: 'draft' | 'approved' | 'rejected';
  manualEdit?: boolean;
  rejectionNote?: string;
  isEditing?: boolean;
  isHovered?: boolean;
  onStatusChange?: (status: 'draft' | 'approved' | 'rejected') => void;
  onValueChange?: (value: string) => void;
  onStartEdit?: () => void;
  onStopEdit?: () => void;
  onReject?: () => void;
}

export function TranslationCell({
  value,
  interpolations,
  isSource = false,
  status = 'draft',
  manualEdit,
  rejectionNote,
  isEditing = false,
  isHovered = false,
  onStatusChange,
  onValueChange,
  onStartEdit,
  onStopEdit,
  onReject,
}: TranslationCellProps) {
  const [editValue, setEditValue] = useState(value);

  // Reset edit value when entering edit mode or when value changes
  useEffect(() => {
    setEditValue(value);
  }, [value, isEditing]);

  const handleSave = () => {
    if (editValue !== value && onValueChange) {
      onValueChange(editValue);
    }
    onStopEdit?.();
  };

  const handleCancel = () => {
    setEditValue(value);
    onStopEdit?.();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSave();
    }
    if (e.key === 'Escape') {
      handleCancel();
    }
  };

  const handleApprove = () => {
    if (status === 'approved') {
      // Revert to draft
      onStatusChange?.('draft');
    } else {
      onStatusChange?.('approved');
    }
  };

  // Parse text and highlight interpolation variables safely
  const highlightedContent = useMemo(() => {
    return parseAndHighlight(value);
  }, [value]);

  // Editing mode
  if (isEditing) {
    return (
      <div className="space-y-1">
        <textarea
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={handleSave}
          onKeyDown={handleKeyDown}
          className="w-full p-2 text-sm border rounded resize-none bg-background focus:outline-none focus:ring-2 focus:ring-ring"
          rows={3}
          autoFocus
        />
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>Enter to save, Esc to cancel</span>
        </div>
      </div>
    );
  }

  // Source column (English) - simplified display
  if (isSource) {
    return (
      <div className="space-y-1">
        <div className="text-sm leading-relaxed">{highlightedContent}</div>
        {interpolations.length > 0 && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Link2 className="h-3 w-3" />
            {interpolations.join(', ')}
          </div>
        )}
      </div>
    );
  }

  // Target column with status and actions
  return (
    <div className="space-y-1">
      {/* Translation value */}
      <div className="text-sm leading-relaxed">{highlightedContent}</div>

      {/* Status badges row */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Status badge (read-only indicator) */}
        <StatusBadge status={status} />

        {/* Manual edit indicator */}
        {manualEdit && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
            Manual
          </span>
        )}

        {/* Interpolation indicator */}
        {interpolations.length > 0 && (
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <Link2 className="h-3 w-3" />
            {interpolations.length} var{interpolations.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Rejection note (if rejected) */}
      {status === 'rejected' && rejectionNote && (
        <div className="flex items-start gap-1 text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950 p-1.5 rounded">
          <AlertCircle className="h-3 w-3 mt-0.5 shrink-0" />
          <span className="line-clamp-2">{rejectionNote}</span>
        </div>
      )}

      {/* Action bar (visible on hover) */}
      {isHovered && (
        <ActionBar
          status={status}
          onApprove={handleApprove}
          onReject={() => onReject?.()}
          onEdit={() => onStartEdit?.()}
        />
      )}
    </div>
  );
}

/**
 * Status badge component
 */
function StatusBadge({ status }: { status: 'draft' | 'approved' | 'rejected' }) {
  switch (status) {
    case 'approved':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
          <Check className="h-3 w-3" />
          Approved
        </span>
      );
    case 'rejected':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
          <X className="h-3 w-3" />
          Rejected
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center px-2 py-0.5 text-xs rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
          Draft
        </span>
      );
  }
}

/**
 * Safely parse text and return React elements with highlighted interpolation variables.
 * All content is escaped - no innerHTML usage.
 */
function parseAndHighlight(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  const variablePattern = /\{\{([^}]+)\}\}/g;
  let lastIndex = 0;
  let match;
  let key = 0;

  while ((match = variablePattern.exec(text)) !== null) {
    // Add text before the match
    if (match.index > lastIndex) {
      parts.push(
        <span key={key++}>{text.slice(lastIndex, match.index)}</span>
      );
    }

    // Add the highlighted variable
    parts.push(
      <span
        key={key++}
        className="inline-flex items-center px-1 py-0.5 mx-0.5 rounded text-xs font-mono bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
      >
        {`{{${match[1]}}}`}
      </span>
    );

    lastIndex = variablePattern.lastIndex;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    parts.push(<span key={key++}>{text.slice(lastIndex)}</span>);
  }

  return parts;
}
