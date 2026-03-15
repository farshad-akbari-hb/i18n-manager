/**
 * JobPanel Component
 * Language picker, start button, and job status
 */

import { useState } from 'react';
import { Play, X, Loader2, Languages, ChevronDown, ChevronUp } from 'lucide-react';
import { useUIStore } from '../../stores/uiStore';
import { startJob, cancelJob } from '../../lib/api';
import { useJobProgress } from '../../hooks/useJobProgress';
import { ProgressFeed } from './ProgressFeed';
import { cn } from '../../lib/utils';
import { toast } from '../../stores/toastStore';

const AVAILABLE_LANGUAGES = [
  { code: 'de', name: 'German', flag: '🇩🇪' },
  { code: 'fa', name: 'Persian', flag: '🇮🇷' },
  { code: 'ar', name: 'Arabic', flag: '🇸🇦' },
  { code: 'tr', name: 'Turkish', flag: '🇹🇷' },
  { code: 'es', name: 'Spanish', flag: '🇪🇸' },
  { code: 'fr', name: 'French', flag: '🇫🇷' },
];

export function JobPanel() {
  const { job, setActiveJobId, openJobPanel, closeJobPanel } = useUIStore();
  const [selectedLangs, setSelectedLangs] = useState<string[]>(['de', 'fa']);
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Subscribe to job progress via SSE
  useJobProgress(job.activeJobId, {
    onComplete: () => {
      setError(null);
      toast.success('Translation job completed successfully');
    },
    onError: (err) => {
      setError(err);
      toast.error(err || 'Translation job failed');
    },
  });

  const handleToggleLang = (code: string) => {
    setSelectedLangs((prev) =>
      prev.includes(code)
        ? prev.filter((l) => l !== code)
        : [...prev, code]
    );
  };

  const handleStartJob = async () => {
    if (selectedLangs.length === 0) {
      toast.warning('Please select at least one language');
      return;
    }

    setIsStarting(true);
    setError(null);

    try {
      const response = await startJob(selectedLangs);
      setActiveJobId(response.jobId);
      openJobPanel();
      toast.info(`Translation job started for ${selectedLangs.length} language(s)`);
    } catch (err) {
      const message = (err as Error).message;
      setError(message);
      toast.error(message);
    } finally {
      setIsStarting(false);
    }
  };

  const handleCancelJob = async () => {
    if (!job.activeJobId) return;

    try {
      await cancelJob(job.activeJobId);
      toast.info('Translation job cancelled');
    } catch (err) {
      const message = (err as Error).message;
      setError(message);
      toast.error(message);
    }
  };

  const isRunning = !!job.activeJobId;
  const progress = job.progress;

  return (
    <div className="border rounded-lg bg-card">
      {/* Header */}
      <button
        onClick={() => (job.isJobPanelOpen ? closeJobPanel() : openJobPanel())}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Languages className="h-4 w-4" />
          <span className="font-medium text-sm">Translation Jobs</span>
          {isRunning && (
            <span className="flex items-center gap-1 px-2 py-0.5 text-xs rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
              <Loader2 className="h-3 w-3 animate-spin" />
              Running
            </span>
          )}
        </div>
        {job.isJobPanelOpen ? (
          <ChevronUp className="h-4 w-4" />
        ) : (
          <ChevronDown className="h-4 w-4" />
        )}
      </button>

      {/* Collapsible Content */}
      {job.isJobPanelOpen && (
        <div className="px-4 pb-4 space-y-4 border-t">
          {/* Error message */}
          {error && (
            <div className="mt-3 p-2 text-sm text-red-600 bg-red-50 dark:bg-red-950 dark:text-red-400 rounded">
              {error}
            </div>
          )}

          {/* Language Selection */}
          {!isRunning && (
            <div className="mt-3 space-y-2">
              <label className="text-sm font-medium text-muted-foreground">
                Select languages to translate:
              </label>
              <div className="flex flex-wrap gap-2">
                {AVAILABLE_LANGUAGES.map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => handleToggleLang(lang.code)}
                    className={cn(
                      'flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md border transition-colors',
                      selectedLangs.includes(lang.code)
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-background hover:bg-muted border-input'
                    )}
                  >
                    <span>{lang.flag}</span>
                    <span>{lang.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Start/Cancel Button */}
          <div className="flex items-center gap-2">
            {!isRunning ? (
              <button
                onClick={handleStartJob}
                disabled={isStarting || selectedLangs.length === 0}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isStarting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Starting...
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4" />
                    Start Translation
                  </>
                )}
              </button>
            ) : (
              <button
                onClick={handleCancelJob}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md bg-red-600 text-white hover:bg-red-700"
              >
                <X className="h-4 w-4" />
                Cancel Job
              </button>
            )}

            {selectedLangs.length > 0 && !isRunning && (
              <span className="text-sm text-muted-foreground">
                {selectedLangs.length} language{selectedLangs.length !== 1 ? 's' : ''} selected
              </span>
            )}
          </div>

          {/* Progress Feed */}
          {(isRunning || progress) && (
            <ProgressFeed progress={progress} isRunning={isRunning} />
          )}
        </div>
      )}
    </div>
  );
}
