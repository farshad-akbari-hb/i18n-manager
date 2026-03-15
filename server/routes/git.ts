/**
 * Git Router
 * Handles Git operations for translation workflow
 */

import { Router, Request, Response, type IRouter } from 'express';
import {
  getStatus,
  createBranch,
  switchBranch,
  getDiff,
  commit,
  getBranches,
  discardChanges,
} from '../services/git-service.js';

const router: IRouter = Router();

/**
 * GET /api/git/status
 * Get current git status
 */
router.get('/status', async (_req: Request, res: Response) => {
  try {
    const status = await getStatus();
    res.json(status);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

/**
 * GET /api/git/branches
 * Get list of branches
 */
router.get('/branches', async (_req: Request, res: Response) => {
  try {
    const branches = await getBranches();
    res.json(branches);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

/**
 * POST /api/git/branch
 * Create a new branch
 */
router.post('/branch', async (req: Request, res: Response) => {
  const { name } = req.body;

  if (!name || typeof name !== 'string') {
    return res.status(400).json({ error: 'Branch name is required' });
  }

  try {
    await createBranch(name);
    res.json({ success: true, branch: name });
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

/**
 * POST /api/git/switch
 * Switch to an existing branch
 */
router.post('/switch', async (req: Request, res: Response) => {
  const { name } = req.body;

  if (!name || typeof name !== 'string') {
    return res.status(400).json({ error: 'Branch name is required' });
  }

  try {
    await switchBranch(name);
    res.json({ success: true, branch: name });
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

/**
 * GET /api/git/diff
 * Get diff of translation files
 */
router.get('/diff', async (_req: Request, res: Response) => {
  try {
    const diff = await getDiff();
    res.json(diff);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

/**
 * POST /api/git/commit
 * Commit translation changes
 */
router.post('/commit', async (req: Request, res: Response) => {
  const { message } = req.body;

  if (!message || typeof message !== 'string') {
    return res.status(400).json({ error: 'Commit message is required' });
  }

  try {
    const result = await commit(message);
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

/**
 * POST /api/git/discard
 * Discard changes to translation files
 */
router.post('/discard', async (_req: Request, res: Response) => {
  try {
    await discardChanges();
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

export default router;
