/**
 * ProgressFeed Component
 * Displays job progress with a progress bar and stats
 */

import { Check, AlertTriangle, Loader2 } from 'lucide-react';
import type { JobProgress } from '../../lib/api';
import { cn } from '../../lib/utils';

interface ProgressFeedProps {
  progress: JobProgress | null;
  isRunning: boolean;
}

export function ProgressFeed({ progress, isRunning }: ProgressFeedProps) {
  if (!progress) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>Initializing...</span>
      </div>
    );
  }

  const {
    totalKeys,
    translatedKeys,
    currentBatch,
    totalBatches,
    failedKeys,
    percent,
  } = progress;

  const isComplete = !isRunning && percent === 100;
  const hasFailed = failedKeys > 0;

  return (
    <div className="space-y-3">
      {/* Progress Bar */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium">
            {isComplete ? (
              <span className="flex items-center gap-1 text-green-600">
                <Check className="h-4 w-4" />
                Complete
              </span>
            ) : isRunning ? (
              <span className="flex items-center gap-1">
                <Loader2 className="h-4 w-4 animate-spin" />
                Translating...
              </span>
            ) : (
              'Progress'
            )}
          </span>
          <span className="text-muted-foreground">{percent}%</span>
        </div>

        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div
            className={cn(
              'h-full transition-all duration-300 ease-out',
              isComplete
                ? 'bg-green-500'
                : hasFailed
                ? 'bg-yellow-500'
                : 'bg-primary'
            )}
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 text-sm">
        <div className="space-y-1">
          <div className="text-muted-foreground">Keys</div>
          <div className="font-medium">
            {translatedKeys} / {totalKeys}
          </div>
        </div>

        <div className="space-y-1">
          <div className="text-muted-foreground">Batches</div>
          <div className="font-medium">
            {currentBatch} / {totalBatches}
          </div>
        </div>

        <div className="space-y-1">
          <div className="text-muted-foreground">Status</div>
          <div className="font-medium">
            {hasFailed ? (
              <span className="flex items-center gap-1 text-yellow-600">
                <AlertTriangle className="h-3 w-3" />
                {failedKeys} failed
              </span>
            ) : isComplete ? (
              <span className="text-green-600">Success</span>
            ) : isRunning ? (
              <span className="text-blue-600">Running</span>
            ) : (
              <span className="text-muted-foreground">Idle</span>
            )}
          </div>
        </div>
      </div>

      {/* ETA / Summary */}
      {isRunning && totalBatches > 0 && currentBatch > 0 && (
        <div className="text-xs text-muted-foreground">
          {totalBatches - currentBatch} batch{totalBatches - currentBatch !== 1 ? 'es' : ''} remaining
        </div>
      )}

      {isComplete && (
        <div className="text-sm text-green-600 bg-green-50 dark:bg-green-950 dark:text-green-400 p-2 rounded">
          Translation complete! {translatedKeys} keys translated.
          {hasFailed && ` (${failedKeys} failed)`}
        </div>
      )}
    </div>
  );
}
