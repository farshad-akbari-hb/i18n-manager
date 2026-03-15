/**
 * useGitStatus Hook
 * TanStack Query hook for fetching and managing Git status
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getGitStatus,
  getGitBranches,
  getGitDiff,
  createBranch,
  switchBranch,
  commitChanges,
  discardChanges,
  type GitStatus,
  type GitBranches,
  type GitDiff,
} from '../lib/api';

// Query keys
export const gitKeys = {
  all: ['git'] as const,
  status: () => [...gitKeys.all, 'status'] as const,
  branches: () => [...gitKeys.all, 'branches'] as const,
  diff: () => [...gitKeys.all, 'diff'] as const,
};

/**
 * Hook to fetch current git status
 */
export function useGitStatus() {
  return useQuery<GitStatus, Error>({
    queryKey: gitKeys.status(),
    queryFn: getGitStatus,
    refetchInterval: 10000, // Refetch every 10 seconds
    staleTime: 5000, // Consider data stale after 5 seconds
  });
}

/**
 * Hook to fetch git branches
 */
export function useGitBranches() {
  return useQuery<GitBranches, Error>({
    queryKey: gitKeys.branches(),
    queryFn: getGitBranches,
    staleTime: 30000, // Branches change less frequently
  });
}

/**
 * Hook to fetch git diff of translation files
 */
export function useGitDiff(enabled: boolean = true) {
  return useQuery<GitDiff, Error>({
    queryKey: gitKeys.diff(),
    queryFn: getGitDiff,
    enabled,
    staleTime: 5000,
  });
}

/**
 * Hook to create a new branch
 */
export function useCreateBranch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (name: string) => createBranch(name),
    onSuccess: () => {
      // Invalidate both status and branches queries
      queryClient.invalidateQueries({ queryKey: gitKeys.status() });
      queryClient.invalidateQueries({ queryKey: gitKeys.branches() });
    },
  });
}

/**
 * Hook to switch to an existing branch
 */
export function useSwitchBranch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (name: string) => switchBranch(name),
    onSuccess: () => {
      // Invalidate all git queries when switching branches
      queryClient.invalidateQueries({ queryKey: gitKeys.all });
    },
  });
}

/**
 * Hook to commit changes
 */
export function useCommitChanges() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (message: string) => commitChanges(message),
    onSuccess: () => {
      // Invalidate status and diff queries after commit
      queryClient.invalidateQueries({ queryKey: gitKeys.status() });
      queryClient.invalidateQueries({ queryKey: gitKeys.diff() });
    },
  });
}

/**
 * Hook to discard changes
 */
export function useDiscardChanges() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: discardChanges,
    onSuccess: () => {
      // Invalidate status and diff queries after discard
      queryClient.invalidateQueries({ queryKey: gitKeys.status() });
      queryClient.invalidateQueries({ queryKey: gitKeys.diff() });
      // Also invalidate translations since they might have changed
      queryClient.invalidateQueries({ queryKey: ['translations'] });
    },
  });
}
