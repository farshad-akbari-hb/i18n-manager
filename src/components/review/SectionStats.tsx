import { useMemo } from 'react';
import { useSections } from '../../hooks/useTranslations';
import { useUIStore } from '../../stores/uiStore';
import { cn } from '../../lib/utils';
import type { SectionNode } from '../../lib/types';

interface SectionStatsProps {
  languages: string[];
}

export function SectionStats({ languages }: SectionStatsProps) {
  const { data } = useSections(languages);
  const { selectedSection } = useUIStore();

  // Find the selected section node (or compute aggregate for "All sections")
  const sectionNode = useMemo(() => {
    if (!data?.sections) return null;

    if (!selectedSection) {
      // Aggregate all sections for "All sections"
      const aggregate: SectionNode = {
        name: 'All sections',
        fullPath: '',
        keyCount: 0,
        children: [],
        statusByLang: {},
      };

      // Initialize statusByLang for each language
      for (const lang of languages) {
        aggregate.statusByLang[lang] = { draft: 0, approved: 0, rejected: 0 };
      }

      // Sum up all root sections
      for (const section of data.sections) {
        aggregate.keyCount += section.keyCount;
        for (const lang of languages) {
          const langStatus = section.statusByLang?.[lang];
          if (langStatus) {
            aggregate.statusByLang[lang].draft += langStatus.draft;
            aggregate.statusByLang[lang].approved += langStatus.approved;
            aggregate.statusByLang[lang].rejected += langStatus.rejected;
          }
        }
      }

      return aggregate;
    }

    // Find the specific section
    const findSection = (nodes: SectionNode[]): SectionNode | null => {
      for (const node of nodes) {
        if (node.fullPath === selectedSection) return node;
        const found = findSection(node.children);
        if (found) return found;
      }
      return null;
    };

    return findSection(data.sections);
  }, [data?.sections, selectedSection, languages]);

  if (!sectionNode) return null;

  return (
    <div className="flex items-center gap-4 px-4 py-2 bg-muted/30 border-b text-sm">
      <span className="font-medium">{sectionNode.name}</span>
      <span className="text-muted-foreground">({sectionNode.keyCount} keys)</span>
      <div className="flex items-center gap-2 ml-auto">
        {languages.map((lang) => {
          const langStatus = sectionNode.statusByLang?.[lang];
          if (!langStatus) return null;

          const total = langStatus.draft + langStatus.approved + langStatus.rejected;
          if (total === 0) return null;

          const approvedPct = Math.round((langStatus.approved / total) * 100);
          const hasRejected = langStatus.rejected > 0;

          return (
            <div
              key={lang}
              className={cn(
                'flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium',
                hasRejected
                  ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
                  : approvedPct === 100
                  ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                  : approvedPct > 50
                  ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300'
                  : 'bg-muted text-muted-foreground'
              )}
              title={`${lang.toUpperCase()}: ${langStatus.approved} approved, ${langStatus.draft} draft, ${langStatus.rejected} rejected`}
            >
              <span className="uppercase font-bold">{lang}</span>
              <span>{approvedPct}%</span>
              <span className="text-[10px] opacity-70">
                ({langStatus.approved}/{total})
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
