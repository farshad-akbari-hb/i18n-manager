/**
 * HistoryManager - In-memory cache with debounced writes
 *
 * Solves the N read/write problem in bulk operations by:
 * 1. Keeping history files in memory after first load
 * 2. Batching writes with a debounce timer
 * 3. Force-flushing after max pending changes
 */

import { readFile, writeFile, readdir } from 'fs/promises';
import path from 'path';
import { config } from '../config.js';

// ============================================================================
// Types
// ============================================================================

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

export interface EntryUpdate {
  sourceHash: string;
  updates: Partial<TranslationHistoryEntry>;
}

// ============================================================================
// Constants
// ============================================================================

const FLUSH_DELAY_MS = 500; // Debounce delay
const MAX_PENDING_CHANGES = 100; // Force flush after this many changes

// ============================================================================
// HistoryManager Class
// ============================================================================

class HistoryManager {
  private cache: Map<string, TranslationHistory> = new Map();
  private dirty: Set<string> = new Set();
  private pendingChanges: number = 0;
  private flushTimer: NodeJS.Timeout | null = null;
  private isShuttingDown: boolean = false;

  /**
   * Get history for a language, loading from disk if not cached
   */
  async getHistory(lang: string): Promise<TranslationHistory | null> {
    // Return from cache if available
    if (this.cache.has(lang)) {
      return this.cache.get(lang)!;
    }

    // Load from disk
    const history = await this.loadFromDisk(lang);
    if (history) {
      this.cache.set(lang, history);
    }
    return history;
  }

  /**
   * Update a single entry - marks as dirty and schedules flush
   */
  async updateEntry(
    lang: string,
    sourceHash: string,
    updates: Partial<TranslationHistoryEntry>
  ): Promise<TranslationHistoryEntry | null> {
    const history = await this.getHistory(lang);
    if (!history) {
      throw new Error(`History file not found for language: ${lang}`);
    }

    const entry = history.entries[sourceHash];
    if (!entry) {
      return null;
    }

    // Apply updates
    Object.assign(entry, updates);
    history.lastSync = Date.now();

    // Mark dirty and schedule flush
    this.markDirty(lang);

    return entry;
  }

  /**
   * Bulk update multiple entries - efficient for bulk operations
   */
  async bulkUpdateEntries(
    lang: string,
    updates: EntryUpdate[]
  ): Promise<number> {
    const history = await this.getHistory(lang);
    if (!history) {
      throw new Error(`History file not found for language: ${lang}`);
    }

    let updated = 0;

    for (const { sourceHash, updates: entryUpdates } of updates) {
      const entry = history.entries[sourceHash];
      if (entry) {
        Object.assign(entry, entryUpdates);
        updated++;
      }
    }

    if (updated > 0) {
      history.lastSync = Date.now();
      this.markDirty(lang);
    }

    return updated;
  }

  /**
   * Get a specific entry from history
   */
  async getEntry(
    lang: string,
    sourceHash: string
  ): Promise<TranslationHistoryEntry | null> {
    const history = await this.getHistory(lang);
    if (!history) {
      return null;
    }
    return history.entries[sourceHash] ?? null;
  }

  /**
   * Find entry by source key
   */
  async findEntryByKey(
    lang: string,
    sourceKey: string
  ): Promise<TranslationHistoryEntry | null> {
    const history = await this.getHistory(lang);
    if (!history) {
      return null;
    }

    for (const entry of Object.values(history.entries)) {
      if (entry.sourceKey === sourceKey) {
        return entry;
      }
    }
    return null;
  }

  /**
   * Delete an entry from history
   */
  async deleteEntry(lang: string, sourceHash: string): Promise<boolean> {
    const history = await this.getHistory(lang);
    if (!history) {
      return false;
    }

    if (!(sourceHash in history.entries)) {
      return false;
    }

    delete history.entries[sourceHash];
    history.stats.translatedKeys = Object.keys(history.entries).length;
    history.lastSync = Date.now();

    this.markDirty(lang);
    return true;
  }

  /**
   * Get all histories (loads all into cache)
   */
  async getAllHistories(): Promise<Map<string, TranslationHistory>> {
    try {
      const files = await readdir(config.historyDir);
      const historyFiles = files.filter((f) => f.endsWith('.history.json'));

      for (const file of historyFiles) {
        const lang = file.replace('.history.json', '');
        await this.getHistory(lang); // This will cache it
      }
    } catch (error) {
      console.error('Error loading translation histories:', error);
    }

    return new Map(this.cache);
  }

  /**
   * Force flush all dirty histories to disk
   */
  async flush(): Promise<void> {
    if (this.dirty.size === 0) {
      return;
    }

    // Clear timer if running
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }

    // Write all dirty histories
    const writePromises: Promise<void>[] = [];

    for (const lang of this.dirty) {
      const history = this.cache.get(lang);
      if (history) {
        writePromises.push(this.writeToDisk(lang, history));
      }
    }

    await Promise.all(writePromises);

    // Clear dirty set and pending count
    this.dirty.clear();
    this.pendingChanges = 0;

    console.log(`[HistoryManager] Flushed ${writePromises.length} history file(s)`);
  }

  /**
   * Graceful shutdown - flush and cleanup
   */
  async shutdown(): Promise<void> {
    if (this.isShuttingDown) {
      return;
    }
    this.isShuttingDown = true;

    console.log('[HistoryManager] Shutting down, flushing pending changes...');
    await this.flush();
    console.log('[HistoryManager] Shutdown complete');
  }

  /**
   * Check if there are pending changes
   */
  hasPendingChanges(): boolean {
    return this.dirty.size > 0;
  }

  /**
   * Get count of pending changes
   */
  getPendingChangeCount(): number {
    return this.pendingChanges;
  }

  // ==========================================================================
  // Private Methods
  // ==========================================================================

  private markDirty(lang: string): void {
    this.dirty.add(lang);
    this.pendingChanges++;

    // Force flush if too many pending changes
    if (this.pendingChanges >= MAX_PENDING_CHANGES) {
      this.flush();
      return;
    }

    // Schedule debounced flush
    this.scheduleFlush();
  }

  private scheduleFlush(): void {
    if (this.isShuttingDown) {
      return;
    }

    // Clear existing timer
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
    }

    // Schedule new flush
    this.flushTimer = setTimeout(() => {
      this.flush().catch((err) => {
        console.error('[HistoryManager] Flush error:', err);
      });
    }, FLUSH_DELAY_MS);
  }

  private async loadFromDisk(lang: string): Promise<TranslationHistory | null> {
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

  private async writeToDisk(
    lang: string,
    history: TranslationHistory
  ): Promise<void> {
    const historyPath = path.join(config.historyDir, `${lang}.history.json`);
    const content = JSON.stringify(history, null, 2);
    await writeFile(historyPath, content, 'utf-8');
  }
}

// ============================================================================
// Singleton Export
// ============================================================================

export const historyManager = new HistoryManager();

// Export class for testing purposes
export { HistoryManager };
