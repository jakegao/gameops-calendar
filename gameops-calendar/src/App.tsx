import { useState, useEffect, useCallback } from 'react';
import { useAppStore } from './store/useAppStore.ts';
import Sidebar from './components/Sidebar.tsx';
import TopBar from './components/TopBar.tsx';
import CalendarView from './components/CalendarView.tsx';
import GanttView from './components/GanttView.tsx';
import BoardView from './components/BoardView.tsx';
import EventModal from './components/EventModal.tsx';
import DetailPanel from './components/DetailPanel.tsx';
import TemplateModal from './components/TemplateModal.tsx';
import ExportModal from './components/ExportModal.tsx';
import Snackbar from './components/Snackbar.tsx';
import HelpModal from './components/HelpModal.tsx';

const VIEW_LABELS = { calendar: '日历', gantt: '时间线', board: '看板' } as const;

export default function App() {
  const { currentView, setCurrentView, openEventModal, isEventModalOpen, isTemplateModalOpen, isExportModalOpen, isDetailPanelOpen } = useAppStore();
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('gameops-theme') === 'dark');

  // B11: .dark class 挂到 document.documentElement 而非 div
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  const toggleDark = useCallback(() => {
    setDarkMode((v) => {
      const next = !v;
      localStorage.setItem('gameops-theme', next ? 'dark' : 'light');
      return next;
    });
  }, []);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    const tag = (e.target as HTMLElement).tagName;
    if (['INPUT', 'TEXTAREA', 'SELECT'].includes(tag)) return;
    const anyModalOpen = isEventModalOpen || isTemplateModalOpen || isExportModalOpen || isDetailPanelOpen || showHelp;
    if (e.key === '?' || (e.key === '/' && e.shiftKey)) { e.preventDefault(); setShowHelp((v) => !v); return; }
    if (anyModalOpen) return;
    switch (e.key) {
      case 'n': case 'N': e.preventDefault(); openEventModal(); break;
      case '1': e.preventDefault(); setCurrentView('calendar'); break;
      case '2': e.preventDefault(); setCurrentView('gantt'); break;
      case '3': e.preventDefault(); setCurrentView('board'); break;
    }
  }, [isEventModalOpen, isTemplateModalOpen, isExportModalOpen, isDetailPanelOpen, showHelp, openEventModal, setCurrentView]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return (
    <div className="flex h-screen w-screen overflow-hidden" style={{ background: 'var(--bg-primary)' }}>
      <Sidebar expanded={sidebarExpanded} onToggle={() => setSidebarExpanded(!sidebarExpanded)} darkMode={darkMode} onToggleDark={toggleDark} />
      <div className="flex-1 flex flex-col min-w-0 transition-all duration-200">
        <TopBar viewLabel={VIEW_LABELS[currentView]} />
        <div className="flex-1 min-h-0 relative">
          {currentView === 'calendar' && <CalendarView />}
          {currentView === 'gantt' && <GanttView />}
          {currentView === 'board' && <BoardView />}
          {currentView === 'dashboard' && <DashboardView />}
          <DetailPanel />
        </div>
      </div>
      <EventModal />
      <TemplateModal />
      <ExportModal />
      <Snackbar />
      {showHelp && <HelpModal onClose={() => setShowHelp(false)} />}
    </div>
  );
}
