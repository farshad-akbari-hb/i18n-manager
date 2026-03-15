/**
 * GitPanel Component
 * Git status, branching, diff viewer, and commit functionality
 */

import { useState } from 'react';
import {
  GitBranch,
  GitCommit,
  GitPullRequest,
  ChevronDown,
  ChevronRight,
  Plus,
  Trash2,
  RefreshCw,
  FileText,
  AlertCircle,
  Check,
  X,
  Loader2,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import {
  useGitStatus,
  useGitBranches,
  useGitDiff,
  useCreateBranch,
  useSwitchBranch,
  useCommitChanges,
  useDiscardChanges,
} from '../../hooks/useGitStatus';
import { toast } from '../../stores/toastStore';

export function GitPanel() {
  const [isExpanded, setIsExpanded] = useState(true);
  const [showBranchForm, setShowBranchForm] = useState(false);
  const [newBranchName, setNewBranchName] = useState('');
  const [commitMessage, setCommitMessage] = useState('');
  const [showDiff, setShowDiff] = useState(false);

  const { data: status, isLoading: statusLoading, refetch: refetchStatus } = useGitStatus();
  const { data: branches } = useGitBranches();
  const { data: diff, isLoading: diffLoading } = useGitDiff(showDiff);

  const createBranchMutation = useCreateBranch();
  const switchBranchMutation = useSwitchBranch();
  const commitMutation = useCommitChanges();
  const discardMutation = useDiscardChanges();

  const handleCreateBranch = async () => {
    if (!newBranchName.trim()) return;
    try {
      await createBranchMutation.mutateAsync(newBranchName.trim());
      toast.success(`Branch "${newBranchName.trim()}" created`);
      setNewBranchName('');
      setShowBranchForm(false);
    } catch (error) {
      toast.error((error as Error).message || 'Failed to create branch');
    }
  };

  const handleSwitchBranch = async (name: string) => {
    try {
      await switchBranchMutation.mutateAsync(name);
      toast.success(`Switched to branch "${name}"`);
    } catch (error) {
      toast.error((error as Error).message || 'Failed to switch branch');
    }
  };

  const handleCommit = async () => {
    if (!commitMessage.trim()) return;
    try {
      await commitMutation.mutateAsync(commitMessage.trim());
      toast.success('Changes committed successfully');
      setCommitMessage('');
    } catch (error) {
      toast.error((error as Error).message || 'Failed to commit');
    }
  };

  const handleDiscard = async () => {
    if (!confirm('Are you sure you want to discard all translation changes?')) return;
    try {
      await discardMutation.mutateAsync();
      toast.success('Changes discarded');
    } catch (error) {
      toast.error((error as Error).message || 'Failed to discard changes');
    }
  };

  const hasChanges = status && !status.clean;
  const changedCount = status?.changedFiles.length ?? 0;

  return (
    <div className="bg-card rounded-lg border shadow-sm">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
          <GitBranch className="h-5 w-5 text-purple-500" />
          <span className="font-medium">Git</span>
          {status && (
            <span className="text-sm text-muted-foreground">
              {status.branch}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {statusLoading ? (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          ) : hasChanges ? (
            <span className="px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200 rounded-full">
              {changedCount} changed
            </span>
          ) : (
            <span className="px-2 py-0.5 text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200 rounded-full">
              Clean
            </span>
          )}
        </div>
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="border-t px-4 pb-4 space-y-4">
          {/* Branch Section */}
          <div className="pt-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-medium flex items-center gap-2">
                <GitBranch className="h-4 w-4" />
                Branch
              </h4>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => refetchStatus()}
                  className="p-1 hover:bg-muted rounded"
                  title="Refresh status"
                >
                  <RefreshCw className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
                <button
                  onClick={() => setShowBranchForm(!showBranchForm)}
                  className="p-1 hover:bg-muted rounded"
                  title="Create new branch"
                >
                  <Plus className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
              </div>
            </div>

            {/* Branch selector */}
            <div className="flex items-center gap-2">
              <select
                value={status?.branch ?? ''}
                onChange={(e) => handleSwitchBranch(e.target.value)}
                disabled={switchBranchMutation.isPending}
                className="flex-1 h-9 px-3 text-sm bg-background border rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {branches?.branches.map((branch) => (
                  <option key={branch} value={branch}>
                    {branch}
                  </option>
                ))}
              </select>
              {switchBranchMutation.isPending && (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
            </div>

            {/* Create branch form */}
            {showBranchForm && (
              <div className="mt-2 flex items-center gap-2">
                <input
                  type="text"
                  value={newBranchName}
                  onChange={(e) => setNewBranchName(e.target.value)}
                  placeholder="new-branch-name"
                  className="flex-1 h-8 px-3 text-sm bg-background border rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
                  onKeyDown={(e) => e.key === 'Enter' && handleCreateBranch()}
                />
                <button
                  onClick={handleCreateBranch}
                  disabled={!newBranchName.trim() || createBranchMutation.isPending}
                  className="h-8 px-3 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
                >
                  {createBranchMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    'Create'
                  )}
                </button>
                <button
                  onClick={() => {
                    setShowBranchForm(false);
                    setNewBranchName('');
                  }}
                  className="h-8 px-2 text-sm text-muted-foreground hover:bg-muted rounded-md"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}

            {/* Ahead/Behind indicator */}
            {status && (status.ahead > 0 || status.behind > 0) && (
              <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                {status.ahead > 0 && (
                  <span className="flex items-center gap-1">
                    <GitPullRequest className="h-3 w-3" />
                    {status.ahead} ahead
                  </span>
                )}
                {status.behind > 0 && (
                  <span className="flex items-center gap-1 text-amber-600">
                    <AlertCircle className="h-3 w-3" />
                    {status.behind} behind
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Changes Section */}
          {hasChanges && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Changes ({changedCount})
                </h4>
                <button
                  onClick={() => setShowDiff(!showDiff)}
                  className="text-xs text-primary hover:underline"
                >
                  {showDiff ? 'Hide diff' : 'Show diff'}
                </button>
              </div>

              {/* Changed files list */}
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {status.changedFiles.map((file) => (
                  <div
                    key={file.path}
                    className="flex items-center gap-2 text-xs"
                  >
                    <span
                      className={cn(
                        'w-1.5 h-1.5 rounded-full',
                        file.status === 'modified' && 'bg-amber-500',
                        file.status === 'added' && 'bg-green-500',
                        file.status === 'deleted' && 'bg-red-500',
                        file.status === 'untracked' && 'bg-blue-500'
                      )}
                    />
                    <span className="text-muted-foreground truncate">
                      {file.path}
                    </span>
                    {file.staged && (
                      <Check className="h-3 w-3 text-green-500" />
                    )}
                  </div>
                ))}
              </div>

              {/* Diff viewer */}
              {showDiff && (
                <div className="mt-2">
                  {diffLoading ? (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    </div>
                  ) : diff?.files.length ? (
                    <div className="border rounded-md overflow-hidden">
                      <div className="bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
                        {diff.summary}
                      </div>
                      <div className="max-h-64 overflow-y-auto">
                        {diff.files.map((file) => (
                          <div key={file.path} className="border-t">
                            <div className="bg-muted/30 px-3 py-1 text-xs font-mono flex items-center justify-between">
                              <span>{file.path}</span>
                              <span className="text-muted-foreground">
                                <span className="text-green-600">+{file.additions}</span>
                                {' / '}
                                <span className="text-red-600">-{file.deletions}</span>
                              </span>
                            </div>
                            <pre className="text-xs font-mono p-2 overflow-x-auto bg-muted/10">
                              {file.diff.slice(0, 2000)}
                              {file.diff.length > 2000 && '...'}
                            </pre>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-4 text-sm text-muted-foreground">
                      No diff available
                    </div>
                  )}
                </div>
              )}

              {/* Commit form */}
              <div className="space-y-2">
                <textarea
                  value={commitMessage}
                  onChange={(e) => setCommitMessage(e.target.value)}
                  placeholder="Commit message..."
                  rows={2}
                  className="w-full px-3 py-2 text-sm bg-background border rounded-md focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                />
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCommit}
                    disabled={!commitMessage.trim() || commitMutation.isPending}
                    className="flex-1 h-9 flex items-center justify-center gap-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 text-sm font-medium"
                  >
                    {commitMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <GitCommit className="h-4 w-4" />
                        Commit
                      </>
                    )}
                  </button>
                  <button
                    onClick={handleDiscard}
                    disabled={discardMutation.isPending}
                    className="h-9 px-4 flex items-center gap-2 text-destructive border border-destructive/30 rounded-md hover:bg-destructive/10 disabled:opacity-50 text-sm"
                  >
                    {discardMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <Trash2 className="h-4 w-4" />
                        Discard
                      </>
                    )}
                  </button>
                </div>
              </div>

            </div>
          )}

          {/* Clean state message */}
          {!hasChanges && !statusLoading && (
            <div className="py-4 text-center text-sm text-muted-foreground">
              <Check className="h-5 w-5 mx-auto mb-1 text-green-500" />
              Working tree clean
            </div>
          )}
        </div>
      )}
    </div>
  );
}
