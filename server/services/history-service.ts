import { readFile, writeFile } from 'fs/promises';
import path from 'path';
import { config } from '../config.js';

export interface TranslationHistoryEntry {
  sourceHash: string;
  sourceKey: string;
  sourceValue: string;
  translatedValue: string;
  targetLang: string;
  timestamp: number;
  version: number;
  interpolations?: string[];
  // Review UI fields
  reviewStatus?: 'draft' | 'approved' | 'rejected';
  reviewedAt?: number;
  rejectedAt?: number;
  manualEdit?: boolean;
  rejectionNote?: string;
}

export interface TranslationHistory {
  schemaVersion: string;
  sourceLang: string;
  targetLang: string;
  baselineFile: string;
  lastSync: number;
  stats: {
    totalKeys: number;
    translatedKeys: number;
    lastTranslation: number;
  };
  entries: Record<string, TranslationHistoryEntry>;
}


export async function readHistory(lang: string): Promise<TranslationHistory | null> {
  const historyPath = path.join(config.historyDir, `${lang}.history.json`);
  try {
    const content = await readFile(historyPath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return null;
    }
    throw error;
  }
}

export async function writeHistory(
  lang: string,
  history: TranslationHistory
): Promise<void> {
  const historyPath = path.join(config.historyDir, `${lang}.history.json`);
  const tempPath = `${historyPath}.tmp`;

  // Atomic write: write to temp file, then rename
  await writeFile(tempPath, JSON.stringify(history, null, 2), 'utf-8');
  await writeFile(historyPath, JSON.stringify(history, null, 2), 'utf-8');
}

export async function updateHistoryEntry(
  lang: string,
  sourceHash: string,
  updates: Partial<TranslationHistoryEntry>
): Promise<TranslationHistoryEntry | null> {
  const history = await readHistory(lang);
  if (!history) {
    throw new Error(`History file not found for language: ${lang}`);
  }

  const entry = history.entries[sourceHash];
  if (!entry) {
    return null;
  }

  // Apply updates
  Object.assign(entry, updates);

  // Update lastSync
  history.lastSync = Date.now();

  await writeHistory(lang, history);
  return entry;
}

export async function getHistoryEntry(
  lang: string,
  sourceHash: string
): Promise<TranslationHistoryEntry | null> {
  const history = await readHistory(lang);
  if (!history) {
    return null;
  }
  return history.entries[sourceHash] ?? null;
}

export async function deleteHistoryEntry(
  lang: string,
  sourceHash: string
): Promise<boolean> {
  const history = await readHistory(lang);
  if (!history) {
    return false;
  }

  if (!(sourceHash in history.entries)) {
    return false;
  }

  delete history.entries[sourceHash];
  history.stats.translatedKeys = Object.keys(history.entries).length;
  history.lastSync = Date.now();

  await writeHistory(lang, history);
  return true;
}

export async function getAllHistories(): Promise<Map<string, TranslationHistory>> {
  const { readdir } = await import('fs/promises');
  const histories = new Map<string, TranslationHistory>();

  try {
    const files = await readdir(config.historyDir);
    const historyFiles = files.filter((f) => f.endsWith('.history.json'));

    for (const file of historyFiles) {
      const lang = file.replace('.history.json', '');
      const history = await readHistory(lang);
      if (history) {
        histories.set(lang, history);
      }
    }
  } catch {
    // Directory might not exist yet
  }

  return histories;
}
