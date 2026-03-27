import { useMemo } from 'react';
import {
  Calendar, BarChart3, LayoutGrid, Plus, Menu,
  Sparkles, Download, AlertTriangle, Moon, Sun,
} from 'lucide-react';
import { useAppStore } from '../store/useAppStore.ts';
import { CATEGORY_COLORS, CATEGORY_NAMES } from '../constants/index.ts';
import type { EventCategory } from '../types/index.ts';

interface Props { expanded: boolean; onToggle: () => void; darkMode: boolean; onToggleDark: () => void }

export default function Sidebar({ expanded, onToggle, darkMode, onToggleDark }: Props) {
  const { currentView, setCurrentView, openEventModal, openTemplateModal, openExportModal } = useAppStore();
  const events = useAppStore((s) => s.events);
  const detectConflicts = useAppStore((s) => s.detectConflicts);

  const activeCount = useMemo(() => events.filter((e) => !['completed', 'cancelled'].includes(e.status)).length, [events]);
  const conflicts = useMemo(() => detectConflicts(), [events, detectConflicts]);
  const catCounts = useMemo(() =>
    (Object.keys(CATEGORY_NAMES) as EventCategory[]).map((cat) => ({
      cat, label: CATEGORY_NAMES[cat], count: events.filter((e) => e.category === cat).length, color: CATEGORY_COLORS[cat],
    })), [events]);

  const navItems = [
    { key: 'calendar' as const, icon: Calendar, label: '日历' },
    { key: 'gantt' as const, icon: BarChart3, label: '时间线' },
    { key: 'board' as const, icon: LayoutGrid, label: '看板' },
  ];

  const Tooltip = ({ text }: { text: string }) => !expanded ? (
    <div className="absolute left-full top-1/2 -translate-y-1/2 ml-3 px-3 py-1.5 text-[12px] rounded-md whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50"
      style={{ background: darkMode ? '#4a4a4a' : '#2d2e30', color: '#fff' }}>{text}</div>
  ) : null;

  return (
    <div className="flex-shrink-0 flex flex-col h-full border-r transition-all duration-200 overflow-hidden"
      style={{ width: expanded ? 256 : 68, background: 'var(--bg-surface)', borderColor: 'var(--border-primary)' }}>
      {/* 汉堡菜单 + Logo */}
      <div className="h-16 flex items-center px-3 gap-2 flex-shrink-0">
        <button onClick={onToggle} className="w-12 h-12 rounded-full flex items-center justify-center t-bg-hover transition-colors">
          <Menu size={22} style={{ color: 'var(--text-tertiary)' }} />
        </button>
        {expanded ? (
          <span className="text-[18px] font-normal whitespace-nowrap" style={{ color: 'var(--text-secondary)' }}>GameOps</span>
        ) : (
          <span className="sr-only">GameOps</span>
        )}
      </div>
      {!expanded && (
        <div className="flex justify-center -mt-2 mb-1">
          <div className="w-8 h-8 rounded-lg bg-[#1a73e8] flex items-center justify-center text-white text-[14px] font-bold">G</div>
        </div>
      )}

      {/* 新建按钮 */}
      <div className="px-3 mb-4 relative group">
        <button onClick={() => openEventModal()}
          className={`flex items-center gap-3 border rounded-2xl transition-all ${expanded ? 'px-6 py-3.5' : 'px-3 py-3.5 justify-center'}`}
          style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-secondary)', boxShadow: 'var(--shadow-sm)' }}>
          <Plus size={24} style={{ color: 'var(--accent)' }} strokeWidth={2} />
          {expanded && <span className="text-[15px] font-medium" style={{ color: 'var(--text-secondary)' }}>新建活动</span>}
        </button>
        <Tooltip text="新建活动" />
      </div>

      {/* 导航 */}
      <div className="px-2 space-y-0.5">
        {navItems.map(({ key, icon: Icon, label }) => (
          <div key={key} className="relative group">
            <button onClick={() => setCurrentView(key)}
              className={`w-full flex items-center gap-4 rounded-full transition-colors ${expanded ? 'px-5 h-12' : 'justify-center h-12'}`}
              style={{
                background: currentView === key ? 'var(--bg-active)' : 'transparent',
                color: currentView === key ? 'var(--text-active)' : 'var(--text-nav)',
              }}
              onMouseEnter={(e) => { if (currentView !== key) e.currentTarget.style.background = 'var(--bg-hover)'; }}
              onMouseLeave={(e) => { if (currentView !== key) e.currentTarget.style.background = 'transparent'; }}>
              <Icon size={22} strokeWidth={currentView === key ? 2 : 1.6} />
              {expanded && <span className="text-[14px] font-medium">{label}</span>}
            </button>
            <Tooltip text={label} />
          </div>
        ))}
      </div>

      <div className="mx-4 my-3 border-t" style={{ borderColor: 'var(--border-primary)' }} />

      {/* 快捷操作 */}
      <div className="px-2 space-y-0.5">
        {[
          { fn: openTemplateModal, icon: Sparkles, label: '模板创建' },
          { fn: openExportModal, icon: Download, label: '导出/导入' },
        ].map(({ fn, icon: Icon, label }) => (
          <div key={label} className="relative group">
            <button onClick={fn}
              className={`w-full flex items-center gap-4 rounded-full h-12 t-bg-hover transition-colors ${expanded ? 'px-5' : 'justify-center'}`}
              style={{ color: 'var(--text-nav)' }}>
              <Icon size={22} strokeWidth={1.6} />
              {expanded && <span className="text-[14px]">{label}</span>}
            </button>
            <Tooltip text={label} />
          </div>
        ))}
      </div>

      {/* 展开状态统计 */}
      {expanded && (
        <>
          <div className="mx-4 my-3 border-t" style={{ borderColor: 'var(--border-primary)' }} />
          <div className="px-5 flex-1 overflow-auto">
            <div className="flex gap-3 mb-4">
              <div className="flex-1 text-center">
                <div className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>活动总数</div>
                <div className="text-[22px] font-medium" style={{ color: 'var(--accent)' }}>{events.length}</div>
              </div>
              <div className="flex-1 text-center">
                <div className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>活跃中</div>
                <div className="text-[22px] font-medium" style={{ color: '#0d652d' }}>{activeCount}</div>
              </div>
            </div>
            {conflicts.length > 0 && (
              <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg mb-4" style={{ background: '#fce8e620' }}>
                <AlertTriangle size={16} className="text-[#c5221f]" />
                <span className="text-[13px] text-[#c5221f] font-medium">{conflicts.length} 个冲突</span>
              </div>
            )}
            <div className="text-[11px] uppercase tracking-wider mb-2 font-medium" style={{ color: 'var(--text-tertiary)' }}>分类</div>
            <div className="space-y-3">
              {catCounts.map(({ cat, label, count, color }) => (
                <div key={cat} className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: color }} />
                  <span className="text-[13px] flex-1" style={{ color: 'var(--text-secondary)' }}>{label}</span>
                  <span className="text-[13px] font-medium" style={{ color: 'var(--text-tertiary)' }}>{count}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* 底部：主题切换 */}
      <div className="mt-auto px-2 pb-3">
        <div className="relative group">
          <button onClick={onToggleDark}
            className={`w-full flex items-center gap-4 rounded-full h-12 t-bg-hover transition-colors ${expanded ? 'px-5' : 'justify-center'}`}
            style={{ color: 'var(--text-nav)' }}>
            {darkMode ? <Sun size={22} strokeWidth={1.6} /> : <Moon size={22} strokeWidth={1.6} />}
            {expanded && <span className="text-[14px]">{darkMode ? '浅色主题' : '深色主题'}</span>}
          </button>
          <Tooltip text={darkMode ? '浅色主题' : '深色主题'} />
        </div>
      </div>
    </div>
  );
}
