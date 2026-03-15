import { useState, useEffect, useRef } from 'react';
import { X, AlertTriangle } from 'lucide-react';
import { useUIStore } from '../../stores/uiStore';
import { useBulkReject, useUpdateTranslation } from '../../hooks/useTranslations';

export function RejectionModal() {
  const { rejectionModal, closeRejectionModal, clearSelection } = useUIStore();
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const bulkRejectMutation = useBulkReject();
  const updateMutation = useUpdateTranslation();

  // Focus textarea when modal opens
  useEffect(() => {
    if (rejectionModal.isOpen) {
      setNote('');
      setTimeout(() => textareaRef.current?.focus(), 100);
    }
  }, [rejectionModal.isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && rejectionModal.isOpen) {
        closeRejectionModal();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [rejectionModal.isOpen, closeRejectionModal]);

  if (!rejectionModal.isOpen) return null;

  const handleSubmit = async () => {
    if (!note.trim()) return;

    setIsSubmitting(true);
    try {
      if (rejectionModal.keys.length === 1) {
        // Single key rejection
        await updateMutation.mutateAsync({
          key: rejectionModal.keys[0],
          lang: rejectionModal.lang,
          updates: {
            status: 'rejected',
            rejectionNote: note.trim(),
          },
        });
      } else {
        // Bulk rejection
        await bulkRejectMutation.mutateAsync({
          keys: rejectionModal.keys,
          lang: rejectionModal.lang,
          rejectionNote: note.trim(),
        });
        clearSelection();
      }
      closeRejectionModal();
    } catch (error) {
      console.error('Failed to reject:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      closeRejectionModal();
    }
  };

  const keyCount = rejectionModal.keys.length;
  const isSingle = keyCount === 1;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={handleBackdropClick}
    >
      <div className="bg-card border rounded-lg shadow-lg w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <div className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            <h2 className="font-semibold">
              Reject {isSingle ? 'Translation' : `${keyCount} Translations`}
            </h2>
          </div>
          <button
            onClick={closeRejectionModal}
            className="p-1 hover:bg-muted rounded"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 space-y-4">
          <p className="text-sm text-muted-foreground">
            {isSingle
              ? 'Provide a note explaining why this translation needs to be redone. This note will be used as context when the CLI re-translates this key.'
              : `Provide a note for all ${keyCount} selected translations. This note will be used as context when the CLI re-translates these keys.`}
          </p>

          {isSingle && (
            <div className="text-sm">
              <span className="text-muted-foreground">Key: </span>
              <code className="bg-muted px-1 rounded">{rejectionModal.keys[0]}</code>
            </div>
          )}

          <div className="text-sm">
            <span className="text-muted-foreground">Language: </span>
            <span className="font-medium">{rejectionModal.lang.toUpperCase()}</span>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Rejection Note <span className="text-destructive">*</span>
            </label>
            <textarea
              ref={textareaRef}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g., Translation is too literal, should be more natural..."
              className="w-full p-2 text-sm border rounded resize-none bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              rows={4}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-4 py-3 border-t bg-muted/30">
          <button
            onClick={closeRejectionModal}
            className="px-3 py-1.5 text-sm rounded hover:bg-muted"
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!note.trim() || isSubmitting}
            className="px-3 py-1.5 text-sm rounded bg-destructive text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Rejecting...' : 'Reject'}
          </button>
        </div>
      </div>
    </div>
  );
}
