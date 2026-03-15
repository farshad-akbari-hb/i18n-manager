import type {
  TranslationsResponse,
  SectionsResponse,
  UnifiedTranslationKey,
} from './types';

const API_BASE = '/api';

interface FetchTranslationsParams {
  languages?: string[];
  section?: string | null;
  status?: 'all' | 'draft' | 'approved' | 'rejected';
  search?: string;
}

export async function fetchTranslations(
  params: FetchTranslationsParams
): Promise<TranslationsResponse> {
  const searchParams = new URLSearchParams();

  if (params.languages?.length) {
    searchParams.set('lang', params.languages.join(','));
  }
  if (params.section) {
    searchParams.set('section', params.section);
  }
  if (params.status && params.status !== 'all') {
    searchParams.set('status', params.status);
  }
  if (params.search) {
    searchParams.set('search', params.search);
  }

  const response = await fetch(
    `${API_BASE}/translations?${searchParams.toString()}`
  );
  if (!response.ok) {
    throw new Error(`Failed to fetch translations: ${response.statusText}`);
  }
  return response.json();
}

export async function fetchSections(languages?: string[]): Promise<SectionsResponse> {
  const searchParams = new URLSearchParams();
  if (languages?.length) {
    searchParams.set('lang', languages.join(','));
  }
  const url = searchParams.toString()
    ? `${API_BASE}/sections?${searchParams.toString()}`
    : `${API_BASE}/sections`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch sections: ${response.statusText}`);
  }
  return response.json();
}

export async function updateTranslation(
  key: string,
  lang: string,
  updates: {
    value?: string;
    status?: 'draft' | 'approved' | 'rejected';
    rejectionNote?: string;
    manualEdit?: boolean;
  }
): Promise<UnifiedTranslationKey> {
  const encodedKey = encodeURIComponent(key);
  const response = await fetch(`${API_BASE}/translations/${encodedKey}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ lang, ...updates }),
  });
  if (!response.ok) {
    throw new Error(`Failed to update translation: ${response.statusText}`);
  }
  return response.json();
}

export async function bulkApprove(
  keys: string[],
  lang: string
): Promise<{ updated: number }> {
  const response = await fetch(`${API_BASE}/translations/bulk-approve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ keys, lang }),
  });
  if (!response.ok) {
    throw new Error(`Failed to bulk approve: ${response.statusText}`);
  }
  return response.json();
}

export async function bulkReject(
  keys: string[],
  lang: string,
  rejectionNote: string
): Promise<{ updated: number }> {
  const response = await fetch(`${API_BASE}/translations/bulk-reject`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ keys, lang, rejectionNote }),
  });
  if (!response.ok) {
    throw new Error(`Failed to bulk reject: ${response.statusText}`);
  }
  return response.json();
}

export async function bulkApproveSection(
  section: string,
  lang: string
): Promise<{ updated: number; total: number }> {
  const response = await fetch(`${API_BASE}/translations/bulk-approve-section`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ section, lang }),
  });
  if (!response.ok) {
    throw new Error(`Failed to bulk approve section: ${response.statusText}`);
  }
  return response.json();
}

// ============================================================================
// Job API Functions
// ============================================================================

export interface JobProgress {
  totalKeys: number;
  translatedKeys: number;
  currentBatch: number;
  totalBatches: number;
  failedKeys: number;
  percent: number;
}

export interface JobStatus {
  id: string;
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  languages: string[];
  startedAt: number;
  completedAt?: number;
  progress: JobProgress;
  error?: string;
}

export interface StartJobResponse {
  jobId: string;
  status: JobStatus;
  message: string;
}

export interface ActiveJobResponse {
  active: boolean;
  job: JobStatus | null;
}

/**
 * Start a new translation job
 */
export async function startJob(languages: string[]): Promise<StartJobResponse> {
  const response = await fetch(`${API_BASE}/jobs/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ languages }),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || `Failed to start job: ${response.statusText}`);
  }
  return response.json();
}

/**
 * Cancel a running job
 */
export async function cancelJob(jobId: string): Promise<{ success: boolean }> {
  const response = await fetch(`${API_BASE}/jobs/${jobId}/cancel`, {
    method: 'POST',
  });
  if (!response.ok) {
    throw new Error(`Failed to cancel job: ${response.statusText}`);
  }
  return response.json();
}

/**
 * Get the currently active job
 */
export async function getActiveJob(): Promise<ActiveJobResponse> {
  const response = await fetch(`${API_BASE}/jobs/active`);
  if (!response.ok) {
    throw new Error(`Failed to get active job: ${response.statusText}`);
  }
  return response.json();
}

/**
 * Get job status by ID
 */
export async function getJobStatus(jobId: string): Promise<JobStatus> {
  const response = await fetch(`${API_BASE}/jobs/${jobId}`);
  if (!response.ok) {
    throw new Error(`Failed to get job status: ${response.statusText}`);
  }
  return response.json();
}

/**
 * Get the SSE URL for job progress streaming
 */
export function getJobProgressUrl(jobId: string): string {
  return `${API_BASE}/jobs/progress/${jobId}`;
}

// ============================================================================
// Git API Functions
// ============================================================================

export interface GitStatus {
  branch: string;
  clean: boolean;
  changedFiles: ChangedFile[];
  ahead: number;
  behind: number;
}

export interface ChangedFile {
  path: string;
  status: 'modified' | 'added' | 'deleted' | 'renamed' | 'untracked';
  staged: boolean;
}

export interface GitDiff {
  files: DiffFile[];
  summary: string;
}

export interface DiffFile {
  path: string;
  additions: number;
  deletions: number;
  diff: string;
}

export interface GitBranches {
  current: string;
  branches: string[];
}

/**
 * Get current git status
 */
export async function getGitStatus(): Promise<GitStatus> {
  const response = await fetch(`${API_BASE}/git/status`);
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || `Failed to get git status: ${response.statusText}`);
  }
  return response.json();
}

/**
 * Get list of branches
 */
export async function getGitBranches(): Promise<GitBranches> {
  const response = await fetch(`${API_BASE}/git/branches`);
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || `Failed to get branches: ${response.statusText}`);
  }
  return response.json();
}

/**
 * Create a new branch
 */
export async function createBranch(name: string): Promise<{ success: boolean; branch: string }> {
  const response = await fetch(`${API_BASE}/git/branch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || `Failed to create branch: ${response.statusText}`);
  }
  return response.json();
}

/**
 * Switch to a branch
 */
export async function switchBranch(name: string): Promise<{ success: boolean; branch: string }> {
  const response = await fetch(`${API_BASE}/git/switch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || `Failed to switch branch: ${response.statusText}`);
  }
  return response.json();
}

/**
 * Get diff of translation files
 */
export async function getGitDiff(): Promise<GitDiff> {
  const response = await fetch(`${API_BASE}/git/diff`);
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || `Failed to get diff: ${response.statusText}`);
  }
  return response.json();
}

/**
 * Commit translation changes
 */
export async function commitChanges(message: string): Promise<{ success: boolean; hash: string }> {
  const response = await fetch(`${API_BASE}/git/commit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message }),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || `Failed to commit: ${response.statusText}`);
  }
  return response.json();
}

/**
 * Discard changes to translation files
 */
export async function discardChanges(): Promise<{ success: boolean }> {
  const response = await fetch(`${API_BASE}/git/discard`, {
    method: 'POST',
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || `Failed to discard changes: ${response.statusText}`);
  }
  return response.json();
}
