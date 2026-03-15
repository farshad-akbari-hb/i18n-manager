import { useState } from 'react';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { ReviewTable } from './components/review/ReviewTable';
import { JobPanel } from './components/jobs';
import { GitPanel } from './components/git';
import { Toaster } from './components/ui/Toaster';
import { useUIStore } from './stores/uiStore';

function App() {
  const { selectedSection, selectedLanguages } = useUIStore();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="h-screen flex flex-col bg-background">
      <Toaster />
      <Header />
      <div className="flex-1 flex overflow-hidden">
        <Sidebar
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        />
        <main className="flex-1 overflow-hidden flex flex-col">
          {/* Workflow Panels */}
          <div className="p-4 pb-0 space-y-4">
            <JobPanel />
            <GitPanel />
          </div>

          {/* Review Table */}
          <div className="flex-1 overflow-hidden p-4">
            <ReviewTable
              section={selectedSection}
              languages={selectedLanguages}
            />
          </div>
        </main>
      </div>
    </div>
  );
}

export default App;
