import { Search, Languages } from 'lucide-react';
import { useUIStore } from '../../stores/uiStore';
import { SUPPORTED_LANGUAGES, LANGUAGE_NAMES } from '../../lib/types';

export function Header() {
  const {
    selectedLanguages,
    setSelectedLanguages,
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
  } = useUIStore();

  const toggleLanguage = (lang: string) => {
    if (selectedLanguages.includes(lang)) {
      if (selectedLanguages.length > 1) {
        setSelectedLanguages(selectedLanguages.filter((l) => l !== lang));
      }
    } else {
      setSelectedLanguages([...selectedLanguages, lang]);
    }
  };

  return (
    <header className="border-b bg-card px-4 py-3">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Languages className="h-6 w-6 text-primary" />
          <h1 className="text-xl font-semibold">i18n Manager</h1>
        </div>

        <div className="flex items-center gap-4 flex-1 max-w-3xl">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search keys or values... (press /)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(e.target.value as 'all' | 'draft' | 'approved' | 'rejected')
            }
            className="px-3 py-2 text-sm border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="all">All Status</option>
            <option value="draft">Draft</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>

        {/* Language Toggles */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Languages:</span>
          <div className="flex gap-1">
            {SUPPORTED_LANGUAGES.map((lang) => (
              <button
                key={lang}
                onClick={() => toggleLanguage(lang)}
                className={`px-2 py-1 text-xs font-medium rounded ${
                  selectedLanguages.includes(lang)
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
                title={LANGUAGE_NAMES[lang]}
              >
                {lang.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      </div>
    </header>
  );
}
