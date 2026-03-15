/**
 * Jobs Router
 * Handles translation job execution and progress streaming via SSE
 */

import { Router, Request, Response, type IRouter } from 'express';
import {
  startTranslationJob,
  getJob,
  getActiveJob,
  cancelJob,
  getAllJobs,
  type JobProgress,
} from '../services/cli-runner.js';
import { config } from '../config.js';

const router: IRouter = Router();

/**
 * POST /api/jobs/start
 * Start a new translation job
 */
router.post('/start', (req: Request, res: Response) => {
  const { languages } = req.body;

  if (!languages || !Array.isArray(languages) || languages.length === 0) {
    return res.status(400).json({
      error: 'Invalid request: languages array is required',
    });
  }

  // Validate language codes
  const invalidLangs = languages.filter((l: string) => !config.supportedLanguages.includes(l));
  if (invalidLangs.length > 0) {
    return res.status(400).json({
      error: `Invalid language codes: ${invalidLangs.join(', ')}`,
      validLanguages: config.supportedLanguages,
    });
  }

  try {
    const job = startTranslationJob(languages);
    res.json({
      jobId: job.id,
      status: job.status,
      message: `Translation job started for: ${languages.join(', ')}`,
    });
  } catch (error) {
    res.status(409).json({
      error: (error as Error).message,
    });
  }
});

/**
 * GET /api/jobs/progress/:jobId
 * SSE endpoint for streaming job progress
 */
router.get('/progress/:jobId', (req: Request, res: Response) => {
  const { jobId } = req.params;
  const job = getJob(jobId);

  if (!job) {
    return res.status(404).json({ error: 'Job not found' });
  }

  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering

  // Send initial status
  res.write(`event: status\ndata: ${JSON.stringify(job.status)}\n\n`);

  // Progress handler
  const onProgress = (progress: JobProgress) => {
    res.write(`event: progress\ndata: ${JSON.stringify(progress)}\n\n`);
  };

  // Output handler (raw CLI output)
  const onOutput = (output: string) => {
    res.write(`event: output\ndata: ${JSON.stringify({ output })}\n\n`);
  };

  // Language change handler
  const onLanguage = (data: { name: string; code: string }) => {
    res.write(`event: language\ndata: ${JSON.stringify(data)}\n\n`);
  };

  // Completion handler
  const onComplete = () => {
    res.write(`event: complete\ndata: ${JSON.stringify(job.status)}\n\n`);
    cleanup();
    res.end();
  };

  // Error handler
  const onError = (error: string) => {
    res.write(`event: error\ndata: ${JSON.stringify({ error })}\n\n`);
    cleanup();
    res.end();
  };

  // Cancelled handler
  const onCancelled = () => {
    res.write(`event: cancelled\ndata: ${JSON.stringify(job.status)}\n\n`);
    cleanup();
    res.end();
  };

  // Register event handlers
  job.on('progress', onProgress);
  job.on('output', onOutput);
  job.on('language', onLanguage);
  job.on('complete', onComplete);
  job.on('error', onError);
  job.on('cancelled', onCancelled);

  // Cleanup function
  const cleanup = () => {
    job.off('progress', onProgress);
    job.off('output', onOutput);
    job.off('language', onLanguage);
    job.off('complete', onComplete);
    job.off('error', onError);
    job.off('cancelled', onCancelled);
  };

  // Handle client disconnect
  req.on('close', () => {
    cleanup();
  });

  // If job already completed, send final status and close
  if (job.status.status !== 'running') {
    const finalEvent = job.status.status === 'completed' ? 'complete' :
                       job.status.status === 'cancelled' ? 'cancelled' : 'error';
    res.write(`event: ${finalEvent}\ndata: ${JSON.stringify(job.status)}\n\n`);
    res.end();
  }
});

/**
 * POST /api/jobs/:jobId/cancel
 * Cancel a running job
 */
router.post('/:jobId/cancel', (req: Request, res: Response) => {
  const { jobId } = req.params;

  const cancelled = cancelJob(jobId);
  if (cancelled) {
    res.json({ success: true, message: 'Job cancellation requested' });
  } else {
    res.status(404).json({ error: 'Job not found or not running' });
  }
});

/**
 * GET /api/jobs/active
 * Get the currently active job (if any)
 */
router.get('/active', (_req: Request, res: Response) => {
  const job = getActiveJob();
  if (job) {
    res.json({ active: true, job: job.status });
  } else {
    res.json({ active: false, job: null });
  }
});

/**
 * GET /api/jobs/:jobId
 * Get job status by ID
 */
router.get('/:jobId', (req: Request, res: Response) => {
  const { jobId } = req.params;
  const job = getJob(jobId);

  if (!job) {
    return res.status(404).json({ error: 'Job not found' });
  }

  res.json(job.status);
});

/**
 * GET /api/jobs
 * Get all jobs
 */
router.get('/', (_req: Request, res: Response) => {
  res.json({ jobs: getAllJobs() });
});

export default router;
