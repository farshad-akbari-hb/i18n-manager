import { Router, type IRouter } from 'express';
import {
  loadTranslations,
  filterTranslations,
  buildSectionTree,
  findEntryByKey,
} from '../services/translation-service.js';
import { historyManager, type EntryUpdate } from '../services/history-manager.js';
import { config } from '../config.js';

const router: IRouter = Router();

/**
 * GET /api/translations
 * Query params: lang (comma-separated), section, status, search
 */
router.get('/', async (req, res) => {
  try {
    const langParam = req.query.lang as string | undefined;
    const languages = langParam
      ? langParam.split(',').filter((l) => config.supportedLanguages.includes(l))
      : config.supportedLanguages.slice(0, 2); // Default: de, fa

    const section = (req.query.section as string) || null;
    const status = (req.query.status as 'all' | 'draft' | 'approved' | 'rejected') || 'all';
    const search = (req.query.search as string) || '';

    const allTranslations = await loadTranslations(languages);
    const filtered = filterTranslations(allTranslations, {
      section,
      status,
      search,
      languages,
    });

    const sections = buildSectionTree(allTranslations, languages);

    res.json({
      translations: filtered,
      totalCount: filtered.length,
      sections,
    });
  } catch (error) {
    console.error('Error fetching translations:', error);
    res.status(500).json({ error: 'Failed to fetch translations' });
  }
});

/**
 * GET /api/translations/:encodedKey
 * Get a single translation key with full details
 */
router.get('/:encodedKey', async (req, res) => {
  try {
    const key = decodeURIComponent(req.params.encodedKey);
    const languages = config.supportedLanguages;

    const allTranslations = await loadTranslations(languages);
    const translation = allTranslations.find((t) => t.key === key);

    if (!translation) {
      return res.status(404).json({ error: 'Translation key not found' });
    }

    res.json(translation);
  } catch (error) {
    console.error('Error fetching translation:', error);
    res.status(500).json({ error: 'Failed to fetch translation' });
  }
});

/**
 * PATCH /api/translations/:encodedKey
 * Update a translation entry
 * Body: { lang, value?, status?, rejectionNote?, manualEdit? }
 */
router.patch('/:encodedKey', async (req, res) => {
  try {
    const key = decodeURIComponent(req.params.encodedKey);
    const { lang, value, status, rejectionNote, manualEdit } = req.body;

    if (!lang || !config.supportedLanguages.includes(lang)) {
      return res.status(400).json({ error: 'Invalid or missing language' });
    }

    // Find the entry by key
    const found = await findEntryByKey(key, lang);
    if (!found) {
      return res.status(404).json({ error: 'Translation entry not found' });
    }

    // Build updates object
    const updates: Record<string, unknown> = {};

    if (value !== undefined) {
      updates.translatedValue = value;
      updates.manualEdit = true;
    }
    if (status !== undefined) {
      updates.reviewStatus = status;
      if (status === 'approved') {
        updates.reviewedAt = Date.now();
        // Clear rejection data when approving
        updates.rejectedAt = undefined;
        updates.rejectionNote = undefined;
      } else if (status === 'rejected') {
        updates.rejectedAt = Date.now();
      } else if (status === 'draft') {
        // Clear both timestamps when reverting to draft
        updates.reviewedAt = undefined;
        updates.rejectedAt = undefined;
        updates.rejectionNote = undefined;
      }
    }
    if (rejectionNote !== undefined) {
      updates.rejectionNote = rejectionNote;
    }
    if (manualEdit !== undefined) {
      updates.manualEdit = manualEdit;
    }

    const updatedEntry = await historyManager.updateEntry(lang, found.sourceHash, updates);

    if (!updatedEntry) {
      return res.status(500).json({ error: 'Failed to update entry' });
    }

    // Return updated translation
    const allTranslations = await loadTranslations([lang]);
    const translation = allTranslations.find((t) => t.key === key);

    res.json(translation);
  } catch (error) {
    console.error('Error updating translation:', error);
    res.status(500).json({ error: 'Failed to update translation' });
  }
});

/**
 * POST /api/translations/bulk-approve
 * Bulk approve multiple keys for a language
 * Body: { keys: string[], lang: string }
 */
router.post('/bulk-approve', async (req, res) => {
  try {
    const { keys, lang } = req.body;

    if (!Array.isArray(keys) || keys.length === 0) {
      return res.status(400).json({ error: 'Keys array is required' });
    }
    if (!lang || !config.supportedLanguages.includes(lang)) {
      return res.status(400).json({ error: 'Invalid or missing language' });
    }

    // Build batch updates
    const batchUpdates: EntryUpdate[] = [];
    const now = Date.now();

    for (const key of keys) {
      const found = await findEntryByKey(key, lang);
      if (found) {
        batchUpdates.push({
          sourceHash: found.sourceHash,
          updates: {
            reviewStatus: 'approved',
            reviewedAt: now,
            rejectedAt: undefined,
            rejectionNote: undefined,
          },
        });
      }
    }

    // Single batch update (single file write)
    const updated = await historyManager.bulkUpdateEntries(lang, batchUpdates);

    res.json({ updated });
  } catch (error) {
    console.error('Error bulk approving:', error);
    res.status(500).json({ error: 'Failed to bulk approve' });
  }
});

/**
 * POST /api/translations/bulk-reject
 * Bulk reject multiple keys for a language with a shared note
 * Body: { keys: string[], lang: string, rejectionNote: string }
 */
router.post('/bulk-reject', async (req, res) => {
  try {
    const { keys, lang, rejectionNote } = req.body;

    if (!Array.isArray(keys) || keys.length === 0) {
      return res.status(400).json({ error: 'Keys array is required' });
    }
    if (!lang || !config.supportedLanguages.includes(lang)) {
      return res.status(400).json({ error: 'Invalid or missing language' });
    }
    if (!rejectionNote || typeof rejectionNote !== 'string') {
      return res.status(400).json({ error: 'Rejection note is required' });
    }

    // Build batch updates
    const batchUpdates: EntryUpdate[] = [];
    const now = Date.now();

    for (const key of keys) {
      const found = await findEntryByKey(key, lang);
      if (found) {
        batchUpdates.push({
          sourceHash: found.sourceHash,
          updates: {
            reviewStatus: 'rejected',
            rejectedAt: now,
            rejectionNote,
          },
        });
      }
    }

    // Single batch update (single file write)
    const updated = await historyManager.bulkUpdateEntries(lang, batchUpdates);

    res.json({ updated });
  } catch (error) {
    console.error('Error bulk rejecting:', error);
    res.status(500).json({ error: 'Failed to bulk reject' });
  }
});

/**
 * POST /api/translations/bulk-approve-section
 * Bulk approve all keys in a section for a language
 * Body: { section: string, lang: string }
 */
router.post('/bulk-approve-section', async (req, res) => {
  try {
    const { section, lang } = req.body;

    if (!section || typeof section !== 'string') {
      return res.status(400).json({ error: 'Section is required' });
    }
    if (!lang || !config.supportedLanguages.includes(lang)) {
      return res.status(400).json({ error: 'Invalid or missing language' });
    }

    // Load all translations and filter by section
    const allTranslations = await loadTranslations([lang]);
    const sectionKeys = allTranslations
      .filter((t) => t.key.startsWith(section + '.') || t.section === section)
      .map((t) => t.key);

    // Build batch updates
    const batchUpdates: EntryUpdate[] = [];
    const now = Date.now();

    for (const key of sectionKeys) {
      const found = await findEntryByKey(key, lang);
      if (found) {
        batchUpdates.push({
          sourceHash: found.sourceHash,
          updates: {
            reviewStatus: 'approved',
            reviewedAt: now,
            rejectedAt: undefined,
            rejectionNote: undefined,
          },
        });
      }
    }

    // Single batch update (single file write)
    const updated = await historyManager.bulkUpdateEntries(lang, batchUpdates);

    res.json({ updated, total: sectionKeys.length });
  } catch (error) {
    console.error('Error bulk approving section:', error);
    res.status(500).json({ error: 'Failed to bulk approve section' });
  }
});

/**
 * GET /api/sections
 * Get section tree for navigation
 */
router.get('/sections', async (_req, res) => {
  try {
    const languages = config.supportedLanguages.slice(0, 2);
    const allTranslations = await loadTranslations(languages);
    const sections = buildSectionTree(allTranslations, languages);

    res.json({ sections });
  } catch (error) {
    console.error('Error fetching sections:', error);
    res.status(500).json({ error: 'Failed to fetch sections' });
  }
});

export default router;
