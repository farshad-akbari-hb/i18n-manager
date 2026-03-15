import { readFile } from 'fs/promises';
import { historyManager } from './history-manager.js';
import { config } from '../config.js';

export interface UnifiedTranslationKey {
  key: string;
  section: string;
  pathParts: string[];
  baselineValue: string;
  interpolations: string[];
  translations: Record<
    string,
    {
      value: string;
      sourceHash: string;
      version: number;
      timestamp: number;
      reviewStatus: 'draft' | 'approved' | 'rejected';
      reviewedAt?: number;
      rejectedAt?: number;
      manualEdit?: boolean;
      rejectionNote?: string;
    }
  >;
}

export interface SectionNode {
  name: string;
  fullPath: string;
  keyCount: number;
  children: SectionNode[];
  // Status counts per language: { "de": { draft: 5, approved: 10, rejected: 0 }, ... }
  statusByLang: Record<string, { draft: number; approved: number; rejected: number }>;
}

type NestedObject = { [key: string]: string | NestedObject };

/**
 * Flatten a nested JSON object into dot-notation keys
 */
function flattenObject(
  obj: NestedObject,
  prefix = ''
): Map<string, string> {
  const result = new Map<string, string>();

  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;

    if (typeof value === 'string') {
      result.set(fullKey, value);
    } else if (typeof value === 'object' && value !== null) {
      const nested = flattenObject(value, fullKey);
      for (const [k, v] of nested) {
        result.set(k, v);
      }
    }
  }

  return result;
}

/**
 * Extract interpolation variables from a string
 */
function extractInterpolations(text: string): string[] {
  const matches = text.match(/\{\{([^}]+)\}\}/g);
  if (!matches) return [];
  return [...new Set(matches.map((m) => m.slice(2, -2)))];
}

/**
 * Load baseline translations and merge with history data
 */
export async function loadTranslations(
  languages: string[]
): Promise<UnifiedTranslationKey[]> {
  // Load baseline
  const baselineContent = await readFile(config.baselinePath, 'utf-8');
  const baseline = JSON.parse(baselineContent) as NestedObject;
  const flatBaseline = flattenObject(baseline);

  // Load all history files (uses in-memory cache)
  const histories = await historyManager.getAllHistories();

  // Build unified translation keys
  const translations: UnifiedTranslationKey[] = [];

  for (const [key, value] of flatBaseline) {
    const section = key.split('.')[0];
    const pathParts = key.split('.');
    const interpolations = extractInterpolations(value);

    const keyTranslations: UnifiedTranslationKey['translations'] = {};

    for (const lang of languages) {
      const history = histories.get(lang);
      if (!history) continue;

      // Find entry by sourceKey
      const entry = Object.values(history.entries).find(
        (e) => e.sourceKey === key
      );

      if (entry) {
        keyTranslations[lang] = {
          value: entry.translatedValue,
          sourceHash: entry.sourceHash,
          version: entry.version,
          timestamp: entry.timestamp,
          reviewStatus: entry.reviewStatus ?? 'draft',
          reviewedAt: entry.reviewedAt,
          rejectedAt: entry.rejectedAt,
          manualEdit: entry.manualEdit,
          rejectionNote: entry.rejectionNote,
        };
      }
    }

    translations.push({
      key,
      section,
      pathParts,
      baselineValue: value,
      interpolations,
      translations: keyTranslations,
    });
  }

  return translations;
}

/**
 * Filter translations by section, status, and search query
 */
export function filterTranslations(
  translations: UnifiedTranslationKey[],
  options: {
    section?: string | null;
    status?: 'all' | 'draft' | 'approved' | 'rejected';
    search?: string;
    languages?: string[];
  }
): UnifiedTranslationKey[] {
  let filtered = translations;

  // Filter by section
  if (options.section) {
    filtered = filtered.filter(
      (t) => t.key.startsWith(options.section + '.') || t.section === options.section
    );
  }

  // Filter by status
  if (options.status && options.status !== 'all' && options.languages?.length) {
    filtered = filtered.filter((t) => {
      // Check if any selected language has the matching status
      return options.languages!.some((lang) => {
        const langData = t.translations[lang];
        const status = langData?.reviewStatus ?? 'draft';
        return status === options.status;
      });
    });
  }

  // Filter by search
  if (options.search) {
    const searchLower = options.search.toLowerCase();
    filtered = filtered.filter((t) => {
      // Search in key
      if (t.key.toLowerCase().includes(searchLower)) return true;
      // Search in baseline value
      if (t.baselineValue.toLowerCase().includes(searchLower)) return true;
      // Search in translations
      for (const langData of Object.values(t.translations)) {
        if (langData.value.toLowerCase().includes(searchLower)) return true;
      }
      return false;
    });
  }

  return filtered;
}

/**
 * Build section tree from translations
 */
export function buildSectionTree(
  translations: UnifiedTranslationKey[],
  languages: string[]
): SectionNode[] {
  const sectionMap = new Map<string, SectionNode>();

  for (const t of translations) {
    const parts = t.pathParts;

    for (let i = 0; i < parts.length - 1; i++) {
      const fullPath = parts.slice(0, i + 1).join('.');
      const name = parts[i];

      if (!sectionMap.has(fullPath)) {
        // Initialize statusByLang for each language
        const statusByLang: Record<string, { draft: number; approved: number; rejected: number }> = {};
        for (const lang of languages) {
          statusByLang[lang] = { draft: 0, approved: 0, rejected: 0 };
        }
        sectionMap.set(fullPath, {
          name,
          fullPath,
          keyCount: 0,
          children: [],
          statusByLang,
        });
      }
    }

    // Count keys and status for ALL ancestor sections (not just first-level)
    for (let i = 0; i < parts.length - 1; i++) {
      const ancestorPath = parts.slice(0, i + 1).join('.');
      const node = sectionMap.get(ancestorPath);
      if (node) {
        node.keyCount++;

        // Count status per language
        for (const lang of languages) {
          const langData = t.translations[lang];
          const status = langData?.reviewStatus ?? 'draft';
          // Ensure lang entry exists
          if (!node.statusByLang[lang]) {
            node.statusByLang[lang] = { draft: 0, approved: 0, rejected: 0 };
          }
          if (status === 'approved') {
            node.statusByLang[lang].approved++;
          } else if (status === 'rejected') {
            node.statusByLang[lang].rejected++;
          } else {
            node.statusByLang[lang].draft++;
          }
        }
      }
    }
  }

  // Build tree structure
  const rootSections: SectionNode[] = [];

  for (const [fullPath, node] of sectionMap) {
    const parts = fullPath.split('.');

    if (parts.length === 1) {
      rootSections.push(node);
    } else {
      const parentPath = parts.slice(0, -1).join('.');
      const parent = sectionMap.get(parentPath);
      if (parent && !parent.children.find((c) => c.fullPath === fullPath)) {
        parent.children.push(node);
      }
    }
  }

  // Sort sections alphabetically
  const sortSections = (nodes: SectionNode[]) => {
    nodes.sort((a, b) => a.name.localeCompare(b.name));
    for (const node of nodes) {
      sortSections(node.children);
    }
  };
  sortSections(rootSections);

  return rootSections;
}

/**
 * Find entry by key using historyManager
 */
export async function findEntryByKey(
  key: string,
  lang: string
): Promise<{ sourceHash: string; entry: import('./history-manager.js').TranslationHistoryEntry } | null> {
  const history = await historyManager.getHistory(lang);
  if (!history) return null;

  for (const [hash, entry] of Object.entries(history.entries)) {
    if (entry.sourceKey === key) {
      return { sourceHash: hash, entry };
    }
  }

  return null;
}
