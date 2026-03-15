import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchTranslations,
  fetchSections,
  updateTranslation,
  bulkApprove,
  bulkReject,
  bulkApproveSection,
} from '../lib/api';

interface UseTranslationsParams {
  languages: string[];
  section: string | null;
  status: 'all' | 'draft' | 'approved' | 'rejected';
  search: string;
}

export function useTranslations(params: UseTranslationsParams) {
  return useQuery({
    queryKey: ['translations', params],
    queryFn: () => fetchTranslations(params),
  });
}

export function useSections(languages?: string[]) {
  return useQuery({
    queryKey: ['sections', languages],
    queryFn: () => fetchSections(languages),
  });
}

export function useUpdateTranslation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      key,
      lang,
      updates,
    }: {
      key: string;
      lang: string;
      updates: {
        value?: string;
        status?: 'draft' | 'approved' | 'rejected';
        rejectionNote?: string;
        manualEdit?: boolean;
      };
    }) => updateTranslation(key, lang, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['translations'] });
      queryClient.invalidateQueries({ queryKey: ['sections'] });
    },
  });
}

export function useBulkApprove() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ keys, lang }: { keys: string[]; lang: string }) =>
      bulkApprove(keys, lang),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['translations'] });
      queryClient.invalidateQueries({ queryKey: ['sections'] });
    },
  });
}

export function useBulkReject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      keys,
      lang,
      rejectionNote,
    }: {
      keys: string[];
      lang: string;
      rejectionNote: string;
    }) => bulkReject(keys, lang, rejectionNote),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['translations'] });
      queryClient.invalidateQueries({ queryKey: ['sections'] });
    },
  });
}

export function useBulkApproveSection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ section, lang }: { section: string; lang: string }) =>
      bulkApproveSection(section, lang),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['translations'] });
      queryClient.invalidateQueries({ queryKey: ['sections'] });
    },
  });
}
