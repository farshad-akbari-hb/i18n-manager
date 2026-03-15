/**
 * SSE Hook for Job Progress Streaming
 * Subscribes to job progress events via Server-Sent Events
 */

import { useEffect, useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getJobProgressUrl, type JobProgress, type JobStatus } from '../lib/api';
import { useUIStore } from '../stores/uiStore';

interface UseJobProgressOptions {
  onComplete?: (status: JobStatus) => void;
  onError?: (error: string) => void;
  onProgress?: (progress: JobProgress) => void;
}

/**
 * Hook to subscribe to job progress via SSE
 */
export function useJobProgress(
  jobId: string | null,
  options: UseJobProgressOptions = {}
) {
  const queryClient = useQueryClient();
  const eventSourceRef = useRef<EventSource | null>(null);
  const { setJobProgress, setActiveJobId, clearJob } = useUIStore();

  const { onComplete, onError, onProgress } = options;

  const cleanup = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!jobId) {
      cleanup();
      return;
    }

    // Create EventSource connection
    const url = getJobProgressUrl(jobId);
    const eventSource = new EventSource(url);
    eventSourceRef.current = eventSource;

    // Handle initial status
    eventSource.addEventListener('status', (event) => {
      try {
        const status: JobStatus = JSON.parse(event.data);
        setJobProgress(status.progress);
      } catch (e) {
        console.error('Failed to parse status event:', e);
      }
    });

    // Handle progress updates
    eventSource.addEventListener('progress', (event) => {
      try {
        const progress: JobProgress = JSON.parse(event.data);
        setJobProgress(progress);
        onProgress?.(progress);
      } catch (e) {
        console.error('Failed to parse progress event:', e);
      }
    });

    // Handle language change
    eventSource.addEventListener('language', (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log(`Translating to ${data.name} (${data.code})`);
      } catch (e) {
        console.error('Failed to parse language event:', e);
      }
    });

    // Handle raw output (for debugging/display)
    eventSource.addEventListener('output', (event) => {
      try {
        const { output } = JSON.parse(event.data);
        // Could be used for a detailed log view
        console.log('[CLI]', output.trim());
      } catch (e) {
        console.error('Failed to parse output event:', e);
      }
    });

    // Handle completion
    eventSource.addEventListener('complete', (event) => {
      try {
        const status: JobStatus = JSON.parse(event.data);
        setJobProgress(status.progress);
        onComplete?.(status);

        // Invalidate translations query to refresh data
        queryClient.invalidateQueries({ queryKey: ['translations'] });
        queryClient.invalidateQueries({ queryKey: ['sections'] });

        // Clear job after a delay to show completion state
        setTimeout(() => {
          clearJob();
        }, 3000);
      } catch (e) {
        console.error('Failed to parse complete event:', e);
      }

      cleanup();
    });

    // Handle error
    eventSource.addEventListener('error', (event) => {
      // Check if it's an SSE error event with data
      if (event instanceof MessageEvent && event.data) {
        try {
          const { error } = JSON.parse(event.data);
          onError?.(error);
        } catch (e) {
          console.error('Job error:', e);
        }
      } else {
        // Connection error
        console.error('SSE connection error');
        onError?.('Connection lost');
      }

      cleanup();
      clearJob();
    });

    // Handle cancellation
    eventSource.addEventListener('cancelled', (event) => {
      try {
        const status: JobStatus = JSON.parse(event.data);
        console.log('Job cancelled:', status);
      } catch (e) {
        console.error('Failed to parse cancelled event:', e);
      }

      cleanup();
      clearJob();
    });

    // Handle connection errors
    eventSource.onerror = () => {
      // EventSource will try to reconnect automatically
      // But if the job is done, we should close
      if (eventSource.readyState === EventSource.CLOSED) {
        cleanup();
      }
    };

    return cleanup;
  }, [jobId, cleanup, setJobProgress, setActiveJobId, clearJob, onComplete, onError, onProgress, queryClient]);

  return {
    disconnect: cleanup,
  };
}
