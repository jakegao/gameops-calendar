import { useState, useRef, useEffect } from 'react';
import { Search, Filter, Layers, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useAppStore } from '../store/useAppStore.ts';
import { format, addMonths, subMonths, addWeeks, subWeeks, addDays, subDays } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { CATEGORY_NAMES, LAYER_CONFIG, ROLE_CONFIG } from '../constants/index.ts';
import type { EventCategory, LayerType, TeamRole } from '../types/index.ts';

interface Props { viewLabel: string }

export default function TopBar({ viewLabel }: Props) {
  const {
    currentView, calendarView, setCalendarView,
    currentDate, setCurrentDate, searchQuery, setSearchQuery,
    visibleLayers, toggleLayer, filterCategories, setFilterCategories,
    filterRole, setFilterRole,
  } = useAppStore();

  const [showLayerDropdown, setShowLayerDropdown] = useState(false);
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const layerRef = useRef<HTMLDivElement>(null);
  const filterRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (layerRef.current && !layerRef.current.contains(e.target as Node)) setShowLayerDropdown(false);
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) setShowFilterDropdown(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => { if (showSearch && searchRef.current) searchRef.current.focus(); }, [showSearch]);

  const navigatePrev = () => {
    if (currentView === 'calendar') {
      if (calendarView === 'month') setCurrentDate(subMonths(currentDate, 1));
      else if (calendarView === 'week') setCurrentDate(subWeeks(currentDate, 1));
      else setCurrentDate(subDays(currentDate, 1));
    } else setCurrentDate(subMonths(currentDate, 1));
  };
  const navigateNext = () => {
    if (currentView === 'calendar') {
      if (calendarView === 'month') setCurrentDate(addMonths(currentDate, 1));
      else if (calendarView === 'week') setCurrentDate(addWeeks(currentDate, 1));
      else setCurrentDate(addDays(currentDate, 1));
    } else setCurrentDate(addMonths(currentDate, 1));
  };
  const goToday = () => setCurrentDate(new Date(2026, 2, 26));

  const dateLabel = () => {
    if (calendarView === 'month' || currentView !== 'calendar') return format(currentDate, 'yyyy年M月', { locale: zhCN });
    if (calendarView === 'week') return format(currentDate, 'yyyy年 M月 第W周', { locale: zhCN });
    return format(currentDate, 'yyyy年M月d日', { locale: zhCN });
  };

  const toggleCategoryFilter = (cat: EventCategory) => {
    setFilterCategories(filterCategories.includes(cat) ? filterCategories.filter((c) => c !== cat) : [...filterCategories, cat]);
  };

  const iconBtn = "w-10 h-10 rounded-full flex items-center justify-center t-bg-hover transition-colors";

  return (
    <div className="h-16 flex items-center px-4 gap-2 border-b flex-shrink-0"
      style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-primary)' }}>

      {/* V2-1: 视图标签 */}
      <span className="text-[13px] font-medium px-3 py-1 rounded-full mr-1"
        style={{ background: 'var(--accent-bg)', color: 'var(--accent)' }}>{viewLabel}</span>

      {/* 今天 + 前后翻页 */}
      <button onClick={goToday}
        className="px-5 h-9 rounded-md border text-[14px] font-medium t-bg-hover transition-colors"
        style={{ borderColor: 'var(--border-secondary)', color: 'var(--text-secondary)' }}>
        今天
      </button>
      <button onClick={navigatePrev} className={iconBtn} style={{ color: 'var(--text-tertiary)' }}><ChevronLeft size={22} /></button>
      <button onClick={navigateNext} className={iconBtn} style={{ color: 'var(--text-tertiary)' }}><ChevronRight size={22} /></button>

      <h1 className="text-[22px] font-normal ml-2 mr-4 select-none" style={{ color: 'var(--text-secondary)' }}>{dateLabel()}</h1>

      {/* 日历子视图 */}
      {currentView === 'calendar' && (
        <div className="flex border rounded-lg overflow-hidden" style={{ borderColor: 'var(--border-secondary)' }}>
          {(['month', 'week', 'day'] as const).map((v, i) => (
            <button key={v} onClick={() => setCalendarView(v)}
              className={`px-4 h-9 text-[14px] font-medium transition-colors ${i > 0 ? 'border-l' : ''}`}
              style={{
                borderColor: 'var(--border-secondary)',
                background: calendarView === v ? 'var(--bg-active)' : 'transparent',
                color: calendarView === v ? 'var(--text-active)' : 'var(--text-tertiary)',
              }}>
              {{ month: '月', week: '周', day: '日' }[v]}
            </button>
          ))}
        </div>
      )}

      <div className="flex-1" />

      {/* 搜索 */}
      {showSearch ? (
        <div className="relative animate-fade-in">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-tertiary)' }} />
          <input ref={searchRef} type="text" placeholder="搜索活动..." value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onBlur={(e) => { if (!searchQuery && !e.currentTarget.value) setTimeout(() => setShowSearch(false), 150); }}
            className="w-72 pl-11 pr-10 h-11 rounded-lg text-[14px] focus:outline-none transition-all"
            style={{ background: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }} />
          <button onClick={() => { setSearchQuery(''); setShowSearch(false); }}
            className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-tertiary)' }}><X size={18} /></button>
        </div>
      ) : (
        <button onClick={() => setShowSearch(true)} className={iconBtn} style={{ color: 'var(--text-tertiary)' }}><Search size={20} /></button>
      )}

      {/* 图层 */}
      <div className="relative" ref={layerRef}>
        <button onClick={() => { setShowLayerDropdown(!showLayerDropdown); setShowFilterDropdown(false); }} className={iconBtn} style={{ color: 'var(--text-tertiary)' }}>
          <Layers size={20} />
        </button>
        {showLayerDropdown && (
          <div className="dropdown-menu absolute right-0 top-full mt-2 w-56 py-2 z-50">
            <div className="px-4 py-2 text-[11px] uppercase tracking-wider font-medium" style={{ color: 'var(--text-tertiary)' }}>显示图层</div>
            {(Object.keys(LAYER_CONFIG) as LayerType[]).map((layer) => (
              <button key={layer} onClick={() => toggleLayer(layer)}
                className="flex items-center gap-3 w-full px-4 py-3 text-[14px] t-bg-hover transition-colors">
                <div className={`w-[18px] h-[18px] rounded flex items-center justify-center border-2 transition-all`}
                  style={{ borderColor: visibleLayers[layer] ? 'var(--accent)' : 'var(--border-secondary)', background: visibleLayers[layer] ? 'var(--accent)' : 'transparent' }}>
                  {visibleLayers[layer] && <span className="text-white text-[11px]">✓</span>}
                </div>
                <div className="w-3 h-3 rounded" style={{ backgroundColor: LAYER_CONFIG[layer].color }} />
                <span style={{ color: 'var(--text-secondary)' }}>{LAYER_CONFIG[layer].name}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 筛选 */}
      <div className="relative" ref={filterRef}>
        <button onClick={() => { setShowFilterDropdown(!showFilterDropdown); setShowLayerDropdown(false); }}
          className={`${iconBtn} relative`} style={{ color: 'var(--text-tertiary)' }}>
          <Filter size={20} />
          {(filterCategories.length > 0 || filterRole) && (
            <span className="absolute top-1 right-1 w-4 h-4 rounded-full text-[9px] font-bold flex items-center justify-center" style={{ background: 'var(--accent)', color: '#fff' }}>
              {filterCategories.length + (filterRole ? 1 : 0)}
            </span>
          )}
        </button>
        {showFilterDropdown && (
          <div className="dropdown-menu absolute right-0 top-full mt-2 w-64 py-2 z-50 max-h-[70vh] overflow-auto">
            <div className="px-4 py-2 text-[11px] uppercase tracking-wider font-medium" style={{ color: 'var(--text-tertiary)' }}>活动类型</div>
            {(Object.keys(CATEGORY_NAMES) as EventCategory[]).map((cat) => (
              <button key={cat} onClick={() => toggleCategoryFilter(cat)}
                className="flex items-center gap-3 w-full px-4 py-3 text-[14px] t-bg-hover transition-colors">
                <div className="w-[18px] h-[18px] rounded flex items-center justify-center border-2 transition-all"
                  style={{ borderColor: filterCategories.includes(cat) ? 'var(--accent)' : 'var(--border-secondary)', background: filterCategories.includes(cat) ? 'var(--accent)' : 'transparent' }}>
                  {filterCategories.includes(cat) && <span className="text-white text-[11px]">✓</span>}
                </div>
                <span style={{ color: 'var(--text-secondary)' }}>{CATEGORY_NAMES[cat]}</span>
              </button>
            ))}
            <div className="border-t my-2" style={{ borderColor: 'var(--border-primary)' }} />
            <div className="px-4 py-2 text-[11px] uppercase tracking-wider font-medium" style={{ color: 'var(--text-tertiary)' }}>角色视图</div>
            <button onClick={() => setFilterRole(null)}
              className="w-full px-4 py-3 text-[14px] text-left t-bg-hover"
              style={{ color: !filterRole ? 'var(--accent)' : 'var(--text-secondary)', fontWeight: !filterRole ? 500 : 400 }}>
              全部角色
            </button>
            {(Object.keys(ROLE_CONFIG) as TeamRole[]).map((role) => (
              <button key={role} onClick={() => setFilterRole(role === filterRole ? null : role)}
                className="flex items-center gap-3 w-full px-4 py-3 text-[14px] t-bg-hover"
                style={{ color: filterRole === role ? 'var(--accent)' : 'var(--text-secondary)', fontWeight: filterRole === role ? 500 : 400 }}>
                <span className="text-[18px]">{ROLE_CONFIG[role].icon}</span>
                <span>{ROLE_CONFIG[role].name}</span>
              </button>
            ))}
            {(filterCategories.length > 0 || filterRole) && (
              <>
                <div className="border-t my-2" style={{ borderColor: 'var(--border-primary)' }} />
                <button onClick={() => { setFilterCategories([]); setFilterRole(null); }}
                  className="w-full px-4 py-3 text-[14px] text-[#c5221f] text-left font-medium t-bg-hover">
                  清除筛选
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
