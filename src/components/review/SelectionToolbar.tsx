import { Check, X, XCircle } from 'lucide-react';
import { useUIStore } from '../../stores/uiStore';
import { useBulkApprove } from '../../hooks/useTranslations';

export function SelectionToolbar() {
  const { selectedLang, selectedKeys, clearSelection, openRejectionModal } = useUIStore();
  const bulkApproveMutation = useBulkApprove();

  const count = selectedKeys.size;
  if (count === 0 || !selectedLang) return null;

  const handleApproveAll = async () => {
    try {
      await bulkApproveMutation.mutateAsync({
        keys: Array.from(selectedKeys),
        lang: selectedLang,
      });
      clearSelection();
    } catch (error) {
      console.error('Failed to bulk approve:', error);
    }
  };

  const handleRejectAll = () => {
    openRejectionModal(Array.from(selectedKeys), selectedLang);
  };

  return (
    <div className="flex items-center gap-3 px-4 py-2 bg-primary/10 border-b">
      <span className="text-sm font-medium">
        {count} selected for <span className="font-bold">{selectedLang.toUpperCase()}</span>
      </span>

      <div className="flex items-center gap-2">
        <button
          onClick={handleApproveAll}
          disabled={bulkApproveMutation.isPending}
          className="inline-flex items-center gap-1 px-3 py-1 text-sm rounded bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
        >
          <Check className="h-4 w-4" />
          Approve All {selectedLang.toUpperCase()}
        </button>

        <button
          onClick={handleRejectAll}
          className="inline-flex items-center gap-1 px-3 py-1 text-sm rounded bg-red-600 text-white hover:bg-red-700"
        >
          <X className="h-4 w-4" />
          Reject All {selectedLang.toUpperCase()}
        </button>

        <button
          onClick={clearSelection}
          className="inline-flex items-center gap-1 px-3 py-1 text-sm rounded bg-muted text-muted-foreground hover:bg-muted/80"
        >
          <XCircle className="h-4 w-4" />
          Clear
        </button>
      </div>
    </div>
  );
}
