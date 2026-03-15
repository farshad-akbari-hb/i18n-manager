/**
 * Git Service
 * Handles Git operations using execFile for safety (no shell injection)
 */

import { execFile } from 'child_process';
import { promisify } from 'util';
import { config } from '../config.js';

const execFileAsync = promisify(execFile);

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

/**
 * Parse git status --porcelain output
 */
function parseGitStatus(output: string): ChangedFile[] {
  const files: ChangedFile[] = [];
  const lines = output.trim().split('\n').filter(Boolean);

  for (const line of lines) {
    if (line.length < 3) continue;

    const indexStatus = line[0];
    const workTreeStatus = line[1];
    const filePath = line.slice(3);

    // Determine if file is staged
    const staged = indexStatus !== ' ' && indexStatus !== '?';

    // Determine status based on git's status codes
    let status: ChangedFile['status'] = 'modified';
    const statusCode = staged ? indexStatus : workTreeStatus;

    switch (statusCode) {
      case 'A':
        status = 'added';
        break;
      case 'D':
        status = 'deleted';
        break;
      case 'R':
        status = 'renamed';
        break;
      case '?':
        status = 'untracked';
        break;
      case 'M':
      default:
        status = 'modified';
    }

    files.push({ path: filePath, status, staged });
  }

  return files;
}

/**
 * Check if a file path is within translation paths
 */
function isTranslationFile(filePath: string): boolean {
  return config.translationPaths.some(p => filePath.startsWith(p));
}

/**
 * Get current git status (scoped to translation files only)
 */
export async function getStatus(): Promise<GitStatus> {
  try {
    // Get porcelain status
    const { stdout: statusOutput } = await execFileAsync(
      'git',
      ['status', '--porcelain'],
      { cwd: config.projectRoot }
    );

    // Get current branch
    const { stdout: branchOutput } = await execFileAsync(
      'git',
      ['branch', '--show-current'],
      { cwd: config.projectRoot }
    );

    // Get ahead/behind info
    let ahead = 0;
    let behind = 0;
    try {
      const { stdout: trackingOutput } = await execFileAsync(
        'git',
        ['rev-list', '--left-right', '--count', '@{upstream}...HEAD'],
        { cwd: config.projectRoot }
      );
      const [behindStr, aheadStr] = trackingOutput.trim().split('\t');
      behind = parseInt(behindStr, 10) || 0;
      ahead = parseInt(aheadStr, 10) || 0;
    } catch {
      // No upstream configured, ignore
    }

    // Parse all changes, then filter to translation files only
    const allChangedFiles = parseGitStatus(statusOutput);
    const changedFiles = allChangedFiles.filter(file => isTranslationFile(file.path));

    return {
      branch: branchOutput.trim(),
      clean: changedFiles.length === 0,
      changedFiles,
      ahead,
      behind,
    };
  } catch (error) {
    throw new Error(`Failed to get git status: ${(error as Error).message}`);
  }
}

/**
 * Create a new branch
 */
export async function createBranch(name: string): Promise<void> {
  // Validate branch name (alphanumeric, underscore, hyphen, slash only)
  if (!/^[a-zA-Z0-9/_-]+$/.test(name)) {
    throw new Error('Invalid branch name. Use only letters, numbers, underscores, hyphens, and slashes.');
  }

  try {
    await execFileAsync(
      'git',
      ['checkout', '-b', name],
      { cwd: config.projectRoot }
    );
  } catch (error) {
    throw new Error(`Failed to create branch: ${(error as Error).message}`);
  }
}

/**
 * Switch to an existing branch
 */
export async function switchBranch(name: string): Promise<void> {
  // Validate branch name
  if (!/^[a-zA-Z0-9/_-]+$/.test(name)) {
    throw new Error('Invalid branch name.');
  }

  try {
    await execFileAsync(
      'git',
      ['checkout', name],
      { cwd: config.projectRoot }
    );
  } catch (error) {
    throw new Error(`Failed to switch branch: ${(error as Error).message}`);
  }
}

/**
 * Get diff of translation files
 */
export async function getDiff(): Promise<GitDiff> {
  try {
    // Get summary of changes
    const { stdout: summaryOutput } = await execFileAsync(
      'git',
      ['diff', '--stat', '--', ...config.translationPaths],
      { cwd: config.projectRoot }
    );

    // Get detailed diff
    const { stdout: diffOutput } = await execFileAsync(
      'git',
      ['diff', '--', ...config.translationPaths],
      { cwd: config.projectRoot, maxBuffer: 10 * 1024 * 1024 } // 10MB buffer for large diffs
    );

    // Parse diff output into files
    const files: DiffFile[] = [];
    const fileDiffs = diffOutput.split(/^diff --git /m).filter(Boolean);

    for (const fileDiff of fileDiffs) {
      const pathMatch = fileDiff.match(/a\/(.+?) b\//);
      if (!pathMatch) continue;

      const filePath = pathMatch[1];
      const additions = (fileDiff.match(/^\+[^+]/gm) || []).length;
      const deletions = (fileDiff.match(/^-[^-]/gm) || []).length;

      files.push({
        path: filePath,
        additions,
        deletions,
        diff: 'diff --git ' + fileDiff,
      });
    }

    return {
      files,
      summary: summaryOutput.trim(),
    };
  } catch (error) {
    throw new Error(`Failed to get diff: ${(error as Error).message}`);
  }
}

/**
 * Stage and commit translation changes
 */
export async function commit(message: string): Promise<{ hash: string }> {
  if (!message || message.trim().length === 0) {
    throw new Error('Commit message is required');
  }

  try {
    // Stage translation files
    await execFileAsync(
      'git',
      ['add', ...config.translationPaths],
      { cwd: config.projectRoot }
    );

    // Check if there's anything to commit
    const { stdout: statusOutput } = await execFileAsync(
      'git',
      ['status', '--porcelain', '--', ...config.translationPaths],
      { cwd: config.projectRoot }
    );

    if (!statusOutput.trim()) {
      throw new Error('No translation changes to commit');
    }

    // Commit
    await execFileAsync(
      'git',
      ['commit', '-m', message.trim()],
      { cwd: config.projectRoot }
    );

    // Get commit hash
    const { stdout: hashOutput } = await execFileAsync(
      'git',
      ['rev-parse', '--short', 'HEAD'],
      { cwd: config.projectRoot }
    );

    return { hash: hashOutput.trim() };
  } catch (error) {
    throw new Error(`Failed to commit: ${(error as Error).message}`);
  }
}

/**
 * Get list of branches
 */
export async function getBranches(): Promise<{ current: string; branches: string[] }> {
  try {
    const { stdout: branchOutput } = await execFileAsync(
      'git',
      ['branch', '--list'],
      { cwd: config.projectRoot }
    );

    const branches: string[] = [];
    let current = '';

    for (const line of branchOutput.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      if (trimmed.startsWith('* ')) {
        current = trimmed.slice(2);
        branches.push(current);
      } else {
        branches.push(trimmed);
      }
    }

    return { current, branches };
  } catch (error) {
    throw new Error(`Failed to get branches: ${(error as Error).message}`);
  }
}

/**
 * Discard changes to translation files
 */
export async function discardChanges(): Promise<void> {
  try {
    await execFileAsync(
      'git',
      ['checkout', '--', ...config.translationPaths],
      { cwd: config.projectRoot }
    );
  } catch (error) {
    throw new Error(`Failed to discard changes: ${(error as Error).message}`);
  }
}
