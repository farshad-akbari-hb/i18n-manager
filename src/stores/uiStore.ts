import { create } from 'zustand';
import type { JobProgress } from '../lib/api';

interface EditingCell {
  key: string;
  lang: string;
}

interface RejectionModal {
  isOpen: boolean;
  keys: string[];
  lang: string;
}

interface JobState {
  activeJobId: string | null;
  progress: JobProgress | null;
  isJobPanelOpen: boolean;
}

interface UIState {
  // Section & Language
  selectedSection: string | null;
  selectedLanguages: string[];

  // Filtering
  searchQuery: string;
  statusFilter: 'all' | 'draft' | 'approved' | 'rejected';

  // Per-language selection (for bulk actions)
  selectedLang: string | null;
  selectedKeys: Set<string>;

  // Row focus (for keyboard navigation)
  focusedRowIndex: number;
  focusedRowKey: string | null;

  // Inline editing
  editingCell: EditingCell | null;

  // Rejection modal
  rejectionModal: RejectionModal;

  // Job state
  job: JobState;

  // Actions - Section & Language
  setSelectedSection: (section: string | null) => void;
  setSelectedLanguages: (languages: string[]) => void;

  // Actions - Filtering
  setSearchQuery: (query: string) => void;
  setStatusFilter: (status: 'all' | 'draft' | 'approved' | 'rejected') => void;

  // Actions - Per-language selection
  selectAllForLang: (lang: string, keys: string[]) => void;
  clearSelection: () => void;

  // Actions - Row focus
  setFocusedRowIndex: (index: number) => void;
  setFocusedRowKey: (key: string | null) => void;
  moveFocus: (direction: 'up' | 'down') => void;

  // Actions - Inline editing
  startEditing: (key: string, lang: string) => void;
  stopEditing: () => void;

  // Actions - Rejection modal
  openRejectionModal: (keys: string[], lang: string) => void;
  closeRejectionModal: () => void;

  // Actions - Job
  setActiveJobId: (jobId: string | null) => void;
  setJobProgress: (progress: JobProgress | null) => void;
  toggleJobPanel: () => void;
  openJobPanel: () => void;
  closeJobPanel: () => void;
  clearJob: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  // Initial state
  selectedSection: null,
  selectedLanguages: ['de', 'fa'],
  searchQuery: '',
  statusFilter: 'all',
  selectedLang: null,
  selectedKeys: new Set(),
  focusedRowIndex: 0,
  focusedRowKey: null,
  editingCell: null,
  rejectionModal: {
    isOpen: false,
    keys: [],
    lang: '',
  },
  job: {
    activeJobId: null,
    progress: null,
    isJobPanelOpen: false,
  },

  // Section & Language actions
  setSelectedSection: (section) => set({ selectedSection: section }),
  setSelectedLanguages: (languages) => set({ selectedLanguages: languages }),

  // Filter actions
  setSearchQuery: (query) => set({ searchQuery: query }),
  setStatusFilter: (status) => set({ statusFilter: status }),

  // Per-language selection actions
  selectAllForLang: (lang, keys) =>
    set({ selectedLang: lang, selectedKeys: new Set(keys) }),
  clearSelection: () => set({ selectedLang: null, selectedKeys: new Set() }),

  // Focus actions
  setFocusedRowIndex: (index) => set({ focusedRowIndex: index }),
  setFocusedRowKey: (key) => set({ focusedRowKey: key }),

  moveFocus: (direction) =>
    set((state) => ({
      focusedRowIndex:
        direction === 'up'
          ? Math.max(0, state.focusedRowIndex - 1)
          : state.focusedRowIndex + 1,
    })),

  // Editing actions
  startEditing: (key, lang) => set({ editingCell: { key, lang } }),
  stopEditing: () => set({ editingCell: null }),

  // Rejection modal actions
  openRejectionModal: (keys, lang) =>
    set({
      rejectionModal: {
        isOpen: true,
        keys,
        lang,
      },
    }),
  closeRejectionModal: () =>
    set({
      rejectionModal: {
        isOpen: false,
        keys: [],
        lang: '',
      },
    }),

  // Job actions
  setActiveJobId: (jobId) =>
    set((state) => ({
      job: { ...state.job, activeJobId: jobId },
    })),

  setJobProgress: (progress) =>
    set((state) => ({
      job: { ...state.job, progress },
    })),

  toggleJobPanel: () =>
    set((state) => ({
      job: { ...state.job, isJobPanelOpen: !state.job.isJobPanelOpen },
    })),

  openJobPanel: () =>
    set((state) => ({
      job: { ...state.job, isJobPanelOpen: true },
    })),

  closeJobPanel: () =>
    set((state) => ({
      job: { ...state.job, isJobPanelOpen: false },
    })),

  clearJob: () =>
    set((state) => ({
      job: { ...state.job, activeJobId: null, progress: null },
    })),
}));
