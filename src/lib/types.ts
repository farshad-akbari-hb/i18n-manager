// Types for the i18n-manager UI

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

export interface TranslationsResponse {
  translations: UnifiedTranslationKey[];
  totalCount: number;
  sections: SectionNode[];
}

export interface SectionsResponse {
  sections: SectionNode[];
}

export const SUPPORTED_LANGUAGES = ['de', 'fa', 'ar', 'tr', 'es', 'fr'] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export const LANGUAGE_NAMES: Record<SupportedLanguage, string> = {
  de: 'German',
  fa: 'Persian',
  ar: 'Arabic',
  tr: 'Turkish',
  es: 'Spanish',
  fr: 'French',
};
