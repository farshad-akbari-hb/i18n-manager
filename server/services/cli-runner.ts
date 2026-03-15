/**
 * CLI Runner Service
 * Spawns the i18n-translator CLI and streams progress via EventEmitter
 */

import { spawn, ChildProcess } from 'child_process';
import { EventEmitter } from 'events';
import { config } from '../config.js';

export interface JobProgress {
  totalKeys: number;
  translatedKeys: number;
  currentBatch: number;
  totalBatches: number;
  failedKeys: number;
  percent: number;
}

export interface TranslationEvent {
  key: string;
  value: string;
  lang: string;
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

export class TranslationJob extends EventEmitter {
  readonly id: string;
  readonly languages: string[];
  readonly startedAt: number;

  private process: ChildProcess | null = null;
  private _status: 'running' | 'completed' | 'failed' | 'cancelled' = 'running';
  private _progress: JobProgress = {
    totalKeys: 0,
    translatedKeys: 0,
    currentBatch: 0,
    totalBatches: 0,
    failedKeys: 0,
    percent: 0,
  };
  private _error?: string;
  private completedAt?: number;
  private outputBuffer = '';

  constructor(id: string, languages: string[]) {
    super();
    this.id = id;
    this.languages = languages;
    this.startedAt = Date.now();
  }

  get status(): JobStatus {
    return {
      id: this.id,
      status: this._status,
      languages: this.languages,
      startedAt: this.startedAt,
      completedAt: this.completedAt,
      progress: this._progress,
      error: this._error,
    };
  }

  start(): void {
    console.log(`[Job ${this.id}] Starting translation for: ${this.languages.join(', ')}`);
    console.log(`[Job ${this.id}] CLI path: ${config.translatorCliPath}`);
    console.log(`[Job ${this.id}] Baseline: ${config.baselinePath}`);

    // Build CLI args
    const args = [
      config.translatorCliPath,
      'translate',
      '-b', config.baselinePath,
      '-t', ...this.languages,
    ];
    // Spawn the CLI process (translator reads context from .i18n-translatorrc.json in its cwd)
    this.process = spawn('node', args, {
      cwd: config.translatorCwd,
      env: { ...process.env },
    });

    // Handle stdout - parse progress and translations
    this.process.stdout?.on('data', (data: Buffer) => {
      const output = data.toString();
      this.outputBuffer += output;
      this.parseOutput(output);
    });

    // Handle stderr
    this.process.stderr?.on('data', (data: Buffer) => {
      const error = data.toString();
      console.error(`[Job ${this.id}] stderr:`, error);
      // Some CLI output goes to stderr (chalk colors, etc.)
      this.parseOutput(error);
    });

    // Handle process exit
    this.process.on('close', (code) => {
      this.completedAt = Date.now();

      if (this._status === 'cancelled') {
        console.log(`[Job ${this.id}] Cancelled`);
        this.emit('cancelled');
      } else if (code === 0) {
        this._status = 'completed';
        console.log(`[Job ${this.id}] Completed successfully`);
        this.emit('complete', this.status);
      } else {
        this._status = 'failed';
        this._error = `Process exited with code ${code}`;
        console.log(`[Job ${this.id}] Failed with code ${code}`);
        this.emit('error', this._error);
      }
    });

    // Handle process error
    this.process.on('error', (err) => {
      this._status = 'failed';
      this._error = err.message;
      this.completedAt = Date.now();
      console.error(`[Job ${this.id}] Process error:`, err);
      this.emit('error', err.message);
    });
  }

  cancel(): void {
    if (this.process && this._status === 'running') {
      this._status = 'cancelled';
      this.process.kill('SIGTERM');

      // Force kill after 5 seconds if still running
      setTimeout(() => {
        if (this.process && !this.process.killed) {
          this.process.kill('SIGKILL');
        }
      }, 5000);
    }
  }

  private parseOutput(output: string): void {
    // Parse progress line: "Translating: X/Y keys (Z%) | Batch N/M"
    const progressMatch = output.match(/Translating:\s*(\d+)\/(\d+)\s*keys\s*\((\d+)%\)\s*\|\s*Batch\s*(\d+)\/(\d+)/);
    if (progressMatch) {
      this._progress = {
        translatedKeys: parseInt(progressMatch[1], 10),
        totalKeys: parseInt(progressMatch[2], 10),
        percent: parseInt(progressMatch[3], 10),
        currentBatch: parseInt(progressMatch[4], 10),
        totalBatches: parseInt(progressMatch[5], 10),
        failedKeys: this._progress.failedKeys,
      };
      this.emit('progress', this._progress);
    }

    // Parse failed keys: "⚠ X failed"
    const failedMatch = output.match(/⚠\s*(\d+)\s*failed/);
    if (failedMatch) {
      this._progress.failedKeys = parseInt(failedMatch[1], 10);
      this.emit('progress', this._progress);
    }

    // Parse "Found X keys to translate"
    const foundMatch = output.match(/Found\s*(\d+)\s*keys?\s*to\s*translate/);
    if (foundMatch) {
      this._progress.totalKeys = parseInt(foundMatch[1], 10);
      this.emit('progress', this._progress);
    }

    // Parse "Translated X keys"
    const translatedMatch = output.match(/Translated\s*(\d+)\s*keys/);
    if (translatedMatch) {
      this._progress.translatedKeys = parseInt(translatedMatch[1], 10);
      this._progress.percent = this._progress.totalKeys > 0
        ? Math.round((this._progress.translatedKeys / this._progress.totalKeys) * 100)
        : 100;
      this.emit('progress', this._progress);
    }

    // Parse language header: "=== Translating to German (de) ==="
    const langMatch = output.match(/===\s*Translating to\s*([^(]+)\s*\((\w+)\)\s*===/);
    if (langMatch) {
      this.emit('language', { name: langMatch[1].trim(), code: langMatch[2] });
    }

    // Parse "No new translations needed"
    if (output.includes('No new translations needed') || output.includes('all keys are up to date')) {
      this.emit('progress', {
        ...this._progress,
        percent: 100,
      });
    }

    // Emit raw output for debugging/display
    this.emit('output', output);
  }
}

// Active jobs store
const activeJobs = new Map<string, TranslationJob>();

/**
 * Generate a unique job ID
 */
function generateJobId(): string {
  return `job_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Start a new translation job
 */
export function startTranslationJob(languages: string[]): TranslationJob {
  // Check if there's already an active job
  for (const [, job] of activeJobs) {
    if (job.status.status === 'running') {
      throw new Error('A translation job is already running. Cancel it first.');
    }
  }

  const id = generateJobId();
  const job = new TranslationJob(id, languages);

  activeJobs.set(id, job);

  // Clean up completed jobs after 1 hour
  job.on('complete', () => {
    setTimeout(() => activeJobs.delete(id), 60 * 60 * 1000);
  });
  job.on('error', () => {
    setTimeout(() => activeJobs.delete(id), 60 * 60 * 1000);
  });
  job.on('cancelled', () => {
    setTimeout(() => activeJobs.delete(id), 60 * 60 * 1000);
  });

  // Start the job
  job.start();

  return job;
}

/**
 * Get a job by ID
 */
export function getJob(id: string): TranslationJob | undefined {
  return activeJobs.get(id);
}

/**
 * Get the currently active job (if any)
 */
export function getActiveJob(): TranslationJob | undefined {
  for (const [, job] of activeJobs) {
    if (job.status.status === 'running') {
      return job;
    }
  }
  return undefined;
}

/**
 * Cancel a job
 */
export function cancelJob(id: string): boolean {
  const job = activeJobs.get(id);
  if (job && job.status.status === 'running') {
    job.cancel();
    return true;
  }
  return false;
}

/**
 * Get all job statuses
 */
export function getAllJobs(): JobStatus[] {
  return Array.from(activeJobs.values()).map(job => job.status);
}
