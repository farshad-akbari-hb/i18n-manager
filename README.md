# i18n Manager

A local development tool providing a web-based interface for reviewing, editing, and managing translations from the `i18n-translator` CLI tool.

## Overview

The i18n Manager complements the AI-powered `i18n-translator` CLI by providing a visual interface to:
- Review machine-generated translations
- Edit translations with inline editing
- Track review status (Draft/Approved)
- Lock translations to prevent CLI overwrites
- Navigate translations by section
- Filter and search across all translation keys
- Run translation jobs directly from the UI
- Manage Git workflow (branch, commit, diff)

```
┌─────────────────────────────────────────────────────────────────┐
│                     i18n-translator CLI                        │
│              (AI-powered batch translation)                    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│              .translation-history/*.history.json                │
│                   (Single source of truth)                      │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                       i18n-manager UI                           │
│      (Review, edit, approve, run jobs, commit changes)          │
└─────────────────────────────────────────────────────────────────┘
```

## Features

### Core Features (Phase 1)
- **Section Navigation** - Tree-based sidebar with approval percentage indicators
- **Multi-Language View** - Side-by-side columns (English source + target languages)
- **Virtual Scrolling** - Handles 1600+ translation keys smoothly
- **Inline Editing** - Click to edit translations directly in the table
- **Status Management** - Toggle between Draft/Approved status
- **Manual Edit Locking** - Edited translations are protected from CLI overwrites
- **Search & Filter** - Filter by status, search across keys and values
- **Keyboard Navigation** - j/k for row navigation, / for search focus
- **Interpolation Highlighting** - `{{variables}}` are visually highlighted

### Job Execution (Phase 2)
- **Translation Jobs** - Start translation jobs directly from the UI
- **Language Selection** - Choose which languages to translate
- **SSE Progress Streaming** - Real-time progress updates via Server-Sent Events
- **Cancel Support** - Cancel running jobs at any time
- **Live Stats** - View translated keys, batches, and completion percentage

### Git Integration (Phase 3)
- **Branch Management** - View current branch, create new branches, switch branches
- **Status Overview** - See changed files, ahead/behind counts
- **Diff Viewer** - View translation file diffs with additions/deletions
- **Commit Workflow** - Stage and commit translation changes
- **Discard Changes** - Revert changes to translation files
- **Toast Notifications** - Success/error feedback for all operations

## Configuration

The manager reads from `.i18n-translatorrc.json` in the project root — the same config file used by the translator:

```json
{
  "baselinePath": "src/i18n/en.json",
  "historyDir": ".translation-history",
  "context": "Your domain description for better translations",
  "projectRoot": ".",
  "translationPaths": ["src/i18n/"],
  "supportedLanguages": ["de", "fr", "es"]
}
```

| Field | Used By | Description |
|-------|---------|-------------|
| `baselinePath` | Both | Path to baseline JSON |
| `historyDir` | Both | History directory |
| `context` | Translator | Domain context for translations |
| `projectRoot` | Manager | Project root directory |
| `translationPaths` | Manager | Directories containing translation files |
| `supportedLanguages` | Manager | Languages to manage |
| `translatorCliPath` | Manager | Path to translator CLI (auto-resolved) |
| `translatorCwd` | Manager | Working directory for translator (defaults to projectRoot) |

## Quick Start

```bash
# Navigate to the i18n-manager directory
cd tools/i18n-manager

# Install dependencies
npm install

# Start both frontend and backend
npm start
```

This starts:
- **Backend API**: http://localhost:4000
- **Frontend UI**: http://localhost:4001

## Project Structure

```
tools/i18n-manager/
├── package.json
├── tsconfig.json
├── vite.config.ts
├── index.html
│
├── server/                          # Express.js Backend
│   ├── index.ts                     # Server entry, routes setup
│   ├── routes/
│   │   ├── translations.ts          # GET/PATCH translations, bulk approve
│   │   ├── jobs.ts                  # Start/cancel jobs, SSE progress
│   │   └── git.ts                   # Git status, branch, diff, commit
│   └── services/
│       ├── history-service.ts       # Read/write .history.json files
│       ├── translation-service.ts   # Merge baseline + history data
│       ├── cli-runner.ts            # Spawn i18n-translator, parse output
│       └── git-service.ts           # Git operations via execFile
│
└── src/                             # React Frontend
    ├── main.tsx                     # App entry point
    ├── App.tsx                      # Main layout
    ├── index.css                    # Tailwind CSS styles
    ├── lib/
    │   ├── types.ts                 # TypeScript interfaces
    │   ├── api.ts                   # API client functions
    │   └── utils.ts                 # Utility functions (cn)
    ├── hooks/
    │   ├── useTranslations.ts       # TanStack Query hooks for translations
    │   ├── useJobProgress.ts        # SSE subscription for job progress
    │   └── useGitStatus.ts          # TanStack Query hooks for git
    ├── stores/
    │   ├── uiStore.ts               # Zustand state management
    │   └── toastStore.ts            # Toast notification state
    └── components/
        ├── layout/
        │   ├── Header.tsx           # Search, filters, language toggles
        │   └── Sidebar.tsx          # Section tree navigation
        ├── review/
        │   ├── ReviewTable.tsx      # Main table with virtual scroll
        │   └── TranslationCell.tsx  # Cell with edit, status, badges
        ├── jobs/
        │   ├── JobPanel.tsx         # Start/cancel jobs, language picker
        │   └── ProgressFeed.tsx     # Live progress display
        ├── git/
        │   └── GitPanel.tsx         # Branch, diff, commit UI
        └── ui/
            └── Toaster.tsx          # Toast notification display
```

## Architecture

### Tech Stack
| Layer | Technology | Purpose |
|-------|------------|---------|
| Frontend | React 19 + Vite | UI framework |
| Styling | Tailwind CSS v4 | Utility-first CSS |
| State | Zustand | UI state (filters, editing, toasts) |
| Data Fetching | TanStack Query | Server state, caching |
| Virtualization | TanStack Virtual | Handle 1600+ rows |
| Backend | Express.js | REST API + SSE |
| Storage | JSON files | .history.json files |
| Git | child_process.execFile | Safe git operations |

### Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND (React)                        │
│  ┌───────────┐  ┌──────────────┐  ┌───────────────────────┐   │
│  │  Sidebar  │  │ ReviewTable  │  │  JobPanel / GitPanel  │   │
│  │  (tree)   │  │ (edit/review)│  │  (workflow controls)  │   │
│  └───────────┘  └──────────────┘  └───────────────────────┘   │
│         │              │                    │                  │
│         └──────────────┴────────────────────┘                  │
│                        │                                       │
│           TanStack Query + SSE (EventSource)                   │
└────────────────────────┼───────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                     EXPRESS.js BACKEND                         │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Routes: /api/translations, /api/jobs, /api/git         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                         │                                      │
│  ┌─────────────────────┴────────────────────────────────────┐  │
│  │                     Services                              │  │
│  │  ┌────────────────┐ ┌────────────┐ ┌─────────────────┐   │  │
│  │  │ history-svc    │ │ cli-runner │ │ git-service     │   │  │
│  │  │ translation-svc│ │ (spawn)    │ │ (execFile)      │   │  │
│  │  └────────────────┘ └────────────┘ └─────────────────┘   │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                    FILE SYSTEM                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  i18n-translator/.translation-history/{lang}.history.json│   │
│  │  (Single source of truth: translations + review status) │   │
│  └─────────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  src/lib/i18n/en.json (baseline/source)                 │   │
│  │  src/lib/i18n/{lang}.json (output)                      │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

## API Reference

### Translations

#### GET /api/translations
Fetch all translations with optional filtering.

**Query Parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `lang` | string | `de,fa` | Comma-separated language codes |
| `section` | string | - | Filter by section (e.g., `calculator`) |
| `status` | string | `all` | Filter: `all`, `draft`, `approved` |
| `search` | string | - | Search in keys and values |

**Response:**
```json
{
  "translations": [...],
  "totalCount": 1662,
  "sections": [...]
}
```

#### GET /api/translations/:encodedKey
Get a single translation by URL-encoded key.

#### PATCH /api/translations/:encodedKey
Update a translation entry.

**Body:**
```json
{
  "lang": "de",
  "value": "Neuer Text",
  "status": "approved"
}
```

**Behavior:**
- Setting `value` automatically sets `manualEdit: true`
- Setting `status` updates `reviewedAt` timestamp

#### POST /api/translations/bulk-approve
Bulk approve multiple keys.

**Body:**
```json
{
  "keys": ["app.title", "app.subtitle"],
  "lang": "de"
}
```

#### POST /api/translations/bulk-approve-section
Bulk approve all draft keys in a section.

**Body:**
```json
{
  "section": "calculator",
  "lang": "de"
}
```

### Sections

#### GET /api/sections
Get the section tree for navigation.

**Response:**
```json
{
  "sections": [
    {
      "name": "calculator",
      "fullPath": "calculator",
      "keyCount": 47,
      "status": { "draft": 40, "approved": 7 },
      "children": [...]
    }
  ]
}
```

### Jobs

#### POST /api/jobs/start
Start a new translation job.

**Body:**
```json
{
  "languages": ["de", "fa"]
}
```

**Response:**
```json
{
  "jobId": "job_1234567890",
  "status": { ... },
  "message": "Translation job started"
}
```

#### GET /api/jobs/progress/:jobId
SSE endpoint for job progress streaming.

**Events:**
- `progress` - Progress update with stats
- `translation` - Individual key translated
- `complete` - Job finished successfully
- `error` - Job failed with error message

#### POST /api/jobs/:jobId/cancel
Cancel a running job.

#### GET /api/jobs/active
Get the currently active job (if any).

#### GET /api/jobs/:jobId
Get status of a specific job.

### Git

#### GET /api/git/status
Get current git status.

**Response:**
```json
{
  "branch": "feat/translations",
  "clean": false,
  "changedFiles": [
    { "path": "src/lib/i18n/de.json", "status": "modified", "staged": false }
  ],
  "ahead": 2,
  "behind": 0
}
```

#### GET /api/git/branches
Get list of branches.

**Response:**
```json
{
  "current": "feat/translations",
  "branches": ["main", "develop", "feat/translations"]
}
```

#### POST /api/git/branch
Create a new branch.

**Body:**
```json
{
  "name": "feat/new-translations"
}
```

#### POST /api/git/switch
Switch to an existing branch.

**Body:**
```json
{
  "name": "main"
}
```

#### GET /api/git/diff
Get diff of translation files.

**Response:**
```json
{
  "files": [
    {
      "path": "src/lib/i18n/de.json",
      "additions": 15,
      "deletions": 3,
      "diff": "diff --git ..."
    }
  ],
  "summary": "2 files changed, 15 insertions(+), 3 deletions(-)"
}
```

#### POST /api/git/commit
Commit translation changes.

**Body:**
```json
{
  "message": "chore(i18n): update German translations"
}
```

**Response:**
```json
{
  "success": true,
  "hash": "abc1234"
}
```

#### POST /api/git/discard
Discard all changes to translation files.

### Health

#### GET /api/health
Health check endpoint.

## Data Model

### Translation History Entry
The UI extends the existing `TranslationHistoryEntry` with review fields:

```typescript
interface TranslationHistoryEntry {
  // Original fields from i18n-translator
  sourceHash: string;        // Hash of source key+value
  sourceKey: string;         // e.g., "calculator.loanAmount"
  sourceValue: string;       // English source text
  translatedValue: string;   // Translated text
  targetLang: string;        // e.g., "de"
  timestamp: number;         // When translated
  version: number;           // Translation version
  interpolations?: string[]; // Variables like ["amount", "rate"]

  // Review UI fields (added by i18n-manager)
  reviewStatus?: 'draft' | 'approved';  // Default: 'draft'
  reviewedAt?: number;                   // Review timestamp
  manualEdit?: boolean;                  // If true, CLI won't overwrite
  rejectionNote?: string;                // Notes for re-translation
}
```

### Key Points
- **Single Source of Truth**: Review data is stored in `.history.json` files
- **No Sync Issues**: No separate review database to maintain
- **CLI Integration**: `manualEdit: true` prevents CLI from overwriting locked translations

## Supported Languages

| Code | Language |
|------|----------|
| `de` | German |
| `fa` | Persian (Farsi) |
| `ar` | Arabic |
| `tr` | Turkish |
| `es` | Spanish |
| `fr` | French |

## UI Features

### Keyboard Shortcuts
| Key | Action |
|-----|--------|
| `j` / `↓` | Move to next row |
| `k` / `↑` | Move to previous row |
| `/` | Focus search input |
| `Enter` | Save edit |
| `Esc` | Cancel edit |

### Status Badges
- **Draft** (yellow) - Needs review
- **Approved** (green) - Reviewed and accepted
- **Manual** (purple) - Manually edited, protected from CLI overwrites

### Section Tree
- Shows approval percentage with color coding:
  - Green (100%) - Fully approved
  - Yellow (>50%) - Partially approved
  - Gray (<50%) - Mostly draft

### Toast Notifications
- **Success** (green) - Operation completed successfully
- **Error** (red) - Operation failed
- **Warning** (amber) - Attention needed
- **Info** (blue) - Informational message

## Integration with i18n-translator

### Manual Edit Protection
When you edit a translation in the UI, the `manualEdit` flag is set to `true`. The `i18n-translator` CLI respects this flag:

```typescript
// In i18n-translator/src/diff.ts
if (existingByKey.manualEdit === true) {
  // Treat as unchanged - don't overwrite manual translations
  result.unchangedKeys.push(key);
  continue;
}
```

This ensures your manual corrections are never overwritten by subsequent translation runs.

### Workflow
1. Run `i18n-translator` to generate initial translations
2. Open `i18n-manager` to review translations
3. Edit translations that need correction
4. Approve translations that are correct
5. Use Git panel to create branch and commit changes
6. Re-run `i18n-translator` - manual edits are preserved

## Development

### Scripts

```bash
# Start both frontend and backend (development)
npm start

# Start only frontend (Vite dev server)
npm run dev

# Start only backend (Express with tsx watch)
npm run server

# Build for production
npm run build

# Preview production build
npm run preview
```

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `4000` | Backend API port |

### Adding a New Language

1. Update `SUPPORTED_LANGUAGES` in:
   - `src/lib/types.ts`
   - `server/routes/translations.ts`

2. Add the language name to `LANGUAGE_NAMES` in `src/lib/types.ts`

3. Add the language to `AVAILABLE_LANGUAGES` in `src/components/jobs/JobPanel.tsx`

4. Run `i18n-translator` for the new language

## Dependencies

### Backend
```json
{
  "express": "^4.21.0",
  "cors": "^2.8.5"
}
```

### Frontend
```json
{
  "react": "^19.0.0",
  "@tanstack/react-query": "^5.56.0",
  "@tanstack/react-virtual": "^3.10.0",
  "zustand": "^5.0.0",
  "lucide-react": "^0.453.0",
  "tailwind-merge": "^2.5.0",
  "clsx": "^2.1.0"
}
```

## Security

### Git Operations
All git operations use `execFile` instead of shell commands to prevent injection:

```typescript
// Safe - arguments passed as array, no shell interpretation
await execFileAsync('git', ['checkout', '-b', branchName]);
```

Branch names are also validated against a whitelist pattern:
```typescript
if (!/^[a-zA-Z0-9/_-]+$/.test(name)) {
  throw new Error('Invalid branch name');
}
```

## License

Internal tool - part of the finance-calculator project.
