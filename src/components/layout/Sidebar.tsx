import { ChevronRight, ChevronDown, Folder, FolderOpen, PanelLeftClose, PanelLeft, Check } from 'lucide-react';
import { useState } from 'react';
import { useSections, useBulkApproveSection } from '../../hooks/useTranslations';
import { useUIStore } from '../../stores/uiStore';
import type { SectionNode } from '../../lib/types';
import { cn } from '../../lib/utils';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const { selectedSection, setSelectedSection, selectedLanguages } = useUIStore();
  const { data, isLoading } = useSections(selectedLanguages);

  if (collapsed) {
    return (
      <aside className="w-12 border-r bg-card flex flex-col">
        <button
          onClick={onToggle}
          className="p-3 hover:bg-muted transition-colors"
          title="Expand sidebar"
        >
          <PanelLeft className="h-5 w-5" />
        </button>
      </aside>
    );
  }

  return (
    <aside className="w-64 border-r bg-card flex flex-col">
      <div className="flex items-center justify-between p-3 border-b">
        <span className="font-medium text-sm">Sections</span>
        <button
          onClick={onToggle}
          className="p-1 hover:bg-muted rounded transition-colors"
          title="Collapse sidebar"
        >
          <PanelLeftClose className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {isLoading ? (
          <div className="text-sm text-muted-foreground p-2">Loading...</div>
        ) : (
          <>
            <button
              onClick={() => setSelectedSection(null)}
              className={cn(
                'w-full text-left px-2 py-1.5 rounded text-sm flex items-center gap-2 hover:bg-muted',
                selectedSection === null && 'bg-muted font-medium'
              )}
            >
              <Folder className="h-4 w-4" />
              <span>All sections</span>
              <span className="ml-auto text-xs text-muted-foreground">
                {data?.sections.reduce((sum, s) => sum + s.keyCount, 0) ?? 0}
              </span>
            </button>
            {data?.sections.map((section) => (
              <SectionTreeItem
                key={section.fullPath}
                node={section}
                level={0}
                selectedSection={selectedSection}
                onSelect={setSelectedSection}
                selectedLanguages={selectedLanguages}
              />
            ))}
          </>
        )}
      </div>
    </aside>
  );
}

interface SectionTreeItemProps {
  node: SectionNode;
  level: number;
  selectedSection: string | null;
  onSelect: (path: string) => void;
  selectedLanguages: string[];
}

function SectionTreeItem({
  node,
  level,
  selectedSection,
  onSelect,
  selectedLanguages,
}: SectionTreeItemProps) {
  const [expanded, setExpanded] = useState(level === 0);
  const [isHovered, setIsHovered] = useState(false);
  const hasChildren = node.children.length > 0;
  const isSelected = selectedSection === node.fullPath;

  const bulkApproveMutation = useBulkApproveSection();

  const handleApproveSection = async (e: React.MouseEvent) => {
    e.stopPropagation();
    // Approve for the first selected language
    const lang = selectedLanguages[0];
    if (!lang) return;
    try {
      await bulkApproveMutation.mutateAsync({
        section: node.fullPath,
        lang,
      });
    } catch (error) {
      console.error('Failed to approve section:', error);
    }
  };

  return (
    <div>
      <div
        className="relative"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <button
          onClick={() => {
            onSelect(node.fullPath);
            if (hasChildren) setExpanded(!expanded);
          }}
          className={cn(
            'w-full text-left px-2 py-1.5 rounded text-sm flex items-center gap-1 hover:bg-muted',
            isSelected && 'bg-muted font-medium'
          )}
          style={{ paddingLeft: `${8 + level * 12}px` }}
        >
          {hasChildren ? (
            expanded ? (
              <ChevronDown className="h-3 w-3 shrink-0" />
            ) : (
              <ChevronRight className="h-3 w-3 shrink-0" />
            )
          ) : (
            <span className="w-3" />
          )}
          {expanded ? (
            <FolderOpen className="h-4 w-4 shrink-0 text-muted-foreground" />
          ) : (
            <Folder className="h-4 w-4 shrink-0 text-muted-foreground" />
          )}
          <span className="truncate">{node.name}</span>
          <span className="ml-auto text-xs text-muted-foreground">{node.keyCount}</span>
        </button>

        {/* Approve Section button - appears on hover */}
        {isHovered && level === 0 && (
          <button
            onClick={handleApproveSection}
            disabled={bulkApproveMutation.isPending}
            className="absolute right-1 top-1/2 -translate-y-1/2 p-1 rounded bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900 dark:text-green-300 dark:hover:bg-green-800"
            title={`Approve all ${node.keyCount} keys in ${node.name}`}
          >
            <Check className="h-3 w-3" />
          </button>
        )}
      </div>

      {hasChildren && expanded && (
        <div>
          {node.children.map((child) => (
            <SectionTreeItem
              key={child.fullPath}
              node={child}
              level={level + 1}
              selectedSection={selectedSection}
              onSelect={onSelect}
              selectedLanguages={selectedLanguages}
            />
          ))}
        </div>
      )}
    </div>
  );
}
