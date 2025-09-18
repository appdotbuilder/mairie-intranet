import { useState, ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { cn } from '../utils';

interface MainLayoutProps {
  currentView: string;
  onViewChange: (view: string) => void;
  children: ReactNode;
}

export function MainLayout({ currentView, onViewChange, children }: MainLayoutProps) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <div className={cn(
        "fixed left-0 top-0 h-full z-40 transition-all duration-300",
        isSidebarCollapsed ? "w-16" : "w-64"
      )}>
        <Sidebar
          currentView={currentView}
          onViewChange={onViewChange}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        />
      </div>

      {/* Main content area */}
      <div className={cn(
        "flex-1 flex flex-col transition-all duration-300",
        isSidebarCollapsed ? "ml-16" : "ml-64"
      )}>
        {/* Top bar */}
        <div className="sticky top-0 z-30">
          <TopBar currentView={currentView} onViewChange={onViewChange} />
        </div>

        {/* Content */}
        <main className="flex-1 overflow-auto">
          <div className="p-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}