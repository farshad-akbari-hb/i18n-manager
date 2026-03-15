import { useRef, useEffect, useCallback, useState } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useTranslations, useUpdateTranslation } from '../../hooks/useTranslations';
import { useUIStore } from '../../stores/uiStore';
import { TranslationCell } from './TranslationCell';
import { SelectionToolbar } from './SelectionToolbar';
import { RejectionModal } from './RejectionModal';
import { SectionStats } from './SectionStats';
import { cn } from '../../lib/utils';
import type { UnifiedTranslationKey } from '../../lib/types';

interface ReviewTableProps {
  section: string | null;
  languages: string[];
}

export function ReviewTable({ section, languages }: ReviewTableProps) {
  const {
    searchQuery,
    statusFilter,
    focusedRowIndex,
    setFocusedRowIndex,
    moveFocus,
    editingCell,
    startEditing,
    stopEditing,
    selectedLang,
    selectedKeys,
    selectAllForLang,
    clearSelection,
    openRejectionModal,
  } = useUIStore();

  const [hoveredRowKey, setHoveredRowKey] = useState<string | null>(null);

  const { data, isLoading, error } = useTranslations({
    languages,
    section,
    status: statusFilter,
    search: searchQuery,
  });

  const parentRef = useRef<HTMLDivElement>(null);
  const updateMutation = useUpdateTranslation();

  const translations = data?.translations ?? [];

  const virtualizer = useVirtualizer({
    count: translations.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 100, // Increased for action bar
    overscan: 10,
  });

  // Get focused translation for keyboard actions
  const focusedTranslation = translations[focusedRowIndex];

  // Keyboard navigation and shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't handle if in input/textarea
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      switch (e.key) {
        case 'j':
        case 'ArrowDown':
          e.preventDefault();
          moveFocus('down');
          break;
        case 'k':
        case 'ArrowUp':
          e.preventDefault();
          moveFocus('up');
          break;
        case '/':
          e.preventDefault();
          document.querySelector<HTMLInputElement>('input[type="text"]')?.focus();
          break;
        case 'a':
          // Approve focused row (first language column)
          e.preventDefault();
          if (focusedTranslation && languages.length > 0) {
            const lang = languages[0];
            const langData = focusedTranslation.translations[lang];
            if (langData) {
              const newStatus = langData.reviewStatus === 'approved' ? 'draft' : 'approved';
              updateMutation.mutate({
                key: focusedTranslation.key,
                lang,
                updates: { status: newStatus },
              });
            }
          }
          break;
        case 'r':
          // Reject focused row (first language column)
          e.preventDefault();
          if (focusedTranslation && languages.length > 0) {
            openRejectionModal([focusedTranslation.key], languages[0]);
          }
          break;
        case 'e':
          // Edit focused row (first language column)
          e.preventDefault();
          if (focusedTranslation && languages.length > 0) {
            startEditing(focusedTranslation.key, languages[0]);
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [moveFocus, focusedTranslation, languages, updateMutation, openRejectionModal, startEditing]);

  // Scroll focused row into view
  useEffect(() => {
    if (focusedRowIndex >= 0 && focusedRowIndex < translations.length) {
      virtualizer.scrollToIndex(focusedRowIndex, { align: 'auto' });
    }
  }, [focusedRowIndex, translations.length, virtualizer]);

  const handleStatusChange = useCallback(
    (key: string, lang: string, status: 'draft' | 'approved' | 'rejected') => {
      updateMutation.mutate({ key, lang, updates: { status } });
    },
    [updateMutation]
  );

  const handleValueChange = useCallback(
    (key: string, lang: string, value: string) => {
      updateMutation.mutate({ key, lang, updates: { value, manualEdit: true } });
    },
    [updateMutation]
  );

  const handleReject = useCallback(
    (key: string, lang: string) => {
      openRejectionModal([key], lang);
    },
    [openRejectionModal]
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        Loading translations...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full text-destructive">
        Error loading translations: {error.message}
      </div>
    );
  }

  if (translations.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        No translations found. Make sure the server is running on port 4000.
      </div>
    );
  }

  // Helper to handle per-language select all toggle
  const handleLangSelectAll = (lang: string, isCurrentlySelected: boolean) => {
    if (isCurrentlySelected) {
      clearSelection();
    } else {
      const allKeys = translations.map((t) => t.key);
      selectAllForLang(lang, allKeys);
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Selection Toolbar */}
      {selectedLang && selectedKeys.size > 0 && <SelectionToolbar />}

      {/* Rejection Modal */}
      <RejectionModal />

      {/* Section Stats Bar */}
      <SectionStats languages={languages} />

      {/* Header */}
      <div className="flex border-b bg-muted/50 text-sm font-medium">
        <div className="w-[280px] shrink-0 px-3 py-2 border-r">Key</div>
        <div className="w-[280px] shrink-0 px-3 py-2 border-r">English (Source)</div>
        {languages.map((lang) => {
          const isLangSelected = selectedLang === lang;
          const allSelected = isLangSelected && selectedKeys.size === translations.length;

          return (
            <div
              key={lang}
              className="flex-1 min-w-[300px] px-3 py-2 border-r last:border-r-0 flex items-center gap-2"
            >
              <input
                type="checkbox"
                checked={allSelected}
                onChange={() => handleLangSelectAll(lang, isLangSelected)}
                className="h-4 w-4 rounded border-gray-300"
                title={`Select all for ${lang.toUpperCase()}`}
              />
              <span>{lang.toUpperCase()}</span>
            </div>
          );
        })}
      </div>

      {/* Scrollable Content */}
      <div ref={parentRef} className="flex-1 overflow-auto">
        <div
          style={{
            height: `${virtualizer.getTotalSize()}px`,
            width: '100%',
            position: 'relative',
          }}
        >
          {virtualizer.getVirtualItems().map((virtualRow) => {
            const translation = translations[virtualRow.index];
            const isFocused = virtualRow.index === focusedRowIndex;
            const isHovered = hoveredRowKey === translation.key;

            return (
              <div
                key={translation.key}
                data-index={virtualRow.index}
                onClick={() => setFocusedRowIndex(virtualRow.index)}
                onMouseEnter={() => setHoveredRowKey(translation.key)}
                onMouseLeave={() => setHoveredRowKey(null)}
                className={cn(
                  'absolute top-0 left-0 w-full flex border-b transition-colors',
                  isFocused && 'ring-2 ring-primary ring-inset',
                  'hover:bg-muted/30'
                )}
                style={{
                  minHeight: `${virtualRow.size}px`,
                  transform: `translateY(${virtualRow.start}px)`,
                }}
              >
                <TranslationRow
                  translation={translation}
                  languages={languages}
                  isHovered={isHovered}
                  onStatusChange={handleStatusChange}
                  onValueChange={handleValueChange}
                  onReject={handleReject}
                  editingCell={editingCell}
                  onStartEdit={startEditing}
                  onStopEdit={stopEditing}
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer */}
      <div className="border-t px-3 py-2 text-sm text-muted-foreground bg-muted/30 flex items-center justify-between">
        <div>
          {translations.length} keys
          {section && ` in "${section}"`}
          {searchQuery && ` matching "${searchQuery}"`}
        </div>
        <div className="text-xs">
          <kbd className="px-1 py-0.5 bg-muted rounded">j</kbd>/<kbd className="px-1 py-0.5 bg-muted rounded">k</kbd> navigate
          {' '}<kbd className="px-1 py-0.5 bg-muted rounded">a</kbd> approve
          {' '}<kbd className="px-1 py-0.5 bg-muted rounded">r</kbd> reject
          {' '}<kbd className="px-1 py-0.5 bg-muted rounded">e</kbd> edit
        </div>
      </div>
    </div>
  );
}

interface TranslationRowProps {
  translation: UnifiedTranslationKey;
  languages: string[];
  isHovered: boolean;
  onStatusChange: (key: string, lang: string, status: 'draft' | 'approved' | 'rejected') => void;
  onValueChange: (key: string, lang: string, value: string) => void;
  onReject: (key: string, lang: string) => void;
  editingCell: { key: string; lang: string } | null;
  onStartEdit: (key: string, lang: string) => void;
  onStopEdit: () => void;
}

function TranslationRow({
  translation,
  languages,
  isHovered,
  onStatusChange,
  onValueChange,
  onReject,
  editingCell,
  onStartEdit,
  onStopEdit,
}: TranslationRowProps) {
  return (
    <>
      {/* Key Column */}
      <div className="w-[280px] shrink-0 px-3 py-2 border-r overflow-hidden">
        <div className="text-sm font-mono truncate" title={translation.key}>
          {translation.key}
        </div>
        <div className="text-xs text-muted-foreground">{translation.section}</div>
      </div>

      {/* English Source Column */}
      <div className="w-[280px] shrink-0 px-3 py-2 border-r overflow-hidden">
        <TranslationCell
          value={translation.baselineValue}
          interpolations={translation.interpolations}
          isSource
        />
      </div>

      {/* Language Columns */}
      {languages.map((lang) => {
        const langData = translation.translations[lang];
        const isCellEditing =
          editingCell?.key === translation.key && editingCell?.lang === lang;
        return (
          <div
            key={lang}
            className="flex-1 min-w-[300px] px-3 py-2 border-r last:border-r-0 overflow-hidden"
          >
            {langData ? (
              <TranslationCell
                value={langData.value}
                interpolations={translation.interpolations}
                status={langData.reviewStatus}
                manualEdit={langData.manualEdit}
                rejectionNote={langData.rejectionNote}
                isEditing={isCellEditing}
                isHovered={isHovered}
                onStatusChange={(status) =>
                  onStatusChange(translation.key, lang, status)
                }
                onValueChange={(value) =>
                  onValueChange(translation.key, lang, value)
                }
                onStartEdit={() => onStartEdit(translation.key, lang)}
                onStopEdit={onStopEdit}
                onReject={() => onReject(translation.key, lang)}
              />
            ) : (
              <span className="text-sm text-muted-foreground italic">
                Not translated
              </span>
            )}
          </div>
        );
      })}
    </>
  );
}
